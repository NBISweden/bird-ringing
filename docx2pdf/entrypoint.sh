#!/bin/sh
set -eu

export HOME=/tmp

export LO_HOST="${LO_HOST:-127.0.0.1}"
export LO_PORT="${LO_PORT:-2002}"
export UNO_URL="${UNO_URL:-socket,host=${LO_HOST},port=${LO_PORT};urp;StarOffice.ComponentContext}"

export URE_BOOTSTRAP="${URE_BOOTSTRAP:-vnd.sun.star.pathname:/usr/lib/libreoffice/program/fundamentalrc}"
export PYTHONPATH="/usr/lib/libreoffice/program:${PYTHONPATH:-}"

soffice \
  --headless \
  --nologo \
  --nofirststartwizard \
  --norestore \
  --nodefault \
  --nolockcheck \
  --accept="socket,host=${LO_HOST},port=${LO_PORT};urp;" \
  >/tmp/soffice.stdout 2>/tmp/soffice.stderr &

sleep 1
exec uvicorn server:app --host 0.0.0.0 --port 8000
