"""
DRF serializers for the auth_users app. Three classes, one per view: a thin
list serializer, a self-view detail serializer (limited write access), and
an admin-only serializer (full write access). All three deliberately exclude
password and claude_api_key — password should never leave the server, and
claude_api_key would return decrypted plaintext if serialized, defeating
EncryptedCharField's protection. See users_views.py's get_serializer_class
for how requests get routed to the right one.
"""
from rest_framework import serializers
from auth_users.models import User
from dj_rest_auth.registration.serializers import RegisterSerializer

class CustomRegisterSerializer(RegisterSerializer):
    """
    Drops the username field entirely — this User model has none by design
    (email-only login). Settings alone can't suppress it: allauth's own system
    check forbids listing 'username' in ACCOUNT_SIGNUP_FIELDS when
    ACCOUNT_USER_MODEL_USERNAME_FIELD is None, but dj-rest-auth's base
    RegisterSerializer hardcodes the field regardless. Overriding it here is
    the only way to remove it from validation without conflicting with either.
    Adds `name`, since neither allauth nor dj-rest-auth
    know about it — this is a platform-specific field, not something the base
    RegisterSerializer can be told about via settings. custom_signup() is
    dj-rest-auth's own extension point for exactly this: it runs right after
    user.save() inside RegisterSerializer.save(), so this is the correct place
    to persist any field the base serializer has no built-in concept of.
    """
    username = None
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def custom_signup(self, request, user):
        user.name = self.validated_data.get('name','')
        user.save(update_fields=['name'])

class UserListSerializer(serializers.ModelSerializer):
    """Minimal fields for list views — enough to identify a user in a table
    or dropdown without exposing profile detail or sensitive fields."""

    class Meta:
        """Maps to the User model; only id/email/name/is_active exposed."""
        model = User
        fields = ["id", "email", "name", "is_active", "avatar_url"]

class UserDetailSerializer(serializers.ModelSerializer):
    """
    Excludes password and claude_api_key entirely — password should never
    leave the server, and claude_api_key would return decrypted plaintext
    if serialized, defeating the EncryptedCharField protection on that field.
    role/is_staff/is_superuser are read-only here to prevent self-promotion;
    admin-only role changes should go through a separate, admin-gated action.
    """

    class Meta:
        """Maps to the User model; only exposing user editable fields."""
        model = User
        fields = [
            "id", "email", "name", "about_me", "role",
            "email_opt_out", "is_active", "is_staff", "date_joined", "dark_mode", "avatar_url"
        ]
        read_only_fields = ["role", "is_staff", "is_active", "date_joined", "avatar_url"]

class UserAdminSerializer(serializers.ModelSerializer):
    """
    Full-access serializer for admin use only — role, is_staff, is_active are
    writable here since only an admin-gated view should ever use this class.
    Still excludes password (never serializes) and claude_api_key (would
    return decrypted plaintext, defeating EncryptedCharField's protection).
    """
    class Meta:
        """Maps to the User model; only exposing admin editable fields."""
        model = User
        fields = [
            "id", "email", "name", "about_me", "role",
            "email_opt_out", "is_active", "is_staff", "is_superuser",
            "date_joined", "last_login", "avatar_url", "dark_mode"
        ]
