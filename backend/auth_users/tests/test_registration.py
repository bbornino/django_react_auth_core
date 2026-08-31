# pylint: disable=missing-function-docstring
"""
Covers CustomRegisterSerializer — the no-username signup path, the optional
name field it adds on top of dj-rest-auth's defaults, and password
validation as configured in AUTH_PASSWORD_VALIDATORS. Test names carry the
documentation here; per-method docstrings would just restate them.
"""
from django.db import IntegrityError
from rest_framework.test import APITestCase
from auth_users.models import User


class RegistrationTests(APITestCase):

    def _valid_payload(self, **overrides):
        payload = {
            "email": "new_user@example.com",
            "name": "New User",
            "password1": "a-real-password-1",
            "password2": "a-real-password-1",
        }
        payload.update(overrides)
        return payload

    def test_register_with_no_username_field_succeeds(self):
        resp = self.client.post("/auth/register/", self._valid_payload(), format="json")
        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(email="new_user@example.com")
        self.assertEqual(user.name, "New User")

    def test_register_mismatched_passwords_fails(self):
        resp = self.client.post(
            "/auth/register/",
            self._valid_payload(password2="a-different-password-1"),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_common_password_fails(self):
        resp = self.client.post(
            "/auth/register/",
            self._valid_payload(password1="password123", password2="password123"),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_password_too_short_fails(self):
        resp = self.client.post(
            "/auth/register/",
            self._valid_payload(password1="short1", password2="short1"),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_register_without_name_still_succeeds(self):
        # name = CharField(required=False, allow_blank=True) — optional by design.
        payload = self._valid_payload(email="no_name@example.com")
        del payload["name"]
        resp = self.client.post("/auth/register/", payload, format="json")
        self.assertEqual(resp.status_code, 201)
        user = User.objects.get(email="no_name@example.com")
        self.assertEqual(user.name, "")

    def test_register_duplicate_email(self):
        # KNOWN GAP (see README): RegisterSerializer's own uniqueness check
        # isn't catching this before the DB does. Django's test client
        # re-raises unhandled server exceptions rather than turning them
        # into a 500 response, so the current (broken) behavior surfaces
        # here as a raised IntegrityError, not a status code. This is a
        # deliberate trip-wire: it should fail loudly the moment the real
        # fix lands, signaling this test needs updating to assert 400.
        User.objects.create_user(email="dupe@example.com", password="pw-1234567")
        with self.assertRaises(IntegrityError):
            self.client.post(
                "/auth/register/",
                self._valid_payload(email="dupe@example.com"),
                format="json",
            )
