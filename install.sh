#!/usr/bin/env bash
# Install every hstack skill into an agent harness by symlinking skills/* into its skills folder.
# Usage: ./install.sh claude|codex|muse|<skills-dir>
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
case "${1:-}" in
  claude) DEST="$HOME/.claude/skills" ;;
  codex)  DEST="$HOME/.codex/skills" ;;
  muse)   DEST="$HOME/.config/muse/skills" ;;
  "")     echo "usage: ./install.sh claude|codex|muse|<skills-dir>" >&2; exit 2 ;;
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
