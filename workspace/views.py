from rest_framework import status, generics, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import (
    Workspace, WorkspaceMember, Channel, ChannelMember,
    Message, MessageReaction, FileUpload, Bookmark,
    Notification, UserPreference, WorkspaceInvite
)
from .serializers import (
    WorkspaceSerializer, WorkspaceDetailSerializer, WorkspaceMemberSerializer,
    ChannelSerializer, ChannelDetailSerializer, ChannelMemberSerializer,
    MessageSerializer, MessageThreadSerializer, MessageReactionSerializer,
    FileUploadSerializer, BookmarkSerializer, NotificationSerializer,
    UserPreferenceSerializer, WorkspaceInviteSerializer
)
from .permissions import IsWorkspaceMember, IsChannelMember, IsWorkspaceAdmin
import logging

logger = logging.getLogger(__name__)


# ========== WORKSPACE VIEWS ==========

class WorkspaceViewSet(viewsets.ModelViewSet):
    """Workspace CRUD"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkspaceDetailSerializer
        return WorkspaceSerializer
    
    def get_queryset(self):
        return Workspace.objects.filter(
            members__user=self.request.user
        ).annotate(
            member_count=Count('members')
        ).distinct()
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        workspace = self.get_object()
        
        if not workspace.is_public:
            return Response(
                {'error': 'This workspace is private'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=request.user,
            defaults={'role': 'member'}
        )
        
        if created:
            return Response({'message': 'Successfully joined workspace'})
        return Response({'message': 'Already a member'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        workspace = self.get_object()
        
        if workspace.owner == request.user:
            return Response(
                {'error': 'Owner cannot leave workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user
        ).delete()
        
        return Response({'message': 'Successfully left workspace'})
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        workspace = self.get_object()
        members = workspace.members.select_related('user').all()
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data)


# ========== CHANNEL VIEWS ==========

class ChannelViewSet(viewsets.ModelViewSet):
    """Channel CRUD"""
    permission_classes = [IsAuthenticated, IsWorkspaceMember]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChannelDetailSerializer
        return ChannelSerializer
    
    def get_queryset(self):
        workspace_id = self.request.query_params.get('workspace')
        
        if workspace_id:
            return Channel.objects.filter(
                Q(workspace_id=workspace_id) &
                (
                    Q(channel_type='public') |
                    Q(channel_members__user=self.request.user)
                )
            ).annotate(
                member_count=Count('channel_members')
            ).distinct()
        
        return Channel.objects.none()
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        channel = self.get_object()
        
        if channel.channel_type == 'private':
            return Response(
                {'error': 'Cannot join private channel without invite'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        member, created = ChannelMember.objects.get_or_create(
            channel=channel,
            user=request.user
        )
        
        if created:
            return Response({'message': 'Successfully joined channel'})
        return Response({'message': 'Already a member'})
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        channel = self.get_object()
        
        if channel.is_general:
            return Response(
                {'error': 'Cannot leave general channel'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ChannelMember.objects.filter(
            channel=channel,
            user=request.user
        ).delete()
        
        return Response({'message': 'Successfully left channel'})
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        channel = self.get_object()
        members = channel.channel_members.select_related('user').all()
        serializer = ChannelMemberSerializer(
            members, 
            many=True,
            context={'workspace_id': channel.workspace_id}
        )
        return Response(serializer.data)


# ========== MESSAGE VIEWS ==========

class MessageViewSet(viewsets.ModelViewSet):
    """Message CRUD"""
    permission_classes = [IsAuthenticated, IsChannelMember]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        channel_id = self.request.query_params.get('channel')
        
        if channel_id:
            return Message.objects.filter(
                channel_id=channel_id,
                parent_message__isnull=True,
                is_deleted=False
            ).select_related('user').prefetch_related(
                'reactions__user',
                'files',
                'mentions'
            ).order_by('-created_at')
        
        return Message.objects.none()
    
    @action(detail=True, methods=['get'])
    def thread(self, request, pk=None):
        message = self.get_object()
        serializer = MessageThreadSerializer(message, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        if not emoji:
            return Response(
                {'error': 'Emoji is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        if not created:
            reaction.delete()
            return Response({'message': 'Reaction removed'})
        
        return Response({'message': 'Reaction added'})
    
    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        message = self.get_object()
        message.is_pinned = not message.is_pinned
        message.save()
        
        action_text = 'pinned' if message.is_pinned else 'unpinned'
        return Response({'message': f'Message {action_text}'})
    
    @action(detail=True, methods=['post'])
    def bookmark(self, request, pk=None):
        message = self.get_object()
        
        bookmark, created = Bookmark.objects.get_or_create(
            message=message,
            user=request.user,
            workspace=message.channel.workspace
        )
        
        if not created:
            bookmark.delete()
            return Response({'message': 'Bookmark removed'})
        
        return Response({'message': 'Message bookmarked'})


# ========== NOTIFICATION VIEWS ==========

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Notification list"""
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).select_related(
            'workspace', 'channel', 'from_user'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({'message': 'All notifications marked as read'})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response({'message': 'Notification marked as read'})


# ========== BOOKMARK VIEWS ==========

class BookmarkViewSet(viewsets.ModelViewSet):
    """Bookmarks"""
    permission_classes = [IsAuthenticated]
    serializer_class = BookmarkSerializer
    
    def get_queryset(self):
        workspace_id = self.request.query_params.get('workspace')
        
        queryset = Bookmark.objects.filter(
            user=self.request.user
        ).select_related('message__user', 'message__channel')
        
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        
        return queryset.order_by('-created_at')


# ========== PREFERENCE VIEWS ==========

class UserPreferenceView(generics.RetrieveUpdateAPIView):
    """User preferences"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer
    
    def get_object(self):
        preference, created = UserPreference.objects.get_or_create(
            user=self.request.user
        )
        return preference
