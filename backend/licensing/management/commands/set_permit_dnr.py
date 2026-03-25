from __future__ import annotations

import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User

from licensing.models import PermitDnr


class Command(BaseCommand):
    help = (
        "Create a PermitDnr row. By default it will NOT overwrite an existing row "
        "with the same starts_at. Use --update to update the existing row."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dnr", required=True, type=str, help="DNR string to store.")
        parser.add_argument("--starts-at", required=True, type=str, help="YYYY-MM-DD")
        parser.add_argument("--ends-at", required=True, type=str, help="YYYY-MM-DD")

        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing row if one already exists for starts_at.",
        )

        parser.add_argument(
            "--deactivate-others",
            action="store_true",
            help="Deactivate all other rows (set is_active=False).",
        )

        parser.add_argument(
            "--username",
            default="system",
            type=str,
            help="Username used for created_by/updated_by (default: system).",
        )

    def _parse_date(self, s: str) -> datetime.date:
        try:
            return datetime.date.fromisoformat(s)
        except ValueError:
            raise CommandError(f"Invalid date: {s}. Expected YYYY-MM-DD.")

    @transaction.atomic
    def handle(self, *args, **options):
        dnr = (options["dnr"] or "").strip()
        if not dnr:
            raise CommandError("--dnr cannot be empty.")

        starts_at = self._parse_date(options["starts_at"])
        ends_at = self._parse_date(options["ends_at"])
        if ends_at < starts_at:
            raise CommandError("--ends-at must be >= --starts-at.")


        user, _ = User.objects.get_or_create(username=options["username"])
        existing = PermitDnr.objects.filter(starts_at=starts_at).first()

        if existing and not options["update"]:
            raise CommandError(
                f"PermitDnr already exists for starts_at={starts_at} (id={existing.id}). "
                "Refusing to overwrite. Use --update to modify it."
            )

        if existing:
            existing.dnr_number = dnr
            existing.ends_at = ends_at
            existing.is_active = True
            existing.updated_by = user
            existing.updated_at = timezone.now()
            existing.save(
                update_fields=["dnr_number", "ends_at", "is_active", "updated_by", "updated_at"]
            )
            obj = existing
            verb = "Updated"
        else:
            obj = PermitDnr.objects.create(
                created_by=user,
                updated_by=user,
                dnr_number=dnr,
                starts_at=starts_at,
                ends_at=ends_at,
                is_active=True,
            )
            verb = "Created"

        if options["deactivate_others"]:
            PermitDnr.objects.exclude(pk=obj.pk).filter(is_active=True).update(
                is_active=False,
                updated_by=user,
                updated_at=timezone.now(),
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} PermitDnr: id={obj.id}, dnr_number='{obj.dnr_number}', "
                f"starts_at={obj.starts_at}, ends_at={obj.ends_at}, is_active={obj.is_active}"
            )
        )