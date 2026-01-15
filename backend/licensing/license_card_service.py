from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Iterable

from django.http import HttpResponse

from licensing.models import LicenseSequence, LicenseRoleChoices, Actor
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
