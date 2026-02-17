import os
import uuid
import asyncio

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.connection import NoConnectException
from com.sun.star.io import IOException as UnoIOException
from com.sun.star.lang import DisposedException, IllegalArgumentException

app = FastAPI()

LO_HOST = os.environ.get("LO_HOST", "127.0.0.1")
LO_PORT = int(os.environ.get("LO_PORT", "2002"))

TMP_DIR = os.environ.get("TMPDIR", "/tmp")

convert_lock = asyncio.Lock()


def _prop(name: str, value) -> PropertyValue:
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def _connect_to_lo():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )

    uno_url = f"uno:socket,host={LO_HOST},port={LO_PORT};urp;StarOffice.ComponentContext"
    ctx = resolver.resolve(uno_url)

    smgr = ctx.ServiceManager
    lo_instance = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    return lo_instance


def _convert_docx_to_pdf(in_path: str, out_path: str):
    lo_instance = _connect_to_lo()
    in_url = uno.systemPathToFileUrl(in_path)
    out_url = uno.systemPathToFileUrl(out_path)

    load_props = (
        _prop("Hidden", True),
        _prop("ReadOnly", True),
    )

    doc = None
    try:
        doc = lo_instance.loadComponentFromURL(in_url, "_blank", 0, load_props)

        export_props = (
            _prop("FilterName", "writer_pdf_Export"),
        )
        doc.storeToURL(out_url, export_props)
    finally:
        if doc is not None:
            try:
                doc.close(True)
            except Exception:
                try:
                    doc.dispose()
                except Exception:
                    pass


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    try:
        lo_instance = _connect_to_lo()
        _ = lo_instance.getComponents()
        return {"ok": True, "lo": "reachable"}
    except Exception as e:
        return {"ok": False, "lo": "unreachable", "error": str(e)}


@app.post("/convert/docx-to-pdf", response_class=Response)
async def convert_docx_to_pdf(request: Request):
    docx_bytes = await request.body()
    if not docx_bytes:
        raise HTTPException(status_code=400, detail="Empty body")
    # we do not expect docx files larger than 50MB
    if len(docx_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    job_id = str(uuid.uuid4())
    in_path = os.path.join(TMP_DIR, f"{job_id}.docx")
    out_path = os.path.join(TMP_DIR, f"{job_id}.pdf")

    async with convert_lock:
        try:
            with open(in_path, "wb") as f:
                f.write(docx_bytes)

            def _do():
                _convert_docx_to_pdf(in_path, out_path)

            try:
                await asyncio.wait_for(asyncio.to_thread(_do), timeout=60)
            except asyncio.TimeoutError:
                raise HTTPException(status_code=504, detail="Conversion timed out")
            except NoConnectException as e:
                raise HTTPException(status_code=503, detail=f"LibreOffice not reachable: {e}")
            except (DisposedException, UnoIOException, IllegalArgumentException) as e:
                raise HTTPException(status_code=500, detail=f"LibreOffice conversion error: {e}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Conversion failed: {e}")

            if not os.path.exists(out_path):
                raise HTTPException(status_code=500, detail="Conversion produced no PDF")

            with open(out_path, "rb") as f:
                return Response(content=f.read(), media_type="application/pdf")
        # Cleanup temp files
        finally:
            for p in (in_path, out_path):
                try:
                    os.remove(p)
                except FileNotFoundError:
                    pass
