#!/usr/bin/env bash
# Let a small model draft the worker task files from the orchestrator's short split.
# Usage: brief.sh <repo> <split.md> <spec.md> [log-dir]
# Env:   AGENT_CMD (default: muse exec --json --prompt-file {prompt})
set -uo pipefail

REPO=$(cd "${1:?usage: brief.sh <repo> <split.md> <spec.md> [log-dir]}" && pwd)
SPLIT=${2:?split.md}; SPEC=${3:?spec.md}
LOGS=${4:-$REPO/.orch}
HERE=$(cd "$(dirname "$0")/.." && pwd)
AGENT_CMD=${AGENT_CMD:-"muse exec --json --prompt-file {prompt}"}
mkdir -p "$LOGS" "$REPO/.orch"

prompt="$REPO/.orch/brief-writer.prompt.md"
sed -e "s#{{SPLIT}}#$SPLIT#g" -e "s#{{SPEC}}#$SPEC#g" \
    -e "s#{{TEMPLATE}}#$HERE/templates/task.md#g" -e "s#{{CHECKLIST}}#$HERE/templates/brief-checklist.md#g" \
    "$HERE/templates/brief-writer.md" > "$prompt"

cd "$REPO" || exit 1
${AGENT_CMD//\{prompt\}/$prompt} > "$LOGS/brief.log" 2>&1
code=$?
ls specs/tasks 2>/dev/null
exit $code
