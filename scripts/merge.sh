#!/usr/bin/env bash
# Apply worker patches (from collect.sh) to the main repo's working tree. Stops at the first conflict.
# Usage: merge.sh <orch-dir> [name ...]   (default: every patch in <orch-dir>/patches)
set -euo pipefail

ORCH=$(cd "${1:?usage: merge.sh <orch-dir> [name ...]}" && pwd)
shift
REPO=$(cat "$ORCH/REPO")

names=("$@")
if [ ${#names[@]} -eq 0 ]; then
  for p in "$ORCH"/patches/*.patch; do names+=("$(basename "$p" .patch)"); done
fi

cd "$REPO"
for n in "${names[@]}"; do
  p="$ORCH/patches/$n.patch"
  if [ ! -s "$p" ]; then echo "$n: empty patch, skipped"; continue; fi
  if git apply --check --whitespace=nowarn "$p" 2>/tmp/orch-merge.err; then
    git apply --whitespace=nowarn "$p"
    echo "$n: applied"
  else
    echo "$n: CONFLICT, not applied:" >&2
    cat /tmp/orch-merge.err >&2
    exit 1
  fi
done
echo "done. Review with: git -C $REPO status"
