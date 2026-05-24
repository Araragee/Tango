#!/usr/bin/env bash
# generate-pwa-icons.sh — Rasterise public/pwa-icon.svg into the PWA PNGs.
#
# Tries rasterisers in this order:
#   1. rsvg-convert  (brew install librsvg)        — best, anti-aliased
#   2. magick / convert (ImageMagick)              — good
#   3. qlmanage      (built-in on macOS)           — fallback, lower quality
#
# Output:
#   public/pwa-192x192.png
#   public/pwa-512x512.png
#   public/apple-touch-icon.png (180x180)
#
# Run from the front-end directory: bash scripts/generate-pwa-icons.sh

set -euo pipefail

SRC="public/pwa-icon.svg"
OUT_DIR="public"

if [ ! -f "$SRC" ]; then
  echo "Source SVG not found at $SRC" >&2
  exit 1
fi

rasterize() {
  local size=$1
  local out=$2

  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$size" -h "$size" "$SRC" -o "$out"
  elif command -v magick >/dev/null 2>&1; then
    magick -background none "$SRC" -resize "${size}x${size}" "$out"
  elif command -v convert >/dev/null 2>&1; then
    convert -background none "$SRC" -resize "${size}x${size}" "$out"
  elif command -v qlmanage >/dev/null 2>&1; then
    # Quick Look thumbnail. Writes "<basename>.png" inside the output dir.
    local tmp
    tmp=$(mktemp -d)
    qlmanage -t -s "$size" -o "$tmp" "$SRC" >/dev/null 2>&1
    mv "$tmp/$(basename "$SRC").png" "$out"
    rmdir "$tmp"
  else
    echo "No rasteriser found. Install one of:" >&2
    echo "  brew install librsvg   # (recommended)" >&2
    echo "  brew install imagemagick" >&2
    exit 1
  fi
}

rasterize 192 "$OUT_DIR/pwa-192x192.png"
rasterize 512 "$OUT_DIR/pwa-512x512.png"
rasterize 180 "$OUT_DIR/apple-touch-icon.png"

echo "Generated:"
ls -lh "$OUT_DIR/pwa-192x192.png" "$OUT_DIR/pwa-512x512.png" "$OUT_DIR/apple-touch-icon.png"
