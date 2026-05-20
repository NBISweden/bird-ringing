from typing import Iterable, Callable
from licensing.models import (
    License,
    LicenseRoleChoices,
    DocumentTypeChoices,
    Actor,
    LicenseRelation,
)
from django.db.models import Q
import urllib.request
import time
import io
import zipfile
from django.conf import settings
from contextlib import contextmanager
from django.utils import translation


# A callable type for determining whether to skip license card creation for a given license/actor/relation.
# This is redefined here to avoid circular imports between utils and license_card_service.
ShouldSkipRelationPolicy = Callable[[License, Actor, LicenseRelation], bool]

def zip_bytes_from_files(files: list[tuple[str, bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for filename, content in files:
            zf.writestr(filename, content)
    buf.seek(0)
    return buf.getvalue()

def get_flattened_license_and_relations(
    licenses: Iterable[License],
    allowed_roles: Iterable[int] = (LicenseRoleChoices.RINGER, LicenseRoleChoices.ASSOCIATE_RINGER),
    should_skip: ShouldSkipRelationPolicy | None = None,
):
    for lic in licenses:
        relations = lic.actors.filter(role__in=list(allowed_roles)).select_related("actor")
        if not relations.exists():
            raise ValueError(f"No ringers/associate ringers on license for mnr {lic.sequence.mnr}.")
        
        for relation in relations:
            if should_skip is not None and should_skip(lic, relation.actor, relation):
                continue
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

def default_document_copy_policy(latest: License, previous: License | None):
    if previous is None or latest == previous:
        return

    document_query = previous.documents.filter(
        is_permanent=False,
    ).filter(
        Q(actor__isnull=True) |
        Q(actor__id__in=set(latest.actors.values_list("actor__id", flat=True)))
    )

    has_content_diff = latest.dump_content() != previous.dump_content()

    document_query = (
        document_query.filter(type=DocumentTypeChoices.LICENSE)
        if has_content_diff
        else document_query
    )

    documents_to_copy = list(document_query)
    latest.documents.add(*documents_to_copy)


@contextmanager
def communication_language_context():
    language = getattr(settings, "COMMUNICATION_LANGUAGE_CODE")
    if language:
        with translation.override(language):
            yield
    else:
        yield