from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Iterable

from django.http import HttpResponse

import hashlib
import json
from django.db import transaction

from licensing.models import (
    LicenseSequence,
    LicenseRoleChoices,
    Actor,
    LicenseDocument,
    DocumentTypeChoices)

from licensing.license_renderer import (
    LicenseCardRenderer,
    RenderRequest,
    ValueAddition,
    build_default_template_path,
)

from django.utils import translation
from django.utils.formats import date_format

def format_date(d) -> str:
    with translation.override("sv"):
        day_month = date_format(d, format="j F", use_l10n=True)
    day, month = day_month.split(" ", 1)
    month = month[:1].upper() + month[1:]
    return f"{day} {month} år {d.year}"

class NoCurrentLicense(Exception):
    pass

class ActorNotOnLicense(Exception):
    pass

@dataclass(frozen=True)
class RenderedPdf:
    filename: str
    pdf_bytes: bytes

class LicenseCardService:
    """
    Logic for producing a license card PDF from a LicenseSequence, for a specific Actor.
    Supports both RINGER and HELPER (and can be extended).
    """

    def __init__(self, renderer: Optional[LicenseCardRenderer] = None):
        self.renderer = renderer or LicenseCardRenderer()

    def render_pdf_for_sequence_and_actor(
        self,
        *,
        seq: LicenseSequence,
        actor: Actor,
        allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER),
    ) -> RenderedPdf:
        lic = seq.current
        if not lic:
            raise NoCurrentLicense("No current license found.")

        rel = (
            lic.actors
            .filter(actor=actor, role__in=list(allowed_roles))
            .select_related("actor")
            .first()
        )
        if not rel:
            raise ActorNotOnLicense(
                "Specified actor is not registered on the current license as ringer/helper."
            )

        holder_name = actor.full_name
        valid_to = format_date(lic.ends_at)
        mnr_line = seq.mnr
        if rel.role == LicenseRoleChoices.HELPER:
            mnr_line = f"{seq.mnr}: {rel.mednr}"
        lines_info = [valid_to, mnr_line, holder_name]

        additions: list[ValueAddition] = []
        if actor.birth_date:
            additions.append(
                ValueAddition(label_id="text5", value=actor.birth_date.isoformat())
            )

        req = RenderRequest(
            template_svg_path=build_default_template_path(),
            additions=additions,
            lines_info=lines_info,
        )

        pdf_bytes = self.renderer.render_pdf_bytes(req)

        filename = f"license-card-{seq.mnr}-actor-{actor.id}.pdf"
        return RenderedPdf(filename=filename, pdf_bytes=pdf_bytes)

    @staticmethod
    def as_inline_pdf_response(rendered: RenderedPdf) -> HttpResponse:
        resp = HttpResponse(rendered.pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{rendered.filename}"'
        return resp

    def _build_fingerprint_payload(self, *, seq: LicenseSequence, actor: Actor, rel) -> dict:
        """
        Define exactly what counts as “license changed” for card generation.
        Anything included here triggers a new document when it changes.
        """
        lic = seq.current
        return {
            "template": str(build_default_template_path()),

            "sequence_mnr": seq.mnr,
            "license_version": lic.version,
            "actor_id": actor.id,
            "actor_full_name": actor.full_name,

            "starts_at": lic.starts_at.isoformat(),
            "ends_at": lic.ends_at.isoformat(),

            "role": int(rel.role),
            "mednr": rel.mednr or "",
        }

    def _fingerprint(self, payload: dict) -> str:
        raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    @transaction.atomic
    def get_or_create_current_license_card_document(
        self,
        *,
        seq: LicenseSequence,
        actor: Actor,
        created_by,
        updated_by,
    ) -> LicenseDocument:
        """
        Returns the current LicenseDocument for this (current license, actor).
        Generates and stores a new one only if the fingerprint changed.
        Archives older ones.
        """
        lic = seq.current
        if not lic:
            raise NoCurrentLicense("No current license found.")

        rel = (
            lic.actors
            .filter(actor=actor, role__in=[LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER])
            .select_related("actor")
            .first()
        )
        if not rel:
            raise ActorNotOnLicense(
                "Specified actor is not registered on the current license as ringer/helper."
            )

        payload = self._build_fingerprint_payload(seq=seq, actor=actor, rel=rel)
        fp = self._fingerprint(payload)

        # If current doc already exists with same fingerprint -> reuse it
        existing = LicenseDocument.objects.filter(
            license=lic,
            actor=actor,
            type=DocumentTypeChoices.LICENSE,
            is_current=True,
            fingerprint=fp,
        ).order_by("-created_at").first()

        if existing:
            return existing

        # Otherwise generate new PDF
        rendered = self.render_pdf_for_sequence_and_actor(seq=seq, actor=actor)

        # Archive previous current docs for this actor+license
        LicenseDocument.objects.filter(
            license=lic,
            actor=actor,
            type=DocumentTypeChoices.LICENSE,
            is_current=True,
        ).update(is_current=False)

        # Store new document (keep old docs for archive)
        doc = LicenseDocument.objects.create(
            created_by=created_by,
            updated_by=updated_by,
            actor=actor,
            license=lic,
            type=DocumentTypeChoices.LICENSE,
            data=rendered.pdf_bytes,
            reference=rendered.filename,
            fingerprint=fp,
            is_current=True,
        )
        return doc