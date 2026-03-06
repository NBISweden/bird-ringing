# docx2pdf service (LibreOffice warm converter)

A small HTTP service that keeps a **warm** LibreOffice instance running and converts **DOCX bytes → PDF bytes** on demand.

The service is intended to be run as a sidecar in Docker Compose and called from the Django backend.

## What it does

- Starts LibreOffice once in **headless listener mode** (UNO socket). LibreOffice stays running between requests, avoiding the startup overhead of spawning `soffice` for each conversion.
- Accepts `POST`ed DOCX bytes on an HTTP endpoint.
- Converts the DOCX to PDF via `uno` connected to the warm LibreOffice listener.
- Returns the resulting PDF bytes (`application/pdf`).
- Uses only ephemeral storage for conversion (`/tmp`), cleans up written files after each successful conversion.

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

## Environment variables

The container supports:

- `LO_HOST` (default: `127.0.0.1`)
- `LO_PORT` (default: `2002`)
- `TMPDIR`  (default: `/tmp`)

## Timeouts and failure behavior

- There is a client-side timeout in-place when calling the service.
- Server-side the service also enforces a conversion timeout (currently set to 60s).
- There is a limit to the incoming `docx` size set to 50Mb.

## Performance and concurrency

- LibreOffice is kept warm for lower latency per conversion.
- A single LibreOffice listener is generally safest when used **one conversion at a time**. The service uses a lock to serialize conversions.
- For higher throughput, it is possible to run multiple `docx2pdf` replicas (each with its own LibreOffice listener) behind a load balancer. Not needed for this usecase.

## Security considerations

This service is indented as internal-only; not to be exposed directly to the public internet unless authentication and resource limits are handled.
