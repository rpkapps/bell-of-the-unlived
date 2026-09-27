#!/bin/sh
# Restart the no-reload test server on :5191 (picks up source changes). Tracks its PID in a file.
PIDF=/tmp/vite5191.pid
[ -f $PIDF ] && kill "$(cat $PIDF)" 2>/dev/null
fuser -k 5191/tcp >/dev/null 2>&1
sleep 1
nohup node node_modules/vite/bin/vite.js --config tools/vite.test.config.ts > /tmp/vite5191.log 2>&1 &
echo $! > $PIDF
sleep 4
