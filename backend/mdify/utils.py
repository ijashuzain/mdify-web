import os

from django.core.cache import cache
from django.utils.crypto import constant_time_compare
from rest_framework.exceptions import Throttled


def client_ip(request):
    # Requests relayed by the Cloudflare Pages function carry the visitor's IP,
    # trusted only when they also carry the shared proxy secret.
    secret = os.environ.get("PROXY_SECRET")
    if secret and constant_time_compare(request.META.get("HTTP_X_MDIFY_PROXY", ""), secret):
        forwarded = request.META.get("HTTP_X_CLIENT_IP", "")
        if forwarded:
            return forwarded
    return request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR", "")


def rate_limit(request, scope, limit, window_seconds):
    """Fixed-window counter per client IP. Raises 429 once `limit` is exceeded."""
    key = f"rl:{scope}:{client_ip(request)}"
    if cache.add(key, 1, window_seconds):
        return
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, window_seconds)
        return
    if count > limit:
        raise Throttled(detail="Too many requests. Try again later.")
