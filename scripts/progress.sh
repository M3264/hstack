#!/usr/bin/env bash
# Live view of what each worker is writing. Refreshes every 2s. Ctrl+C to quit.
# Usage: progress.sh <orch-dir>     (ONCE=1 prints one frame and exits)
ORCH=$(cd "${1:?usage: progress.sh <orch-dir>}" && pwd)
TASKS_DIR=${TASKS_DIR:-specs/tasks}

while :; do
  clear
  printf '\033[2morchestration · %s · Ctrl+C closes this view only\033[0m\n' "$(date +%T)"
  for d in "$ORCH"/*/; do
    [ -f "$d/.git" ] || continue
    n=$(basename "$d")
    if [ -f "$ORCH/.status/$n.exit" ]; then state="DONE (exit $(cat "$ORCH/.status/$n.exit"))"; else state="working..."; fi
    printf '\n\033[1m== %s  %s\033[0m\n' "$n" "$state"

    files=$(cd "$d" && git status --short -uall | sed -E 's/^.{3}//' | grep -v "^$TASKS_DIR/" | grep -v '^\.orch/')
    if [ -z "$files" ]; then echo "   (no files yet)"; continue; fi

    echo "$files" | head -10 | while read -r f; do
      printf '   %-58s %5s lines\n' "$f" "$(wc -l < "$d/$f" 2>/dev/null | tr -d ' ')"
    done
    total=$(echo "$files" | wc -l | tr -d ' ')
    [ "$total" -gt 10 ] && echo "   ... and $((total - 10)) more"

    newest=$(cd "$d" && echo "$files" | while read -r f; do
      [ -f "$f" ] && { stat -f '%m %N' "$f" 2>/dev/null || stat -c '%Y %n' "$f"; }
    done | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$newest" ]; then
      printf '   \033[2mlatest edit: %s\033[0m\n' "$newest"
      tail -n 5 "$d/$newest" | cut -c1-110 | sed 's/^/   | /'
    fi
  done
  [ -n "${ONCE:-}" ] && exit 0
  sleep 2
done
