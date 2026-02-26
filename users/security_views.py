from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from axes.models import AccessLog, AccessAttempt
from django.utils import timezone
from datetime import timedelta


class SecurityStatsView(APIView):
    """Security statistics (admin only)"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        # Get failed login attempts (last 24 hours)
        yesterday = timezone.now() - timedelta(hours=24)
        
        recent_attempts = AccessAttempt.objects.filter(
            attempt_time__gte=yesterday
        ).count()
        
        recent_logs = AccessLog.objects.filter(
            attempt_time__gte=yesterday,
            logout_time__isnull=True
        ).count()
        
        # Currently locked out attempts
        locked_attempts = AccessAttempt.objects.filter(
            attempt_time__gte=timezone.now() - timedelta(hours=1)
        ).values('username', 'ip_address').annotate(
            failures=Count('id')
        ).filter(failures__gte=5)
        
        return Response({
            'failed_attempts_24h': recent_attempts,
            'active_sessions': recent_logs,
            'locked_accounts': list(locked_attempts),
            'total_locked': len(locked_attempts),
        })


class UnblockUserView(APIView):
    """Unblock a user/IP (admin only)"""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        username = request.data.get('username')
        ip_address = request.data.get('ip_address')
        
        if not username and not ip_address:
            return Response(
                {'error': 'Username or IP address required'}, 
                status=400
            )
        
        # Reset axes attempts
        if username:
            AccessAttempt.objects.filter(username=username).delete()
            AccessLog.objects.filter(username=username).delete()
        
        if ip_address:
            AccessAttempt.objects.filter(ip_address=ip_address).delete()
            AccessLog.objects.filter(ip_address=ip_address).delete()
        
        return Response({
            'message': f'Successfully unblocked',
            'username': username,
            'ip_address': ip_address
        })


from django.db.models import Count
