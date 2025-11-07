from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = 'Create required user groups'

    def handle(self, *args, **options):
        group_name = 'Bird ringing experts'
        _, created = Group.objects.get_or_create(name=group_name)
    
        if created:
            self.stdout.write(self.style.SUCCESS(f"Group '{group_name}' was created."))
        else:
            self.stdout.write(self.style.WARNING(f"Group '{group_name}' already exists."))

