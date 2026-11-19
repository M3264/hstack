#!/usr/bin/env bash
# Used by the senior engineer: answer event <id>. The directive is read from stdin or the 3rd argument.
# The first line must be APPROVE, REVISE or ANSWER; then terse WHY / WHAT / HOW lines if needed.
# Usage: direct.sh <worktree> <event-id> ["APPROVE"]   or   direct.sh <worktree> <event-id> < directive.md
set -euo pipefail
WT=$(cd "${1:?usage: direct.sh <worktree> <event-id> [text]}" && pwd)
ID=${2:?event-id}
mkdir -p "$WT/.hstack/directives"
tmp="$WT/.hstack/directives/.$ID.tmp"
if [ $# -ge 3 ]; then printf '%s\n' "$3" > "$tmp"; else cat > "$tmp"; fi
case "$(head -1 "$tmp" | tr -d '[:space:]')" in
  APPROVE|REVISE|ANSWER) ;;
  *) rm -f "$tmp"; echo "first line must be APPROVE, REVISE or ANSWER" >&2; exit 2 ;;
esac
mv "$tmp" "$WT/.hstack/directives/$ID.md"   # atomic: the lead never sees a half-written file
echo "sent directive $ID"
