from django.core.management.base import BaseCommand

from documents.models import Document


class Command(BaseCommand):
    help = "Delete documents whose expiry time has passed."

    def handle(self, *args, **options):
        deleted, _ = Document.objects.expired().delete()
        self.stdout.write(f"Purged {deleted} expired document(s).")
