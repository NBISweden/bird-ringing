from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.http import HttpResponse

from licensing.models import LicenseSequence, LicenseRoleChoices
from licensing.license_renderer import (
    LicenseCardRenderer,
    RenderRequest,
    ValueAddition,
    build_default_template_path,
)

class NoCurrentLicense(Exception):
    pass

@dataclass(frozen=True)
class RenderedPdf:
    filename: str
    pdf_bytes: bytes

class LicenseCardService:
    """
    Logic for producing a license card PDF from a LicenseSequence.
    """

    def __init__(self, renderer: Optional[LicenseCardRenderer] = None):
        self.renderer = renderer or LicenseCardRenderer()

    def render_pdf_for_sequence(self, seq: LicenseSequence) -> RenderedPdf:
        lic = seq.current
        if not lic:
            raise NoCurrentLicense("No current license found.")

        holder_rel = (
            lic.actors
            .filter(role=LicenseRoleChoices.RINGER)
            .select_related("actor")
            .first()
        )
        holder_name = holder_rel.actor.full_name if holder_rel else ""

        valid_to = lic.ends_at.strftime("%d %B %Y")
        lines_info = [valid_to, seq.mnr, holder_name]

        additions: list[ValueAddition] = []
        if holder_rel and holder_rel.actor.birth_date:
            additions.append(
                ValueAddition(label_id="text5", value=holder_rel.actor.birth_date.isoformat())
            )

        req = RenderRequest(
            template_svg_path=build_default_template_path(),
            additions=additions,
            lines_info=lines_info,
        )

        pdf_bytes = self.renderer.render_pdf_bytes(req)
        filename = f"license-card-{seq.mnr}.pdf"
        return RenderedPdf(filename=filename, pdf_bytes=pdf_bytes)

    @staticmethod
    def as_inline_pdf_response(rendered: RenderedPdf) -> HttpResponse:
        resp = HttpResponse(rendered.pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{rendered.filename}"'
        return resp
