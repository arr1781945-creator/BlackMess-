from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, UserProfile, AuditLog


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Auto-create UserProfile when User is created"""
    if created:
        UserProfile.objects.create(user=instance)
        
        # Create audit log
        AuditLog.objects.create(
            user=instance,
            action='REGISTER',
            resource='user',
            resource_id=str(instance.id),
            metadata={'email': instance.email}
        )


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save profile when user is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()
