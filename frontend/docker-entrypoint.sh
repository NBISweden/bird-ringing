#!/bin/sh -

set -u

run_md5sum () {
	find node_modules -type f -exec md5sum {} + | sort | md5sum
}

echo 'Do we need "npm ci"?' >&2

if [ ! -d node_modules ] || [ ! -f node_modules.md5 ] ||
   [ package-lock.json -nt node_modules ] ||
   [ package-lock.json -nt node_modules.md5 ] ||
   [ "$(cat node_modules.md5)" != "$(run_md5sum)" ]
then
	echo 'Yes, running "npm ci"...' >&2
	npm ci &&
	run_md5sum >node_modules.md5
else
	echo 'No, skipping "npm ci".' >&2
fi

if [ "$SERVICE_MODE" = development ]
then
	exec npm run dev
fi
