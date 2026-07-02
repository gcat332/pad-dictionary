# iOS App — Sub-project 4, Phase 2: Special-Search — Leader Skills Group

## Context

Phase 1 shipped the special-search engine shell plus the 3 simplest groups (43 leaves).
This phase ports the **Leader Skills** group (58 leaves in the web tree).

## Finding: 11 of 58 leaves are also broken in the web reference

Confirmed by calling them directly via `require('./engine.js')`:

- 9 leaves under `Matching Style`/`Restriction/Bind` read `card.leaderSkillTypes.*` —
  `leaderSkillTypes` is never assigned anywhere in `engine.js`; calling these throws
  `Cannot read properties of undefined`. (`Multiple Att.`, `Orb Matching`, `Combo Matching`,
  `Same Attribute Combo Matching`, `L Shape Matching`, `Attribute Enchantment`, `Type
  Enchantment`, `HP Percentage Activation`, `Skill Use Activation`.)
- 2 leaves (`Fixed damage inflicts`, `Adds combo`) call `getSkillFixedDamage`/
  `getSkillAddCombo` — neither is defined anywhere in the file.

Same as Phase 1's 2 broken leaves: excluded from the port (nothing correct to port from),
reported as an additional web bug finding, not fixed in this phase.

**That leaves 47 portable leaves**, broken down: Matching Style 7/12, Restriction/Bind
9/13, Extra Effects 16/18, HP Scale 6/6, Reduce Shield 9/9.

## Quirk to port faithfully, not "fix"

`Reduce Shield > Reduce Damage - Exclude chance` calls the web's `getReduceScale(ls,
undefined, undefined, true)` — but `getReduceScale` only declares 2 parameters
(`allAttr`, `noHPneed`); the 4th argument is silently dropped by JS (no error, no effect).
So this leaf behaves identically to `getReduceScale(ls) > 0` with no special "exclude
chance" behavior at all — almost certainly an unfinished feature in the original engine.
Ported as-is (same as the base 2-arg call) to match real behavior, not the leaf's name.

## Architecture

- `SkillChainMatcher` (Phase 1) gains `resolve(skillId:types:skills:searchRandom:) ->
  Skill?` — returns the actual matched skill (not just a boolean), needed by leaves that
  inspect `skill.params[n]` (e.g. "Reduce damage when rcv"). The existing `matches(...)`
  becomes `resolve(...) != nil` — same signature, same tested behavior, no breaking change
  to Phase 1 leaves.
- `LeaderSkillScale` — ports `getHPScale(ls)`, `getReduceScale(ls, allAttr, noHPneed)`,
  `getReduceScale_unconditional(ls)` verbatim (same `switch` cases, same skill-type
  numbers, same param indices), operating on `Skill` + `SkillLookup` (both recurse through
  type-138 "calls another leader skill" wrapper skills the same way the JS does). A small
  `Array.subscript(safe:)` helper backs the same "missing param defaults to 0/absent"
  behavior the JS gets for free from `undefined` arithmetic.
- 47 new `SpecialSearchLeaf` entries appended to `SpecialSearchTree.leaves` (43 → 90),
  grouped under `["Leader Skills", "Matching Style"]` / `["Leader Skills",
  "Restriction/Bind"]` / `["Leader Skills", "Extra Effects", "Increased drop rewards"]` /
  `["Leader Skills", "Extra Effects", "Other"]` / `["Leader Skills", "HP Scale"]` /
  `["Leader Skills", "Reduce Shield"]`, matching the web's nesting.
- Most leaves reduce to `SkillChainMatcher.matches(skillId: card.leaderSkillId, types:
  [...], skills: context.skillsJA)` — the same one-liner shape as most of Phase 1's
  Evo-type leaves, just against `leaderSkillId` instead of `activeSkillId`. `HP Scale`/
  `Reduce Shield` leaves look up `context.skillsJA[card.leaderSkillId]` directly (matching
  the web calling `Skills[card.leaderSkillId]` directly rather than through the chain
  resolver) and feed it to `LeaderSkillScale`.

## Simplifications (documented, not silent)

Per-leaf custom sort overrides (most Leader Skills leaves also `.sort()` by a specific
skill param) are dropped, same as Phase 1 — the existing `CardSort` dropdown governs order.

## Testing

`SkillChainMatcher.resolve`, `LeaderSkillScale.hpScale`/`reduceScale`/
`reduceScaleUnconditional`, and every new leaf closure are pure functions — unit-tested
directly. UI is unchanged (`SpecialSearchView` already renders whatever's in
`SpecialSearchTree.leaves` grouped by `groupPath` — no new UI code needed, just more data);
verified via a real Simulator screenshot showing the new "Leader Skills" sections appear.

## Out of scope for this phase

Active Skill group (Phase 3, 160 leaves — largest, likely needs further sub-phasing). The
11 broken web leaves (reported separately). Saved special-search presets (sub-project 5).
