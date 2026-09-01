from django.core.management.base import BaseCommand
from auth_users.models import User

# Every Playwright test that creates a user must use this exact prefix — the
# cleanup command has no other way to distinguish test accounts from real
# ones. This intentionally bypasses the app's own soft-delete design
# (UserViewSet.destroy() never hard-deletes a real row) — that's a product
# guarantee for real users reached through the API; this command runs
# directly against the ORM, outside the API entirely, purely to keep a
# local/dev database from accumulating throwaway E2E test accounts.
E2E_EMAIL_PREFIX = "e2e-test-"


class Command(BaseCommand):
    help = "Deletes all users created by Playwright E2E tests. Local/dev use only."

    def handle(self, *args, **options):
        deleted_count, _ = User.objects.filter(email__startswith=E2E_EMAIL_PREFIX).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} E2E test user(s)."))  # pylint: disable=no-member
