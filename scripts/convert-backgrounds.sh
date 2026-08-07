#!/usr/bin/env bash
# Convert studio backgrounds: assets/backgrounds → apps/web/public/backgrounds
# Usage:
#   scripts/convert-backgrounds.sh           # convert all jpg/png/webp
#   scripts/convert-backgrounds.sh --help    # this help
#   scripts/convert-backgrounds.sh --dry-run # list inputs, write nothing
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/backgrounds"
OUT="$ROOT/apps/web/public/backgrounds"
MANIFEST="$OUT/manifest.json"
DRY_RUN=0

usage() {
  cat <<'EOF'
convert-backgrounds.sh — Storyworks daily BG playlist tooling

Reads jpg/png/webp from assets/backgrounds/ (skips raw/ and .gitkeep).
Writes apps/web/public/backgrounds/bg-NNN.webp + manifest.json.

Options:
  --help, -h     Show this help and exit
  --dry-run      List would-be conversions; do not write files

Requires: cwebp (brew install webp) and/or ffmpeg with libwebp.
Empty input → writes empty manifest (app falls back to solid color).
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

HAVE_CWEBP=0
HAVE_FFMPEG_WEBP=0
if command -v cwebp >/dev/null 2>&1; then
  HAVE_CWEBP=1
fi
if command -v ffmpeg >/dev/null 2>&1 && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q 'libwebp'; then
  HAVE_FFMPEG_WEBP=1
fi

if [ "$HAVE_CWEBP" -eq 0 ] && [ "$HAVE_FFMPEG_WEBP" -eq 0 ]; then
  echo "error: need cwebp (brew install webp) or ffmpeg with libwebp encoder" >&2
  exit 1
fi

# Convert one image → dest webp. Prefer cwebp (Homebrew ffmpeg often lacks libwebp).
# Cap long edge at 2560 without upscaling small sources.
convert_one() {
  local src="$1"
  local dest="$2"
  if [ "$HAVE_CWEBP" -eq 1 ]; then
    local w h max
    # sips is macOS-native; fall back to no resize hint if unavailable
    if command -v sips >/dev/null 2>&1; then
      w=$(sips -g pixelWidth "$src" 2>/dev/null | awk '/pixelWidth/{print $2}')
      h=$(sips -g pixelHeight "$src" 2>/dev/null | awk '/pixelHeight/{print $2}')
      max="$w"
      if [ -n "${h:-}" ] && [ "${h:-0}" -gt "${w:-0}" ]; then
        max="$h"
      fi
      if [ -n "${max:-}" ] && [ "$max" -gt 2560 ]; then
        cwebp -quiet -q 82 -resize 2560 0 "$src" -o "$dest"
      else
        cwebp -quiet -q 82 "$src" -o "$dest"
      fi
    else
      cwebp -quiet -q 82 "$src" -o "$dest"
    fi
  else
    ffmpeg -y -hide_banner -loglevel error -i "$src" \
      -vf "scale='min(2560,iw)':'-2'" \
      -c:v libwebp -quality 82 -compression_level 4 \
      "$dest"
  fi
}

mkdir -p "$SRC" "$OUT"

# Collect convertible files (flat in SRC; skip raw/ subtree)
TMP_LIST="$(mktemp)"
trap 'rm -f "$TMP_LIST"' EXIT

find "$SRC" -type f \( \
  -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \
\) ! -path '*/raw/*' 2>/dev/null | sort >"$TMP_LIST"

COUNT=0
while IFS= read -r _; do
  COUNT=$((COUNT + 1))
done <"$TMP_LIST"

echo "Source: $SRC"
echo "Output: $OUT"
echo "Found ${COUNT} image(s)"

UTC_NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ "$COUNT" -eq 0 ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] Would write empty manifest (no inputs)."
    exit 0
  fi
  printf '%s\n' "{\"version\":1,\"generated\":\"${UTC_NOW}\",\"items\":[]}" >"$MANIFEST"
  echo "Wrote empty manifest (app uses solid-color fallback)."
  exit 0
fi

ITEMS_JSON=""
i=0
while IFS= read -r src; do
  [ -z "$src" ] && continue
  i=$((i + 1))
  id=$(printf 'bg-%03d' "$i")
  dest="$OUT/${id}.webp"
  base=$(basename "$src")
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $base → ${id}.webp"
  else
    echo "Converting $base → ${id}.webp"
    convert_one "$src" "$dest"
  fi
  entry="{\"id\":\"${id}\",\"file\":\"${id}.webp\",\"src\":\"${base}\"}"
  if [ -z "$ITEMS_JSON" ]; then
    ITEMS_JSON="    ${entry}"
  else
    ITEMS_JSON="${ITEMS_JSON},
    ${entry}"
  fi
done <"$TMP_LIST"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] Would write manifest with ${i} item(s)."
  exit 0
fi

cat >"$MANIFEST" <<EOF
{
  "version": 1,
  "generated": "${UTC_NOW}",
  "items": [
${ITEMS_JSON}
  ]
}
EOF

echo "Wrote $MANIFEST (${i} item(s))."
