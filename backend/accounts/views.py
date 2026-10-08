from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from documents.models import Document
from mdify.utils import rate_limit

User = get_user_model()


def me_payload(user):
    return {
        "email": user.email,
        "doc_count": Document.objects.live().filter(owner=user).count(),
        "max_docs": settings.USER_MAX_DOCS,
        "max_days": settings.USER_MAX_DAYS,
    }


def auth_response(user, code=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": me_payload(user)}, status=code)


def read_credentials(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    return email, password


class Register(APIView):
    def post(self, request):
        rate_limit(request, "register", 10, 3600)
        email, password = read_credentials(request)
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Enter a valid email."}, status=400)
        if User.objects.filter(username=email).exists():
            return Response({"detail": "An account with this email already exists."}, status=400)
        try:
            validate_password(password)
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=400)
        user = User.objects.create_user(username=email, email=email, password=password)
        return auth_response(user, status.HTTP_201_CREATED)


class Login(APIView):
    def post(self, request):
        rate_limit(request, "login", 20, 600)
        email, password = read_credentials(request)
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({"detail": "Incorrect email or password."}, status=400)
        return auth_response(user)


class Logout(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class Me(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(me_payload(request.user))
