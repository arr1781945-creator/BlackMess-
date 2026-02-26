from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from workspace.models import (
    Workspace, WorkspaceMember, Channel, ChannelMember,
    Message, UserPreference
)
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed workspace data for testing'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Seeding workspace data...\n')
        
        # Get or create demo users
        users = []
        for i in range(1, 6):
            email = f'user{i}@test.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f'user{i}',
                    'first_name': f'User',
                    'last_name': f'{i}',
                }
            )
            if created:
                user.set_password('User123!')
                user.save()
                self.stdout.write(f'  ✅ Created user: {email}')
            
            # Create preferences
            UserPreference.objects.get_or_create(user=user)
            users.append(user)
        
        # Create demo workspace
        workspace, created = Workspace.objects.get_or_create(
            slug='demo-workspace',
            defaults={
                'name': 'Demo Workspace',
                'description': 'A demo workspace for testing',
                'owner': users[0],
                'is_public': True,
            }
        )
        
        if created:
            self.stdout.write(f'  ✅ Created workspace: {workspace.name}')
        
        # Add members to workspace
        for i, user in enumerate(users):
            role = 'owner' if i == 0 else 'admin' if i == 1 else 'member'
            member, created = WorkspaceMember.objects.get_or_create(
                workspace=workspace,
                user=user,
                defaults={'role': role}
            )
            if created:
                self.stdout.write(f'  ✅ Added {user.email} as {role}')
        
        # Create channels
        channels_data = [
            {
                'name': 'general',
                'description': 'General discussion',
                'channel_type': 'public',
                'is_general': True,
                'is_default': True,
            },
            {
                'name': 'random',
                'description': 'Random chat',
                'channel_type': 'public',
            },
            {
                'name': 'engineering',
                'description': 'Engineering team',
                'channel_type': 'public',
            },
            {
                'name': 'marketing',
                'description': 'Marketing team',
                'channel_type': 'public',
            },
            {
                'name': 'private-discussion',
                'description': 'Private discussion',
                'channel_type': 'private',
            },
        ]
        
        channels = []
        for ch_data in channels_data:
            channel, created = Channel.objects.get_or_create(
                workspace=workspace,
                name=ch_data['name'],
                defaults={
                    **ch_data,
                    'created_by': users[0],
                }
            )
            if created:
                self.stdout.write(f'  ✅ Created channel: #{channel.name}')
            
            # Add members to channel
            for user in users:
                ChannelMember.objects.get_or_create(
                    channel=channel,
                    user=user
                )
            
            channels.append(channel)
        
        # Create sample messages
        sample_messages = [
            "Welcome to the team! 👋",
            "Hey everyone! How's it going?",
            "Just finished the new feature 🚀",
            "Meeting at 3 PM today!",
            "Great work on the presentation!",
            "Anyone up for coffee? ☕",
            "The deployment was successful ✅",
            "Found a bug, working on a fix",
            "New design looks amazing! 🎨",
            "Happy Friday everyone! 🎉",
        ]
        
        for channel in channels[:3]:  # Only add messages to first 3 channels
            for i in range(5):
                user = random.choice(users)
                text = random.choice(sample_messages)
                
                Message.objects.get_or_create(
                    channel=channel,
                    user=user,
                    text=text,
                    defaults={'message_type': 'text'}
                )
            
            self.stdout.write(f'  ✅ Added messages to #{channel.name}')
        
        self.stdout.write(self.style.SUCCESS('\n✨ Workspace seeding complete!\n'))
        self.stdout.write('📊 Summary:')
        self.stdout.write(f'  - Users: {len(users)}')
        self.stdout.write(f'  - Workspace: {workspace.name}')
        self.stdout.write(f'  - Channels: {len(channels)}')
        self.stdout.write(f'  - Sample messages added')
        self.stdout.write('\n🔐 Test credentials:')
        for i in range(1, 4):
            self.stdout.write(f'  - user{i}@test.com / User123!')
