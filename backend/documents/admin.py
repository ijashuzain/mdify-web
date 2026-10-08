from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "owner", "views", "created_at", "expires_at")
    search_fields = ("slug", "title", "owner__email")
    list_filter = ("unlisted",)
    readonly_fields = ("edit_token_hash", "passcode_hash")
