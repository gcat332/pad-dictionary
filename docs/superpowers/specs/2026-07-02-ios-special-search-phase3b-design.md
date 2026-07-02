# iOS App — Sub-project 4, Phase 3b: Special-Search — Active Skill (second slice)

## Context

Phase 3a covered 29 of the Active Skill group's 160 leaves. This phase covers **For player
team (18) + Orbs States Change (7) + Board States Change (9) + Skill use is conditional
(6) + Other (6 of 7) = 46 leaves** — good news, this slice is mostly simple
`getCardActiveSkill` type-membership checks plus a few bitmask (`params[n] & 0bXXX`)
reads, no new aggregate `_Turns`/`_Rate` helpers needed like Phase 3a.

## One leaf deferred (not broken — needs infrastructure not yet built)

`Other > Seamless Buff (Round ≥CD)` requires the web's full generic semantic skill parser
(`skillParser`, `SkillKinds.ActiveTurns`/`RandomSkills`/`EvolvedSkills`) — the DSL builder
system glimpsed early in `engine.js` (`evolvedSkills()`, `boardChange()`, etc.), which is a
much larger undertaking than anything ported so far and would only serve this one leaf.
Deferred to a future phase if/when that parser infrastructure gets built; not counted
among the "broken web leaf" findings since the web reference itself works correctly.

Two leaves in this slice (`1 CD`, `Skill Loop less than 4 card`) need a small amount of new
logic — a one-level type-232 unwrap plus `getSkillMinCD` — ported as two small
`ActiveSkillEffects` functions rather than a shared generic helper, since the "unwrap once,
not recursively" behavior is specific to these two leaves.

## Architecture

- `ActiveSkillEffects` gains `getSkillMinCD(_:) -> Int` (`initialCooldown - (maxLevel - 1)`),
  `hasOneCD(_:skills:) -> Bool`, `hasSkillLoopLessThan4(_:skills:) -> Bool` — ported
  verbatim from the JS quoted in the implementation plan.
- 46 new `SpecialSearchLeaf` entries appended to `SpecialSearchTree.leaves` (119 → 165),
  almost all built directly on the existing `SkillChainMatcher.matches`/`resolve` — no new
  shared infrastructure beyond the two functions above.

## Testing

Same as every prior phase: pure-function unit tests for the two new `ActiveSkillEffects`
functions and every new leaf; verified via a real Simulator screenshot confirming the app
still launches cleanly with 165 leaves loaded.

## Out of scope for this phase

`Seamless Buff` (deferred, see above). Remaining ~85 Active Skill leaves (Orbs Drop, Change
all Orbs on Board, Orbs Color Change, Random Create Orbs, Create Fixed Position Orbs,
Damage Enemy — Gravity/Fixed/Numerical) — future Phase 3c+. Saved presets, compare mode
(sub-project 5).
