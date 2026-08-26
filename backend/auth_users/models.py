"""
Custom User model for auth_users. Uses email as the login identifier (no
username field), stores platform-specific fields (role, Claude API key,
profile info) directly on the user rather than a separate profile table.
"""
from typing import Optional
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from encrypted_model_fields.fields import EncryptedCharField

class Role(models.TextChoices):
    """Fixed set of app-level access tiers. See User.role below for usage."""
    ADMIN = 'admin', 'Admin'
    USER = 'user', 'User'
    GUEST = 'guest', 'Guest'

class UserManager(BaseUserManager):
    """
    Creates User rows keyed on email instead of username. Required because
    AbstractBaseUser has no default manager — Django's built-in one assumes
    a username field this model doesn't have.
    """
    def create_user(self, email: str, password: Optional[str] = None, **extra_fields):
        """Normalizes email, hashes password (or marks it unusable if None), saves."""
        if not email:
            raise ValueError("Email must be provided")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self, email: str, password: Optional[str] = None, **extra_fields
    ):
        """Delegates to create_user, forcing is_staff/is_superuser/is_active True."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    """
    Platform-wide user, shared across every tenant app via the common DB.
    Login is email/password or Google OAuth (see allauth's SocialAccount,
    linked separately — no provider-specific fields live here).
    """
    
    # Primary identifier — replaces the username field entirely (see USERNAME_FIELD below)
    email = models.EmailField(unique=True)
    USERNAME_FIELD = "email"  # authenticate with email instead of username.
    REQUIRED_FIELDS = []  # prevents Django from prompting for a username

    # Tells Django to use OUR UserManager (defined above) for all user creation and
    # queries — User.objects.create(...), manage.py createsuperuser, Django admin
    # lookups, etc. all route through UserManager instead of Django's built-in
    # manager, which assumes a username field we don't have.
    objects = UserManager()

    # Required by Django's auth system and admin site — AbstractBaseUser does NOT
    # provide these on its own (AbstractUser does, but we skipped that base class).
    # is_active gates login entirely; is_staff gates Django admin access specifically.
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # "created_at" — Django's own convention for this is date_joined, kept for
    # consistency with Django admin's built-in user list display, which expects it.
    date_joined = models.DateTimeField(default=timezone.now)

    # Fixed set of app-level access tiers — see Role class above. Independent of
    # is_staff/is_superuser, which control Django ADMIN access specifically, not
    # our app's own role logic.
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)

    # Lets a user opt out of platform emails (digests, notifications) while still
    # being a normal active account — separate from is_active, which governs login.
    email_opt_out = models.BooleanField(default=False)

    # Friendly display name for greetings/admin identification — not used for login
    # (email/USERNAME_FIELD handles that). Optional since OAuth signups may not
    # always provide one immediately.
    display_name = models.CharField(max_length=100, blank=True, default='')

    # Short bio/intro, mainly so the admin (and other small-circle users, if ever
    # shown) can tell who's who beyond just an email address.
    about_me = models.TextField(blank=True, default='')

    # Each user's own Anthropic key, used by every tenant app calling Claude on their
    # behalf. Encrypted at rest — this column stores ciphertext, decrypted
    # transparently on read using FIELD_ENCRYPTION_KEY. Stored blank for guests/new
    # signups who haven't added one yet.
    claude_api_key = EncryptedCharField(max_length=255, blank=True, default='')

    def __str__(self) -> str:   # pylint: disable=invalid-str-returned
        """Admin list view, shell prompts, etc. show the email instead of 'User object (1)'."""
        return self.email
