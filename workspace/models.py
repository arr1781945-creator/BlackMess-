from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify
import uuid

User = get_user_model()


class Workspace(models.Model):
    """Workspace like Slack"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    # Branding
    logo = models.URLField(max_length=500, blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#611f69')
    
    # Settings
    is_public = models.BooleanField(default=False)
    allow_invites = models.BooleanField(default=True)
    max_members = models.IntegerField(default=100)
    
    # Owner
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_workspaces')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['-created_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    @property
    def member_count(self):
        return self.members.filter(user__is_active=True).count()


class WorkspaceMember(models.Model):
    """Workspace membership"""
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('guest', 'Guest'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('away', 'Away'),
        ('dnd', 'Do Not Disturb'),
        ('offline', 'Offline'),
    ]
    
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspace_memberships')
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='offline')
    status_text = models.CharField(max_length=100, blank=True)
    status_emoji = models.CharField(max_length=50, blank=True)
    
    # Settings
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    
    # Tracking
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'workspace_members'
        unique_together = ['workspace', 'user']
        indexes = [
            models.Index(fields=['workspace', 'user']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.user.email} in {self.workspace.name}"


class Channel(models.Model):
    """Channels like Slack"""
    CHANNEL_TYPES = [
        ('public', 'Public Channel'),
        ('private', 'Private Channel'),
        ('dm', 'Direct Message'),
        ('group', 'Group DM'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='channels')
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    topic = models.CharField(max_length=250, blank=True)
    
    channel_type = models.CharField(max_length=10, choices=CHANNEL_TYPES, default='public')
    
    # Creator
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_channels')
    
    # Settings
    is_archived = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    is_general = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'channels'
        ordering = ['name']
        indexes = [
            models.Index(fields=['workspace', 'channel_type']),
            models.Index(fields=['-last_message_at']),
        ]
    
    def __str__(self):
        prefix = '#' if self.channel_type == 'public' else '🔒'
        return f"{prefix}{self.name}"
    
    @property
    def member_count(self):
        return self.channel_members.count()
    
    @property
    def unread_count(self):
        # TODO: implement unread count logic
        return 0


class ChannelMember(models.Model):
    """Channel membership"""
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='channel_members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='channel_memberships')
    
    # Preferences
    muted = models.BooleanField(default=False)
    starred = models.BooleanField(default=False)
    notification_level = models.CharField(max_length=20, default='all', choices=[
        ('all', 'All messages'),
        ('mentions', 'Mentions only'),
        ('nothing', 'Nothing'),
    ])
    
    # Tracking
    last_read_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'channel_members'
        unique_together = ['channel', 'user']
        indexes = [
            models.Index(fields=['channel', 'user']),
        ]
    
    def __str__(self):
        return f"{self.user.email} in {self.channel.name}"


class Message(models.Model):
    """Chat messages"""
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('system', 'System'),
        ('call_start', 'Call Started'),
        ('call_end', 'Call Ended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    
    # Content
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    text = models.TextField()
    
    # Rich content
    mentions = models.ManyToManyField(User, related_name='mentioned_in', blank=True)
    
    # Thread support
    parent_message = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    reply_count = models.IntegerField(default=0)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # State
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['channel', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['parent_message']),
            models.Index(fields=['is_pinned']),
        ]
    
    def __str__(self):
        return f"{self.user.username}: {self.text[:50]}"


class MessageReaction(models.Model):
    """Emoji reactions"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reactions')
    emoji = models.CharField(max_length=50)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'message_reactions'
        unique_together = ['message', 'user', 'emoji']
        indexes = [
            models.Index(fields=['message']),
        ]
    
    def __str__(self):
        return f"{self.emoji} by {self.user.username}"


class MessageReadReceipt(models.Model):
    """Track who read messages"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='read_messages')
    read_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'message_read_receipts'
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['message', 'user']),
        ]


class FileUpload(models.Model):
    """File uploads"""
    FILE_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
        ('archive', 'Archive'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='files')
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    
    # File info
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FILE_TYPES, default='other')
    file_url = models.URLField(max_length=500)
    file_size = models.BigIntegerField(help_text='Size in bytes')
    mime_type = models.CharField(max_length=100)
    
    # Thumbnail
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    
    # Metadata
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True, help_text='Duration in seconds for audio/video')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'file_uploads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workspace', '-created_at']),
            models.Index(fields=['channel']),
        ]
    
    def __str__(self):
        return self.filename


class Bookmark(models.Model):
    """Bookmarked messages"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarks')
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='bookmarked_by')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='bookmarks')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookmarks'
        unique_together = ['user', 'message']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Bookmark by {self.user.email}"


class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = [
        ('mention', 'Mention'),
        ('reply', 'Reply'),
        ('dm', 'Direct Message'),
        ('invite', 'Workspace Invite'),
        ('channel_invite', 'Channel Invite'),
        ('reaction', 'Reaction'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Links
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, null=True, blank=True)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True)
    related_message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True)
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notifications')
    
    # State
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} for {self.user.email}"


class UserPreference(models.Model):
    """User preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='app_preferences')
    
    # Theme
    theme = models.CharField(max_length=20, default='light', choices=[
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ])
    
    # Notifications
    desktop_notifications = models.BooleanField(default=True)
    mobile_notifications = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    sound_enabled = models.BooleanField(default=True)
    
    # Display
    sidebar_theme = models.CharField(max_length=20, default='default')
    message_display = models.CharField(max_length=20, default='comfortable', choices=[
        ('comfortable', 'Comfortable'),
        ('compact', 'Compact'),
    ])
    
    # Language
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Privacy
    show_online_status = models.BooleanField(default=True)
    read_receipts = models.BooleanField(default=True)
    
    # Preferences JSON
    preferences = models.JSONField(default=dict, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_preferences'
    
    def __str__(self):
        return f"Preferences for {self.user.email}"


class WorkspaceInvite(models.Model):
    """Workspace invitations"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='invites')
    
    email = models.EmailField()
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invites')
    
    role = models.CharField(max_length=10, default='member')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    
    token = models.CharField(max_length=100, unique=True)
    
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'workspace_invites'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'workspace']),
        ]
    
    def __str__(self):
        return f"Invite to {self.workspace.name} for {self.email}"

