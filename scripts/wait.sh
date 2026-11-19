#!/usr/bin/env bash
# Used by the senior engineer (frontier model): block until the lead needs you, then print one line:
#   EVENT <id> <path-to-event-file>   an event without a directive yet; read it, answer with direct.sh
#   EXITED <code>                     the lead process ended (read its last event and log tail)
# Run it in the background with a completion notification; never poll. Waiting costs no tokens.
# Usage: wait.sh <worktree> [timeout-minutes, default 240]
set -uo pipefail
WT=$(cd "${1:?usage: wait.sh <worktree> [timeout-min]}" && pwd)
end=$(( SECONDS + ${2:-240} * 60 ))
while :; do
  for e in $(ls "$WT/.hstack/events" 2>/dev/null | sort); do
    id=${e%%-*}
    if [ ! -s "$WT/.hstack/directives/$id.md" ]; then
      echo "EVENT $id $WT/.hstack/events/$e"; exit 0
    fi
  done
  if [ -f "$WT/.hstack/lead.exit" ]; then echo "EXITED $(cat "$WT/.hstack/lead.exit")"; exit 0; fi
  [ $SECONDS -ge $end ] && { echo "TIMEOUT"; exit 0; }
  sleep 5
done
