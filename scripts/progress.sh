#!/usr/bin/env bash
# Live view of an hstack task: lead status, events and directives, and the files being written.
# Refreshes every 2s. Ctrl+C closes the view only. ONCE=1 prints one frame and exits.
# Usage: progress.sh <worktree>
WT=$(cd "${1:?usage: progress.sh <worktree>}" && pwd)

while :; do
  clear
  printf '\033[2mhstack · %s · %s · Ctrl+C closes this view only\033[0m\n' "$(basename "$WT")" "$(date +%T)"
  if [ -f "$WT/.hstack/lead.exit" ]; then state="lead exited ($(cat "$WT/.hstack/lead.exit"))"; else state="lead working..."; fi
  printf '\n\033[1m%s\033[0m\n' "$state"

  printf '\n\033[1mCheckpoints\033[0m\n'
  for e in $(ls "$WT/.hstack/events" 2>/dev/null | sort); do
    id=${e%%-*}
    d="$WT/.hstack/directives/$id.md"
    if [ -s "$d" ]; then ans="-> $(head -1 "$d")"; else ans="-> waiting for senior engineer"; fi
    printf '   %-32s %s\n' "$e" "$ans"
  done
  [ -z "$(ls "$WT/.hstack/events" 2>/dev/null)" ] && echo "   (none yet)"

  printf '\n\033[1mFiles\033[0m\n'
  files=$(cd "$WT" && git status --short -uall | sed -E 's/^.{3}//' | grep -v '^\.hstack/' | grep -v '^\.orch/')
  if [ -z "$files" ]; then echo "   (no files yet)"; else
    echo "$files" | head -15 | while read -r f; do
      printf '   %-58s %5s lines\n' "$f" "$(wc -l < "$WT/$f" 2>/dev/null | tr -d ' ')"
    done
    total=$(echo "$files" | wc -l | tr -d ' ')
    [ "$total" -gt 15 ] && echo "   ... and $((total - 15)) more"
    newest=$(cd "$WT" && echo "$files" | while read -r f; do
      [ -f "$f" ] && { stat -f '%m %N' "$f" 2>/dev/null || stat -c '%Y %n' "$f"; }
    done | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$newest" ]; then
      printf '   \033[2mlatest edit: %s\033[0m\n' "$newest"
      tail -n 6 "$WT/$newest" | cut -c1-110 | sed 's/^/   | /'
    fi
  fi
  [ -n "${ONCE:-}" ] && exit 0
  sleep 2
done
