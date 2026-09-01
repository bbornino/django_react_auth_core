# pylint: disable=missing-function-docstring
"""
Covers CustomSocialAccountAdapter.pre_social_login — the email-merge and
avatar-sync logic that has no coverage anywhere else. sociallogin is mocked
rather than constructed as a real allauth SocialLogin: the adapter only ever
touches sociallogin.is_existing, sociallogin.account.extra_data,
sociallogin.user, and sociallogin.connect(...), so a double matching exactly
that surface tests our logic in isolation, without needing to also exercise
allauth's own internal lookup()/is_existing machinery.
"""
from unittest.mock import MagicMock
from django.test import TestCase
from auth_users.models import User
from auth_users.adapters import CustomSocialAccountAdapter


def make_sociallogin(is_existing, user, picture="", email=None):
    sociallogin = MagicMock()
    sociallogin.is_existing = is_existing
    sociallogin.user = user
    extra_data = {"picture": picture}
    if email is not None:
        extra_data["email"] = email
    sociallogin.account.extra_data = extra_data
    return sociallogin


class PreSocialLoginTests(TestCase):

    def setUp(self):
        self.adapter = CustomSocialAccountAdapter()
        self.request = MagicMock()

    # -- repeat login on an already-linked SocialAccount ------------------

    def test_existing_linked_user_gets_avatar_synced_and_saved(self):
        # The specific bug this locks in: a repeat login never triggers a
        # user.save() anywhere else in allauth's normal flow, so this branch
        # must persist the change itself rather than relying on downstream
        # code to do it.
        user = User.objects.create_user(email="linked@example.com", password="pw-1234567")
        sociallogin = make_sociallogin(
            is_existing=True, user=user, picture="https://example.com/new.jpg"
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        user.refresh_from_db()
        self.assertEqual(user.avatar_url, "https://example.com/new.jpg")

    def test_existing_linked_user_with_unchanged_picture_stays_correct(self):
        user = User.objects.create_user(
            email="linked@example.com", password="pw-1234567",
            avatar_url="https://example.com/same.jpg",
        )
        sociallogin = make_sociallogin(
            is_existing=True, user=user, picture="https://example.com/same.jpg"
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        user.refresh_from_db()
        self.assertEqual(user.avatar_url, "https://example.com/same.jpg")

    def test_existing_linked_user_never_calls_connect(self):
        # connect() is only for first-time email-based linking — calling it
        # on an already-linked account would be redundant, and possibly wrong.
        user = User.objects.create_user(email="linked@example.com", password="pw-1234567")
        sociallogin = make_sociallogin(is_existing=True, user=user, picture="")

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_not_called()

    # -- new social login, no existing SocialAccount link yet -------------

    def test_new_login_with_matching_email_connects_to_existing_user(self):
        existing_user = User.objects.create_user(
            email="already-registered@example.com", password="pw-1234567"
        )
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email="already-registered@example.com"),  # unsaved, Google-built instance
            picture="https://example.com/pic.jpg",
            email="already-registered@example.com",
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_called_once_with(self.request, existing_user)

    def test_new_login_with_matching_email_syncs_avatar_before_connecting(self):
        existing_user = User.objects.create_user(
            email="already-registered@example.com", password="pw-1234567"
        )
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email="already-registered@example.com"),
            picture="https://example.com/pic.jpg",
            email="already-registered@example.com",
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        existing_user.refresh_from_db()
        self.assertEqual(existing_user.avatar_url, "https://example.com/pic.jpg")

    def test_new_login_with_matching_email_case_insensitive(self):
        # email__iexact — a Google account's email casing shouldn't matter
        # for finding the match.
        existing_user = User.objects.create_user(
            email="Already-Registered@Example.com", password="pw-1234567"
        )
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email="already-registered@example.com"),
            picture="https://example.com/pic.jpg",
            email="already-registered@example.com",
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_called_once_with(self.request, existing_user)

    def test_new_login_with_no_matching_email_does_not_connect(self):
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email="brand-new@example.com"),
            picture="https://example.com/pic.jpg",
            email="brand-new@example.com",
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_not_called()

    def test_new_login_with_no_email_in_profile_data_does_not_crash_or_connect(self):
        # Real-world edge case: Google's response is missing the email key
        # entirely (scope not granted, provider quirk, etc.) — must not
        # raise, and must not attempt to connect anything.
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email=""),
            picture="https://example.com/pic.jpg",
            email=None,
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_not_called()

    def test_new_login_with_no_picture_still_connects_on_email_match(self):
        # Avatar sync and email-merge are independent — a Google account
        # with no profile picture should still link correctly.
        existing_user = User.objects.create_user(
            email="already-registered@example.com", password="pw-1234567"
        )
        sociallogin = make_sociallogin(
            is_existing=False,
            user=User(email="already-registered@example.com"),
            picture="",
            email="already-registered@example.com",
        )

        self.adapter.pre_social_login(self.request, sociallogin)

        sociallogin.connect.assert_called_once_with(self.request, existing_user)
        existing_user.refresh_from_db()
        self.assertEqual(existing_user.avatar_url, "")
