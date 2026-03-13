from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.template import Template, Context
from django.utils.html import escape
import cairosvg
import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RenderRequest:
    template_svg_path: Path
    context: dict[str, object]


class LicenseCardRenderer:
    def render_pdf_bytes(self, req: RenderRequest) -> bytes:
        svg_bytes = self._render_svg_bytes(req)
        return cairosvg.svg2pdf(bytestring=svg_bytes)

    def _render_svg_bytes(self, req: RenderRequest) -> bytes:
        svg = req.template_svg_path.read_text(encoding="utf-8")
        # This is added here to ensure compatibility with linux fonts
        svg = svg.replace("font-family:'Segoe UI'", "font-family:'Noto Sans Light'")

        safe_ctx: dict[str, object] = {}
        for k, v in (req.context or {}).items():
            safe_ctx[k] = escape(v) if isinstance(v, str) else v

        rendered = Template(svg).render(Context(safe_ctx))
        return rendered.encode("utf-8")

def get_template_path(setting_name: str) -> Path:
    configured = getattr(settings, setting_name, None)
    if not configured:
        logger.error("%s is not configured", setting_name)
        raise ImproperlyConfigured(f"{setting_name} is not configured.")

    p = Path(configured)
    if not p.exists():
        logger.error("%s does not exist: %s", setting_name, p)
        raise ImproperlyConfigured(f"{setting_name} does not exist: {p}")

    if not p.is_file():
        logger.error("%s is not a file: %s", setting_name, p)
        raise ImproperlyConfigured(f"{setting_name} is not a file: {p}")

    return p