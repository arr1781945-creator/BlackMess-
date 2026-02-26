from rest_framework import permissions
from .models import WorkspaceMember, ChannelMember


class IsWorkspaceMember(permissions.BasePermission):
    """
    Check if user is a member of the workspace
    """
    message = 'You must be a member of this workspace.'
    
    def has_permission(self, request, view):
        workspace_id = request.query_params.get('workspace') or request.data.get('workspace')
        
        if not workspace_id:
            return True  # Let view handle validation
        
        return WorkspaceMember.objects.filter(
            workspace_id=workspace_id,
            user=request.user
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        # Get workspace from object
        if hasattr(obj, 'workspace'):
            workspace = obj.workspace
        elif hasattr(obj, 'channel'):
            workspace = obj.channel.workspace
        else:
            workspace = obj
        
        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user
        ).exists()


class IsWorkspaceAdmin(permissions.BasePermission):
    """
    Check if user is admin/owner of the workspace
    """
    message = 'You must be an admin or owner of this workspace.'
    
    def has_object_permission(self, request, view, obj):
        # Get workspace from object
        if hasattr(obj, 'workspace'):
            workspace = obj.workspace
        else:
            workspace = obj
        
        try:
            member = WorkspaceMember.objects.get(
                workspace=workspace,
                user=request.user
            )
            return member.role in ['owner', 'admin']
        except WorkspaceMember.DoesNotExist:
            return False


class IsWorkspaceOwner(permissions.BasePermission):
    """
    Check if user is owner of the workspace
    """
    message = 'You must be the owner of this workspace.'
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'workspace'):
            workspace = obj.workspace
        else:
            workspace = obj
        
        return workspace.owner == request.user


class IsChannelMember(permissions.BasePermission):
    """
    Check if user is a member of the channel
    """
    message = 'You must be a member of this channel.'
    
    def has_permission(self, request, view):
        channel_id = request.query_params.get('channel') or request.data.get('channel')
        
        if not channel_id:
            return True  # Let view handle validation
        
        return ChannelMember.objects.filter(
            channel_id=channel_id,
            user=request.user
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        # Get channel from object
        if hasattr(obj, 'channel'):
            channel = obj.channel
        else:
            channel = obj
        
        # Check if public channel or user is member
        if channel.channel_type == 'public':
            return True
        
        return ChannelMember.objects.filter(
            channel=channel,
            user=request.user
        ).exists()


class IsMessageOwner(permissions.BasePermission):
    """
    Check if user is the owner of the message
    """
    message = 'You can only edit/delete your own messages.'
    
    def has_object_permission(self, request, view, obj):
        # Allow safe methods for all channel members
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only message owner can edit/delete
        return obj.user == request.user


class IsFileOwner(permissions.BasePermission):
    """
    Check if user is the uploader of the file
    """
    message = 'You can only delete your own files.'
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return obj.uploaded_by == request.user
