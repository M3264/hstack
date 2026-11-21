#!/usr/bin/env bash
# Install hstack for Claude Code from a clone: links skills into ~/.claude/skills and
# sub-agents into ~/.claude/agents. Prefer the hstack CLI (`hstack`), which does the same
# and also records your default worker model in ~/.config/hstack/config.json.
# Usage: ./install.sh [claude-config-dir]   (default: ~/.claude)
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
BASE=${1:-$HOME/.claude}
mkdir -p "$BASE/skills" "$BASE/agents"

link() { # source dest
  if [ -e "$2" ] && [ ! -L "$2" ]; then
    echo "skip $(basename "$2"): $2 exists and is not an hstack link" >&2
    return
  fi
  ln -sfn "$1" "$2"
  echo "linked $2"
}

for skill in "$HERE"/skills/*/; do link "${skill%/}" "$BASE/skills/$(basename "$skill")"; done
for agent in "$HERE"/agents/*.md; do link "$agent" "$BASE/agents/$(basename "$agent")"; done
echo "Done. In Claude Code, on your frontier model, run /hstack-activate."
echo "Update later with: git -C $HERE pull"
