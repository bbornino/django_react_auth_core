# pylint: disable=missing-function-docstring
from rest_framework.test import APITestCase
from auth_users.models import User, Role


class AdminUserManagementTests(APITestCase):
    """
    Covers the admin-only surface of UserViewSet: unrestricted list/retrieve,
    writable role/is_active/is_staff via UserAdminSerializer, and the
    soft-delete-only destroy() action. Self-service behavior for a non-admin
    lives in test_user_views.py — both files exercise the same UserViewSet,
    split by permission tier rather than by view.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="test_user@example.com", password="pw-1234567", role=Role.USER,
        )
        self.other_user = User.objects.create_user(
            email="test_other@example.com", password="pw-2345678", role=Role.USER,
        )
        self.admin = User.objects.create_user(
            email="test_admin@example.com", password="pw-9876543", role=Role.ADMIN,
        )

    # -- unrestricted list/retrieve --------------------------------------

    def test_admin_can_list_all_users(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/users/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 3)

    def test_admin_can_retrieve_any_user(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f"/users/{self.user.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["id"], self.user.id)

    def test_admin_retrieve_uses_admin_serializer(self):
        # UserAdminSerializer exposes is_superuser/last_login — fields the
        # self-service UserDetailSerializer never includes at all.
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f"/users/{self.user.id}/")
        self.assertIn("is_superuser", resp.data)
        self.assertIn("last_login", resp.data)

    def test_admin_view_never_exposes_password_or_api_key(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(f"/users/{self.user.id}/")
        self.assertNotIn("password", resp.data)
        self.assertNotIn("claude_api_key", resp.data)

    # -- admin can write fields a self-user cannot -----------------------

    def test_admin_can_update_other_users_profile_fields(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"about_me": "set by an admin"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.about_me, "set by an admin")

    def test_admin_can_change_another_users_role(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"role": "admin"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, Role.ADMIN)

    def test_admin_can_set_is_staff_and_is_active(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            f"/users/{self.user.id}/",
            {"is_staff": True, "is_active": False},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)
        self.assertFalse(self.user.is_active)

    def test_admin_editing_self_via_detail_endpoint_also_uses_admin_serializer(self):
        # get_serializer_class() branches on the requesting user's role, not
        # on whose row is being touched — an admin editing their OWN row
        # through the general detail endpoint still gets admin-level access,
        # same as editing anyone else's.
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(
            f"/users/{self.admin.id}/", {"is_staff": True}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_staff)

    # -- destroy(): admin-only soft delete --------------------------------

    def test_non_admin_cannot_deactivate_own_account(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.delete(f"/users/{self.user.id}/")
        self.assertEqual(resp.status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_non_admin_cannot_deactivate_other_user(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.delete(f"/users/{self.other_user.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_non_admin_delete_of_nonexistent_user_is_still_403_not_404(self):
        # destroy() checks role BEFORE calling get_object(), so a non-admin
        # gets the same 403 whether the id is real, someone else's, or
        # doesn't exist at all — the role check short-circuits first.
        self.client.force_authenticate(user=self.user)
        resp = self.client.delete("/users/999999/")
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_deactivate_a_user(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f"/users/{self.user.id}/")
        self.assertEqual(resp.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_destroy_is_a_soft_delete_not_a_real_one(self):
        self.client.force_authenticate(user=self.admin)
        self.client.delete(f"/users/{self.user.id}/")
        self.assertTrue(User.objects.filter(pk=self.user.id).exists())

    def test_admin_delete_of_nonexistent_user_is_404(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete("/users/999999/")
        self.assertEqual(resp.status_code, 404)
