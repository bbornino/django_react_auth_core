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
from django.contrib.auth import password_validation
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import environ
env = environ.Env()


@api_view(['GET'])
@permission_classes([AllowAny])
def password_rules(_request):
    """
    Returns the currently configured AUTH_PASSWORD_VALIDATORS as human-readable
    strings, so the frontend can display real password rules instead of a
    hardcoded guess that could drift out of sync with settings.py.
    """
    return Response(password_validation.password_validators_help_texts())


class GoogleLogin(SocialLoginView):
    """
    Handles both login AND first-time registration for Google OAuth in one
    endpoint — dj-rest-auth/allauth create the User (via our UserManager)
    automatically on first login, so there's no separate "register with
    Google" endpoint needed. Frontend POSTs the Google access token here.
    """
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    callback_url = env('GOOGLE_CALLBACK_URL', default='http://localhost:5173/auth/google/callback')
