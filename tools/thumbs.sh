#!/usr/bin/env bash
# Render gallery thumbnails (docs/thumbs/<id>.webp) from gallery.json.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/thumbs
tmp=$(mktemp -d)
node -e 'for (const g of require("./gallery.json")) console.log(g.id, g.recipe)' |
  { while read -r id recipe; do
      bin/ember-wall "$recipe" --size 960x540 --out "$tmp/$id.png" >/dev/null &
    done; wait; }
for f in "$tmp"/*.png; do
  magick "$f" -resize 640x360 -quality 82 "docs/thumbs/$(basename "${f%.png}").webp"
done
rm -rf "$tmp"
ls docs/thumbs | wc -l
