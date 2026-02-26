from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# API Documentation
schema_view = get_schema_view(
   openapi.Info(
      title="Slack-Like Collaboration API",
      default_version='v1',
      description="""
      Enterprise collaboration platform API like Slack with:
      
      **Core Features:**
      - 💬 Real-time Chat (Channels & DMs)
      - 👥 Workspaces (Teams)
      - 📁 File Sharing
      - 🔔 Notifications
      - 🔍 Search
      - 📌 Pins & Bookmarks
      - 😀 Reactions
      - 🧵 Threads
      - 🔐 RBAC
      
      **Authentication:**
      - JWT tokens (Access + Refresh)
      - Email-based login
      
      **User Management:**
      - Custom user model
      - User profiles
      - Audit logging
      - Login history
      
      **Workspace Features:**
      - Multiple workspaces
      - Role-based permissions
      - Invite system
      - Public/Private workspaces
      
      **Channel Features:**
      - Public/Private channels
      - Direct messages
      - Group DMs
      - Channel topics
      
      **Message Features:**
      - Text messages
      - File attachments
      - Emoji reactions
      - Threaded replies
      - Message editing
      - Message pinning
      - Bookmarks
      - Mentions
      
      **Tech Stack:**
      - Django 6.0
      - Django REST Framework
      - JWT Authentication
      - PostgreSQL/SQLite
      """,
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="contact@slacklike.local"),
      license=openapi.License(name="MIT License"),
   ),
   public=True,
   permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    # Admin panel
    path('admin/', admin.site.urls),
    
    # User management API
    path('api/auth/', include('users.urls')),
    
    # Workspace/Chat API
    path('api/', include('workspace.urls')),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
]
