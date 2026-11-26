#!/usr/bin/env bash
# Renders chosen frames of a composition and tiles them into one contact sheet for review.
#
#   bash stills.sh <video dir> <composition> <frame> [frame ...]
#
# Writes .hstack/motion/stills/<frame>.png and .hstack/motion/stills/sheet.png (relative to where it is run).
set -euo pipefail

dir="$1" comp="$2"; shift 2
out=".hstack/motion/stills"
mkdir -p "$out"
rm -f "$out"/*.png
for frame in "$@"; do
  (cd "$dir" && bunx remotion still "$comp" "$OLDPWD/$out/$(printf %05d "$frame").png" --frame="$frame" --log=error)
done
# Tile the frames into a grid, three across, each 900 wide.
files=("$out"/[0-9]*.png)
count=${#files[@]}
cols=$(( count < 3 ? count : 3 ))
inputs=() scale="" layout=""
for i in "${!files[@]}"; do
  inputs+=(-i "${files[$i]}")
  scale+="[$i:v]scale=900:-2[s$i];"
  col=$(( i % cols )) row=$(( i / cols ))
  x="0"; for ((c = 0; c < col; c++)); do x+="+w0"; done
  y="0"; for ((r = 0; r < row; r++)); do y+="+h0"; done
  layout+="${layout:+|}${x}_${y}"
done
if (( count == 1 )); then
  # xstack needs at least two inputs; one frame is its own sheet.
  ffmpeg -v error -y -i "${files[0]}" -vf scale=900:-2 "$out/sheet.png"
  echo "$out/sheet.png"
  exit 0
fi
stack=""; for i in "${!files[@]}"; do stack+="[s$i]"; done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${scale}${stack}xstack=inputs=${count}:layout=${layout}:fill=black" "$out/sheet.png"
echo "$out/sheet.png"
