from django.contrib import admin
from .models import (
    Workspace, WorkspaceMember, Channel, ChannelMember,
    Message, MessageReaction, MessageReadReceipt,
    FileUpload, Bookmark, Notification, UserPreference,
    WorkspaceInvite
)


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'owner', 'is_public', 'member_count', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'slug', 'description']
    raw_id_fields = ['owner']
    readonly_fields = ['created_at', 'updated_at']
    
    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'workspace', 'role', 'status', 'joined_at']
    list_filter = ['role', 'status', 'joined_at']
    search_fields = ['user__email', 'workspace__name']
    raw_id_fields = ['user', 'workspace']


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ['name', 'workspace', 'channel_type', 'is_archived', 'member_count', 'created_at']
    list_filter = ['channel_type', 'is_archived', 'is_default', 'created_at']
    search_fields = ['name', 'description', 'workspace__name']
    raw_id_fields = ['workspace', 'created_by']
    readonly_fields = ['created_at', 'updated_at', 'last_message_at']
    
    def member_count(self, obj):
        return obj.channel_members.count()
    member_count.short_description = 'Members'


@admin.register(ChannelMember)
class ChannelMemberAdmin(admin.ModelAdmin):
    list_display = ['user', 'channel', 'muted', 'starred', 'joined_at']
    list_filter = ['muted', 'starred', 'notification_level', 'joined_at']
    search_fields = ['user__email', 'channel__name']
    raw_id_fields = ['user', 'channel']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'channel', 'message_type', 'text_preview', 'reply_count', 'is_pinned', 'created_at']
    list_filter = ['message_type', 'is_edited', 'is_deleted', 'is_pinned', 'created_at']
    search_fields = ['text', 'user__email', 'channel__name']
    raw_id_fields = ['channel', 'user', 'parent_message']
    readonly_fields = ['created_at', 'updated_at', 'edited_at']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Message'


@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ['emoji', 'user', 'message', 'created_at']
    list_filter = ['emoji', 'created_at']
    search_fields = ['user__email', 'message__text']
    raw_id_fields = ['message', 'user']


@admin.register(MessageReadReceipt)
class MessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'read_at']
    list_filter = ['read_at']
    search_fields = ['user__email']
    raw_id_fields = ['message', 'user']


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    list_display = ['filename', 'file_type', 'file_size_mb', 'uploaded_by', 'workspace', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['filename', 'uploaded_by__email', 'workspace__name']
    raw_id_fields = ['workspace', 'channel', 'message', 'uploaded_by']
    readonly_fields = ['created_at']
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024*1024):.2f} MB"
    file_size_mb.short_description = 'Size'


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'workspace', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'message__text']
    raw_id_fields = ['user', 'message', 'workspace']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__email', 'title', 'message']
    raw_id_fields = ['user', 'workspace', 'channel', 'related_message', 'from_user']
    readonly_fields = ['created_at']


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'theme', 'language', 'timezone', 'updated_at']
    list_filter = ['theme', 'language', 'updated_at']
    search_fields = ['user__email']
    raw_id_fields = ['user']


@admin.register(WorkspaceInvite)
class WorkspaceInviteAdmin(admin.ModelAdmin):
    list_display = ['email', 'workspace', 'invited_by', 'role', 'status', 'created_at', 'expires_at']
    list_filter = ['status', 'role', 'created_at']
    search_fields = ['email', 'workspace__name', 'invited_by__email']
    raw_id_fields = ['workspace', 'invited_by']
    readonly_fields = ['token', 'created_at']
