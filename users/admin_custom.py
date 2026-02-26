from django.contrib import admin
from django.contrib.admin import AdminSite
from django.utils import timezone
from datetime import timedelta

class CustomAdminSite(AdminSite):
    site_header = 'SlackClone Administration'
    site_title = 'SlackClone Admin'
    index_title = 'Dashboard'
    
    def index(self, request, extra_context=None):
        from django.contrib.auth import get_user_model
        from workspace.models import Workspace, Channel, Message
        User = get_user_model()
        
        extra_context = extra_context or {}
        extra_context['stats'] = {
            'total_users': User.objects.count(),
            'total_messages': Message.objects.count(),
            'messages_today': Message.objects.filter(created_at__gte=timezone.now() - timedelta(days=1)).count(),
        }
        return super().index(request, extra_context)

custom_admin_site = CustomAdminSite(name='custom_admin')
