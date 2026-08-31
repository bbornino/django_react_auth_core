# django_react_auth_core

The Django + React auth shell for Project Zero — the deployment blueprint powering
every tenant app on `apps.bornino.net` (Job Tracker, Garden Expert, and future apps).
Email/password and Google OAuth login (including account linking by email and
avatar sync), JWT-based auth with an httpOnly refresh cookie, role-based access,
self- and admin-editable user profiles, and a per-user Anthropic API key slot —
built once here, copied into each tenant app's repo as its starting point.

## Status

Register, Login (email/password + Google), Logout, session persistence across
reloads and multiple tabs, route protection, and self/admin profile editing are
all built and confirmed working end-to-end against the real backend — not just
reasoned about. Automated tests are the one major piece still outstanding; see
**Known gaps** below for everything else.

## Why this exists

Every Project Zero app needs the same login, and every app should share one
identity — log in once, and that session works across Job Tracker, Garden Expert,
and everything else, because they all point at the same physical database. This
repo is that shared foundation: a working, tested reference implementation of the
auth pattern, not a live service other apps call over the network (see
**Deployment model** below for why, and when that might change).

## Stack

- **Backend:** Django + DRF, `django-allauth` + `dj-rest-auth[with_social]` for
  auth/OAuth, `djangorestframework-simplejwt` for JWTs, `uv` for dependency
  management, MariaDB (matches the platform's Lightsail DB target).
- **Frontend:** Vite + React + TypeScript, React Router v7 (client mode), Zustand
  for state, Axios with interceptor-based silent refresh, React Hook Form + Zod,
  shadcn/ui (Base UI + Nova preset) for components.

## Architecture decisions worth knowing before touching this code

- **Email is the identifier, no username field exists.** The custom `User` model
  extends `AbstractBaseUser` directly (not `AbstractUser`) — there's no username
  column to nullify, it was never declared. `ACCOUNT_USER_MODEL_USERNAME_FIELD`,
  `ACCOUNT_SIGNUP_FIELDS`, and `ACCOUNT_LOGIN_METHODS` in `settings.py` tell
  allauth 65+'s newer signup API this explicitly. `CustomRegisterSerializer`
  additionally drops dj-rest-auth's own hardcoded `username` field, since that
  library's fallback logic treats "not required" differently from "not present" —
  see the comment block on that class for the exact mechanism.
- **Access token: JSON body only, held in memory (Zustand), never persisted.**
  Refresh token: httpOnly cookie, invisible to JS by design. This is the whole
  point of the split — an XSS payload can read anything in `localStorage` but
  cannot read an httpOnly cookie. Never add `persist` middleware to the auth
  store, and never expect to read the refresh token's value from JS anywhere.
- **`auth/token/refresh/` is the real refresh endpoint** — it comes from
  dj-rest-auth's own `urls.py` (`include('dj_rest_auth.urls')`), not a
  hand-rolled route. This one specifically has to stay at dj-rest-auth's path
  rather than the flat `auth/refresh/` convention used elsewhere, because
  dj-rest-auth's `RefreshViewWithCookieSupport` (the only view that actually
  reads the refresh token out of the cookie) is wired to that exact URL name.
  Plain `simplejwt.TokenRefreshView` does **not** read cookies — it expects the
  token in the POST body — so don't reintroduce a manual route pointing at it.
- **Every other auth route is flat**, matching industry convention over
  dj-rest-auth's own defaults: `auth/register/`, `auth/login/`, `auth/logout/`.
- **`ROTATE_REFRESH_TOKENS: False`.** Multiple tabs each independently redeeming
  the same refresh cookie is safe under this setting — confirmed via actual
  multi-tab testing, not just reasoning. If rotation is ever turned on, that
  assumption breaks and cross-tab coordination (`BroadcastChannel`) becomes
  necessary — see the bin list below.
- **snake_case (backend) vs. camelCase (frontend) is a deliberate boundary, not
  an inconsistency.** `lib/map-user-response.ts` is the one place that
  translation happens — never rename the frontend `User` interface to match the
  wire format, and never skip the mapper when handling a fresh API response.
- **Google OAuth uses the redirect flow, not a popup.** `GoogleAuthButton`
  navigates the browser to Google's consent screen directly (built from
  `VITE_GOOGLE_CLIENT_ID` + the registered redirect URI); Google redirects back
  to `GoogleCallbackPage` (`/auth/google/callback` on the frontend) with a
  `code` query param, which gets POSTed to `auth/google/`. dj-rest-auth's
  `SocialLoginSerializer` handles the code-for-token exchange internally — no
  custom backend exchange view was needed. `GoogleCallbackPage` has its own
  `useRef` single-fire guard, same as `AuthBootstrap`: OAuth codes are single-use,
  so StrictMode's double-invoke would otherwise burn the code on a throwaway
  duplicate request and fail the real one.
- **`SOCIALACCOUNT_AUTO_SIGNUP = True` is required** for first-time Google
  signups to work at all in this API-only setup. Without it, allauth's default
  signup flow tries to redirect to an HTML "complete your signup" template view
  (`socialaccount_signup`) that doesn't exist here — `NoReverseMatch`, every
  time. This setting tells allauth to complete signup immediately from the
  Google profile data instead.
- **`CustomSocialAccountAdapter` (`auth_users/adapters.py`) does two things
  allauth doesn't by default:** links a Google login to an existing
  password-based account when the emails match (allauth's own
  `assess_unique_email` treats a matching-but-unlinked email as a conflict and
  blocks it, to prevent account-takeover via an unverified email claim — this
  app instead trusts Google's verified email as safe to auto-link), and syncs
  `avatar_url` from Google's profile picture on every login. The two code paths
  need separate, explicit `save(update_fields=['avatar_url'])` calls — a repeat
  login on an *already-linked* account never triggers a `user.save()` anywhere
  else in allauth's normal login flow, so an in-memory-only field change here
  would otherwise silently vanish without ever reaching the database, even
  though it'd briefly look correct in that request's own login response.
- **`avatar_url` is read-only from the API's perspective.** Stays blank forever
  for email/password-only users; the frontend falls back to initials via
  `UserAvatar` in that case.
- **Self vs. admin profile editing is one page (`EditUserPage`), one schema
  (`adminUserSchema`), not two.** Admin-only fields (`role`, `is_active`,
  `is_staff`) are `.optional()` in the Zod schema rather than a second schema
  type — a non-admin's form simply never renders those `Controller` fields, so
  they stay `undefined` and axios drops them from the JSON body entirely.
  `PATCH`, not `PUT`, is what makes this safe: PUT expects a complete resource
  and 400s on any field DRF considers required but absent (this cost real
  debugging time before landing on PATCH); PATCH only validates fields actually
  present in the request. The backend's `UserViewSet.get_queryset()` — not
  anything client-side — is the real enforcement for who can edit whom; the
  frontend's own role check is purely a UX shortcut to skip a doomed request.

## Deployment model

Not yet decided as final, but the current direction: **auth becomes its own live
microservice** at `apps.bornino.net/auth`, sharing one JWT signing secret with
every tenant app so each app can verify tokens locally with no network
round-trip back to the auth service. Every tenant app's *frontend* still copies
this repo's components/store/api-client wholesale (copy-paste, not a package) —
only the Django half runs as a single shared instance. This is a deliberate,
accepted trade: copy-paste drift on the frontend side is a known, accepted risk;
running one live backend instead of N independent copies eliminates backend
drift entirely. See the platform's own architecture notes for the fuller
reasoning on why package/microservice status was deliberately left undecided
until real usage (this repo, then a second app) could inform the call.

## Known gaps / bin list

**Automated tests — the main outstanding item.** Nothing here has coverage yet;
everything's been verified by hand. Highest-value starting points: pure
functions (`parseApiError`, `mapUserResponse`) need no rendering to test; Django
side, `UserViewSet.get_queryset()`'s self-vs-admin scoping,
`CustomRegisterSerializer`'s username-drop, and `CustomSocialAccountAdapter`'s
email-merge/avatar-sync logic are the highest-value backend targets, given how
much non-obvious conditional logic lives in them.

**Repo hygiene**
- No `.env.example` yet (backend or frontend) — a real list of required vars
  (`GOOGLE_CALLBACK_URL`, `GOOGLE_CLIENT_ID`/`SECRET`, `VITE_GOOGLE_CLIENT_ID`,
  etc.) has accumulated; whoever copies this shell into the next app's repo
  needs a checked-in template, not a reverse-engineering exercise.
- Confirm `frontend/.env` is gitignored the same way the backend's already is.
- A stray `// debugger` comment is still sitting in `EditUserPage.tsx`.

**Account-editing features**
- Password change flow — needs current-password re-entry; a separate form from
  general profile editing, not bundled into it.
- Email change flow — email doubles as `USERNAME_FIELD`; needs a decision on
  re-verification, session invalidation, and keeping allauth's `EmailAddress`
  table in sync before this is safe to expose.
- Avatar upload — user-provided, independent of the Google-synced `avatar_url`.
  Open question: should a user be able to override their Google avatar at all?
- "Connect your Google account" from within an authenticated session — right
  now, linking only happens automatically when a Google login's email matches
  an existing account; there's no explicit, user-initiated "link this" flow.
- `claude_api_key` write path — no endpoint exists yet. Needs to be a narrow,
  dedicated action, never bundled into the general profile PUT/PATCH (the field
  is deliberately excluded from every serializer since it would otherwise
  round-trip decrypted plaintext, defeating `EncryptedCharField`'s protection).

**Known bugs, low priority but real**
- Duplicate-email registration raises a raw `IntegrityError` instead of a clean
  `{"email": [...]}` response — `RegisterSerializer`'s own uniqueness check
  isn't catching it before the DB does.
- `SESSION_LOGIN` drift — defaults to `True` in dj-rest-auth, silently sets a
  Django session cookie alongside JWT even though the design is JWT-only.
  Should be set to `False` explicitly.
- `JWT_AUTH_COOKIE: 'access_token'` is inert — `REST_FRAMEWORK` uses header-only
  JWT auth, so this cookie gets set but is never read by anything. Dead config;
  worth removing for clarity once revisited.

**Platform-level (from the broader architecture doc, not just this repo)**
- Role-gated views beyond `EditUserPage` — `Role.ADMIN` exists on the model;
  nothing else built yet actually gates on it.
- "Log in as user" admin support tool.
- Guest accounts with a capped, shared token pool.
- Platform billing/usage-tracking mechanism for per-user Claude API usage.

**Infra — only matters once this runs as a live shared service**
- Real email — SES setup, `EMAIL_BACKEND` swap, `ACCOUNT_EMAIL_VERIFICATION`
  back to `'optional'`/`'mandatory'` (currently `'none'` — a settings toggle,
  not a removed code path, so re-enabling requires no redesign).
- `CORS_ALLOWED_ORIGINS` — needs an explicit per-subdomain list, replacing dev's
  wide-open setting.
- `JWT_AUTH_COOKIE_DOMAIN` — needs the shared parent domain (e.g. `.bornino.net`)
  for cross-subdomain SSO to actually work.
- Google Cloud Console — currently only `localhost:5173` is registered as an
  authorized origin/redirect target. Real domains need adding before deploy.
- `sync_site`'s `post_migrate` hook — written, never exercised against a second,
  real `SITE_DOMAIN` value (i.e., an actual deploy).

**Explicitly resolved — not a gap, noted so it isn't re-litigated:** multi-tab
session coordination. With `ROTATE_REFRESH_TOKENS: False`, multiple tabs each
independently calling refresh is safe — confirmed via real multi-tab testing.
`BroadcastChannel` coordination is only needed if rotation is ever turned on.

## Repo structure

```
backend/
  auth_core/         Django project (settings, urls, root config)
  auth_users/         Custom User model, serializers, views, adapters, migrations
frontend/
  src/
    components/       Shared UI (NavBar, TextField, CheckboxField, TextareaField,
                       SelectField, FieldError, SystemError, PageHeading, PageCard,
                       NavLink, UserAvatar, AuthBootstrap, ProtectedRoute)
    components/ui/     shadcn-generated primitives
    lib/              api-client, parseApiError, mapUserResponse, constants
    pages/            Welcome, Login, Register, Dashboard, EditUser,
                       GoogleCallback (public/protected)
    stores/           Zustand auth store
```
