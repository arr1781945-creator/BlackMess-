from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from .models import AuditLog, LoginHistory, UserRole, Role
from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer
)
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class UserRegistrationView(APIView):
    """API endpoint for user registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Assign default 'user' role
                    try:
                        user_role = Role.objects.get(name='user')
                        UserRole.objects.create(user=user, role=user_role)
                    except Role.DoesNotExist:
                        pass
                    
                    # Generate JWT tokens
                    refresh = RefreshToken.for_user(user)
                    
                    # Log registration (already done by signal, but log IP)
                    AuditLog.objects.create(
                        user=user,
                        action='REGISTER',
                        resource='user',
                        resource_id=str(user.id),
                        ip_address=get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        metadata={'email': user.email}
                    )
                    
                    logger.info(f"User registered: {user.email}")
                    
                    return Response({
                        'message': 'Registrasi berhasil',
                        'user': UserSerializer(user).data,
                        'tokens': {
                            'refresh': str(refresh),
                            'access': str(refresh.access_token),
                        }
                    }, status=status.HTTP_201_CREATED)
                    
            except Exception as e:
                logger.error(f"Registration error: {str(e)}")
                return Response({
                    'error': 'Terjadi kesalahan saat registrasi'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """API endpoint for login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response({
                'error': 'Email dan password harus diisi'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user for login history
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            user_obj = None
        
        # Authenticate
        user = authenticate(request, username=email, password=password)
        
        # Log login attempt
        if user_obj:
            LoginHistory.objects.create(
                user=user_obj,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=user is not None,
                failure_reason='' if user else 'Invalid password'
            )
        
        if user is not None:
            if not user.is_active:
                return Response({
                    'error': 'Akun tidak aktif'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Update login info
            user.last_login_ip = get_client_ip(request)
            user.failed_login_attempts = 0
            user.save(update_fields=['last_login_ip', 'failed_login_attempts'])
            
            # Create audit log
            AuditLog.objects.create(
                user=user,
                action='LOGIN',
                resource='user',
                resource_id=str(user.id),
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"User logged in: {user.email}")
            
            return Response({
                'message': 'Login berhasil',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        # Increment failed attempts
        if user_obj:
            user_obj.failed_login_attempts += 1
            user_obj.save(update_fields=['failed_login_attempts'])
        
        logger.warning(f"Failed login attempt for email: {email}")
        return Response({
            'error': 'Email atau password salah'
        }, status=status.HTTP_401_UNAUTHORIZED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update current user profile"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            self.perform_update(serializer)
            
            # Audit log
            AuditLog.objects.create(
                user=instance,
                action='UPDATE',
                resource='user',
                resource_id=str(instance.id),
                ip_address=get_client_ip(request),
                metadata={'fields_updated': list(request.data.keys())}
            )
            
            logger.info(f"User updated profile: {instance.email}")
            
            return Response({
                'message': 'Profile berhasil diupdate',
                'user': UserSerializer(instance).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Change password endpoint"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            # Set new password
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            # Audit log
            AuditLog.objects.create(
                user=request.user,
                action='PASSWORD_CHANGE',
                resource='user',
                resource_id=str(request.user.id),
                ip_address=get_client_ip(request)
            )
            
            logger.info(f"Password changed: {request.user.email}")
            
            # Generate new tokens
            refresh = RefreshToken.for_user(request.user)
            
            return Response({
                'message': 'Password berhasil diubah',
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """List all users (requires authentication)"""
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        
        if search:
            queryset = queryset.filter(
                email__icontains=search
            ) | queryset.filter(
                username__icontains=search
            )
        
        return queryset


class AuditLogView(generics.ListAPIView):
    """View audit logs (admin only or own logs)"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import AuditLog
        
        # Get user's own logs or all if admin
        if request.user.is_staff:
            logs = AuditLog.objects.all()[:50]
        else:
            logs = AuditLog.objects.filter(user=request.user)[:20]
        
        data = [{
            'action': log.action,
            'resource': log.resource,
            'ip_address': log.ip_address,
            'created_at': log.created_at,
            'metadata': log.metadata
        } for log in logs]
        
        return Response({
            'count': len(data),
            'results': data
        })


class LoginHistoryView(generics.ListAPIView):
    """View login history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import LoginHistory
        
        history = LoginHistory.objects.filter(user=request.user)[:10]
        
        data = [{
            'success': h.success,
            'ip_address': h.ip_address,
            'user_agent': h.user_agent,
            'failure_reason': h.failure_reason,
            'created_at': h.created_at
        } for h in history]
        
        return Response({
            'count': len(data),
            'results': data
        })


# Import rate limiting
from .decorators import api_ratelimit

# Add rate limiting to login view
# Update your LoginView with decorator:
# @api_ratelimit(rate='10/m')  # 10 attempts per minute
