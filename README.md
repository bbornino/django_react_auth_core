# django_react_auth_core

The Django + React auth shell for Project Zero — the deployment blueprint powering
every tenant app on `apps.bornino.net` (Job Tracker, Garden Expert, and future apps).
Email/password and Google OAuth login, JWT-based auth with an httpOnly refresh
cookie, role-based access, and a per-user Anthropic API key slot — built once here,
copied into each tenant app's repo as its starting point.

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
- **`avatar_url` is read-only from the API's perspective**, populated from
  Google's OAuth profile (`picture` field) on every login — not just the first —
  so it self-heals if the user updates their photo upstream. Stays blank forever
  for email/password-only users; the frontend should fall back to initials or a
  default icon in that case.

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

Things surfaced during development, deliberately deferred rather than solved —
most likely picked up together whenever the microservice retrofit happens.

**Account-editing features**
- Password change flow — needs current-password re-entry; a separate form from
  general profile editing, not bundled into it.
- Email change flow — email doubles as `USERNAME_FIELD`; needs a decision on
  re-verification, session invalidation, and keeping allauth's `EmailAddress`
  table in sync before this is safe to expose.
- Avatar upload — user-provided, independent of the Google-synced `avatar_url`.
  Open question: should a user be able to override their Google avatar at all?
- `claude_api_key` write path — no endpoint exists yet. Needs to be a narrow,
  dedicated action, never bundled into the general profile PUT (the field is
  deliberately excluded from every serializer since it would otherwise
  round-trip decrypted plaintext, defeating `EncryptedCharField`'s protection).

**OAuth completion**
- Real Google Cloud Console credentials — `SOCIALACCOUNT_PROVIDERS` is still
  empty.
- `GoogleLogin.callback_url` — hardcoded to `localhost:5173`, needs to become
  `.env`-driven, matching `CORS_ALLOWED_ORIGINS` before any real deployment.
- The actual OAuth flow shape was never finalized — `@react-oauth/google`
  (popup, token posted to the backend) vs. the placeholder button's redirect-
  based approach are incompatible designs; pick one before building it out.

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
- Role-gated views — `Role.ADMIN` exists on the model; nothing built yet
  actually gates on it.
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
- `sync_site`'s `post_migrate` hook — written, never exercised against a second,
  real `SITE_DOMAIN` value (i.e., an actual deploy).

**Explicitly resolved — not a gap, noted so it isn't re-litigated:** multi-tab
session coordination. With `ROTATE_REFRESH_TOKENS: False`, multiple tabs each
independently calling refresh is safe — confirmed via real multi-tab testing.
`BroadcastChannel` coordination is only needed if rotation is ever turned on.

## Repo structure

```
backend/
  auth_core/        Django project (settings, urls, root config)
  auth_users/        Custom User model, serializers, views, migrations
frontend/
  src/
    components/      Shared UI (NavBar, TextField, FieldError, SystemError,
                      PageHeading, NavLink, AuthBootstrap, ProtectedRoute)
    components/ui/    shadcn-generated primitives
    lib/             api-client, parseApiError, mapUserResponse, constants
    pages/           Welcome, Login, Register, Dashboard (public/protected)
    stores/          Zustand auth store
```
