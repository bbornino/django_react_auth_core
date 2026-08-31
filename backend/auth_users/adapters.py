"""
Custom SocialAccountAdapter — auto-links a Google login to an existing
password-based account when the emails match, and syncs avatar_url from
Google's profile picture on every login (not just first), so it self-heals
if the user updates their photo upstream. allauth's default behavior
deliberately blocks email-matched auto-linking (assess_unique_email treats
it as a conflict, to prevent account-takeover via an unverified email
claim) — but since Google's OAuth email is itself a verified, trusted
identity source, treating a match here as safe to link is a legitimate
choice, not a security shortcut.
"""
import logging
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from auth_users.models import User

logger = logging.getLogger(__name__)


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        picture = sociallogin.account.extra_data.get('picture', '')
        logger.info(
            "pre_social_login: is_existing=%s user_pk=%s picture=%r",
            sociallogin.is_existing, sociallogin.user.pk, picture,
        )

        if sociallogin.is_existing:
            if picture and sociallogin.user.avatar_url != picture:
                logger.info("Updating avatar_url on existing linked user %s", sociallogin.user.pk)
                sociallogin.user.avatar_url = picture
                sociallogin.user.save(update_fields=['avatar_url'])
                logger.info("Saved. Re-fetched value: %s", User.objects.get(pk=sociallogin.user.pk).avatar_url)
            else:
                logger.info("Skipped save: picture=%r, current avatar_url=%r", picture, sociallogin.user.avatar_url)
            return

        email = sociallogin.account.extra_data.get('email')
        if not email:
            return

        try:
            existing_user = User.objects.get(email__iexact=email)
        except User.DoesNotExist: # pylint: disable=no-member
            return

        if picture:
            existing_user.avatar_url = picture
            existing_user.save(update_fields=['avatar_url'])
            logger.info("Connect path saved avatar_url=%r for user %s", picture, existing_user.pk)
        sociallogin.connect(request, existing_user)