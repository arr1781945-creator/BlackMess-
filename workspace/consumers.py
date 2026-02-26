import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import (
    Channel, ChannelMember, Message, MessageReaction,
    Workspace, WorkspaceMember, Notification
)
from .serializers import MessageSerializer, NotificationSerializer
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat in a channel
    """
    
    async def connect(self):
        self.channel_id = self.scope['url_route']['kwargs']['channel_id']
        self.room_group_name = f'chat_{self.channel_id}'
        self.user = self.scope['user']
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Check if user is member of channel
        is_member = await self.check_channel_membership()
        if not is_member:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send user joined notification
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': str(self.user.id),
                'username': self.user.username,
            }
        )
        
        logger.info(f"User {self.user.email} connected to channel {self.channel_id}")
    
    async def disconnect(self, close_code):
        # Send user left notification
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                }
            )
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        
        logger.info(f"User {self.user.email} disconnected from channel {self.channel_id}")
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'message':
                await self.handle_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'reaction':
                await self.handle_reaction(data)
            elif message_type == 'read_receipt':
                await self.handle_read_receipt(data)
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))
    
    async def handle_message(self, data):
        """Handle new message"""
        text = data.get('text', '').strip()
        parent_message_id = data.get('parent_message_id')
        
        if not text:
            return
        
        # Save message to database
        message = await self.save_message(text, parent_message_id)
        
        # Broadcast message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': is_typing,
            }
        )
    
    async def handle_reaction(self, data):
        """Handle message reaction"""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        if message_id and emoji:
            reaction = await self.toggle_reaction(message_id, emoji)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_reaction',
                    'message_id': message_id,
                    'emoji': emoji,
                    'user_id': str(self.user.id),
                    'action': 'added' if reaction else 'removed',
                }
            )
    
    async def handle_read_receipt(self, data):
        """Handle message read receipt"""
        message_id = data.get('message_id')
        
        if message_id:
            await self.mark_message_read(message_id)
    
    # Receive message from room group
    async def chat_message(self, event):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
        }))
    
    async def user_joined(self, event):
        """User joined notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_joined',
            'user_id': event['user_id'],
            'username': event['username'],
        }))
    
    async def user_left(self, event):
        """User left notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'username': event['username'],
        }))
    
    async def typing_indicator(self, event):
        """Typing indicator"""
        # Don't send typing indicator back to the user who's typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing'],
            }))
    
    async def message_reaction(self, event):
        """Message reaction update"""
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'message_id': event['message_id'],
            'emoji': event['emoji'],
            'user_id': event['user_id'],
            'action': event['action'],
        }))
    
    async def message_deleted(self, event):
        """Message deleted notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
        }))
    
    async def message_edited(self, event):
        """Message edited notification"""
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message': event['message'],
        }))
    
    # Database operations
    @database_sync_to_async
    def check_channel_membership(self):
        """Check if user is member of channel"""
        try:
            return ChannelMember.objects.filter(
                channel_id=self.channel_id,
                user=self.user
            ).exists()
        except:
            return False
    
    @database_sync_to_async
    def save_message(self, text, parent_message_id=None):
        """Save message to database"""
        from django.utils import timezone
        
        message = Message.objects.create(
            channel_id=self.channel_id,
            user=self.user,
            text=text,
            parent_message_id=parent_message_id,
            message_type='text'
        )
        
        # Update channel last_message_at
        Channel.objects.filter(id=self.channel_id).update(
            last_message_at=timezone.now()
        )
        
        # Serialize message
        from rest_framework.renderers import JSONRenderer
        serializer = MessageSerializer(message)
        
        return serializer.data
    
    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        """Toggle reaction on message"""
        try:
            reaction = MessageReaction.objects.filter(
                message_id=message_id,
                user=self.user,
                emoji=emoji
            ).first()
            
            if reaction:
                reaction.delete()
                return False
            else:
                MessageReaction.objects.create(
                    message_id=message_id,
                    user=self.user,
                    emoji=emoji
                )
                return True
        except:
            return False
    
    @database_sync_to_async
    def mark_message_read(self, message_id):
        """Mark message as read"""
        from .models import MessageReadReceipt
        MessageReadReceipt.objects.get_or_create(
            message_id=message_id,
            user=self.user
        )


class WorkspaceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for workspace-wide events
    """
    
    async def connect(self):
        self.workspace_id = self.scope['url_route']['kwargs']['workspace_id']
        self.room_group_name = f'workspace_{self.workspace_id}'
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Check workspace membership
        is_member = await self.check_workspace_membership()
        if not is_member:
            await self.close()
            return
        
        # Join workspace group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Update user status
        await self.update_user_status('active')
        
        logger.info(f"User {self.user.email} connected to workspace {self.workspace_id}")
    
    async def disconnect(self, close_code):
        # Update user status
        await self.update_user_status('offline')
        
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')
        
        if event_type == 'status_change':
            await self.handle_status_change(data)
    
    async def handle_status_change(self, data):
        """Handle user status change"""
        status = data.get('status', 'active')
        status_text = data.get('status_text', '')
        
        await self.update_user_status(status, status_text)
        
        # Broadcast status change
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status_changed',
                'user_id': str(self.user.id),
                'status': status,
                'status_text': status_text,
            }
        )
    
    async def user_status_changed(self, event):
        """Send status change to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'status_change',
            'user_id': event['user_id'],
            'status': event['status'],
            'status_text': event['status_text'],
        }))
    
    @database_sync_to_async
    def check_workspace_membership(self):
        try:
            return WorkspaceMember.objects.filter(
                workspace_id=self.workspace_id,
                user=self.user
            ).exists()
        except:
            return False
    
    @database_sync_to_async
    def update_user_status(self, status, status_text=''):
        from django.utils import timezone
        WorkspaceMember.objects.filter(
            workspace_id=self.workspace_id,
            user=self.user
        ).update(
            status=status,
            status_text=status_text,
            last_seen=timezone.now()
        )


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications
    """
    
    async def connect(self):
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.room_group_name = f'notifications_{self.user.id}'
        
        # Join personal notification group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        logger.info(f"User {self.user.email} connected to notifications")
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data.get('type') == 'mark_read':
            notification_id = data.get('notification_id')
            await self.mark_notification_read(notification_id)
    
    async def notification(self, event):
        """Send notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification'],
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from django.utils import timezone
        Notification.objects.filter(
            id=notification_id,
            user=self.user
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

# Update save_message to handle mentions
from django.contrib.auth import get_user_model

@database_sync_to_async
def save_message_with_mentions(self, text, parent_message_id, mentioned_user_ids):
    """Save message with mentions"""
    from django.utils import timezone
    
    User = get_user_model()
    
    message = Message.objects.create(
        channel_id=self.channel_id,
        user=self.user,
        text=text,
        parent_message_id=parent_message_id,
        message_type='text'
    )
    
    # Add mentions
    if mentioned_user_ids:
        mentioned_users = User.objects.filter(id__in=mentioned_user_ids)
        message.mentions.set(mentioned_users)
        
        # Create notifications for mentioned users
        from .models import Notification
        for user in mentioned_users:
            if user != self.user:  # Don't notify yourself
                Notification.objects.create(
                    user=user,
                    notification_type='mention',
                    title=f'{self.user.username} mentioned you',
                    message=text[:100],
                    workspace=message.channel.workspace,
                    channel=message.channel,
                    related_message=message,
                    from_user=self.user
                )
    
    # Update channel last_message_at
    Channel.objects.filter(id=self.channel_id).update(
        last_message_at=timezone.now()
    )
    
    # Serialize message
    from rest_framework.renderers import JSONRenderer
    serializer = MessageSerializer(message)
    
    return serializer.data

# Update handle_message in ChatConsumer
async def handle_message(self, data):
    """Handle new message"""
    text = data.get('text', '').strip()
    parent_message_id = data.get('parent_message_id')
    mentions = data.get('mentions', [])
    
    if not text:
        return
    
    # Save message to database with mentions
    message = await self.save_message_with_mentions(text, parent_message_id, mentions)
    
    # Broadcast message to room group
    await self.channel_layer.group_send(
        self.room_group_name,
        {
            'type': 'chat_message',
            'message': message,
        }
    )

# Add to ChatConsumer class

@database_sync_to_async
def get_online_users(self):
    """Get list of online users in channel"""
    from django.utils import timezone
    from datetime import timedelta
    
    # Get workspace members who were active in last 5 minutes
    recent_time = timezone.now() - timedelta(minutes=5)
    
    members = WorkspaceMember.objects.filter(
        workspace=self.channel.workspace,
        last_seen__gte=recent_time
    ).select_related('user').exclude(
        user=self.user
    ).order_by('user__username')
    
    return [
        {
            'id': str(member.user.id),
            'username': member.user.username,
            'full_name': member.user.get_full_name() or member.user.username,
            'email': member.user.email,
            'status': member.status,
            'status_text': member.status_text,
        }
        for member in members
    ]

@database_sync_to_async
def update_user_presence(self, status='active'):
    """Update user presence"""
    from django.utils import timezone
    
    WorkspaceMember.objects.filter(
        workspace=self.channel.workspace,
        user=self.user
    ).update(
        status=status,
        last_seen=timezone.now()
    )

# Update connect method
async def connect(self):
    self.channel_id = self.scope['url_route']['kwargs']['channel_id']
    self.room_group_name = f'chat_{self.channel_id}'
    self.user = self.scope['user']
    
    # Check if user is authenticated
    if not self.user.is_authenticated:
        await self.close()
        return
    
    # Check if user is member of channel
    is_member = await self.check_channel_membership()
    if not is_member:
        await self.close()
        return
    
    # Get channel to access workspace
    from channels.db import database_sync_to_async
    
    @database_sync_to_async
    def get_channel():
        return Channel.objects.select_related('workspace').get(id=self.channel_id)
    
    self.channel = await get_channel()
    
    # Update presence
    await self.update_user_presence('active')
    
    # Join room group
    await self.channel_layer.group_add(
        self.room_group_name,
        self.channel_name
    )
    
    await self.accept()
    
    # Get online users
    online_users = await self.get_online_users()
    
    # Send user joined notification with online users
    await self.channel_layer.group_send(
        self.room_group_name,
        {
            'type': 'user_joined',
            'user_id': str(self.user.id),
            'username': self.user.username,
            'full_name': self.user.get_full_name() or self.user.username,
        }
    )
    
    # Send online users list to this user
    await self.send(text_data=json.dumps({
        'type': 'online_users',
        'users': online_users
    }))
    
    logger.info(f"User {self.user.email} connected to channel {self.channel_id}")

# Update disconnect method
async def disconnect(self, close_code):
    # Update presence to offline
    if hasattr(self, 'channel'):
        await self.update_user_presence('offline')
    
    # Send user left notification
    if hasattr(self, 'room_group_name'):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user_id': str(self.user.id),
                'username': self.user.username,
            }
        )
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    logger.info(f"User {self.user.email} disconnected from channel {self.channel_id}")

# Add presence update handler
async def user_presence_update(self, event):
    """Handle user presence update"""
    await self.send(text_data=json.dumps({
        'type': 'presence_update',
        'user_id': event['user_id'],
        'status': event['status'],
        'status_text': event.get('status_text', '')
    }))
