import secrets
import string

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone

ALPHABET = string.ascii_letters + string.digits


def new_slug():
    return "".join(secrets.choice(ALPHABET) for _ in range(8))


class DocumentQuerySet(models.QuerySet):
    def live(self):
        return self.filter(expires_at__gt=timezone.now())

    def expired(self):
        return self.filter(expires_at__lte=timezone.now())


class Document(models.Model):
    slug = models.CharField(max_length=12, unique=True, default=new_slug)
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="documents"
    )
    # Anonymous ownership: browser-generated id (quota) + secret edit token (editing).
    anon_id = models.CharField(max_length=64, blank=True, db_index=True)
    edit_token_hash = models.CharField(max_length=128, blank=True)
    passcode_hash = models.CharField(max_length=128, blank=True)
    unlisted = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(db_index=True)

    objects = DocumentQuerySet.as_manager()

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.slug} {self.title}"

    def set_passcode(self, raw):
        self.passcode_hash = make_password(raw) if raw else ""

    def check_passcode(self, raw):
        return not self.passcode_hash or (bool(raw) and check_password(raw, self.passcode_hash))

    def issue_edit_token(self):
        token = secrets.token_urlsafe(24)
        self.edit_token_hash = make_password(token)
        return token

    def check_edit_token(self, raw):
        return bool(raw and self.edit_token_hash) and check_password(raw, self.edit_token_hash)
