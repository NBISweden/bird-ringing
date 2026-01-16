from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.conf import settings
from lxml import etree
import cairosvg


SVG_NS = "http://www.w3.org/2000/svg"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"svg": SVG_NS}

DEFAULT_INFO_LABEL_ID = "text4"


@dataclass(frozen=True)
class RenderRequest:
    template_svg_path: Path
    lines_info: list[str]
    info_label_id: str = DEFAULT_INFO_LABEL_ID


class LicenseCardRenderer:
    def render_pdf_bytes(self, req: RenderRequest) -> bytes:
        svg_bytes = self._render_svg_bytes(req)
        return cairosvg.svg2pdf(bytestring=svg_bytes)

    def _render_svg_bytes(self, req: RenderRequest) -> bytes:
        if len(req.lines_info) != 3:
            raise ValueError("lines_info must contain exactly 3 strings")

        # This is adedd here to ensure compatibility with linux fonts
        svg = req.template_svg_path.read_text(encoding="utf-8")
        svg = svg.replace("font-family:'Segoe UI'", "font-family:'Noto Sans Light'")

        root = etree.fromstring(svg.encode("utf-8"))

        self._add_info_box_above_label(root, label_id=req.info_label_id, lines_info=req.lines_info)

        return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)

    def _add_info_box_above_label(self, root, *, label_id: str, lines_info: list[str]) -> None:
        label = root.xpath(f"//svg:text[@id='{label_id}']", namespaces=NS)
        if not label:
            raise ValueError(f"Missing <text id='{label_id}'>")
        label = label[0]

        ts = label.xpath(".//svg:tspan", namespaces=NS)
        if not ts:
            raise ValueError(f"<text id='{label_id}'> has no <tspan>")
        ts = ts[0]

        box_id = "info_box"
        if root.xpath(f"//*[@id='{box_id}']"):
            raise ValueError(f"ID already exists: {box_id}")

        box_text = etree.Element(f"{{{SVG_NS}}}text", id=box_id)
        box_text.set(f"{{{XML_NS}}}space", "preserve")

        orig_transform = label.get("transform") or ""
        box_text.set("transform", f"{orig_transform} translate(0,-90)".strip())

        x0 = float(ts.get("x") or label.get("x") or "0")
        y0 = float(ts.get("y") or label.get("y") or "0")
        style = ts.get("style")

        prefixes = ["Giltig t.o.m ", "Märkare nr. ", ""]
        line_height = 12.0

        for i, (prefix, line) in enumerate(zip(prefixes, lines_info, strict=True)):
            t = etree.SubElement(box_text, f"{{{SVG_NS}}}tspan")
            t.set("x", str(x0))
            t.set("y", str(y0 + i * line_height))
            if style:
                t.set("style", style)
            t.text = prefix + line

        parent = label.getparent()
        parent.insert(parent.index(label), box_text)


def build_default_template_path() -> Path:
    configured = getattr(settings, "LICENSING_CARD_TEMPLATE", None)
    if configured:
        return Path(configured)
