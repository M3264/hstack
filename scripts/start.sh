#!/usr/bin/env bash
# Start a small-model lead on a task in an isolated git worktree. Returns immediately.
# Usage: start.sh <repo> <orch-dir> <task-name> <intake.md>
#   Creates <orch-dir>/<task-name> (a worktree on branch orch/<task-name>, snapshot of <repo>
#   including uncommitted work), copies the intake to .hstack/intake.md, then launches
#   the lead headless in the background. Prints the worktree path.
# Env: LEAD_CMD     full lead command with {prompt}; overrides model selection when set.
#      SMALL_MODEL  model for the lead. Default: from ~/.config/hstack/config.json ("small",
#                   then "fallbacks"). If a model fails to start (e.g. not on your plan), the next is tried.
#                   Default command: muse exec --json --trust-workspace --model <m> --prompt-file <prompt>
#                   (--trust-workspace lets Muse load AGENTS.md and use its own sub-agents.)
#      HSTACK_CONFIG  config path (default ~/.config/hstack/config.json)
#      PROGRESS     0 disables the progress window (macOS).
#      LINK_DIRS, SETUP_CMD  passed to setup.sh
set -euo pipefail

REPO=${1:?usage: start.sh <repo> <orch-dir> <task-name> <intake.md>}
ORCH=${2:?orch-dir}; NAME=${3:?task-name}; INTAKE=${4:?intake.md}
HSTACK=$(cd "$(dirname "$0")/.." && pwd)
INTAKE=$(cd "$(dirname "$INTAKE")" && pwd)/$(basename "$INTAKE")
CONFIG=${HSTACK_CONFIG:-$HOME/.config/hstack/config.json}

# Models to try for the lead, in order.
MODELS=""
if [ -z "${LEAD_CMD:-}" ]; then
  if [ -n "${SMALL_MODEL:-}" ]; then
    MODELS=$SMALL_MODEL
  elif [ -f "$CONFIG" ]; then
    flat=$(tr -d '\n' < "$CONFIG")
    small=$(printf '%s' "$flat" | sed -n 's/.*"small": *"\([^"]*\)".*/\1/p')
    fallbacks=$(printf '%s' "$flat" | sed -n 's/.*"fallbacks": *\[\([^]]*\)\].*/\1/p' | tr -d ' "' | tr ',' ' ')
    if [ -n "$small" ] && [ "$small" != "auto" ]; then MODELS=$small; fi
    for m in $fallbacks; do
      case " $MODELS " in *" $m "*) ;; *) MODELS="$MODELS $m" ;; esac
    done
  fi
fi

"$HSTACK/scripts/setup.sh" "$REPO" "$ORCH" "$NAME" >/dev/null
ORCH=$(cd "$ORCH" && pwd)
WT="$ORCH/$NAME"
mkdir -p "$WT/.hstack/events" "$WT/.hstack/directives" "$ORCH/logs"
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

RUN="$ORCH/.run-$NAME.sh"
LOG="$ORCH/logs/$NAME.lead.log"
if [ -n "${LEAD_CMD:-}" ]; then
  {
    echo '#!/usr/bin/env bash'
    echo "cd \"$WT\" || exit 1"
    echo "${LEAD_CMD//\{prompt\}/.hstack/lead.prompt.md} > \"$LOG\" 2>&1"
    echo "echo \$? > \"$WT/.hstack/lead.exit\""
  } > "$RUN"
else
  {
    echo '#!/usr/bin/env bash'
    echo '# Try each model. A fast failure (under 90s) usually means the model is unavailable, so move on.'
    echo "cd \"$WT\" || exit 1"
    echo "code=1"
    echo "for m in ${MODELS:-default}; do"
    echo '  start=$SECONDS'
    echo '  if [ "$m" = default ]; then args=""; else args="--model $m"; fi'
    echo "  echo \"hstack: starting lead with \$m\" >> \"$LOG\""
    echo "  muse exec --json --trust-workspace \$args --prompt-file .hstack/lead.prompt.md >> \"$LOG\" 2>&1"
    echo '  code=$?'
    echo '  [ $code -eq 0 ] && break'
    echo '  [ $((SECONDS - start)) -ge 90 ] && break'
    echo "  echo \"hstack: \$m failed to start (exit \$code), trying the next model\" >> \"$LOG\""
    echo "done"
    echo "echo \$code > \"$WT/.hstack/lead.exit\""
  } > "$RUN"
fi
chmod +x "$RUN"
nohup bash "$RUN" >/dev/null 2>&1 &

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
