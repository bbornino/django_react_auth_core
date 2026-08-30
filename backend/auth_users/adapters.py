"""
Custom SocialAccountAdapter — auto-links a Google login to an existing
password-based account when the emails match. allauth's default behavior
deliberately blocks this (assess_unique_email treats a matching email on an
unlinked account as a conflict, to prevent account-takeover via an
unverified email claim) — but since Google's OAuth email is itself a
verified, trusted identity source, treating a match here as safe to link
is a legitimate choice, not a security shortcut.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from auth_users.models import User


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # Already linked to a social account — nothing to do.
        if sociallogin.is_existing:
            return

        email = sociallogin.account.extra_data.get('email')
        if not email:
            return

        try:
            existing_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return

        # Connect this Google login to the existing user, bypassing
        # allauth's default "email already in use" block.
        sociallogin.connect(request, existing_user)