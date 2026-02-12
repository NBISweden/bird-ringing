import urllib.request
import time

from django.conf import settings


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
