from django.core.management.base import BaseCommand
from auth_users.models import User, Role

# Locked to the same prefix e2e_cleanup.py uses — this command deliberately
# refuses to promote anything that isn't an obvious throwaway test account,
# so a typo in a Playwright test can't accidentally grant admin to a real user.
E2E_EMAIL_PREFIX = "e2e-test-"


class Command(BaseCommand):
    help = "Promotes an E2E test user (email must start with 'e2e-test-') to admin. Local/dev use only."

    def add_arguments(self, parser):
        parser.add_argument("email", type=str)

    def handle(self, *args, **options):
        email = options["email"]
        if not email.startswith(E2E_EMAIL_PREFIX):
            self.stderr.write(self.style.ERROR(  # pylint: disable=no-member
                f"Refusing to promote '{email}' — only {E2E_EMAIL_PREFIX}* accounts "
                "can be promoted by this command."
            ))
            return

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stderr.write(self.style.ERROR(f"No user found with email {email}"))  # pylint: disable=no-member
            return

        user.role = Role.ADMIN
        user.save(update_fields=["role"])
        self.stdout.write(self.style.SUCCESS(f"Promoted {email} to admin."))  # pylint: disable=no-member
