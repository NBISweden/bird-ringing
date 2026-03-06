#!/bin/sh -
set -u

LO_HOST="${LO_HOST:-127.0.0.1}"
LO_PORT="${LO_PORT:-2002}"

LO_PROFILE_DIR="${LO_PROFILE_DIR:-"${TMPDIR:-/tmp}"/lo-profile}"
mkdir -p "$LO_PROFILE_DIR" || exit

soffice --headless \
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
while ! nc -z "$LO_HOST" "$LO_PORT" 2>/dev/null
do
	sleep 1

	i=$((i+1))
	if [ "$i" -gt 10 ]; then
		printf "LibreOffice did not start listening on %s:%s\n" "$LO_HOST" "$LO_PORT"
		echo '--- soffice.stderr ---'
		cat /tmp/soffice.stderr
		echo '--- soffice.stdout ---'
		cat /tmp/soffice.stdout
		exit 1
	fi >&2
done

exec uvicorn server:app --host 0.0.0.0 --port 8000
