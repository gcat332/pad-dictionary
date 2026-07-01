# iOS App — Sub-project 3: Basic Filters

## Context

Sub-project 2 shipped the Browse grid (search-by-ID, 8-key sort) and card detail view. This
sub-project adds the web dictionary's non-special-search filters: attribute (3 positional
slots), type, rarity, awakening (count-aware), and can-be-assist — ported from `dict.js`'s
`F` state object and `matches()` function. Special-search (the skill taxonomy tree) is
sub-project 4; saved presets and compare mode are sub-project 5.

Per user direction, this sub-project is executed with the same rigor as prior ones (real
Simulator verification, TDD) but without a back-and-forth design Q&A — design decisions
below follow the web's existing behavior 1:1 since that's already a proven, shipped UX.

## Ported filter semantics (from `dict.js`)

- **Attribute** — 3 independent positional slots (main/sub/3rd). Each slot is a multi-select
  (OR) over the 5 elements; a card matches a slot only if that slot has selections AND the
  card's `attrs[slot]` is one of them. Empty slot = no constraint.
- **Type** — multi-select (OR) over the 12 named types; card matches if ANY of its `types`
  is in the selected set. Empty = no constraint.
- **Rarity** — multi-select (OR) over ★1–★10; card matches if its `rarity` is selected.
- **Awakening** — multi-select but count-aware: selecting the same awakening twice means
  "needs at least 2 copies of this awakening." A toggle ("incl. Super") decides whether
  `superAwakenings` count toward the total alongside `awakenings`.
- **Can-be-assist** — simple boolean; when on, only `canAssist == true` cards match.
- All active filter categories AND together (matching the web).

## Architecture

- `FilterState` (Swift struct) — mirrors `F`: `var attr: [Set<Int>]` (3 slots), `var types:
  Set<Int>`, `var rarities: Set<Int>`, `var awakenings: [Int]` (array, not set — duplicates
  encode required count), `var includeSuper: Bool`, `var canAssistOnly: Bool`. Pure function
  `func matches(_ card: Card) -> Bool` ports `matches()` (minus the term/search part, which
  stays in `BrowseViewModel` from sub-project 2).
- `BrowseViewModel` gains `@Published var filterState = FilterState()`; its `cards` computed
  property ANDs `filterState.matches(card)` with the existing ID-substring search and sort.
- `FilterView` (SwiftUI, presented as a `.sheet` from a new toolbar button on `BrowseView`) —
  sectioned multi-select button grids for Attr 1/2/3, Type, Rarity; an awakening grid where
  tap = +1 count, long-press = −1 count (native touch equivalent of the web's left/right
  click), with a small count badge on multi-selected chips; an "incl. Super" toggle; a
  "Can be assist" toggle; a "Clear filters" button. The toolbar button shows a filled icon
  when any filter is active, matching "genuinely usable, not a wireframe."

## Data

No `Card`/`Skill` model changes — every field `FilterState.matches` needs (`attrs`, `types`,
`rarity`, `awakenings`, `superAwakenings`, `canAssist`) already exists.

## Error handling

Nothing new — filtering an empty `dataStore.cards` just yields an empty grid, already
handled by the existing empty-state view from sub-project 2.

## Testing

`FilterState.matches` is a pure function — unit-tested directly for every filter category
(positional attr slots, type OR-match, rarity, awakening count logic including the
incl-super toggle, can-assist) without touching SwiftUI. `BrowseViewModel`'s composition of
filter + search + sort gets one integration test. `FilterView`'s tap/long-press interaction
is thin SwiftUI wiring, verified visually via a real Simulator screenshot once implemented.

## Out of scope

Special-search skill taxonomy (sub-project 4). Saved filter presets, compare mode
(sub-project 5). No changes to the existing ID-only search box.
