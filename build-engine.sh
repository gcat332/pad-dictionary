#!/usr/bin/env bash
# Rebuild engine.js by concatenating the ordered partials in engine/src/.
# The 2-digit filename prefixes define load order (lexical sort = intended order).
#
#   ./build-engine.sh          # regenerate engine.js from engine/src/*.js
#
# engine.js is a single UMD closure that cannot be split across <script> tags,
# so the partials are authored separately and concatenated back into one file.
# Edit files under engine/src/, then run this. Output is byte-identical to the
# concatenation of the parts (verify with: git diff --stat engine.js).
set -euo pipefail
cd "$(dirname "$0")"
cat engine/src/*.js > engine.js
echo "Built engine.js from $(ls engine/src/*.js | wc -l | tr -d ' ') parts ($(wc -l < engine.js) lines)."
