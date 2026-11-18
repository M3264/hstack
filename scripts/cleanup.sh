#!/usr/bin/env bash
# Remove the worker worktrees and their orch/* branches. Logs and patches in <orch-dir> are kept.
# Usage: cleanup.sh <orch-dir> --yes
set -euo pipefail

ORCH=$(cd "${1:?usage: cleanup.sh <orch-dir> --yes}" && pwd)
if [ "${2:-}" != "--yes" ]; then
  echo "This removes every worktree in $ORCH and its orch/<name> branch (uncommitted worker changes are lost)."
  echo "Collect patches first (collect.sh). Re-run with --yes to proceed."
  exit 1
fi

REPO=$(cat "$ORCH/REPO")
for d in "$ORCH"/*/; do
  [ -f "$d/.git" ] || continue
  n=$(basename "$d")
  git -C "$REPO" worktree remove --force "$d" && echo "removed worktree $n"
  git -C "$REPO" branch -D "orch/$n" >/dev/null 2>&1 && echo "deleted branch orch/$n"
done
git -C "$REPO" worktree prune
echo "kept: $ORCH/logs, $ORCH/patches"
