from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Workspace, WorkspaceMember, Channel, ChannelMember,
    Message, MessageReaction, MessageReadReceipt,
    FileUpload, Bookmark, Notification, UserPreference,
    WorkspaceInvite
)
import uuid

User = get_user_model()


# ========== USER SERIALIZERS ==========

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for nested serializers"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields


class UserStatusSerializer(serializers.ModelSerializer):
    """User with online status"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    status = serializers.SerializerMethodField()
    status_text = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'status', 'status_text']
    
    def get_status(self, obj):
        workspace_id = self.context.get('workspace_id')
        if workspace_id:
            try:
                member = WorkspaceMember.objects.get(user=obj, workspace_id=workspace_id)
                return member.status
            except WorkspaceMember.DoesNotExist:
                pass
        return 'offline'
    
    def get_status_text(self, obj):
        workspace_id = self.context.get('workspace_id')
        if workspace_id:
            try:
                member = WorkspaceMember.objects.get(user=obj, workspace_id=workspace_id)
                return member.status_text
            except WorkspaceMember.DoesNotExist:
                pass
        return ''


# ========== WORKSPACE SERIALIZERS ==========

class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Workspace member details"""
    user = UserMinimalSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = WorkspaceMember
        fields = [
            'id', 'user', 'user_id', 'role', 'status', 'status_text', 
            'status_emoji', 'notifications_enabled', 'email_notifications',
            'joined_at', 'last_seen'
        ]
        read_only_fields = ['id', 'joined_at', 'last_seen']


class WorkspaceSerializer(serializers.ModelSerializer):
    """Workspace details"""
    owner = UserMinimalSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'slug', 'description', 'logo', 'primary_color',
            'is_public', 'allow_invites', 'max_members', 'owner',
            'member_count', 'user_role', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'member_count', 'created_at', 'updated_at']
    
    def get_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                member = WorkspaceMember.objects.get(workspace=obj, user=request.user)
                return member.role
            except WorkspaceMember.DoesNotExist:
                pass
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['owner'] = request.user
        
        workspace = super().create(validated_data)
        
        # Auto-add owner as member
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=request.user,
            role='owner'
        )
        
        # Create default channels
        Channel.objects.create(
            workspace=workspace,
            name='general',
            description='Company-wide announcements and discussion',
            channel_type='public',
            created_by=request.user,
            is_default=True,
            is_general=True
        )
        
        Channel.objects.create(
            workspace=workspace,
            name='random',
            description='Non-work banter and water cooler conversation',
            channel_type='public',
            created_by=request.user
        )
        
        return workspace


class WorkspaceDetailSerializer(WorkspaceSerializer):
    """Detailed workspace with members"""
    members = WorkspaceMemberSerializer(many=True, read_only=True)
    
    class Meta(WorkspaceSerializer.Meta):
        fields = WorkspaceSerializer.Meta.fields + ['members']


# ========== CHANNEL SERIALIZERS ==========

class ChannelMemberSerializer(serializers.ModelSerializer):
    """Channel member details"""
    user = UserStatusSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = ChannelMember
        fields = [
            'id', 'user', 'user_id', 'muted', 'starred', 
            'notification_level', 'last_read_at', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']


class ChannelSerializer(serializers.ModelSerializer):
    """Channel details"""
    created_by = UserMinimalSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    is_member = serializers.SerializerMethodField()
    
    class Meta:
        model = Channel
        fields = [
            'id', 'workspace', 'name', 'description', 'topic', 'channel_type',
            'created_by', 'is_archived', 'is_default', 'is_general',
            'member_count', 'unread_count', 'is_member',
            'created_at', 'updated_at', 'last_message_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_message_at']
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ChannelMember.objects.filter(channel=obj, user=request.user).exists()
        return False
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        
        channel = super().create(validated_data)
        
        # Auto-add creator as member
        ChannelMember.objects.create(
            channel=channel,
            user=request.user
        )
        
        return channel


class ChannelDetailSerializer(ChannelSerializer):
    """Detailed channel with members"""
    members = ChannelMemberSerializer(source='channel_members', many=True, read_only=True)
    
    class Meta(ChannelSerializer.Meta):
        fields = ChannelSerializer.Meta.fields + ['members']


# ========== MESSAGE SERIALIZERS ==========

class MessageReactionSerializer(serializers.ModelSerializer):
    """Message reaction"""
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'emoji', 'user', 'created_at']
        read_only_fields = fields


class MessageReactionGroupSerializer(serializers.Serializer):
    """Grouped reactions by emoji"""
    emoji = serializers.CharField()
    count = serializers.IntegerField()
    users = UserMinimalSerializer(many=True)
    reacted_by_current_user = serializers.BooleanField()


class FileUploadSerializer(serializers.ModelSerializer):
    """File upload details"""
    uploaded_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = FileUpload
        fields = [
            'id', 'filename', 'file_type', 'file_url', 'file_size',
            'mime_type', 'thumbnail_url', 'width', 'height', 'duration',
            'uploaded_by', 'created_at'
        ]
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    """Message details"""
    user = UserMinimalSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    files = FileUploadSerializer(many=True, read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    is_bookmarked = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'user', 'message_type', 'text', 'mentions',
            'parent_message', 'reply_count', 'metadata', 'is_edited',
            'is_deleted', 'is_pinned', 'reactions', 'files', 'is_bookmarked',
            'created_at', 'updated_at', 'edited_at'
        ]
        read_only_fields = ['id', 'user', 'reply_count', 'created_at', 'updated_at']
    
    def get_reactions(self, obj):
        # Group reactions by emoji
        reactions = obj.reactions.all()
        grouped = {}
        request = self.context.get('request')
        
        for reaction in reactions:
            if reaction.emoji not in grouped:
                grouped[reaction.emoji] = {
                    'emoji': reaction.emoji,
                    'count': 0,
                    'users': [],
                    'reacted_by_current_user': False
                }
            grouped[reaction.emoji]['count'] += 1
            grouped[reaction.emoji]['users'].append(reaction.user)
            
            if request and request.user == reaction.user:
                grouped[reaction.emoji]['reacted_by_current_user'] = True
        
        return list(grouped.values())
    
    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(message=obj, user=request.user).exists()
        return False
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        
        message = super().create(validated_data)
        
        # Update channel last_message_at
        channel = message.channel
        channel.last_message_at = message.created_at
        channel.save(update_fields=['last_message_at'])
        
        # Increment reply count if replying to thread
        if message.parent_message:
            Message.objects.filter(id=message.parent_message.id).update(
                reply_count=models.F('reply_count') + 1
            )
        
        return message


class MessageThreadSerializer(MessageSerializer):
    """Message with replies"""
    replies = serializers.SerializerMethodField()
    
    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ['replies']
    
    def get_replies(self, obj):
        replies = Message.objects.filter(parent_message=obj).order_by('created_at')[:50]
        return MessageSerializer(replies, many=True, context=self.context).data


# ========== NOTIFICATION SERIALIZERS ==========

class NotificationSerializer(serializers.ModelSerializer):
    """Notification details"""
    from_user = UserMinimalSerializer(read_only=True)
    workspace = serializers.StringRelatedField(read_only=True)
    channel = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message', 'workspace',
            'channel', 'related_message', 'from_user', 'is_read',
            'read_at', 'created_at'
        ]
        read_only_fields = fields


# ========== BOOKMARK SERIALIZERS ==========

class BookmarkSerializer(serializers.ModelSerializer):
    """Bookmark details"""
    message = MessageSerializer(read_only=True)
    message_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Bookmark
        fields = ['id', 'message', 'message_id', 'workspace', 'created_at']
        read_only_fields = ['id', 'created_at']


# ========== PREFERENCE SERIALIZERS ==========

class UserPreferenceSerializer(serializers.ModelSerializer):
    """User preferences"""
    class Meta:
        model = UserPreference
        fields = [
            'theme', 'desktop_notifications', 'mobile_notifications',
            'email_notifications', 'sound_enabled', 'sidebar_theme',
            'message_display', 'language', 'timezone', 'show_online_status',
            'read_receipts', 'preferences', 'updated_at'
        ]
        read_only_fields = ['updated_at']


# ========== INVITE SERIALIZERS ==========

class WorkspaceInviteSerializer(serializers.ModelSerializer):
    """Workspace invite"""
    invited_by = UserMinimalSerializer(read_only=True)
    workspace = WorkspaceSerializer(read_only=True)
    workspace_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = WorkspaceInvite
        fields = [
            'id', 'workspace', 'workspace_id', 'email', 'invited_by',
            'role', 'status', 'token', 'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'created_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['invited_by'] = request.user
        validated_data['token'] = str(uuid.uuid4())
        validated_data['expires_at'] = timezone.now() + timezone.timedelta(days=7)
        
        return super().create(validated_data)
