#!/usr/bin/env bash
# Snapshot the repo's working tree and create one git worktree per work package.
# Usage: setup.sh <repo> <orch-dir> <name> [<name> ...]
# Env:   LINK_DIRS  space-separated git-ignored dirs to symlink into each worktree (default: node_modules)
#        SETUP_CMD  command to run inside each worktree after creation (e.g. "npx next typegen")
set -euo pipefail

if [ $# -lt 3 ]; then
  echo "usage: setup.sh <repo> <orch-dir> <name> [<name> ...]" >&2
  exit 2
fi

REPO=$(cd "$1" && pwd)
mkdir -p "$2"
ORCH=$(cd "$2" && pwd)
shift 2

cd "$REPO"
git rev-parse --verify HEAD >/dev/null

# Snapshot = HEAD + every uncommitted change (respecting .gitignore), without touching the real index or branch.
IDX=$(mktemp -u "${TMPDIR:-/tmp}/orch-index.XXXXXX")
trap 'rm -f "$IDX"' EXIT
GIT_INDEX_FILE="$IDX" git read-tree HEAD
GIT_INDEX_FILE="$IDX" git add -A
TREE=$(GIT_INDEX_FILE="$IDX" git write-tree)
SNAP=$(git commit-tree "$TREE" -p HEAD -m "orchestration snapshot")

mkdir -p "$ORCH/.status" "$ORCH/logs" "$ORCH/patches" "$ORCH/.run"
echo "$SNAP" > "$ORCH/SNAPSHOT"
echo "$REPO" > "$ORCH/REPO"

for name in "$@"; do
  wt="$ORCH/$name"
  if [ -e "$wt" ]; then
    echo "error: $wt already exists (run cleanup.sh first)" >&2
    exit 1
  fi
  git worktree add -q -b "orch/$name" "$wt" "$SNAP"
  for d in ${LINK_DIRS:-node_modules}; do
    [ -e "$REPO/$d" ] && ln -s "$REPO/$d" "$wt/$d"
  done
  mkdir -p "$wt/.orch"
  if [ -n "${SETUP_CMD:-}" ]; then
    (cd "$wt" && eval "$SETUP_CMD") >/dev/null 2>&1 || echo "warning: SETUP_CMD failed in $name" >&2
  fi
  echo "worktree ready: $wt (branch orch/$name)"
done

echo "snapshot: $SNAP"
