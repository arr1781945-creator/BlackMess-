from django.core.management.base import BaseCommand
from users.models import Role, Permission, RolePermission


class Command(BaseCommand):
    help = 'Seed initial roles and permissions'
    
    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding roles and permissions...')
        
        # Create Roles
        roles_data = [
            {'name': 'admin', 'description': 'System Administrator', 'is_system': True},
            {'name': 'moderator', 'description': 'Content Moderator', 'is_system': True},
            {'name': 'user', 'description': 'Regular User', 'is_system': True},
            {'name': 'guest', 'description': 'Guest User', 'is_system': True},
        ]
        
        roles = {}
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults=role_data
            )
            roles[role.name] = role
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: Role "{role.name}"')
        
        # Create Permissions
        permissions_data = [
            # User permissions
            {'name': 'users.create', 'resource': 'users', 'action': 'create', 'description': 'Create new users'},
            {'name': 'users.read', 'resource': 'users', 'action': 'read', 'description': 'View user information'},
            {'name': 'users.update', 'resource': 'users', 'action': 'update', 'description': 'Update user information'},
            {'name': 'users.delete', 'resource': 'users', 'action': 'delete', 'description': 'Delete users'},
            {'name': 'users.list', 'resource': 'users', 'action': 'list', 'description': 'List all users'},
            
            # Role permissions
            {'name': 'roles.manage', 'resource': 'roles', 'action': 'manage', 'description': 'Manage roles and permissions'},
            
            # Settings permissions
            {'name': 'settings.manage', 'resource': 'settings', 'action': 'manage', 'description': 'Manage system settings'},
            
            # Audit permissions
            {'name': 'audit.view', 'resource': 'audit', 'action': 'view', 'description': 'View audit logs'},
        ]
        
        permissions = {}
        for perm_data in permissions_data:
            perm, created = Permission.objects.get_or_create(
                name=perm_data['name'],
                defaults=perm_data
            )
            permissions[perm.name] = perm
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  {status}: Permission "{perm.name}"')
        
        # Assign permissions to roles
        
        # Admin gets all permissions
        admin_role = roles['admin']
        for perm in permissions.values():
            RolePermission.objects.get_or_create(role=admin_role, permission=perm)
        self.stdout.write(f'  Assigned all permissions to "admin"')
        
        # Moderator gets limited permissions
        moderator_role = roles['moderator']
        moderator_perms = ['users.read', 'users.list', 'users.update']
        for perm_name in moderator_perms:
            RolePermission.objects.get_or_create(
                role=moderator_role,
                permission=permissions[perm_name]
            )
        self.stdout.write(f'  Assigned {len(moderator_perms)} permissions to "moderator"')
        
        # User gets basic permissions
        user_role = roles['user']
        user_perms = ['users.read']
        for perm_name in user_perms:
            RolePermission.objects.get_or_create(
                role=user_role,
                permission=permissions[perm_name]
            )
        self.stdout.write(f'  Assigned {len(user_perms)} permissions to "user"')
        
        self.stdout.write(self.style.SUCCESS('✅ Successfully seeded roles and permissions!'))
