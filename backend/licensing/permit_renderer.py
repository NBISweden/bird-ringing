from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
import datetime
import io
from collections import OrderedDict

from docxtpl import DocxTemplate, RichText

from django.utils import translation
from django.utils.formats import date_format
from django.db.models import Prefetch

from licensing.models import (
    License,
    Actor,
    LicensePermission,
    Species,
    LicensePermissionProperty,
)


@dataclass(frozen=True)
class PermitRenderRequest:
    template_docx_path: Path
    lic: License
    actor: Actor
    date: datetime.date


class PermitDocxRenderer:
    """
    Render a DOCX document with a section describing the license's permissions in a human-friendly way.
    Layout:
      Permission type (bold)

      [Condition block header]          (only if non-empty)
        Location                         (only if location exists; INDENTED + BOLD)
          - description line
          - Species: ...                  (always last)
    """

    # Options to format layout
    MAX_INLINE_SPECIES = 6
    BLANK_LINE_BETWEEN_TYPES = True
    BLANK_LINE_BETWEEN_CONDITIONS = True
    BLANK_LINE_BETWEEN_LOCATIONS = False
    LOCATION_INDENT = 2
    ITEM_PREFIX = "- "
    ITEM_INDENT_NO_LOC = 0
    ITEM_INDENT_WITH_LOC = 4

    # Hardcoded property names that are needed for formatting logic.
    # These must match the actual property names in the database.
    PROP_BREEDING = "Under häckningstid"
    PROP_NONBREEDING = "Under icke häckningstid"

    def get_permissions_for_license(self, lic: License) -> list[LicensePermission]:
        """
        Fetch permissions + required relations in a query-efficient way.
        Returned list is suitable for both fingerprinting and DOCX rendering.
        Note: Ordering here is inherited by both the fingerprint and the DOCX renderer.
        """
        qs = (
            lic.permissions.select_related("type")
            .prefetch_related(
                Prefetch(
                    "properties",
                    queryset=LicensePermissionProperty.objects.order_by("name"),
                ),
                Prefetch(
                    "species_list",
                    queryset=Species.objects.order_by("name"),
                ),
            )
            .order_by("id")
        )
        return list(qs)

    def build_context_fingerprint(
        self,
        *,
        lic: License,
        actor: Actor,
        permissions: list[LicensePermission] | None = None,
    ) -> dict[str, Any]:
        perms = permissions if permissions is not None else self.get_permissions_for_license(lic)

        permits: list[dict[str, Any]] = []
        for perm in perms:
            permits.append(
                {
                    "type_name": perm.type.name,
                    "location": (perm.location or "").strip(),
                    "description": (perm.description or "").strip(),
                    "starts_at": perm.starts_at.isoformat() if perm.starts_at else None,
                    "ends_at": perm.ends_at.isoformat() if perm.ends_at else None,
                    "properties": [p.name for p in perm.properties.all()],
                    "species": [s.name for s in perm.species_list.all()],
                }
            )

        return {
            "full_name": actor.full_name,
            "address": self.format_actor_address(actor),
            "permits": permits,
        }

    @staticmethod
    def format_actor_address(actor: Actor) -> str:
        """
        Returns a multi-line address string for {{ address }} in the template.
        Skips empty parts gracefully.
        """
        lines: list[str] = []

        street = (actor.address or "").strip()
        if street:
            lines.append(street)

        postal = (actor.postal_code or "").strip()
        city = (actor.city or "").strip()
        postal_city = " ".join([p for p in (postal, city) if p]).strip()
        if postal_city:
            lines.append(postal_city)

        return "\n".join(lines)

    def _join_sv_list(self, items: list[str]) -> str:
        items = [i.strip() for i in items if i and i.strip()]
        if not items:
            return ""
        if len(items) == 1:
            return items[0]
        if len(items) == 2:
            return f"{items[0]} och {items[1]}"
        return f"{', '.join(items[:-1])} och {items[-1]}"

    def _norm_props(self, props: Iterable[str]) -> tuple[str, ...]:
        return tuple(sorted([p.strip() for p in props if p and p.strip()]))

    def _format_species_line(self, species: list[str]) -> str:
        if len(species) <= self.MAX_INLINE_SPECIES:
            return f"Arter: {self._join_sv_list(species)}"
        return "Arter: " + ", ".join(species)

    def _format_date_sv(self, d: datetime.date) -> str:
        """
        Returns Swedish short date as "jul 15" (month abbrev first).
        """
        with translation.override("sv"):
            day = date_format(d, "j", use_l10n=True)
            month = date_format(d, "b", use_l10n=True)
        month = (month or "").strip().lower()
        return f"{month} {day}".strip()

    def _period_label(self, *, starts_at, ends_at, props: tuple[str, ...]) -> str:
        """
        Default: YYYY-MM-DD.
        Exception: if props contains "Under häckningstid" or "Under icke häckningstid".
        """
        if not starts_at and not ends_at:
            return ""

        is_breeding_related = (self.PROP_BREEDING in props) or (self.PROP_NONBREEDING in props)

        def fmt(d: datetime.date) -> str:
            return self._format_date_sv(d) if is_breeding_related else d.strftime("%Y-%m-%d")

        if starts_at and ends_at:
            return f"{fmt(starts_at)} – {fmt(ends_at)}"
        if starts_at:
            return f"fr.o.m. {fmt(starts_at)}"
        return f"t.o.m. {fmt(ends_at)}"

    def _condition_header(self, props: tuple[str, ...], period: str) -> str:
        bits: list[str] = []
        if props:
            bits.append(", ".join(props))
        if period:
            bits.append(period)
        return " | ".join(bits)

    def _rt_line(self, rt: RichText, text: str = "", *, bold: bool = False, indent: int = 0) -> None:
        if text is None:
            text = ""
        if text == "":
            rt.add("\n")
            return
        rt.add((" " * indent) + text, bold=bold)
        rt.add("\n")


    def _build_permit_section_richtext(
        self,
        *,
        lic: License,
        permissions: list[LicensePermission] | None = None,
    ) -> RichText:
        rt = RichText()

        perms = permissions if permissions is not None else self.get_permissions_for_license(lic)

        if not perms:
            rt.add("— Inga tillstånd registrerade —")
            return rt

        by_type: "OrderedDict[str, list[LicensePermission]]" = OrderedDict()
        for p in perms:
            by_type.setdefault(p.type.name, []).append(p)

        first_type = True

        for type_name, rows in by_type.items():
            if not first_type and self.BLANK_LINE_BETWEEN_TYPES:
                self._rt_line(rt)
            first_type = False

            self._rt_line(rt, type_name, bold=True)

            no_loc = [p for p in rows if not (p.location or "").strip()]
            has_loc = [p for p in rows if (p.location or "").strip()]
            ordered_rows = [*no_loc, *has_loc]

            blocks: "OrderedDict[tuple[tuple[str, ...], str], list[LicensePermission]]" = OrderedDict()
            for p in ordered_rows:
                props = self._norm_props([x.name for x in p.properties.all()])
                period = self._period_label(starts_at=p.starts_at, ends_at=p.ends_at, props=props)
                blocks.setdefault((props, period), []).append(p)

            first_cond = True

            for (props, period), block_rows in blocks.items():
                cond_header = self._condition_header(props, period)

                if not first_cond and self.BLANK_LINE_BETWEEN_CONDITIONS:
                    self._rt_line(rt)
                first_cond = False

                if cond_header:
                    self._rt_line(rt, cond_header)

                by_loc: "OrderedDict[str, list[LicensePermission]]" = OrderedDict()
                for p in block_rows:
                    loc = (p.location or "").strip()
                    by_loc.setdefault(loc, []).append(p)

                loc_order = list(by_loc.keys())
                if "" in by_loc:
                    loc_order = [""] + [l for l in loc_order if l != ""]

                first_loc = True

                for loc in loc_order:
                    loc_rows = by_loc[loc]

                    if loc and not first_loc and self.BLANK_LINE_BETWEEN_LOCATIONS:
                        self._rt_line(rt)
                    first_loc = False

                    if loc:
                        self._rt_line(rt, loc, bold=True, indent=self.LOCATION_INDENT)

                    for p in loc_rows:
                        desc = (p.description or "").strip()
                        species = [s.name for s in p.species_list.all()]
                        species = [s.strip() for s in species if s and s.strip()]

                        item_indent = self.ITEM_INDENT_WITH_LOC if loc else self.ITEM_INDENT_NO_LOC

                        if desc:
                            for line in desc.splitlines():
                                line = line.strip()
                                if line:
                                    self._rt_line(rt, f"{self.ITEM_PREFIX}{line}", indent=item_indent)

                        if species:
                            self._rt_line(
                                rt,
                                f"{self.ITEM_PREFIX}{self._format_species_line(species)}",
                                indent=item_indent,
                            )

        return rt

    def render_docx_bytes(
        self,
        req: PermitRenderRequest,
        *,
        permissions: list[LicensePermission] | None = None,
    ) -> bytes:
        doc = DocxTemplate(str(req.template_docx_path))

        context = {
            "date": req.date,
            "full_name": req.actor.full_name,
            "address": self.format_actor_address(req.actor),
            "permit_section_rich": self._build_permit_section_richtext(
                lic=req.lic,
                permissions=permissions,
            ),
        }

        doc.render(context)

        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()