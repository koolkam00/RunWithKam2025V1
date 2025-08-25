#!/usr/bin/env bash
set -euo pipefail

# Generate iOS AppIcon set from a single square source image (ideally 1024x1024)
# Usage: ./tools/generate-icons.sh /absolute/path/to/source.png

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/source.png" >&2
  exit 1
fi

SRC="$1"
if [[ ! -f "$SRC" ]]; then
  echo "Source image not found: $SRC" >&2
  exit 1
fi

APPICON_DIR="RunWithKam2025v1/Assets 2.xcassets/AppIcon.appiconset"
if [[ ! -d "$APPICON_DIR" ]]; then
  echo "AppIcon.appiconset not found at $APPICON_DIR" >&2
  exit 1
fi

echo "Generating iOS app icons from $SRC into $APPICON_DIR"

resize() {
  local size="$1"; shift
  local out="$1"; shift
  sips -s format png --resampleHeightWidth "$size" "$size" "$SRC" --out "$APPICON_DIR/$out" >/dev/null
  echo "  ✓ $out (${size}x${size})"
}

# iPhone/iPad icons as used in this asset set
resize 20  Icon-20.png
resize 40  Icon-20@2x.png
resize 60  Icon-20@3x.png

resize 29  Icon-29.png
resize 58  Icon-29@2x.png
resize 87  Icon-29@3x.png

resize 40  Icon-40.png
resize 80  Icon-40@2x.png
resize 120 Icon-40@3x.png

resize 120 Icon-60@2x.png
resize 180 Icon-60@3x.png

resize 76  Icon-76.png
resize 152 Icon-76@2x.png
resize 167 Icon-83.5@2x.png

resize 1024 Icon-1024.png

echo "All icons generated. Open Xcode and clean build if needed."

