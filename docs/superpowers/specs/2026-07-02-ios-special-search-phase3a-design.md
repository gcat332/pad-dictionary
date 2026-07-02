# iOS App — Sub-project 4, Phase 3a: Special-Search — Active Skill (first slice)

## Context

The web's "Active Skill" group has 160 leaves across 18 subgroups — the largest and most
varied group, and confirmed to introduce a genuinely new pattern beyond Phases 1-2: several
leaves depend on aggregate helper functions (`voidsAbsorption_Turns`, `unbind_Turns`,
`healImmediately_Rate`, `atkBuff_Rate`, `rcvBuff_Rate`, `damageSelf_Rate`,
`changeEnemiesAttr_Attr`) that inspect MULTIPLE skill types at once and return a small
result object, rather than a single true/false or scale number.

Given the added complexity, this phase (3a) covers a smaller slice than Phases 1-2:
**Voids Absorption (6) + Recovers Bind Status (4) + Player's HP change (4) + Buff (9) +
For Enemy (6) = 29 leaves.** Remaining ~131 Active Skill leaves (For player team, Orbs/
Board state changes, orb creation/color, damage calculators, skill-use conditions) are
deferred to future sub-phases (3b, 3c, ...).

No additional broken web leaves were found in this slice (unlike Phases 1-2).

## New primitives needed

- `SkillChainMatcher.resolveAll(skillId:types:skills:searchRandom:) -> [Skill]` — ports
  `getActuallySkills` returning ALL matches via the same recursive wrapper-type traversal
  (not just the first, which `resolve()` already provides). Needed because
  `getCardActiveSkills` (plural, used by the aggregate helpers) collects every matching
  skill across a chain's branches, not just one.
- `Bin.unflags(_:) -> [Int]` — decodes a bitmask into the array of its set-bit indices.
  Ported from the web's `Bin.unflags` (used by `atkBuff_Rate`'s type-228 case, though not
  actually needed for THIS phase's filter logic since only `skilltype` is checked — kept
  as a small standalone utility for completeness/future phases that may need it for real).

## Simplification (documented, not silent)

`atkBuff_Rate`/`rcvBuff_Rate` compute a 6-field result object (`skilltype`, `types`,
`attrs`, `awoken`, `rate`, `turns`), but the ONLY field any Buff leaf's filter condition
actually reads is `skilltype > 0` — the rest exist for the sort order and the "additional
display" annotation, both already out of scope per Phase 1's established simplification.
Ported as `atkBuffSkillType(card:) -> Int` / `rcvBuffSkillType(card:) -> Int`, computing
just enough of each type-specific branch to determine `skilltype`, faithfully preserving
the original's "first skill among matches whose computed rate is non-zero" selection logic
(`skills.map(parse).find(s => s.rate != 0)`) since that governs WHICH skill's skilltype
wins when a card has multiple qualifying skills through a wrapper chain.

## Architecture

- `SkillChainMatcher` (existing) gains `resolveAll`.
- `Bin` (new, tiny) gains `unflags`.
- `ActiveSkillEffects` (new) — one function per aggregate helper, operating on `Card` +
  `SkillLookup`, ported verbatim from the quoted JS in the implementation plan:
  `voidsAbsorptionTurns`, `unbindTurns`, `healImmediatelyRate`, `damageSelfRate`,
  `changeEnemiesAttrAttr`, `atkBuffSkillType`, `rcvBuffSkillType`.
- 29 new `SpecialSearchLeaf` entries appended to `SpecialSearchTree.leaves` (90 → 119),
  grouped under `["Active Skill", "Voids Absorption", ...]` etc., matching the web's
  nesting.

## Testing

`SkillChainMatcher.resolveAll`, every `ActiveSkillEffects` function, and every new leaf
closure are pure functions — unit-tested directly against constructed `Card`/`Skill`
fixtures. No UI changes this phase (`SpecialSearchView` already renders whatever's in the
tree); verified via a real Simulator screenshot confirming the app still launches cleanly
with 119 leaves loaded.

## Out of scope for this phase

The remaining ~131 Active Skill leaves (deferred to Phase 3b+). Leader Skills/Evo type/
Awakenings/Others Search are already done (Phases 1-2). Saved presets, compare mode
(sub-project 5).
