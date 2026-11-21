// Served at https://hstack.shellhaki.dev/install
// Usage: curl -fsSL https://hstack.shellhaki.dev/install | sh
export const INSTALL_SCRIPT = `#!/bin/sh
# hstack installer
#   curl -fsSL https://hstack.shellhaki.dev/install | sh
# Downloads the hstack CLI, then runs its setup (links the Claude Code skills and sub-agents, and picks a default worker model).
set -eu

REPO="shellhaki/hstack"
BIN_DIR="\${HSTACK_BIN:-$HOME/.local/bin}"

say() { printf '%s\\n' "$*"; }
fail() { printf 'hstack: %s\\n' "$*" >&2; exit 1; }

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case "$arch" in
  x86_64|amd64) arch=amd64 ;;
  arm64|aarch64) arch=arm64 ;;
  *) fail "unsupported CPU: $arch" ;;
esac
case "$os" in
  darwin|linux) ;;
  *) fail "unsupported OS: $os (macOS and Linux for now)" ;;
esac

mkdir -p "$BIN_DIR"
url="https://github.com/$REPO/releases/latest/download/hstack_\${os}_\${arch}"
say "Downloading hstack for $os/$arch..."
if curl -fsSL "$url" -o "$BIN_DIR/hstack.tmp" 2>/dev/null; then
  chmod +x "$BIN_DIR/hstack.tmp"
  mv "$BIN_DIR/hstack.tmp" "$BIN_DIR/hstack"
elif command -v go >/dev/null 2>&1; then
  rm -f "$BIN_DIR/hstack.tmp"
  say "No prebuilt binary found; building with Go instead..."
  GOBIN="$BIN_DIR" go install "github.com/$REPO/cmd/hstack@latest"
else
  rm -f "$BIN_DIR/hstack.tmp"
  fail "no prebuilt binary for $os/$arch yet, and Go is not installed. Install Go (https://go.dev/dl) and run this again."
fi
say "Installed $BIN_DIR/hstack"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) say "Add it to your PATH:  export PATH=\\"$BIN_DIR:\\$PATH\\"" ;;
esac

# Setup is interactive. This script is read from a pipe, so ask the terminal directly.
if [ -r /dev/tty ] && [ -w /dev/tty ]; then
  "$BIN_DIR/hstack" < /dev/tty
else
  say "Run 'hstack' to finish setup."
fi
`;
