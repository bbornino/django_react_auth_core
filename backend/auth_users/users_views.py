"""
DRF views for the auth_users app — everything under /users/ except account
creation (that lives in registration/OAuth, not here). One ViewSet built
from explicit mixins (no CreateModelMixin) backs list/retrieve/update/
soft-delete, with visibility and serializer choice both scoped by role:
non-admins see and edit only themselves, admins see and edit everyone.
"""
import logging

from rest_framework import viewsets
from rest_framework import mixins
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from auth_users.models import User, Role
from auth_users.serializers import UserListSerializer, UserAdminSerializer, UserDetailSerializer

logger = logging.getLogger(__name__)

class UserViewSet(mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,):
    """
    No CreateModelMixin — user creation only happens through registration
    (dj-rest-auth) or Google OAuth, never a direct POST here.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Scope visibility to the requesting user. Without this, any authenticated
        user could list/retrieve every other user's profile and Claude API key.
        Admins retain full visibility; everyone else sees only their own record.
        """
        user = self.request.user
        qs = User.objects.all()
        if getattr(user, "role", None) == Role.ADMIN:
            return qs
        if not (user and user.is_authenticated):
            return qs.none()
        return qs.filter(id=user.id)

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        if getattr(self.request.user, 'role', None) == Role.ADMIN:
            return UserAdminSerializer
        return UserDetailSerializer

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """GET /users/me/ — return the requesting user's own profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @me.mapping.put
    def update_me(self, request):
        """PUT /users/me/ — update the requesting user's own profile."""
        serializer = self.get_serializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Soft-delete only — DELETE never removes a row, it flips is_active=False.
        Admin-only: a user can't deactivate their own or anyone else's account
        through this endpoint (self-deactivation, if ever needed, would be its
        own deliberate /me action, not this one).
        """
        if getattr(request.user, "role", None) != Role.ADMIN:
            raise PermissionDenied("Only admins can deactivate accounts.")
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)
