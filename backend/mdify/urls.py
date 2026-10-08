from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from accounts import views as accounts
from documents import views as documents

urlpatterns = [
    path("api/health/", lambda request: JsonResponse({"ok": True})),
    path("api/auth/register/", accounts.Register.as_view()),
    path("api/auth/login/", accounts.Login.as_view()),
    path("api/auth/logout/", accounts.Logout.as_view()),
    path("api/auth/me/", accounts.Me.as_view()),
    path("api/docs/", documents.DocumentListCreate.as_view()),
    path("api/docs/claim/", documents.ClaimDocuments.as_view()),
    path("api/docs/<str:slug>/", documents.DocumentDetail.as_view()),
    path("api/docs/<str:slug>/raw/", documents.DocumentRaw.as_view()),
    path("admin/", admin.site.urls),
]
