# iOS App — Sub-project 4, Phase 1: Special-Search Engine Shell + Simple Groups

## Context

The web dictionary's special-search feature (`window.PADEngine.createSpecialSearchEngine`
in `engine.js`) is a 264-leaf taxonomy tree across 6 top-level groups, ~4,300 lines of
hand-curated filter functions reverse-engineered from the game's binary skill format. Full
port is being phased:

- **Phase 1** (this doc): engine shell (tree/leaf types, AND/OR composition) + full UI +
  the 3 simplest groups — **Evo type** (10 leaves), **Awakenings** (12 leaves), **Others
  Search** (23 leaves) = 45 leaves, all filtering on static card fields (no skill-text
  parsing needed except one leaf).
- **Phase 2** (future): **Leader Skills** group (58 leaves).
- **Phase 3** (future): **Active Skill** group (160 leaves, largest — likely needs further
  sub-phasing).

Counts were obtained by `require()`-ing `engine.js` directly in Node and calling
`createSpecialSearchEngine({skills:[],cards:[]})` to walk the real `.tree`/`.leaves`.

## Finding: 2 web leaves are already broken

`Evo type > Other > Reincarnation/Super Rein..` and `Awakenings > Other > 3 same Killer, or
2 with latent` call `isReincarnated` and `typekiller_for_type` — neither is defined anywhere
in `engine.js` (confirmed: calling them throws `ReferenceError`). This is a pre-existing gap
from whatever extraction produced this file (its header says "extracted from old/ sources").
These 2 leaves are **excluded from the Swift port** (unportable — there's no correct
reference to port from) and reported to the user as a separate, optional web bug to fix
later; not addressed in this phase.

That leaves **43 portable leaves** + the tree's own `"No Filter"` sentinel, which the web
UI hides and treats as its own "Clear" action (`dict.js` never lists it as a selectable
chip) — the iOS port does the same (a "Clear" button, not a 44th leaf).

## Architecture

- `Card` gains 13 fields present in `mon_ja.json` but unused until now: `orbSkinOrBgmId`,
  `badgeId`, `feedExp`, `sellPrice`, `limitBreakIncr`, `sellMP`, `latentAwakeningId`,
  `stackable`, `skillBanner`, `evoMaterials: [Int]`, `isUltEvo`, `evoBaseId`,
  `syncAwakening`.
- `SkillChainMatcher` — ports `getActuallySkills()`: given a skill id, a target type set,
  and the skill table, recursively resolves "wrapper" skill types (116, 118, 138, 232, 233,
  248 — random/evolution/multi-part skills whose real effect lives in `params`) and reports
  whether any resolved skill's `type` is in the target set. Needed by exactly one Phase 1
  leaf ("Random Transform", type 236) but is the shared foundation Phase 2/3 depend on
  heavily (every Active/Leader Skill leaf inspects skill types this way).
- `SpecialSearchLeaf` — `struct { let key: String; let label: String; let groupPath:
  [String]; let matches: (Card, SpecialSearchContext) -> Bool }`. `SpecialSearchContext`
  bundles `cardsById: [Int: Card]` (for the two leaves that look up a card's evo-base card)
  and `skillsJA: SkillLookup` (for the one skill-type-checking leaf).
- `SpecialSearchTree` — a flat `[SpecialSearchLeaf]` (44 total counting the excluded 2 as
  simply absent) grouped by `groupPath` for display; no need to mirror the web's exact
  nested `group`/`leaf` node types, since a flat leaf list with a `groupPath: [String]` is
  sufficient to reconstruct the same grouped UI and is far simpler to build/test.
- `SpecialSearchEngine.filter(_ cards: [Card], selectedKeys: Set<String>, mode: MatchMode,
  context:) -> [Card]` — AND intersects per-leaf results across selected leaves; OR unions
  them. Ports `filterCardsByLeaves`.
- `BrowseViewModel` gains `selectedSpecialSearchKeys: Set<String>` and `specialSearchMode:
  MatchMode`, composed into `cards` alongside the existing ID search / `FilterState` / sort.
- `SpecialSearchView` — a new sheet (separate from `FilterView`, matching the web's separate
  "Search Filter" section) showing leaves grouped by `groupPath` with multi-select chips,
  an AND/OR segmented control, a selected-count badge, and a "Clear" button.

## Simplifications (documented, not silent)

- 7 of the 23 "Others Search" leaves are the web's "Only Additional display" leaves —
  their JS `function` is `cards=>cards` (or filters+re-sorts) purely to annotate results
  with extra info the web renders inline (feed EXP, sell price, etc.), a display feature
  this app doesn't have yet. Ported as their filter behavior only (4 of the 7 do filter:
  Show Feed EXP → `feedExp > 0`, Show Sell Price → `sellPrice > 0`; the other 5 are
  pure no-op filters). The extra per-leaf **custom sort override** 4 leaves apply
  (Show Feed EXP, Show Sell Price, Raise ≥50% at lv110, All Latent TAMADRA) is dropped —
  the existing `CardSort` dropdown governs order, matching how `FilterState` (sub-project 3)
  already works.
- The 2 broken web leaves noted above are omitted entirely.

## Data

`Card` needs the 13 additive fields listed above — all present in the synced
`mon_ja.json`, decoded the same additive way `henshinTo`/`henshinFrom` were in sub-project 2
(non-optional where the JSON always has the key, optional/defaulted where sparse).

## Testing

`SkillChainMatcher` and every `SpecialSearchLeaf.matches` closure are pure functions —
unit-tested directly against constructed `Card` fixtures, no simulator rendering needed.
`SpecialSearchEngine.filter`'s AND/OR composition gets its own tests. The tree/UI wiring is
thin SwiftUI, verified via a real Simulator screenshot once built.

## Out of scope for this phase

Leader Skills group (Phase 2), Active Skill group (Phase 3), the 2 broken web leaves, the
"additional display" annotation feature itself (only its filter side-effect is ported),
per-leaf custom sort overrides, saved special-search presets (sub-project 5).
