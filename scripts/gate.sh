#!/usr/bin/env bash
# Mechanical quality gate, with no large-model tokens:
#   checks -> small-model review -> one automatic fix round for failures -> checks + review again.
# Writes <orch-dir>/gate.md (the only thing the orchestrator needs to read) and prints it.
# Usage: gate.sh <orch-dir> <spec-path-inside-worktree>
# Env:   VERIFY_CMD (checks run in each worktree), FIX_ROUNDS (default 1), AGENT_CMD, TASKS_DIR
set -uo pipefail

ORCH=$(cd "${1:?usage: gate.sh <orch-dir> <spec>}" && pwd)
SPEC=${2:?spec}
HERE=$(cd "$(dirname "$0")" && pwd)
TASKS_DIR=${TASKS_DIR:-specs/tasks}
export TASKS_DIR

names=()
for d in "$ORCH"/*/; do [ -f "$d/.git" ] && names+=("$(basename "$d")"); done

checks() { # name -> "pass" | "fail"
  if [ -z "${VERIFY_CMD:-}" ]; then echo pass; return; fi
  if (cd "$ORCH/$1" && eval "$VERIFY_CMD") > "$ORCH/logs/$1.verify.log" 2>&1; then echo pass; else echo fail; fi
}

gate_round() { # names... -> sets FAILED
  FAILED=()
  local verdicts
  verdicts=$("$HERE/review.sh" "$ORCH" "$SPEC" "$@")
  for n in "$@"; do
    c=$(checks "$n")
    v=$(echo "$verdicts" | awk -v n="$n" '$1==n {print $2}')
    echo "$n checks=$c review=${v:-NO-VERDICT}" >> "$ORCH/gate.rounds"
    if [ "$c" != pass ] || [ "$v" != PASS ]; then FAILED+=("$n"); fi
  done
}

: > "$ORCH/gate.rounds"
echo "round 0" >> "$ORCH/gate.rounds"
gate_round "${names[@]}"

round=1
while [ ${#FAILED[@]} -gt 0 ] && [ $round -le "${FIX_ROUNDS:-1}" ]; do
  for n in "${FAILED[@]}"; do
    task="$ORCH/$n/$TASKS_DIR/$n.md"
    {
      echo
      echo "## Fix round $round"
      echo "Checks and an independent reviewer found problems. Fix them in your owned files only, keep everything that already works, rerun the definition of done, and update your report."
      echo
      echo "### Reviewer findings"
      sed -n '2,40p' "$ORCH/$n/.orch/$n.review.md" 2>/dev/null || echo "- (no review produced)"
      echo
      echo "### Last check output"
      echo '```'
      tail -n 30 "$ORCH/logs/$n.verify.log" 2>/dev/null
      echo '```'
    } >> "$task"
  done
  echo "round $round: re-dispatching ${FAILED[*]}" >> "$ORCH/gate.rounds"
  ONLY="${FAILED[*]}" MODE=headless "$HERE/run.sh" "$ORCH" >> "$ORCH/gate.rounds" 2>&1
  gate_round "${FAILED[@]}"
  round=$((round + 1))
done

{
  echo "# hstack gate"
  echo
  for n in "${names[@]}"; do
    last=$(grep "^$n " "$ORCH/gate.rounds" | tail -1)
    echo "- $last"
  done
  if [ ${#FAILED[@]} -gt 0 ]; then
    echo
    echo "Still failing after ${FIX_ROUNDS:-1} fix round(s): ${FAILED[*]}"
    for n in "${FAILED[@]}"; do
      echo
      echo "## $n"
      sed -n '1,25p' "$ORCH/$n/.orch/$n.review.md" 2>/dev/null
      echo '```'; tail -n 15 "$ORCH/logs/$n.verify.log" 2>/dev/null; echo '```'
    done
  else
    echo
    echo "All packages pass checks and review."
  fi
} > "$ORCH/gate.md"
cat "$ORCH/gate.md"
