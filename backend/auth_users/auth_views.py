"""
Custom auth views for auth_users. Login, logout, token refresh, and
password-based registration all come from dj-rest-auth's own built-in
views — wired via include() in urls.py, not reimplemented here. The one
addition this file provides is Google OAuth login/registration, which
dj-rest-auth can't supply on its own since it needs app-specific wiring
to the Google adapter.
"""

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView


class GoogleLogin(SocialLoginView):
    """
    Handles both login AND first-time registration for Google OAuth in one
    endpoint — dj-rest-auth/allauth create the User (via our UserManager)
    automatically on first login, so there's no separate "register with
    Google" endpoint needed. Frontend POSTs the Google access token here.
    """
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    # TODO: move to env-driven value, matches CORS_ALLOWED_ORIGINS for prod
    callback_url = "http://localhost:5173"
