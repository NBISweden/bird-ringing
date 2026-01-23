from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.conf import settings


class Command(BaseCommand):
    help = "Create user groups defined in settings.GROUP_NAMES"

    def handle(self, *args, **options):
        with transaction.atomic():
            group_names = getattr(settings, "GROUP_NAMES", {})

            if not group_names:
                self.stdout.write(
                    self.style.WARNING("No group names found in settings.GROUP_NAMES")
                )
                return

            permissions = ["view_licensesequence", "view_actor", "add_licensesequence", "change_licensesequence"]

            for _, group_name in group_names.items():
                group, created = Group.objects.get_or_create(name=group_name)
                if created:
                    for perm_name in permissions:
                        perm = Permission.objects.get(codename=perm_name)
                        group.permissions.add(perm)
                    group.save()

                    self.stdout.write(
                        self.style.SUCCESS(f"Group '{group_name}' was created.")
                    )
                else:
                    self.stdout.write(
                        self.style.NOTICE(f"Group '{group_name}' already exists.")
                    )
