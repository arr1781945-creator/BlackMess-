from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserRegistrationView,
    UserLoginView,
    UserProfileView,
    UserListView,
    ChangePasswordView,
    AuditLogView,
    LoginHistoryView,
)

urlpatterns = [
    # Authentication
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User management
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Audit & History
    path('audit-logs/', AuditLogView.as_view(), name='audit-logs'),
    path('login-history/', LoginHistoryView.as_view(), name='login-history'),
]

# User search endpoints
from .search_views import UserSearchView, WorkspaceMembersView

urlpatterns += [
    path('search/', UserSearchView.as_view(), name='user-search'),
    path('workspace/<uuid:workspace_id>/members/', WorkspaceMembersView.as_view(), name='workspace-members'),
]

# Profile endpoints
from .profile_views import UserProfileDetailView, UpdateAvatarView, UserStatusView

urlpatterns += [
    path('profile/detail/', UserProfileDetailView.as_view(), name='profile-detail'),
    path('profile/avatar/', UpdateAvatarView.as_view(), name='profile-avatar'),
    path('profile/status/', UserStatusView.as_view(), name='profile-status'),
]

# Security monitoring endpoints
from .security_views import SecurityStatsView, UnblockUserView

urlpatterns += [
    path('security/stats/', SecurityStatsView.as_view(), name='security-stats'),
    path('security/unblock/', UnblockUserView.as_view(), name='security-unblock'),
]
