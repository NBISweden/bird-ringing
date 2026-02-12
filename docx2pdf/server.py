import os
import uuid
import subprocess
import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import Response

app = FastAPI()

LO_HOST = os.environ.get("LO_HOST", "127.0.0.1")
LO_PORT = os.environ.get("LO_PORT", "2002")
UNO_URL = os.environ.get(
    "UNO_URL",
    f"socket,host={LO_HOST},port={LO_PORT};urp;StarOffice.ComponentContext"
)

# Use RAM-backed temp if available
TMP_ROOT = "/dev/shm" if os.path.isdir("/dev/shm") else "/tmp"

convert_lock = asyncio.Lock()

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"ok": True}

@app.post("/convert/docx-to-pdf", response_class=Response)
async def convert_docx_to_pdf(request: Request):
    docx_bytes = await request.body()
    if not docx_bytes:
        raise HTTPException(status_code=400, detail="Empty body")

    # Basic safeguard
    if len(docx_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    job_id = str(uuid.uuid4())
    in_path = os.path.join(TMP_ROOT, f"{job_id}.docx")
    out_path = os.path.join(TMP_ROOT, f"{job_id}.pdf")

    async with convert_lock:
        try:
            with open(in_path, "wb") as f:
                f.write(docx_bytes)

            cmd = [
                "/usr/bin/python3", "/usr/bin/unoconv",
                "-f", "pdf",
                "-o", out_path,
                "--connection", UNO_URL,
                in_path,
            ]
            # Set a timeout for the conversion process so that it doesn't hang indefinitely
            try:
                p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=504, detail="Conversion timed out")

            if p.returncode != 0 or not os.path.exists(out_path):
                raise HTTPException(
                    status_code=500,
                    detail=(
                        f"Conversion failed. rc={p.returncode} "
                        f"stdout={p.stdout.decode(errors='ignore')} "
                        f"stderr={p.stderr.decode(errors='ignore')}"
                    ),
                )

            with open(out_path, "rb") as f:
                pdf_bytes = f.read()

            return Response(content=pdf_bytes, media_type="application/pdf")

        finally:
            # Cleanup
            for path in (in_path, out_path):
                try:
                    os.remove(path)
                except FileNotFoundError:
                    pass
