#!/usr/bin/env bash
# Build one patch per worker (against the snapshot), list changed files, check lanes, optionally verify.
# Usage: collect.sh <orch-dir> [name ...]
# Env:   TASKS_DIR   (default: specs/tasks)   <name>.owns there = one glob per line of allowed paths
#        VERIFY_CMD  run inside each worktree, e.g. "npx tsc --noEmit && npm run lint && npx vitest run"
# Exit:  1 if any lane violation or verification failure.
set -uo pipefail

ORCH=$(cd "${1:?usage: collect.sh <orch-dir> [name ...]}" && pwd)
shift
SNAP=$(cat "$ORCH/SNAPSHOT")
TASKS_DIR=${TASKS_DIR:-specs/tasks}
mkdir -p "$ORCH/patches"

names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for d in "$ORCH"/*/; do [ -f "$d/.git" ] && names+=("$(basename "$d")"); done
fi

status=0
for n in "${names[@]}"; do
  wt="$ORCH/$n"
  echo "== $n"
  IDX=$(mktemp -u "${TMPDIR:-/tmp}/orch-collect.XXXXXX")
  (
    cd "$wt" || exit 1
    export GIT_INDEX_FILE="$IDX"
    git read-tree "$SNAP"
    git add -A -- . ":(exclude).orch" ":(exclude).hstack" ":(exclude)$TASKS_DIR"
    git diff --cached --binary "$SNAP" > "$ORCH/patches/$n.patch"
    git diff --cached --stat "$SNAP" | tail -1
    git diff --cached --name-only "$SNAP" > "$ORCH/patches/$n.files"
  )
  rm -f "$IDX"

  owns="$wt/$TASKS_DIR/$n.owns"
  if [ -f "$owns" ]; then
    while read -r f; do
      ok=0
      # Tests next to the code are always allowed (set ALLOW_TESTS=0 to disable).
      if [ "${ALLOW_TESTS:-1}" = 1 ] && [[ "$f" == *.test.* || "$f" == *.spec.* ]]; then continue; fi
      while read -r g; do
        [ -z "$g" ] && continue
        case "$g" in \#*) continue ;; esac
        # shellcheck disable=SC2053
        [[ "$f" == $g ]] && { ok=1; break; }
      done < "$owns"
      [ $ok -eq 1 ] || { echo "   LANE VIOLATION: $f"; status=1; }
    done < "$ORCH/patches/$n.files"
  fi

  if [ -n "${VERIFY_CMD:-}" ]; then
    if (cd "$wt" && eval "$VERIFY_CMD") > "$ORCH/logs/$n.verify.log" 2>&1; then
      echo "   verify: pass"
    else
      echo "   verify: FAIL (see $ORCH/logs/$n.verify.log)"; status=1
    fi
  fi
  [ -f "$wt/.orch/$n.report.md" ] && echo "   report: $wt/.orch/$n.report.md" || echo "   report: missing"
  echo "   patch:  $ORCH/patches/$n.patch"
done
exit $status
