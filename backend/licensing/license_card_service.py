from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Iterable

from django.http import HttpResponse

import hashlib
import io
import zipfile

from django.db import transaction

from licensing.models import (
    License,
    LicenseRoleChoices,
    Actor,
    LicenseDocument,
    DocumentTypeChoices,
)
from licensing.serializers import json_serialize
from licensing.license_renderer import (
    LicenseCardRenderer,
    RenderRequest,
    get_template_path,
)

from django.utils import translation
from django.utils.text import slugify
from django.utils.formats import date_format

def format_date(d) -> str:
    with translation.override("sv"):
        day_month = date_format(d, format="j F", use_l10n=True)
    day, month = day_month.split(" ", 1)
    month = month[:1].upper() + month[1:]
    return f"{day} {month} år {d.year}"

class NoLicense(Exception):
    pass

class ActorNotOnLicense(Exception):
    pass

@dataclass(frozen=True)
class RenderedPdf:
    filename: str
    pdf_bytes: bytes

class LicenseCardService:
    """
    Logic for producing a license card PDF from a License for a specific Actor.
    Supports both RINGER and ASSOCIATE RINGER (and can be extended). Since this is using License, it could be extended
    to historical licenses in the future if needed.
    """

    def __init__(self, renderer: Optional[LicenseCardRenderer] = None):
        self.renderer = renderer or LicenseCardRenderer()

    def make_license_card_filename(self, lic, actor, allowed_roles=(LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> str:
        rel = self._get_license_relation(lic=lic, actor=actor, allowed_roles=allowed_roles)

        mnr = lic.sequence.mnr
        identifier = f"{mnr}-{rel.mednr}" if rel.role == LicenseRoleChoices.ASSOCIATE_RINGER else f"{mnr}"
        name = slugify(actor.full_name)[:40]

        return f"license-card-{identifier}" + (f"-{name}.pdf" if name else ".pdf")

    def render_pdf_for_license_and_actor(
        self,
        *,
        lic: License,
        actor: Actor,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> RenderedPdf:

        rel = self._get_license_relation(
            lic=lic,
            actor=actor,
            allowed_roles=allowed_roles,
        )

        holder_name = actor.full_name
        valid_to = format_date(lic.ends_at)

        mnr = lic.sequence.mnr
        mnr_line = mnr
        if rel.role == LicenseRoleChoices.ASSOCIATE_RINGER:
            mnr_line = f"{mnr}: {rel.mednr}"

        lines_info = [valid_to, mnr_line, holder_name]

        req = RenderRequest(
            template_svg_path=get_template_path("LICENSING_CARD_TEMPLATE"),
            lines_info=lines_info,
        )

        pdf_bytes = self.renderer.render_pdf_bytes(req)

        filename = self.make_license_card_filename(lic, actor, allowed_roles=allowed_roles)
        return RenderedPdf(filename=filename, pdf_bytes=pdf_bytes)

    @staticmethod
    def as_inline_pdf_response(rendered: RenderedPdf) -> HttpResponse:
        resp = HttpResponse(rendered.pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{rendered.filename}"'
        return resp

    def _build_fingerprint_payload(self, *, lic: License, actor: Actor, rel) -> dict:
        """
        Define exactly what counts as “license changed” for card generation.
        Anything included here triggers a new document when it changes.
        """
        return {
            "template": str(get_template_path("LICENSING_CARD_TEMPLATE")),

            "sequence_mnr": lic.sequence.mnr,
            "actor_id": actor.id,
            "actor_full_name": actor.full_name,

            "starts_at": lic.starts_at.isoformat(),
            "ends_at": lic.ends_at.isoformat(),

            "role": int(rel.role),
            "mednr": rel.mednr or "",
        }

    def _fingerprint(self, payload: dict) -> str:
        raw = json_serialize(payload).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    @transaction.atomic
    def get_or_create_license_card_document(
        self,
        *,
        lic: License,
        actor: Actor,
        created_by,
        updated_by,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> LicenseDocument:
        """
        Returns the current LicenseDocument for this actor and license.
        Generates and stores a new one only if the fingerprint changed.
        Archives older ones.
        """
        rel = self._get_license_relation(
            lic=lic,
            actor=actor,
            allowed_roles=allowed_roles,
        )

        payload = self._build_fingerprint_payload(lic=lic, actor=actor, rel=rel)
        fp = self._fingerprint(payload)

        # If current doc already exists with same fingerprint -> reuse it
        existing = LicenseDocument.objects.filter(
            license_sequence=lic.sequence,
            actor=actor,
            type=DocumentTypeChoices.LICENSE,
            fingerprint=fp,
        ).order_by("-created_at").first()

        if existing:
            lic.documents.add(existing)
            return existing

        rendered = self.render_pdf_for_license_and_actor(lic=lic, actor=actor, allowed_roles=allowed_roles)

        # Store new document (keep old docs for archive)
        (doc, _created) = LicenseDocument.objects.get_or_create(
            license_sequence=lic.sequence,
            actor=actor,
            type=DocumentTypeChoices.LICENSE,
            fingerprint=fp,
            defaults={
                "created_by": created_by,
                "updated_by": updated_by,
                "reference": rendered.filename,
                "is_permanent": False,
                "data": rendered.pdf_bytes,
            }
        )

        lic.documents.add(doc)
        return doc

    def batch_get_or_create_license_card_documents(
        self,
        *,
        licenses: Iterable[License],
        created_by,
        updated_by,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> list[LicenseDocument]:
        """
        Batch get-or-create license card documents for all ringers/associate ringers on each provided license.
        """
        docs: list[LicenseDocument] = []

        for lic in licenses:
            if not lic:
                raise NoLicense("No license found.")

            relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
            if not relations.exists():
                raise ValueError(f"No ringers/associate ringers on license for mnr {lic.sequence.mnr}.")

            for rel in relations:
                doc = self.get_or_create_license_card_document(
                    lic=lic,
                    actor=rel.actor,
                    created_by=created_by,
                    updated_by=updated_by,
                    allowed_roles=allowed_roles,
                )
                docs.append(doc)

        return docs

    def create_zip_with_license_card_pdfs(
        self,
        *,
        licenses: Iterable[License],
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> bytes:
        """
        Create ZIP (bytes) containing existing current license-card PDFs
        for all ringers/associate ringers on each provided license.
        If any expected PDF is missing, raise a ValueError.
        """
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for lic in licenses:
                if not lic:
                    raise NoLicense("No license found.")

                relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
                if not relations.exists():
                    raise ValueError(f"No ringers/associate ringers on license for mnr {lic.sequence.mnr}.")

                for rel in relations:
                    actor = rel.actor

                    doc = self.get_license_card_document(
                        lic=lic,
                        actor=actor,
                        allowed_roles=allowed_roles,
                    )

                    if not doc:
                        raise ValueError(
                            f"License card PDF(s) missing for mnr {lic.sequence.mnr}. "
                            "Generate all license cards for your selected MNRs before creating ZIP."
                        )

                    if not doc.data:
                        raise ValueError(f"{lic.sequence.mnr}: existing PDF has no data for actor {actor.id}.")

                    filename = self.make_license_card_filename(lic, actor, allowed_roles=allowed_roles)
                    zf.writestr(f"{lic.sequence.mnr}/{filename}", bytes(doc.data))

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    def get_license_card_document(
        self,
        *,
        lic: License,
        actor: Actor,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    ) -> Optional[LicenseDocument]:
        self._get_license_relation(
            lic=lic,
            actor=actor,
            allowed_roles=allowed_roles,
        )

        return lic.documents.filter(
            actor=actor,
            type=DocumentTypeChoices.LICENSE,
        ).order_by("-created_at").first()

    def _get_license_relation(
        self,
        *,
        lic: License,
        actor: Actor,
        allowed_roles: Iterable[int],
    ):
        if not lic:
            raise NoLicense("No license found.")

        rel = (
            lic.actors
            .filter(actor=actor, role__in=list(allowed_roles))
            .select_related("actor") # keep for now
            .first()
        )
        if not rel:
            raise ActorNotOnLicense(
                "Specified actor is not registered on the license as ringer/associate ringer."
            )

        return rel
