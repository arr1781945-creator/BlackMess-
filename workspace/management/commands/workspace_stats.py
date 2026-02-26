from django.core.management.base import BaseCommand
from workspace.models import (
    Workspace, WorkspaceMember, Channel, Message,
    Notification, FileUpload
)


class Command(BaseCommand):
    help = 'Show workspace statistics'
    
    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('\n📊 WORKSPACE STATISTICS\n'))
        
        # Workspaces
        total_workspaces = Workspace.objects.count()
        public_workspaces = Workspace.objects.filter(is_public=True).count()
        
        self.stdout.write('🏢 Workspaces:')
        self.stdout.write(f'  Total: {total_workspaces}')
        self.stdout.write(f'  Public: {public_workspaces}')
        self.stdout.write(f'  Private: {total_workspaces - public_workspaces}')
        self.stdout.write('')
        
        # Channels
        total_channels = Channel.objects.count()
        public_channels = Channel.objects.filter(channel_type='public').count()
        private_channels = Channel.objects.filter(channel_type='private').count()
        dm_channels = Channel.objects.filter(channel_type='dm').count()
        
        self.stdout.write('📢 Channels:')
        self.stdout.write(f'  Total: {total_channels}')
        self.stdout.write(f'  Public: {public_channels}')
        self.stdout.write(f'  Private: {private_channels}')
        self.stdout.write(f'  Direct Messages: {dm_channels}')
        self.stdout.write('')
        
        # Messages
        total_messages = Message.objects.count()
        text_messages = Message.objects.filter(message_type='text').count()
        file_messages = Message.objects.filter(message_type='file').count()
        pinned_messages = Message.objects.filter(is_pinned=True).count()
        
        self.stdout.write('💬 Messages:')
        self.stdout.write(f'  Total: {total_messages}')
        self.stdout.write(f'  Text: {text_messages}')
        self.stdout.write(f'  Files: {file_messages}')
        self.stdout.write(f'  Pinned: {pinned_messages}')
        self.stdout.write('')
        
        # Members
        total_members = WorkspaceMember.objects.count()
        active_members = WorkspaceMember.objects.filter(user__is_active=True).count()
        
        self.stdout.write('👥 Members:')
        self.stdout.write(f'  Total: {total_members}')
        self.stdout.write(f'  Active: {active_members}')
        self.stdout.write('')
        
        # Files
        total_files = FileUpload.objects.count()
        total_size_mb = sum([f.file_size for f in FileUpload.objects.all()]) / (1024 * 1024)
        
        self.stdout.write('📁 Files:')
        self.stdout.write(f'  Total: {total_files}')
        self.stdout.write(f'  Total Size: {total_size_mb:.2f} MB')
        self.stdout.write('')
        
        # Notifications
        total_notifs = Notification.objects.count()
        unread_notifs = Notification.objects.filter(is_read=False).count()
        
        self.stdout.write('🔔 Notifications:')
        self.stdout.write(f'  Total: {total_notifs}')
        self.stdout.write(f'  Unread: {unread_notifs}')
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*50 + '\n'))
