import re
from datetime import timedelta

from django.conf import settings
from django.db.models import F
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from mdify.utils import rate_limit

from .models import Document

EXPIRY_DAYS = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}
ANON_ID_RE = re.compile(r"^[A-Za-z0-9-]{16,64}$")


def derive_title(content):
    for line in content.splitlines():
        line = line.strip().lstrip("#").strip()
        if line:
            return line[:120]
    return "Untitled"


def limits_for(user):
    if user.is_authenticated:
        return settings.USER_MAX_DOCS, settings.USER_MAX_DAYS
    return settings.ANON_MAX_DOCS, settings.ANON_MAX_DAYS


def resolve_expiry(value, user):
    _, max_days = limits_for(user)
    default = "90d" if user.is_authenticated else "7d"
    days = EXPIRY_DAYS.get(value or default)
    if days is None:
        return None, "Invalid expiry."
    if days > max_days:
        return None, f"Guests can keep documents for up to {max_days} days. Sign in for longer storage."
    return timezone.now() + timedelta(days=days), None


def validate_content(content):
    if not isinstance(content, str) or not content.strip():
        return "Document is empty."
    if len(content.encode()) > settings.MAX_DOC_BYTES:
        return "Document is too large (max 512 KB)."
    return None


def can_edit(request, doc):
    if request.user.is_authenticated and doc.owner_id == request.user.id:
        return True
    return doc.owner_id is None and doc.check_edit_token(request.headers.get("X-Edit-Token"))


def serialize(doc, *, editable, full=True):
    data = {
        "id": doc.slug,
        "title": doc.title,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "expires_at": doc.expires_at,
        "has_passcode": bool(doc.passcode_hash),
        "unlisted": doc.unlisted,
        "views": doc.views,
        "can_edit": editable,
    }
    if full:
        data["content"] = doc.content
    return data


def error(message, http_status=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({"detail": message, **extra}, status=http_status)


class DocumentListCreate(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return error("Sign in to list documents.", status.HTTP_401_UNAUTHORIZED)
        docs = Document.objects.live().filter(owner=request.user)
        return Response([serialize(d, editable=True, full=False) for d in docs])

    def post(self, request):
        user = request.user
        rate_limit(request, "create", 60 if user.is_authenticated else 30, 3600)
        content = request.data.get("content")
        if msg := validate_content(content):
            return error(msg)
        expires_at, msg = resolve_expiry(request.data.get("expiry"), user)
        if msg:
            return error(msg)

        max_docs, _ = limits_for(user)
        doc = Document(content=content, title=derive_title(content), expires_at=expires_at)
        doc.unlisted = bool(request.data.get("unlisted"))
        doc.set_passcode((request.data.get("passcode") or "").strip())

        if user.is_authenticated:
            if Document.objects.live().filter(owner=user).count() >= max_docs:
                return error(f"You have reached the limit of {max_docs} documents. Delete some to publish more.", status.HTTP_403_FORBIDDEN)
            doc.owner = user
            edit_token = None
        else:
            anon_id = request.headers.get("X-Anon-Id", "")
            if not ANON_ID_RE.match(anon_id):
                return error("Missing browser id.")
            if Document.objects.live().filter(owner=None, anon_id=anon_id).count() >= max_docs:
                return error(
                    f"Guests can keep up to {max_docs} documents. Sign in to store up to {settings.USER_MAX_DOCS}.",
                    status.HTTP_403_FORBIDDEN,
                    code="anon_limit",
                )
            doc.anon_id = anon_id
            edit_token = doc.issue_edit_token()

        doc.save()
        data = serialize(doc, editable=True)
        if edit_token:
            data["edit_token"] = edit_token
        return Response(data, status=status.HTTP_201_CREATED)


class DocumentDetail(APIView):
    def get_doc(self, slug):
        return get_object_or_404(Document.objects.live(), slug=slug)

    def get(self, request, slug):
        doc = self.get_doc(slug)
        editable = can_edit(request, doc)
        if not editable:
            rate_limit(request, "view", 600, 600)
            passcode = request.headers.get("X-Passcode", "")
            if not doc.check_passcode(passcode):
                if passcode:
                    rate_limit(request, f"passcode:{slug}", 10, 600)
                return error("Passcode required.", status.HTTP_401_UNAUTHORIZED, code="passcode_required", has_passcode=True)
            Document.objects.filter(pk=doc.pk).update(views=F("views") + 1)
        return Response(serialize(doc, editable=editable))

    def patch(self, request, slug):
        doc = self.get_doc(slug)
        if not can_edit(request, doc):
            return error("You cannot edit this document.", status.HTTP_403_FORBIDDEN)
        if "content" in request.data:
            content = request.data["content"]
            if msg := validate_content(content):
                return error(msg)
            doc.content = content
            doc.title = derive_title(content)
        if request.data.get("expiry"):
            owner = doc.owner if doc.owner_id else request.user
            expires_at, msg = resolve_expiry(request.data["expiry"], owner)
            if msg:
                return error(msg)
            doc.expires_at = expires_at
        if "passcode" in request.data and request.data["passcode"] is not None:
            doc.set_passcode(str(request.data["passcode"]).strip())
        if "unlisted" in request.data:
            doc.unlisted = bool(request.data["unlisted"])
        doc.save()
        return Response(serialize(doc, editable=True))

    def delete(self, request, slug):
        doc = self.get_doc(slug)
        if not can_edit(request, doc):
            return error("You cannot delete this document.", status.HTTP_403_FORBIDDEN)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentRaw(APIView):
    def get(self, request, slug):
        doc = get_object_or_404(Document.objects.live(), slug=slug)
        passcode = request.headers.get("X-Passcode") or request.query_params.get("passcode", "")
        if not can_edit(request, doc) and not doc.check_passcode(passcode):
            if passcode:
                rate_limit(request, f"passcode:{slug}", 10, 600)
            return HttpResponse("Passcode required.\n", status=401, content_type="text/plain; charset=utf-8")
        response = HttpResponse(doc.content, content_type="text/markdown; charset=utf-8")
        if request.query_params.get("download"):
            response["Content-Disposition"] = f'attachment; filename="{doc.slug}.md"'
        return response


class ClaimDocuments(APIView):
    """Move guest documents (proved by their edit tokens) into the signed-in account."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        items = request.data.get("items") or []
        if not isinstance(items, list):
            return error("Invalid items.")
        live = Document.objects.live()
        room = settings.USER_MAX_DOCS - live.filter(owner=request.user).count()
        claimed = []
        for item in items[:50]:
            if room <= 0:
                break
            if not isinstance(item, dict):
                continue
            doc = live.filter(owner=None, slug=item.get("id")).first()
            if doc and doc.check_edit_token(item.get("edit_token")):
                doc.owner = request.user
                doc.anon_id = ""
                doc.edit_token_hash = ""
                doc.save(update_fields=["owner", "anon_id", "edit_token_hash", "updated_at"])
                claimed.append(doc.slug)
                room -= 1
        return Response({"claimed": claimed})
