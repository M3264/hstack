#!/usr/bin/env bash
# Used by the lead: block until the senior engineer answers event <id>, then print the directive.
# Prints "STILL_WAITING" after AWAIT_MAX seconds (default 280) so a tool-call timeout never
# kills the wait; the lead simply runs it again. Waiting costs no model tokens.
# Usage (from the worktree): await.sh <event-id>
set -uo pipefail
ID=${1:?usage: await.sh <event-id>}
f=".hstack/directives/$ID.md"
end=$(( SECONDS + ${AWAIT_MAX:-280} ))
until [ -s "$f" ]; do
  [ $SECONDS -ge $end ] && { echo "STILL_WAITING (run await.sh $ID again)"; exit 0; }
  sleep 3
done
cat "$f"
