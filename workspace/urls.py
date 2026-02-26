from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkspaceViewSet,
    ChannelViewSet,
    MessageViewSet,
    NotificationViewSet,
    BookmarkViewSet,
    UserPreferenceView,
)

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'bookmarks', BookmarkViewSet, basename='bookmark')

# URL patterns
urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # User preferences
    path('preferences/', UserPreferenceView.as_view(), name='user-preferences'),
]

# File upload endpoints
from .file_views import FileUploadView, FileListView

urlpatterns += [
    path('files/upload/', FileUploadView.as_view(), name='file-upload'),
    path('files/', FileListView.as_view(), name='file-list'),
]

# Thread endpoints
from .thread_views import ThreadDetailView, ThreadReplyView, ThreadListView

urlpatterns += [
    path('threads/<uuid:message_id>/', ThreadDetailView.as_view(), name='thread-detail'),
    path('threads/<uuid:message_id>/reply/', ThreadReplyView.as_view(), name='thread-reply'),
    path('threads/', ThreadListView.as_view(), name='thread-list'),
]
