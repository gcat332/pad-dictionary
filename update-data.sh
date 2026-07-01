#!/usr/bin/env bash
# Refresh the card dictionary's data (and sprites) from the upstream repo:
#   https://github.com/Mapaler/PADDashFormation  (branch: master)
#
# Uses a blobless, no-cone sparse clone so ONLY the paths we actually use are
# downloaded — not the full 1.6 GB repo.
#
#   ./update-data.sh             # update JSON data + JP card sprites
#   ./update-data.sh --data-only # update JSON data only (fast; new cards may show broken icons)
#
# After running, review with `git status` / `git diff --stat` and commit if happy.
set -euo pipefail
cd "$(dirname "$0")"

UPSTREAM="https://github.com/Mapaler/PADDashFormation.git"
BRANCH="master"
DATA_ONLY=false
[ "${1:-}" = "--data-only" ] && DATA_ONLY=true

# sparse patterns (anchored to repo root)
#   skill_ja = authoritative skill table (type/params for the engine + JP source for translation)
#   skill_en = English skill text where available
patterns=(/monsters-info/mon_ja.json /monsters-info/skill_en.json /monsters-info/skill_ja.json)
$DATA_ONLY || patterns+=(/images/cards_ja /images/awoken.png /images/icon-type.svg /images/CARDFRAME2.png /images/CARDFRAMEW.png)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching upstream ($BRANCH, sparse: ${patterns[*]}) …"
git clone --depth 1 --filter=blob:none --no-checkout -b "$BRANCH" "$UPSTREAM" "$TMP" >/dev/null 2>&1
git -C "$TMP" sparse-checkout init --no-cone >/dev/null 2>&1
git -C "$TMP" sparse-checkout set "${patterns[@]}" >/dev/null 2>&1
git -C "$TMP" checkout >/dev/null 2>&1

echo "Copying card + skill data …"
cp "$TMP/monsters-info/mon_ja.json"   monsters-info/mon_ja.json
cp "$TMP/monsters-info/skill_en.json" monsters-info/skill_en.json
cp "$TMP/monsters-info/skill_ja.json" monsters-info/skill_ja.json

if ! $DATA_ONLY; then
  command -v cwebp >/dev/null || { echo "Error: cwebp not found. Install with 'brew install webp' (card sprites are stored as WebP for faster loading)."; exit 1; }
  echo "Syncing card sprites (PNG → WebP) + icons + frames …"
  rm -rf images/cards_ja && mkdir -p images/cards_ja
  for f in "$TMP"/images/cards_ja/*.PNG; do
    cwebp -q 90 -quiet "$f" -o "images/cards_ja/$(basename "${f%.PNG}").webp"
  done
  cp "$TMP/images/awoken.png"     images/awoken.png      # awakening icons (32px cells, ids 0–143)
  cp "$TMP/images/icon-type.svg"  images/icon-type.svg   # type icons
  cp "$TMP/images/CARDFRAME2.png" images/CARDFRAME2.png  # attribute frame sprite
  cp "$TMP/images/CARDFRAMEW.png" images/CARDFRAMEW.png  # no-attribute frame
fi

echo "Done. Review: git status && git diff --stat"
