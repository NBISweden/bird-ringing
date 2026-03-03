from __future__ import annotations

from typing import Optional, Iterable
import hashlib
import json
import io
import zipfile
import datetime

from django.db import transaction, IntegrityError
from django.utils.text import slugify
from django.utils import timezone

from licensing.models import (
    License,
    Actor,
    LicenseDocument,
    DocumentTypeChoices,
    LicenseRoleChoices,
    PermitDnr,
)
from licensing.license_renderer import get_template_path
from licensing.permit_renderer import PermitDocxRenderer, PermitRenderRequest
from licensing.utils import docx_to_pdf_bytes


class NoCurrentLicense(Exception):
    pass


class ActorNotOnLicense(Exception):
    pass


class PermitService:
    def __init__(self, renderer: Optional[PermitDocxRenderer] = None):
        self.renderer = renderer or PermitDocxRenderer()

    def _get_license_relation(self, *, lic: License, actor: Actor, allowed_roles: Iterable[int]):
        rel = (
            lic.actors.filter(actor=actor, role__in=list(allowed_roles))
            .select_related("actor")
            .first()
        )
        if not rel:
            raise ActorNotOnLicense(
                "Specified actor is not registered on the license as ringer/associate ringer."
            )
        return rel

    def make_permit_filename(
        self,
        lic: License,
        actor: Actor,
        allowed_roles=(LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
        *,
        rel=None,
    ) -> str:
        # Avoid duplicate query if rel argument is passed (optional).
        if rel is None:
            rel = self._get_license_relation(lic=lic, actor=actor, allowed_roles=allowed_roles)

        mnr = lic.sequence.mnr
        identifier = f"{mnr}-{rel.mednr}" if rel.role == LicenseRoleChoices.ASSOCIATE_RINGER else mnr
        name = slugify(actor.full_name)[:40]
        return f"permit-{identifier}" + (f"-{name}.pdf" if name else ".pdf")

    def _fingerprint(self, payload: dict) -> str:
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def _fingerprint_payload(
        self,
        *,
        lic: License,
        actor: Actor,
        context_fp: dict,
        template_sha256: str,
    ) -> dict:
        return {
            "template_sha256": template_sha256,
            "license_id": lic.id,
            "license_version": lic.version,
            "sequence_mnr": lic.sequence.mnr,
            "actor_id": actor.id,
            "context": context_fp,
        }

    def _get_dnr_for_date(self, *, d: datetime.date) -> str:
        """
        Pick the DNR row valid for date d.
        If multiple match, choose the most recent (largest starts_at, then created_at).
        If none match, raise (permit must not be created).
        """
        row = (
            PermitDnr.objects.filter(
                is_active=True,
                starts_at__lte=d,
                ends_at__gte=d,
            )
            .order_by("-starts_at", "-created_at")
            .first()
        )
        if not row:
            raise ValueError(f"No DNR configured for date {d}.")
        return row.dnr_number

    @transaction.atomic
    def get_or_create_permit_document(
        self,
        *,
        lic: License,
        actor: Actor,
        created_by,
        updated_by,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> LicenseDocument:
        if not lic:
            raise NoCurrentLicense("No license found.")

        # validate actor role once and reuse relation (this should be broken ourt to helper (duplicate in license_service)
        rel = self._get_license_relation(lic=lic, actor=actor, allowed_roles=allowed_roles)

        template_path = get_template_path("LICENSING_PERMIT_TEMPLATE_DOCX")
        template_sha256 = hashlib.sha256(template_path.read_bytes()).hexdigest()

        permissions = self.renderer.get_permissions_for_license(lic)

        render_date = timezone.localdate()
        dnr_number = self._get_dnr_for_date(d=render_date)

        context_fp = self.renderer.build_context_fingerprint(
            lic=lic,
            actor=actor,
            permissions=permissions,
            dnr_number=dnr_number,
        )
        payload = self._fingerprint_payload(lic=lic, actor=actor, context_fp=context_fp, template_sha256=template_sha256)
        fp = self._fingerprint(payload)

        existing = (
            LicenseDocument.objects.filter(
                license=lic,
                actor=actor,
                type=DocumentTypeChoices.PERMIT,
                is_current=True,
                fingerprint=fp,
            )
            .order_by("-created_at")
            .first()
        )
        if existing:
            return existing

        LicenseDocument.objects.filter(
            license=lic,
            actor=actor,
            type=DocumentTypeChoices.PERMIT,
            is_current=True,
        ).update(is_current=False)

        filename = self.make_permit_filename(lic, actor, allowed_roles=allowed_roles, rel=rel)

        # Create first to get created_at.date
        try:
            doc = LicenseDocument.objects.create(
                created_by=created_by,
                updated_by=updated_by,
                actor=actor,
                license=lic,
                type=DocumentTypeChoices.PERMIT,
                data=None,
                reference=filename,
                fingerprint=fp,
                is_current=True,
            )
        except IntegrityError:
            # Safeguard against race condition where another request created a "current" permit concurrently.
            # Prefer returning the document with our fingerprint if it exists.
            current = (
                LicenseDocument.objects.filter(
                    license=lic,
                    actor=actor,
                    type=DocumentTypeChoices.PERMIT,
                    is_current=True,
                    fingerprint=fp,
                )
                .order_by("-created_at")
                .first()
            )
            if current:
                return current

            current = (
                LicenseDocument.objects.filter(
                    license=lic,
                    actor=actor,
                    type=DocumentTypeChoices.PERMIT,
                    is_current=True,
                )
                .order_by("-created_at")
                .first()
            )
            if current:
                return current
            raise

        try:
            docx_bytes = self.renderer.render_docx_bytes(
                PermitRenderRequest(
                    template_docx_path=template_path,
                    lic=lic,
                    actor=actor,
                    date=render_date,
                ),
                permissions=permissions,
                dnr_number=dnr_number,
            )
            pdf_bytes = docx_to_pdf_bytes(docx_bytes)
        except Exception:
            # Avoid leaving a current document with missing data in case rendering fails
            doc.delete()
            raise

        doc.data = pdf_bytes
        doc.save(update_fields=["data", "updated_at"])
        return doc

    def get_permit_document(
        self,
        *,
        lic: License,
        actor: Actor,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> Optional[LicenseDocument]:
        self._get_license_relation(lic=lic, actor=actor, allowed_roles=allowed_roles)

        return (
            LicenseDocument.objects.filter(
                license=lic,
                actor=actor,
                type=DocumentTypeChoices.PERMIT,
                is_current=True,
            )
            .order_by("-created_at")
            .first()
        )

    def batch_get_or_create_permit_documents(
        self,
        *,
        licenses: Iterable[License],
        created_by,
        updated_by,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> list[LicenseDocument]:
        """
        Batch get-or-create permit documents for all ringers/associate ringers on each provided license.
        """
        docs: list[LicenseDocument] = []

        for lic in licenses:
            if not lic:
                raise NoCurrentLicense("No license found.")

            relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
            if not relations.exists():
                raise ValueError(f"No ringers/associate ringers on license for mnr {lic.sequence.mnr}.")

            for rel in relations:
                doc = self.get_or_create_permit_document(
                    lic=lic,
                    actor=rel.actor,
                    created_by=created_by,
                    updated_by=updated_by,
                    allowed_roles=allowed_roles,
                )
                docs.append(doc)

        return docs

    def create_zip_with_permit_docx_files(
        self,
        *,
        licenses: Iterable[License],
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> bytes:
        """
        Create ZIP (bytes) containing existing current permit DOCX files
        for all ringers/associate ringers on each provided license.

        If any expected DOCX is missing, raise ValueError.
        """
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for lic in licenses:
                if not lic:
                    raise NoCurrentLicense("No license found.")

                relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
                if not relations.exists():
                    raise ValueError(f"No ringers/associate ringers on license for mnr {lic.sequence.mnr}.")

                for rel in relations:
                    actor = rel.actor

                    doc = self.get_permit_document(
                        lic=lic,
                        actor=actor,
                        allowed_roles=allowed_roles,
                    )

                    if not doc:
                        raise ValueError(
                            f"Permit PDF missing for mnr {lic.sequence.mnr}. "
                            "Generate all permits for your selected MNRs before creating ZIP."
                        )

                    if not doc.data:
                        raise ValueError(
                            f"{lic.sequence.mnr}: existing permit PDF has no data for actor {actor.id}."
                        )

                    filename = doc.reference or self.make_permit_filename(
                        lic, actor, allowed_roles=allowed_roles, rel=rel
                    )
                    zf.writestr(f"{lic.sequence.mnr}/{filename}", bytes(doc.data))

        zip_buffer.seek(0)
        return zip_buffer.getvalue()