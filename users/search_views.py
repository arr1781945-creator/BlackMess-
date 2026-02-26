from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q
from .serializers import UserSerializer

User = get_user_model()


class UserSearchView(APIView):
    """Search users for mentions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        workspace_id = request.query_params.get('workspace')
        
        if not query or len(query) < 2:
            return Response([])
        
        # Search users
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query),
            is_active=True
        )
        
        # Filter by workspace if provided
        if workspace_id:
            users = users.filter(
                workspace_memberships__workspace_id=workspace_id
            )
        
        users = users.distinct()[:10]
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class WorkspaceMembersView(APIView):
    """Get all members in a workspace for mentions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, workspace_id):
        from workspace.models import WorkspaceMember
        
        members = WorkspaceMember.objects.filter(
            workspace_id=workspace_id
        ).select_related('user').order_by('user__username')
        
        users = [m.user for m in members]
        serializer = UserSerializer(users, many=True)
        
        return Response(serializer.data)
