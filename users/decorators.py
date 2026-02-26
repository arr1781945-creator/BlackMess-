from django_ratelimit.decorators import ratelimit
from functools import wraps
from rest_framework.response import Response
from rest_framework import status


def api_ratelimit(group=None, key='ip', rate='5/m', method='POST'):
    """
    Rate limit decorator for DRF views
    Usage: @api_ratelimit(rate='10/m')
    """
    def decorator(fn):
        @wraps(fn)
        @ratelimit(group=group, key=key, rate=rate, method=method)
        def wrapper(self, request, *args, **kwargs):
            if getattr(request, 'limited', False):
                return Response(
                    {'error': 'Rate limit exceeded. Please try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            return fn(self, request, *args, **kwargs)
        return wrapper
    return decorator
