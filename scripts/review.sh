#!/usr/bin/env bash
# Run one small-model reviewer per worktree, in parallel, then print each verdict.
# Usage: review.sh <orch-dir> <spec-path-inside-worktree> [name ...]
# Env:   AGENT_CMD (default: muse exec --json --prompt-file {prompt}), TASKS_DIR (default: specs/tasks)
# Output lines: "<name> PASS|FAIL|NO-VERDICT"; review file at <worktree>/.orch/<name>.review.md
set -uo pipefail

ORCH=$(cd "${1:?usage: review.sh <orch-dir> <spec> [name ...]}" && pwd)
SPEC=${2:?spec}; shift 2
HERE=$(cd "$(dirname "$0")/.." && pwd)
AGENT_CMD=${AGENT_CMD:-"muse exec --json --prompt-file {prompt}"}
TASKS_DIR=${TASKS_DIR:-specs/tasks}
SNAP=$(cat "$ORCH/SNAPSHOT")
mkdir -p "$ORCH/logs"

names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for d in "$ORCH"/*/; do [ -f "$d/.git" ] && names+=("$(basename "$d")"); done
fi

pids=()
for n in "${names[@]}"; do
  wt="$ORCH/$n"; mkdir -p "$wt/.orch"; rm -f "$wt/.orch/$n.review.md"
  prompt="$wt/.orch/reviewer.prompt.md"
  sed -e "s#{{NAME}}#$n#g" -e "s#{{TASK}}#$TASKS_DIR/$n.md#g" -e "s#{{SPEC}}#$SPEC#g" -e "s#{{SNAPSHOT}}#$SNAP#g" \
      "$HERE/templates/reviewer.md" > "$prompt"
  ( cd "$wt" && ${AGENT_CMD//\{prompt\}/$prompt} > "$ORCH/logs/$n.review.log" 2>&1 ) &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done

for n in "${names[@]}"; do
  f="$ORCH/$n/.orch/$n.review.md"
  v=$(head -1 "$f" 2>/dev/null | sed -n 's/^VERDICT: *//p')
  echo "$n ${v:-NO-VERDICT}"
done
