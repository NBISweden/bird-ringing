#!/bin/sh
set -eu

export HOME="${HOME:-/home/app}"

export LO_HOST="${LO_HOST:-127.0.0.1}"
export LO_PORT="${LO_PORT:-2002}"

# LO/UNO environment
export URE_BOOTSTRAP="${URE_BOOTSTRAP:-vnd.sun.star.pathname:/usr/lib/libreoffice/program/fundamentalrc}"
export PYTHONPATH="/usr/lib/libreoffice/program:${PYTHONPATH:-}"

# Profile dir
export LO_PROFILE_DIR="${LO_PROFILE_DIR:-/tmp/lo-profile}"
mkdir -p "$LO_PROFILE_DIR"

soffice \
  --headless \
  --nologo \
  --nofirststartwizard \
  --norestore \
  --nodefault \
  --nolockcheck \
  -env:UserInstallation="file://${LO_PROFILE_DIR}" \
  --accept="socket,host=${LO_HOST},port=${LO_PORT};urp;" \
  >/tmp/soffice.stdout 2>/tmp/soffice.stderr &

# Wait until LO is listening
i=0
until wget --spider http://127.0.0.1:2002 >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -gt 10 ]; then
    echo "LibreOffice did not start listening on ${LO_HOST}:${LO_PORT}" >&2
    echo "--- soffice.stderr ---" >&2
    tail -200 /tmp/soffice.stderr >&2 || true
    exit 1
  fi
  sleep 0.5
done

exec uvicorn server:app --host 0.0.0.0 --port 8000