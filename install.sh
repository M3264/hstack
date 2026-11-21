#!/usr/bin/env bash
# Install every hstack skill into an agent harness by symlinking skills/* into its skills folder.
# Usage: ./install.sh claude|muse|<skills-dir>
#   muse    ~/.config/muse/skills (supported)
#   claude  ~/.claude/skills (experimental: Claude Code as the frontier is not officially supported yet;
#           Muse Code also reads this folder)
# Prefer the hstack CLI (`hstack init`), which also records your models in ~/.config/hstack/config.json.
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
case "${1:-}" in
  claude) DEST="$HOME/.claude/skills" ;;
  muse)   DEST="$HOME/.config/muse/skills" ;;
  "")     echo "usage: ./install.sh claude|muse|<skills-dir>" >&2; exit 2 ;;
  *)      DEST="$1" ;;
esac

mkdir -p "$DEST"
chmod +x "$HERE"/scripts/*.sh
for skill in "$HERE"/skills/*/; do
  name=$(basename "$skill")
  if [ -e "$DEST/$name" ] && [ ! -L "$DEST/$name" ]; then
    echo "skip $name: $DEST/$name exists and is not an hstack symlink" >&2
    continue
  fi
  ln -sfn "${skill%/}" "$DEST/$name"
  echo "installed $name -> $DEST/$name"
done
echo "Update later with: git -C $HERE pull"
