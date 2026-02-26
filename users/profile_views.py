from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserUpdateSerializer
from .models import UserProfile

User = get_user_model()


class UserProfileDetailView(APIView):
    """Get/Update user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        user = request.user
        profile = UserProfile.objects.get_or_create(user=user)[0]
        
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update user profile"""
        user = request.user
        profile = UserProfile.objects.get_or_create(user=user)[0]
        
        # Update user fields
        user_fields = ['first_name', 'last_name', 'username']
        for field in user_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        
        # Update profile fields
        profile_data = request.data.get('profile', {})
        profile_fields = ['bio', 'phone_number', 'city', 'country', 'timezone']
        
        for field in profile_fields:
            if field in profile_data:
                setattr(profile, field, profile_data[field])
        
        user.save()
        profile.save()
        
        serializer = UserSerializer(user)
        return Response({
            'message': 'Profile updated successfully',
            'user': serializer.data
        })


class UpdateAvatarView(APIView):
    """Update user avatar"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Upload avatar"""
        avatar_url = request.data.get('avatar_url')
        
        if not avatar_url:
            return Response(
                {'error': 'Avatar URL required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        profile = UserProfile.objects.get_or_create(user=request.user)[0]
        profile.avatar = avatar_url
        profile.save()
        
        return Response({
            'message': 'Avatar updated successfully',
            'avatar_url': avatar_url
        })


class UserStatusView(APIView):
    """Update user status"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Set custom status"""
        from workspace.models import WorkspaceMember
        
        status_text = request.data.get('status_text', '')
        status_emoji = request.data.get('status_emoji', '')
        status = request.data.get('status', 'active')
        
        # Update all workspace memberships
        WorkspaceMember.objects.filter(user=request.user).update(
            status=status,
            status_text=status_text,
            status_emoji=status_emoji
        )
        
        return Response({
            'message': 'Status updated successfully',
            'status': status,
            'status_text': status_text,
            'status_emoji': status_emoji
        })
