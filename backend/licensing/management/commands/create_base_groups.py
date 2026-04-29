from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.conf import settings


class Command(BaseCommand):
    help = "Create user groups defined in settings.GROUP_NAMES"

    def add_arguments(self, parser):
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing group",
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            group_names = getattr(settings, "GROUP_NAMES", {})

            if not group_names:
                self.stdout.write(
                    self.style.WARNING("No group names found in settings.GROUP_NAMES")
                )
                return

            permissions = [
                "view_licensesequence",
                "view_actor",
                "change_licensesequence",
                "view_licensepermissiontype",
                "view_licensepermissionproperty"
            ]

            for _, group_name in group_names.items():
                group, created = Group.objects.get_or_create(name=group_name)
                if created or options["update"]:
                    for perm_name in permissions:
                        perm = Permission.objects.get(codename=perm_name)
                        group.permissions.add(perm)
                    group.save()
                    
                    action = (
                        "updated"
                        if options["update"]
                        else "created"
                    )

                    self.stdout.write(
                        self.style.SUCCESS(f"Group '{group_name}' was {action}.")
                    )
                else:
                    self.stdout.write(
                        self.style.NOTICE(f"Group '{group_name}' already exists.")
                    )
