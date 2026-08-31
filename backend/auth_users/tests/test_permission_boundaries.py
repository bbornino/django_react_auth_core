# pylint: disable=missing-function-docstring
"""
Two cross-cutting boundaries that don't belong to any one permission tier:
(1) every endpoint requires authentication at all, and (2) a non-admin can
never reach another user's data, including confirming a 404 response
doesn't accidentally leak anything about the record it's hiding.
"""
from rest_framework.test import APITestCase
from auth_users.models import User, Role


class AuthenticationRequiredTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="test_user@example.com", password="pw-1234567", role=Role.USER,
        )

    def test_anonymous_cannot_list_users(self):
        resp = self.client.get("/users/")
        self.assertEqual(resp.status_code, 401)

    def test_anonymous_cannot_retrieve_user(self):
        resp = self.client.get(f"/users/{self.user.id}/")
        self.assertEqual(resp.status_code, 401)

    def test_anonymous_cannot_update_user(self):
        resp = self.client.patch(
            f"/users/{self.user.id}/", {"name": "Joe Test"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    def test_anonymous_cannot_access_me(self):
        resp = self.client.get("/users/me/")
        self.assertEqual(resp.status_code, 401)


class CrossUserAccessTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="test_user@example.com", password="pw-1234567", role=Role.USER,
        )
        self.other_user = User.objects.create_user(
            email="test_other@example.com", password="pw-2345678", role=Role.USER,
        )

    def test_non_admin_cannot_retrieve_other_user(self):
        # get_queryset() scopes non-admins to themselves only, so another
        # user's id isn't in the queryset at all — 404, not 403, so a
        # probing request can't distinguish "not yours" from "doesn't exist."
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/users/{self.other_user.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_non_admin_retrieve_of_other_user_leaks_no_field_data(self):
        # Belt-and-suspenders on top of the 404 above: confirm the response
        # body itself carries none of the other user's actual data, not
        # just the right status code.
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(f"/users/{self.other_user.id}/")
        self.assertEqual(resp.status_code, 404)
        self.assertNotIn(self.other_user.email, str(resp.data))

    def test_self_cannot_update_other_users_profile_fields(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(
            f"/users/{self.other_user.id}/",
            {"about_me": "should never land"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)
        self.other_user.refresh_from_db()
        self.assertNotEqual(self.other_user.about_me, "should never land")
