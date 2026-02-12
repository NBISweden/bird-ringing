# docx2pdf service (LibreOffice warm converter)

A small HTTP service that keeps a **warm** LibreOffice instance running and converts **DOCX bytes → PDF bytes** on demand.

The service is intended to be run as a sidecar in Docker Compose and called from the Django backend.

## What it does

- Starts LibreOffice once in **headless listener mode** (UNO socket).
- Accepts `POST`ed DOCX bytes on an HTTP endpoint.
- Converts the DOCX to PDF via `unoconv` connected to the warm LibreOffice listener.
- Returns the resulting PDF bytes (`application/pdf`).
- Uses only ephemeral storage for conversion (`/dev/shm` if available, otherwise `/tmp`).

## Endpoints

### Health
- `GET /health`
- `HEAD /health`

Returns `200` if the API is running.

### Convert DOCX to PDF
- `POST /convert/docx-to-pdf`

**Request**
- Body: raw `.docx` bytes
- Header:  
  `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Response**
- `200 OK`
- Content-Type: `application/pdf`
- Body: PDF bytes

Example:

```bash
curl -sS \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @example.docx \
  http://localhost:8000/convert/docx-to-pdf \
  -o out.pdf
```

## How it works (high level)

1. `entrypoint.sh` launches LibreOffice:

- `soffice --headless ... --accept="socket,host=127.0.0.1,port=2002;urp;"`

2. The FastAPI server receives a request, writes input DOCX to a temp path, runs:

- `/usr/bin/python3 /usr/bin/unoconv ... --connection socket,...;urp;StarOffice.ComponentContext`

3. The produced PDF is read back and returned.

LibreOffice stays running between requests, avoiding the startup overhead of spawning `soffice` for each conversion.

## Environment variables

The container supports:

- `LO_HOST` (default: `127.0.0.1`)
- `LO_PORT` (default: `2002`)
- `UNO_URL` (default: `socket,host=127.0.0.1,port=2002;urp;StarOffice.ComponentContext`)

Notes:
- `UNO_URL` must include `StarOffice.ComponentContext` (required by `unoconv`).

## Timeouts and failure behavior

- There is a client-side timeout in-place when calling the service.
- Server-side the service also enforces a conversion timeout (currently set to 30s).

## Performance and concurrency

- LibreOffice is kept warm for lower latency per conversion.
- A single LibreOffice listener is generally safest when used **one conversion at a time**. The service uses a lock to serialize conversions.
- For higher throughput, it is possible to run multiple `docx2pdf` replicas (each with its own LibreOffice listener) behind a load balancer. Not needed for this usecase.

## Security considerations

This service is indented as internal-only; not to be exposed directly to the public internet unless authentication and resource limits are handled.
