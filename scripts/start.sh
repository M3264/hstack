#!/usr/bin/env bash
# Start a Muse lead on a task in an isolated git worktree. Returns immediately.
# Usage: start.sh <repo> <orch-dir> <task-name> <intake.md>
#   Creates <orch-dir>/<task-name> (a worktree on branch orch/<task-name>, snapshot of <repo>
#   including uncommitted work), copies the intake to .hstack/intake.md, then launches
#   the lead headless in the background. Prints the worktree path.
# Env: LEAD_CMD    (default: muse exec --json --trust-workspace --prompt-file {prompt})
#                   --trust-workspace lets Muse load AGENTS.md and use its own sub-agents.
#      PROGRESS    1 (default on macOS) opens one Terminal window with live progress.
#      LINK_DIRS, SETUP_CMD  passed to setup.sh
set -euo pipefail

REPO=${1:?usage: start.sh <repo> <orch-dir> <task-name> <intake.md>}
ORCH=${2:?orch-dir}; NAME=${3:?task-name}; INTAKE=${4:?intake.md}
HSTACK=$(cd "$(dirname "$0")/.." && pwd)
LEAD_CMD=${LEAD_CMD:-"muse exec --json --trust-workspace --prompt-file {prompt}"}
INTAKE=$(cd "$(dirname "$INTAKE")" && pwd)/$(basename "$INTAKE")

"$HSTACK/scripts/setup.sh" "$REPO" "$ORCH" "$NAME" >/dev/null
ORCH=$(cd "$ORCH" && pwd)
WT="$ORCH/$NAME"
mkdir -p "$WT/.hstack/events" "$WT/.hstack/directives"
cp "$INTAKE" "$WT/.hstack/intake.md"

cat > "$WT/.hstack/lead.prompt.md" <<EOF
You are the hstack lead for this task. Follow the \`hstack-lead\` skill
($HSTACK/skills/hstack-lead/SKILL.md) and the \`hstack-practice\` skill
($HSTACK/skills/hstack-practice/SKILL.md) exactly.

- Your working directory is this git worktree: $WT
- The task intake from your senior engineer: .hstack/intake.md
- hstack scripts: $HSTACK/scripts (you need await.sh)

Start now.
EOF

cat > "$ORCH/.run-$NAME.sh" <<EOF
#!/usr/bin/env bash
cd "$WT" || exit 1
${LEAD_CMD//\{prompt\}/.hstack/lead.prompt.md} > "$ORCH/logs/$NAME.lead.log" 2>&1
echo \$? > "$WT/.hstack/lead.exit"
EOF
chmod +x "$ORCH/.run-$NAME.sh"
mkdir -p "$ORCH/logs"
nohup bash "$ORCH/.run-$NAME.sh" >/dev/null 2>&1 &

if [ "${PROGRESS:-auto}" != 0 ] && [ "$(uname)" = Darwin ] && command -v osascript >/dev/null; then
  osascript - "bash '$HSTACK/scripts/progress.sh' '$WT'" <<'OSA' >/dev/null 2>&1 || true
on run argv
  tell application "Terminal"
    do script (item 1 of argv)
    set custom title of (selected tab of front window) to "hstack progress"
  end tell
end run
OSA
fi

echo "$WT"
