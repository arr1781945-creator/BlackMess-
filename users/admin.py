from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, UserProfile, Role, Permission, UserRole, RolePermission,
    UserSession, PasswordReset, EmailVerification, TwoFactorAuth,
    AuditLog, LoginHistory
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'is_active', 'is_verified', 'is_staff', 'created_at']
    list_filter = ['is_active', 'is_verified', 'is_staff', 'is_superuser', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Permissions', {'fields': ('is_active', 'is_verified', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
        ('Security', {'fields': ('last_login_ip', 'failed_login_attempts', 'locked_until')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'gender', 'city', 'country', 'created_at']
    search_fields = ['user__email', 'user__username', 'city', 'country']
    list_filter = ['gender', 'country', 'created_at']
    raw_id_fields = ['user']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_system', 'created_at']
    list_filter = ['is_system', 'created_at']
    search_fields = ['name', 'description']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'resource', 'action', 'created_at']
    list_filter = ['resource', 'action']
    search_fields = ['name', 'resource', 'action']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'assigned_by', 'assigned_at']
    list_filter = ['role', 'assigned_at']
    search_fields = ['user__email', 'role__name']
    raw_id_fields = ['user', 'assigned_by']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'assigned_at']
    list_filter = ['role', 'assigned_at']
    search_fields = ['role__name', 'permission__name']


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ip_address', 'last_activity', 'expires_at', 'created_at']
    list_filter = ['created_at', 'expires_at']
    search_fields = ['user__email', 'ip_address']
    raw_id_fields = ['user']
    readonly_fields = ['token_hash', 'created_at', 'last_activity']


@admin.register(PasswordReset)
class PasswordResetAdmin(admin.ModelAdmin):
    list_display = ['user', 'used', 'created_at', 'expires_at']
    list_filter = ['used', 'created_at']
    search_fields = ['user__email']
    raw_id_fields = ['user']
    readonly_fields = ['token_hash', 'created_at']


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'verified_at', 'created_at', 'expires_at']
    list_filter = ['created_at', 'verified_at']
    search_fields = ['user__email']
    raw_id_fields = ['user']
    readonly_fields = ['token_hash', 'created_at']


@admin.register(TwoFactorAuth)
class TwoFactorAuthAdmin(admin.ModelAdmin):
    list_display = ['user', 'enabled', 'created_at']
    list_filter = ['enabled', 'created_at']
    search_fields = ['user__email']
    raw_id_fields = ['user']
    readonly_fields = ['secret_key', 'created_at']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource', 'ip_address', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['user__email', 'resource', 'resource_id']
    raw_id_fields = ['user']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'success', 'ip_address', 'created_at']
    list_filter = ['success', 'created_at']
    search_fields = ['user__email', 'ip_address']
    raw_id_fields = ['user']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
