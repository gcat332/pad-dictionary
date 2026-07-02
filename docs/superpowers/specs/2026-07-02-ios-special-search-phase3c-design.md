# iOS App — Sub-project 4, Phase 3c: Special-Search — Active Skill (final slice)

## Context

Phases 1–3b ported 165 of 264 web leaves. All that remains is the rest of the "Active
Skill" group: **Orbs Drop (16) + Change all Orbs on Board (14) + Orbs Color Change (14) +
Random Create Orbs (10) + Create Fixed Position Orbs (12) + Damage Enemy — Gravity (5) +
Damage Enemy — Fixed damage (3) + Damage Enemy — Numerical damage (10) = 84 leaves.**
Counts verified via the same `node -e "require('./engine.js')..."` introspection used to
scope every prior phase.

User decision: do all 83 in a single phase (Phase 3c) rather than splitting further, despite
"Create Fixed Position Orbs" introducing genuinely new complexity (bitmask row/shape
matching for 3×3 blocks, crosses, and L-shapes — geometry logic with no precedent in
Phases 1–3b).

No new broken web leaves found in this slice.

## New primitives needed

- `Bin.unflags(_ number: Int) -> [Int]` — decodes a bitmask into the array of its set-bit
  indices. Referenced (but never implemented) since Phase 3a; this phase is the first to
  actually need it (`Drop locked orbs`, `6 color Orbs`, `orbsChangeParse` type 154, etc.).
  New file `Models/Bin.swift`, ported verbatim from the web's `Bin.unflags` static method.
- `Int.notNeighbour() -> Int` — `~self & (self << 1 | self >> 1)`, ported from the web's
  `Number.prototype.notNeighbour`. Used only by the shape-matching helpers below. Swift's
  `Int` is 64-bit vs JS's 32-bit bitwise ops, but every consumer immediately ANDs the result
  against a small (≤10-bit) row value, so the differing high bits are always masked away —
  no behavior difference.
- `ActiveSkillEffects` gains, ported verbatim from the JS quoted in the implementation plan:
  - `boardChangeColorTypes(_ skill: Skill?) -> [Int]` — reads the color list before a `-1`
    sentinel out of a type-71 skill's params.
  - `orbsChangeParse(_ skill: Skill) -> [(from: [Int], to: [Int])]` — parses types 9/20/154
    into from→to color-change pairs.
  - `generateOrbsParse(_ card: Card, skills: SkillLookup) -> [(count: Int, to: Int, exclude: Int)]`
    — parses types 141/208 into orb-generation descriptors (type 208 yields two descriptors).
  - `shapeThisRowOk(_ line: Int?, _ lineNumber: Int) -> Bool`,
    `shapeUpsideDownRowOk(_ line: Int?, _ lineNumber: Int) -> Bool`,
    `shapeIsCross(_ sk: [Int]) -> Bool`, `shapeIsLShape(_ sk: [Int]) -> Bool` — the row-bitmask
    shape matchers used by "Create Fixed Position Orbs". Out-of-range JS array reads
    (`sk[ri+3]` etc. beyond the 5-element params slice) evaluate as `undefined`; ported using
    `sk[safe: idx] ?? 0`, which is behaviorally identical for these two functions specifically
    (verified: both functions treat "0" and "out of range" identically — see plan for the
    per-function argument).

## Architecture

- 84 new `SpecialSearchLeaf` entries appended to `SpecialSearchTree.leaves` (165 → 249),
  grouped under `["Active Skill", "Orbs Drop", ...]` etc., matching the web's nesting
  (including the "Drop rate increases", "Colors Count", "Include Color", "To Color",
  "From Color", "Orb Color", and "Target"/"Attribute"/"Damage" subgroups).
- Almost all leaves are direct `SkillChainMatcher.matches`/`resolve`/`resolveAll` calls plus
  a bitmask check on `skill.params`, following the exact pattern already established in
  Phases 1–3b. Only the shape-matching leaves (6 of the 12 "Create Fixed Position Orbs"
  leaves) need the new geometry helpers.

## Simplification (documented, not silent)

Every leaf's web `addition` (the extra display column) is out of scope, per every prior
phase's established simplification — only the `function` (filter predicate) is ported.
Web-side `sort` comparators are likewise out of scope (display order only, doesn't affect
which cards match).

## Testing

Same as every prior phase: pure-function unit tests for every new `ActiveSkillEffects`
helper (`Bin.unflags`, `notNeighbour`, the orb/shape parsers) and every new leaf; verified
via a real Simulator screenshot confirming the app still launches cleanly with 249 leaves
loaded.

## Out of scope for this phase

`Seamless Buff (Round ≥CD)` (deferred since Phase 3b, needs the full generic skill DSL
parser). Saved presets, compare mode (sub-project 5). This phase completes the "Active
Skill" group and effectively completes the special-search port: 249 of 264 web leaves
ported; the remaining 15 are the previously-documented broken web leaves from Phases 1–2
plus this 1 deferred leaf (not fixed/ported by design — see the Phase 1/2 specs).
