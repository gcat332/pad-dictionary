# iOS App — SP4 Phase 4: Port the 13 fixed web leaves + Seamless Buff

## Context

The web bug fix (commit `01f6a9d`) restored 13 special-search leaves that were previously
broken (threw at runtime) and therefore excluded from the iOS port during Phases 1–2. The
remaining "Seamless Buff (Round ≥CD)" leaf was never broken — it was deferred because its
web implementation calls into `skillParser`, a large generic skill-semantics DSL, believed
too costly to port for one leaf. This phase ports all 14, closing the special-search gap
from 249/264 to 263/264 (the true final leaf, confirmed via exhaustive diff below, is
`"No Filter"` — the web's own sentinel/"Clear" action, which iOS already implements as a
dedicated Clear button rather than a 264th leaf, per Phase 1's original design).

**Verification method used throughout this phase:** every new leaf's logic was diffed
against the actual `engine.js` behavior on the full real card/skill dataset
(`monsters-info/mon_ja.json` + `skill_ja.json`, ~13,878 cards) via a Node harness, not just
hand-read. This is the same rigor as every prior phase, applied more aggressively here
because two pieces (the bit-flag leader-skill checks and the Seamless Buff logic) have
non-obvious parameter layouts.

## Part A: the 13 leaves

Root causes (see the web-fix commit message for the full story): `isReincarnated`,
`typekiller_for_type`, `getSkillAddCombo`, `getSkillFixedDamage` were dropped during
`engine.js`'s extraction from the old sources; 9 leaves read `card.leaderSkillTypes`, whose
getter (backed by `card.searchFlags` bitmasks) was also dropped.

**New `Card` fields required:** `is8Latent: Bool` and `searchFlags: [Int]` — both present in
the raw `mon_ja.json` data (confirmed: `"is8Latent":false`, `"searchFlags":[1049088,0]`),
but never added to the Swift model since nothing needed them until now. **Both are added as
required (non-Optional) fields**, matching the established Phase-1 precedent for adding new
`Card` fields: every existing `Card(...)` full-memberwise call site across the test target,
and every JSON-literal test fixture, must be updated to include them. This bit Phase 1 once
already (documented as an "assumed fixtures wouldn't need updates" mistake) — this plan
enumerates every affected file up front instead of leaving it to be discovered:
- Memberwise `Card(...)` call sites (8 total, across 6 files): `CardSortTests.swift`,
  `EvoFamilyTests.swift`, `ActiveSkillEffectsTests.swift`, `FilterStateTests.swift`,
  `SpecialSearchEngineTests.swift` (2 sites), `SpecialSearchTreeTests.swift` (2 sites).
- JSON-literal fixtures (5 files): `CardSpecialSearchFieldsTests.swift`,
  `CardHenshinDecodingTests.swift`, `BrowseViewModelTests.swift`, `DataStoreTests.swift`,
  `PADDictionaryTests/Fixtures/mon_ja_sample.json`.

**The 13 leaves, their group paths (matched to each group's *existing* Swift convention —
some groups bundle loose leaves under a synthetic "Other" node, some don't; verified by
reading each group's current leaves rather than assumed), and their logic:**

1. `Evo type > Reincarnation/Super Rein..` — `isReincarnated(card)`, a recursive check on
   `is8Latent`/`isUltEvo`/`evoBaseId`/`evoRootId`/`awakenings`. New free function.
2. `Awakenings > 3 same Killer, or 2 with latent` — needs the `typekiller_for_type` data
   table (13 fixed entries mapping type→awakening-id→latent-id→killable-types), ported as
   `TypeKiller.all`. New model.
3–7. `Leader Skills > Matching Style > {Multiple Att., Orb Matching, Combo Matching, Same
   Attribute Combo Matching, L Shape Matching}` — bits 0–4 of `card.searchFlags[0]`.
8–11. `Leader Skills > Restriction/Bind > {Attribute Enchantment, Type Enchantment, HP
   Percentage Activation, Skill Use Activation}` — bits 9, 10, 13, 14 of `searchFlags[0]`.
12–13. `Leader Skills > Extra Effects > {Fixed damage inflicts, Adds combo}` — sum
   `getSkillFixedDamage`/`getSkillAddCombo` across all leader-skill-chain matches for a
   fixed set of skill types (each type reads a different, hand-verified params index),
   ported as two new `LeaderSkillScale` functions using the existing
   `SkillChainMatcher.resolveAll`.

All bit indices and params indices were cross-checked against `old/script.js`'s original
getters (recovered from git history, commit `81e5edf^`) — not re-derived from scratch.

## Part B: Seamless Buff (Round ≥CD)

The web's implementation calls a ~2000-line generic skill-semantics parser
(`skillParser`/`SkillKinds`, ~70 effect kinds) — but this ONE leaf only ever inspects
whether a skill's top-level parsed effect is `ActiveTurns` (a buff lasting N turns) with
`N ≥ cooldown`, or is a `RandomSkills`/`EvolvedSkills` wrapper needing one level of
recursion into its sub-skill IDs. Empirically enumerating which skill types produce
`ActiveTurns` at the top level (via a modified `engine.js` copy exposing `skillParser`
internally, run against every real skill in `skill_ja.json`) found **48 skill types**, of
which all but 3 (`126`, `205`, `239`) read their "turns" value from `params[0]` — the other
3 read `params[1]`, verified against `engine.js`'s declared parameter names for each type
(`(attrs, turns)` for 205, etc.) and empirically against real skill params.

This is portable as a single small `SeamlessBuff` model — NOT the full generic DSL — and
was cross-validated by running both implementations (a JS mirror of the planned Swift logic,
and the real `engine.js` leaf) against all ~13,878 real cards: **1973/1973 matches, zero
discrepancies either direction.** The plan's code is transcribed directly from that
validated JS mirror.

`Active Skill > Seamless Buff (Round ≥CD)` groups under `["Active Skill", "Other"]`,
matching its existing sibling loose leaves there (`1 CD`, `Time pause`, etc.).

## Verification (addressing "does iOS match web" directly)

Beyond the usual per-leaf unit tests, this phase adds a dedicated cross-check: for a sample
of real card IDs (chosen because they're empirically true/false for each new leaf per the
Node harness), assert the same result in the Swift unit tests — i.e. the tests themselves
encode "verified against the real web output," not just hand-constructed synthetic cases.
The final task also rebuilds the app, launches it on the real Simulator, and opens the
Browse tab's special-search sheet to visually confirm all new leaves appear in their
expected groups with no crash — the same bar as every prior phase.

## Leaf count reconciliation

Exhaustive diff of all 264 web leaf paths against the 249 currently in
`SpecialSearchTree.swift` found exactly 24 discrepancies: 9 are false positives (leaves
already ported, just nested one level differently under a synthetic "Other" node the raw
engine tree doesn't show — confirmed by comparing each group's *existing* Swift
convention, not the raw path), 14 are the genuinely new leaves this phase adds (13 fixed +
Seamless Buff), and 1 is `"No Filter"` — the web's own sentinel/"Clear" action, which
`dict.js` never lists as a selectable chip and which the iOS port already implements as a
dedicated Clear button (Phase 1's original design). After this phase: 249 + 14 = 263 of 264
web leaves ported; the sole remainder is intentionally not a leaf on either platform.

## Out of scope

Nothing else remains unported after this phase.
