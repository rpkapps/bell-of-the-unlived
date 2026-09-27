#!/bin/sh
# (Re)start the academy dev server on :5212 without HMR/file watching (other agents edit the tree).
SP=${SCRATCH:-/tmp}
for p in $(ps aux | grep "[p]ort 5212" | awk "{print \$2}"); do kill $p 2>/dev/null; done; sleep 1
[ "$1" = "stop" ] && exit 0
nohup npx vite --config tools/vite.test.config.ts --port 5212 --strictPort > "$SP/academy-vite.log" 2>&1 &
echo $! > "$SP/academy-vite.pid"
sleep 4
tail -2 "$SP/academy-vite.log"
