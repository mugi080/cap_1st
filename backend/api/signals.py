from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def promote_first_user(sender, instance, created, **kwargs):
    if created and User.objects.count() == 1:
        # Set permissions only once during creation
        instance.is_staff = True
        instance.is_superuser = True
        instance.save(update_fields=['is_staff', 'is_superuser'])
