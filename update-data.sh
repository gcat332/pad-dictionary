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
patterns=(/monsters-info/mon_ja.json /monsters-info/skill_en.json)
$DATA_ONLY || patterns+=(/images/cards_ja)

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

if ! $DATA_ONLY; then
  echo "Syncing JP card sprites …"
  rm -rf images/cards_ja
  cp -R "$TMP/images/cards_ja" images/cards_ja
fi

echo "Done. Review: git status && git diff --stat"
