from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

import cairosvg
import logging
import textwrap
from lxml import etree

logger = logging.getLogger(__name__)

SVG_NS = "http://www.w3.org/2000/svg"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"svg": SVG_NS}


class _AnchorInfo(NamedTuple):
    x: float
    y: float
    style: str
    transform: str
    anchor_xpath: str

# to be used as a cache for parsed templates and anchor info in an attempt for speed up
_TEMPLATE_CACHE: dict[tuple[str, str], tuple[bytes, _AnchorInfo]] = {}


@dataclass(frozen=True)
class RenderRequest:
    template_svg_path: Path
    lines: list[str]

    placeholder_key: str = "text_placeholder"
    box_id: str = "info_box"
    line_height: float = 20.18522


class LicenseCardRenderer:
    def render_pdf_bytes(self, req: RenderRequest) -> bytes:
        svg_bytes = self._render_svg_bytes(req)
        return cairosvg.svg2pdf(bytestring=svg_bytes)

    def _render_svg_bytes(self, req: RenderRequest) -> bytes:
        if not req.lines:
            raise ValueError("RenderRequest.lines must not be empty")

        template_bytes, anchor = _get_cached_template_and_anchor(req.template_svg_path, req.placeholder_key)
        root = etree.fromstring(template_bytes)

        anchor_nodes = root.xpath(anchor.anchor_xpath)
        if not anchor_nodes:
            raise ValueError("Anchor node not found (cache mismatch?)")
        anchor_node = anchor_nodes[0]

        box = etree.Element(f"{{{SVG_NS}}}text", id=req.box_id)
        box.set(f"{{{XML_NS}}}space", "preserve")

        if anchor.transform:
            box.set("transform", anchor.transform)

        style = anchor.style
        if style and not style.endswith(";"):
            style += ";"
        style += "text-anchor:middle;text-align:center;"

        lines = [ln.strip() for ln in req.lines if ln and ln.strip()]
        for i, line in enumerate(lines):
            tspan = etree.SubElement(box, f"{{{SVG_NS}}}tspan")
            tspan.set("x", str(anchor.x))
            tspan.set("y", str(anchor.y + i * req.line_height))
            if style:
                tspan.set("style", style)
            tspan.text = line

        parent = anchor_node.getparent()
        if parent is None:
            raise ValueError("Anchor <text> has no parent")
        parent.replace(anchor_node, box)

        return etree.tostring(root, encoding="utf-8")

def _get_cached_template_and_anchor(template_path: Path, placeholder_key: str) -> tuple[bytes, _AnchorInfo]:
    cache_key = (str(template_path), placeholder_key)
    cached = _TEMPLATE_CACHE.get(cache_key)
    if cached is not None:
        return cached

    svg = template_path.read_text(encoding="utf-8")

    # Font replacements for Linux compatibility
    svg = svg.replace("font-family:'Segoe UI'", "font-family:'Noto Sans'")
    svg = svg.replace("font-family:'Segoe UI Symbol'", "font-family:'Noto Sans'")

    token = "{{ " + placeholder_key + " }}"
    root = etree.fromstring(svg.encode("utf-8"))

    # Find the <text> node that contains the placeholder somewhere inside.
    anchor = None
    for text_node in root.xpath("//svg:text", namespaces=NS):
        blob = "".join(text_node.itertext())
        if token in blob:
            anchor = text_node
            break
    if anchor is None:
        raise ValueError(f"Could not find <text> containing placeholder '{{{{ {placeholder_key} }}}}' in {template_path}")

    ref = None
    for tspan in anchor.xpath(".//svg:tspan", namespaces=NS):
        blob = "".join(tspan.itertext())
        if token in blob:
            ref = tspan
            break

    if ref is None:
        tspans = anchor.xpath(".//svg:tspan", namespaces=NS)
        ref = tspans[0] if tspans else anchor

    def fattr(node: etree._Element, name: str) -> float:
        v = node.get(name)
        if not v:
            return 0.0
        try:
            return float(v)
        except ValueError:
            return 0.0

    x0 = fattr(ref, "x") or fattr(anchor, "x")
    y0 = fattr(ref, "y") or fattr(anchor, "y")

    style = (ref.get("style") or anchor.get("style") or "").strip()
    transform = (anchor.get("transform") or "").strip()

    anchor_xpath = root.getroottree().getpath(anchor)

    template_bytes = etree.tostring(root, encoding="utf-8")
    info = _AnchorInfo(
        x=x0,
        y=y0,
        style=style,
        transform=transform,
        anchor_xpath=anchor_xpath,
    )

    _TEMPLATE_CACHE[cache_key] = (template_bytes, info)
    return template_bytes, info

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

def split_into_two_lines_textwrap(text: str) -> tuple[str, str]:
    # adjust width as needed based on template design and typical name lengths
    width = 42

    # normalize whitespace and trim
    s = " ".join((text or "").split())
    if not s:
        return ("", "")

    # do not wrap if it already fits
    if len(s) <= width:
        return (s, "")

    # wrap without breaking words if possible, but if the first word is too long, allow breaking it in the second pass
    lines = textwrap.wrap(s, width=width,break_long_words=False, break_on_hyphens=False)
    if lines and len(lines[0]) > width:
        lines = textwrap.wrap(s, width=width, break_long_words=True, break_on_hyphens=False)

    line1 = lines[0] if lines else ""
    remainder = s[len(line1) :].lstrip()
    if not remainder:
        return (line1, "")

    # default behavior (no suffix preservation)
    return (line1, _truncate_with_dots(remainder, width))

def _truncate_with_dots(s: str, max_len: int) -> str:
    s = (s or "").strip()
    if len(s) <= max_len:
        return s
    if max_len <= 1:
        return "."
    return s[: max_len - 1].rstrip() + "."