from typing import Iterable
from licensing.models import (
    License,
    LicenseRoleChoices,
)
import urllib.request
import time
import io
import zipfile
from django.conf import settings

def zip_bytes_from_files(files: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files:
            zf.writestr(filename, content)
    buf.seek(0)
    return buf.getvalue()

def get_flattened_license_and_relations(
    licenses: Iterable[License],
    allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.HELPER),
):
    for lic in licenses:
        relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
        if not relations.exists():
            raise ValueError(f"No ringers/helpers on license for mnr {lic.sequence.mnr}.")
        
        for relation in relations:
            yield (lic, relation)

def docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    url = getattr(settings, "DOCX2PDF_URL", None).strip()
    if not url:
        raise RuntimeError("DOCX2PDF_URL is not configured.")

    req = urllib.request.Request(
        url=url,
        data=docx_bytes,
        method="POST",
        headers={
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
    )

    last_err = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = getattr(resp, "status", None) or resp.getcode()
                body = resp.read()
            if status != 200:
                detail = body.decode("utf-8", errors="replace")
                raise RuntimeError(f"DOCX2PDF conversion failed: {status} {detail}")
            return body
        except Exception as e:
            last_err = e
            time.sleep(0.2)
    raise last_err

