#!/bin/sh
# (Re)start the academy dev server on :5212 without HMR/file watching (other agents edit the tree).
SP=${SCRATCH:-/tmp}
if [ -f "$SP/academy-vite.pid" ]; then kill "$(cat "$SP/academy-vite.pid")" 2>/dev/null; sleep 1; fi
[ "$1" = "stop" ] && exit 0
nohup npx vite --config tools/vite.test.config.ts --port 5212 --strictPort > "$SP/academy-vite.log" 2>&1 &
echo $! > "$SP/academy-vite.pid"
sleep 4
tail -2 "$SP/academy-vite.log"
