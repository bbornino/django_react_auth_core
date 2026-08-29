"""
Customized AppConfig for auth_users. Beyond the standard app registration,
this wires a post_migrate hook (sync_site) that keeps django.contrib.sites'
one Site row in sync with SITE_DOMAIN/SITE_NAME from .env — see the
SITE_DOMAIN comment in settings.py for why that's needed.

Site/settings are imported inside sync_site, not at module level, because
apps.py's ready() runs during Django's app-loading phase, before every app's
models are guaranteed to be registered. Importing Site (or touching settings)
at the top of this file risks AppRegistryNotReady errors — deferring the
import until the function actually runs (well after migrate) sidesteps that.
"""
from django.apps import AppConfig
from django.db.models.signals import post_migrate


def sync_site(sender, **_kwargs):       # pylint: disable=unused-argument
    """After every migrate, update the one Site row to match .env's
    SITE_DOMAIN/SITE_NAME — keeps allauth's redirect URLs correct per
    environment without a manual shell command on every deploy."""
    from django.conf import settings # pylint: disable=import-outside-toplevel
    from django.contrib.sites.models import Site # pylint: disable=import-outside-toplevel
    Site.objects.update_or_create(
        id=settings.SITE_ID,
        defaults={'domain': settings.SITE_DOMAIN, 'name': settings.SITE_NAME},
    )


class AuthUsersConfig(AppConfig):
    """Standard app config for auth_users, plus the sync_site hook registered
    in ready() so it runs automatically after every migrate."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auth_users'

    def ready(self):
        post_migrate.connect(sync_site, sender=self)
