#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
BROWSER_DIR="${SCRIPT_DIR:h}"
SOURCE="${BROWSER_DIR}/resources/aura.svg"
PNG_OUT="${BROWSER_DIR}/resources/aura.png"
ICNS_OUT="${BROWSER_DIR}/resources/aura.icns"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "AURA brand asset generation is macOS-only; keeping repository assets unchanged."
  exit 0
fi

for tool in qlmanage sips iconutil; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required macOS tool: $tool" >&2
    exit 1
  fi
done

if [[ ! -f "$SOURCE" ]]; then
  echo "AURA vector source was not found at $SOURCE" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aura-brand.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
ICONSET="$TMP_DIR/AURA.iconset"
mkdir -p "$ICONSET"

# Quick Look uses the system SVG renderer and gives us a 1024px PNG without
# adding a JavaScript/native image dependency to the event browser.
qlmanage -t -s 1024 -o "$TMP_DIR" "$SOURCE" >/dev/null 2>&1
MASTER="$(find "$TMP_DIR" -maxdepth 1 -type f -name '*.png' | head -n 1)"
if [[ -z "$MASTER" || ! -f "$MASTER" ]]; then
  echo "macOS could not render the AURA SVG into a PNG preview." >&2
  exit 1
fi

cp "$MASTER" "$PNG_OUT"

make_size() {
  local pixels="$1"
  local filename="$2"
  sips -z "$pixels" "$pixels" "$MASTER" --out "$ICONSET/$filename" >/dev/null
}

make_size 16   icon_16x16.png
make_size 32   icon_16x16@2x.png
make_size 32   icon_32x32.png
make_size 64   icon_32x32@2x.png
make_size 128  icon_128x128.png
make_size 256  icon_128x128@2x.png
make_size 256  icon_256x256.png
make_size 512  icon_256x256@2x.png
make_size 512  icon_512x512.png
make_size 1024 icon_512x512@2x.png

iconutil -c icns "$ICONSET" -o "$ICNS_OUT"

echo "Generated AURA Halo assets:"
echo "  $PNG_OUT"
echo "  $ICNS_OUT"
