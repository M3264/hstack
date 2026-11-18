#!/usr/bin/env bash
# Launch one worker agent per worktree, open a live progress view, wait for all to finish,
# close the progress view and print results. Run it in the background if your harness can
# notify you on exit; it blocks until every worker is done.
# Usage: run.sh <orch-dir>
# Env:   AGENT_CMD    worker command, {prompt} is replaced by the task file path
#                     (default: muse exec --prompt-file {prompt})
#        TASKS_DIR    task files dir inside each worktree (default: specs/tasks); prompt = $TASKS_DIR/<name>.md
#        MODE         progress (macOS: workers headless + one Terminal progress window, default)
#                     | windows (macOS: one Terminal window per worker + progress window)
#                     | tmux | headless (default: auto)
#        DELAY        seconds to wait before launching (default: 0)
#        TIMEOUT_MIN  give up waiting after this many minutes (default: 120)
set -uo pipefail

ORCH=$(cd "${1:?usage: run.sh <orch-dir>}" && pwd)
HERE=$(cd "$(dirname "$0")" && pwd)
AGENT_CMD=${AGENT_CMD:-"muse exec --prompt-file {prompt}"}
TASKS_DIR=${TASKS_DIR:-specs/tasks}
TIMEOUT_MIN=${TIMEOUT_MIN:-120}

names=()
for d in "$ORCH"/*/; do
  [ -f "$d/.git" ] && names+=("$(basename "$d")")
done
[ ${#names[@]} -gt 0 ] || { echo "no worktrees in $ORCH (run setup.sh)" >&2; exit 1; }

MODE=${MODE:-auto}
if [ "$MODE" = auto ]; then
  if [ "$(uname)" = Darwin ] && command -v osascript >/dev/null; then MODE=progress
  elif command -v tmux >/dev/null; then MODE=tmux
  else MODE=headless; fi
fi

mkdir -p "$ORCH/.status" "$ORCH/logs" "$ORCH/.run"
for n in "${names[@]}"; do rm -f "$ORCH/.status/$n.exit"; done

# One runner script per worker so exit codes are captured the same way in every mode.
for n in "${names[@]}"; do
  prompt="$TASKS_DIR/$n.md"
  [ -f "$ORCH/$n/$prompt" ] || { echo "missing task file: $ORCH/$n/$prompt" >&2; exit 1; }
  cat > "$ORCH/.run/$n.sh" <<EOF
#!/usr/bin/env bash
cd "$ORCH/$n" || exit 1
${AGENT_CMD//\{prompt\}/$prompt} 2>&1 | tee "$ORCH/logs/$n.log"
echo "\${PIPESTATUS[0]}" > "$ORCH/.status/$n.exit"
EOF
  chmod +x "$ORCH/.run/$n.sh"
done

[ "${DELAY:-0}" -gt 0 ] && sleep "$DELAY"

osa_window() { # title command x y w h
  osascript - "$@" <<'EOF' >/dev/null
on run argv
  tell application "Terminal"
    activate
    do script (item 2 of argv)
    set custom title of (selected tab of front window) to (item 1 of argv)
    set x to (item 3 of argv) as integer
    set y to (item 4 of argv) as integer
    set bounds of front window to {x, y, x + ((item 5 of argv) as integer), y + ((item 6 of argv) as integer)}
  end tell
end run
EOF
}

case "$MODE" in
  progress)
    for n in "${names[@]}"; do nohup bash "$ORCH/.run/$n.sh" >/dev/null 2>&1 & done
    read -r _ _ SW SH < <(osascript -e 'tell application "Finder" to get bounds of window of desktop' | tr -d ',')
    osa_window "orch progress" "bash '$HERE/progress.sh' '$ORCH'" $(( SW / 10 )) 40 $(( SW * 8 / 10 )) $(( SH * 9 / 10 ))
    ;;
  windows|terminal)
    read -r _ _ SW SH < <(osascript -e 'tell application "Finder" to get bounds of window of desktop' | tr -d ',')
    count=${#names[@]}; cols=$(( count > 1 ? 2 : 1 )); rows=$(( (count + cols - 1) / cols ))
    w=$(( SW / cols )); h=$(( (SH - 25) / rows ))
    i=0
    for n in "${names[@]}"; do
      osa_window "orch $n" "bash '$ORCH/.run/$n.sh'; exit" $(( (i % cols) * w )) $(( 25 + (i / cols) * h )) "$w" "$h"
      i=$((i + 1))
    done
    sleep 2
    osa_window "orch progress" "bash '$HERE/progress.sh' '$ORCH'" $(( SW / 10 )) 40 $(( SW * 8 / 10 )) $(( SH * 9 / 10 ))
    ;;
  tmux)
    tmux kill-session -t orch 2>/dev/null
    tmux new-session -d -s orch -n agents "bash '$ORCH/.run/${names[0]}.sh'"
    for n in "${names[@]:1}"; do tmux split-window -t orch:agents "bash '$ORCH/.run/$n.sh'"; tmux select-layout -t orch:agents tiled; done
    tmux new-window -t orch -n progress "bash '$HERE/progress.sh' '$ORCH'"
    echo "watch with: tmux attach -t orch"
    ;;
  headless)
    for n in "${names[@]}"; do nohup bash "$ORCH/.run/$n.sh" >/dev/null 2>&1 & done
    echo "running headless; live view: bash $HERE/progress.sh $ORCH"
    ;;
esac

end=$(( SECONDS + TIMEOUT_MIN * 60 ))
while :; do
  done_count=0
  for n in "${names[@]}"; do [ -f "$ORCH/.status/$n.exit" ] && done_count=$((done_count + 1)); done
  [ "$done_count" -ge ${#names[@]} ] && break
  [ $SECONDS -ge $end ] && { echo "timeout after $TIMEOUT_MIN min"; break; }
  sleep 15
done

pkill -f "progress.sh $ORCH" 2>/dev/null
pkill -f "progress.sh '$ORCH'" 2>/dev/null
if [ "$MODE" = progress ] || [ "$MODE" = windows ] || [ "$MODE" = terminal ]; then
  osascript <<'EOF' >/dev/null 2>&1
tell application "Terminal"
  set ids to {}
  repeat with w in windows
    try
      if (custom title of selected tab of w) is "orch progress" then set end of ids to (id of w)
    end try
  end repeat
  repeat with i in ids
    close (first window whose id is i) saving no
  end repeat
end tell
EOF
elif [ "$MODE" = tmux ]; then
  tmux kill-window -t orch:progress 2>/dev/null
fi

for n in "${names[@]}"; do
  echo "$n exit=$(cat "$ORCH/.status/$n.exit" 2>/dev/null || echo unfinished) report=$([ -f "$ORCH/$n/.orch/$n.report.md" ] && echo yes || echo missing)"
done
