"""
Registers User with Django admin so it's visible/editable at /admin/ — without
this, the default admin site has no way to know about our swapped-in
AUTH_USER_MODEL, since Django's built-in admin.py only auto-registers its own
default User, not a custom replacement.
"""
from django.contrib import admin
from auth_users.models import User

admin.site.register(User)
