# pylint: disable=missing-function-docstring
"""
Covers what an authenticated non-admin can do to their OWN record: list/me
scoping, field-level exposure, and which fields they can vs. can't write on
themselves. Cross-user access and anonymous access live in
test_permission_boundaries.py instead — this file stays scoped to "self."
"""
from rest_framework.test import APITestCase
from auth_users.models import User, Role


class SelfServiceTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="test_user@example.com", password="pw-1234567", role=Role.USER,
        )
        self.admin = User.objects.create_user(
            email="test_admin@example.com", password="pw-9876543", role=Role.ADMIN,
        )

    # -- list/me scoping ---------------------------------------------------

    def test_authenticated_non_admin_can_list_users(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/users/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["id"], self.user.id)

    def test_non_admin_can_retrieve_self(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/users/{self.user.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id"], self.user.id)

    def test_list_serializer_excludes_sensitive_and_admin_fields(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/users/")
        row = resp.data[0]
        for field in ("password", "claude_api_key", "about_me", "role", "is_staff"):
            self.assertNotIn(field, row)

    def test_me_returns_own_profile(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/users/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id"], self.user.id)
        self.assertEqual(resp.data["email"], self.user.email)

    def test_me_never_exposes_password_or_api_key(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/users/me/")
        self.assertNotIn("password", resp.data)
        self.assertNotIn("claude_api_key", resp.data)

    def test_me_put_updates_own_profile(self):
        # /me/ is wired via @me.mapping.put — PUT only, not PATCH — so the
        # full payload is required, including the current (unchanged) email.
        self.client.force_authenticate(user=self.user)
        payload = {
            "email": self.user.email,
            "name": "Updated Name",
            "about_me": "hello",
            "email_opt_out": False,
            "dark_mode": True,
        }
        resp = self.client.put("/users/me/", payload, format="json")
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Updated Name")
        self.assertTrue(self.user.dark_mode)

    # -- self-write: which fields actually persist ------------------------

    def test_self_can_update_own_about_me(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"about_me": "a real bio"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.about_me, "a real bio")

    def test_self_cannot_promote_own_role(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"role": "admin"}, format="json"
        )
        # role is read_only on UserDetailSerializer — DRF silently strips it
        # rather than erroring, so the request itself still succeeds...
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        # ...but the actual stored value never changes.
        self.assertEqual(self.user.role, Role.USER)

    def test_self_cannot_set_own_is_staff(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"is_staff": True}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)

    def test_avatar_url_is_read_only_for_self(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.user.id}/",
            {"avatar_url": "https://example.com/fake.jpg"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_url, "")

    def test_self_can_currently_change_own_email_via_detail_patch(self):
        # NOTABLE FINDING, not yet in the README's bin list: 'email' has no
        # read_only_fields entry on UserDetailSerializer, so a self-user's
        # PATCH to their own detail endpoint can currently change their
        # login email — despite the README listing "email change flow" as
        # deferred (no re-verification, no session-invalidation handling
        # built yet). Deliberate trip-wire: should go red the moment
        # 'email' gets locked down, as a signal this test needs updating.
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"email": "changed@example.com"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "changed@example.com")
