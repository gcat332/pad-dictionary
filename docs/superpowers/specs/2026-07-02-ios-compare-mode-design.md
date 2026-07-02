# iOS App — Sub-project 5: Compare Mode

## Context

The original SP5 scope was "Saved Presets + Compare mode." The web app already has full
reference implementations of both (`dict.js`): Saved Presets (`initPresets()`,
`localStorage`-backed full filter-state snapshots) and Compare mode (`addCompare`/
`renderCmpBar`/`openCompare`, an in-memory list of card IDs with a side-by-side stat/skill
grid). User decision: **drop Saved Presets from scope entirely** (not deferred — cancelled).
This sub-project covers **Compare mode only**, porting the web's behavior with a few
iOS-specific UX choices confirmed below.

## Reference: the web's Compare mode

- `COMPARE: number[]` — in-memory only, never persisted, cleared on page reload.
- Added via a "⇄ Compare" button in the card detail dialog (`addCompare`, one-way add,
  no-ops if already present).
- A fixed bottom bar (`cmpBar`) appears whenever `COMPARE` is non-empty: card thumbnails
  (click to remove), a "Compare N" button, a "Clear" button.
- Tapping "Compare N" opens a dialog (`openCompare`) rendering a CSS grid: one label column
  + one column per card, rows for Type, Rarity, Cost, HP/ATK/RCV (bold, highest value
  marked `.best`), Awakenings, Active skill text, Leader skill text.

## Confirmed iOS-specific decisions

- **No card limit** — matches the web (unbounded `COMPARE` array).
- **Two entry points** (web only has one): the `CardDetailView` button, AND long-press on a
  card thumbnail in the `BrowseView` grid. Long-press directly toggles membership — no
  separate "selection mode" UI state.
- **`CardDetailView` button is a toggle** (not a one-way "Add" like the web) — reads
  "⇄ Add to Compare" / "✕ Remove from Compare" depending on current membership. This is an
  intentional upgrade over the web's one-way button, confirmed with the user.
- **Compare screen is a full-screen sheet**, not a `.paged` layout — a sticky label column
  on the left, horizontally-scrolling card columns on the right (see Architecture).
- **Compare bar is scoped to the Browse tab only** — not a global overlay visible from
  Sync/Settings, since adding/removing cards only happens in Browse-adjacent screens.

## Architecture

- **`CompareStore`** (new, `Models/CompareStore.swift`): `ObservableObject` with
  `@Published var ids: [Int] = []`. Methods: `add(_ id: Int)`, `remove(_ id: Int)`,
  `toggle(_ id: Int)`, `clear()`, `contains(_ id: Int) -> Bool`. Ephemeral — no persistence,
  matching the web. Instantiated once in `ContentView` and threaded down through
  initializers alongside the existing `dataStore` parameter (following the codebase's
  established pattern — not `@EnvironmentObject`).
- **`BrowseView`** changes: each grid cell gets `.onLongPressGesture { compareStore.toggle(card.id) }`.
  A new bottom-aligned overlay view, `CompareBar`, renders whenever `compareStore.ids` is
  non-empty: card thumbnails (`CardArtworkView` at a small size, tap removes), a
  "Compare N" button presenting `CompareView` as a `.sheet`, and a "Clear" button.
- **`CardDetailView`** changes: the existing header gains a toggle button reading its label
  from `compareStore.contains(card.id)`.
- **`CompareView`** (new, `Views/CompareView.swift`): takes `cardIds: [Int]`, `dataStore`,
  `compareStore`. Resolves `Card` objects from `dataStore.cardsById`. Layout:
  `HStack(alignment: .top) { StickyLabelColumn; ScrollView(.horizontal) { HStack { per-card columns } } }`.
  Removing a card updates `compareStore`; if `compareStore.ids` becomes empty, the sheet
  dismisses itself (via `.onChange(of: compareStore.ids)` in the presenting view).

## Row rendering (one per card, in the scrolling `HStack`)

- **Header**: `CardArtworkView`, `card.displayName`, `#id`, a remove button.
- **Type**: `card.types.filter { $0 >= 0 }.map(CardTypeNames.name(for:))`, joined.
- **Rarity**: `"★\(card.rarity)"`.
- **Cost**: `card.cost`.
- **HP / ATK / RCV**: `card.hp.max` / `card.atk.max` / `card.rcv.max`, each row computing
  the max across all compared cards and bolding/highlighting column(s) that match it (ties
  all highlighted, matching the web's `nrow`).
- **Awakenings**: reuse the existing `AwakeningIconView` row-rendering already built for
  `CardDetailView`'s awakenings section.
- **Active skill / Leader skill**: reuse `SkillResolver.resolve()` + `cooldownText()`
  (already built), rendering name + description + cooldown, same as
  `CardDetailView.skillSection`.

## Testing

- `CompareStore`: pure unit tests for `add`/`remove`/`toggle`/`clear`/`contains` (no
  dependencies, trivially testable).
- `CompareView`'s max-value-highlighting logic: extracted as a small pure function (e.g.
  `bestIndices(_ values: [Int]) -> Set<Int>`) and unit-tested directly, since SwiftUI view
  bodies aren't unit-testable — this mirrors how `FilterState`/`CardSort` logic was kept
  pure and tested apart from their views in earlier sub-projects.
- UI wiring (long-press gesture, sheet presentation, auto-dismiss on empty) verified via a
  real Simulator screenshot/interaction, same bar as every prior phase's UI-only tasks.

## Out of scope

Saved Presets (cancelled, not deferred — see Context). Persisting Compare selection across
app launches (matches the web's ephemeral behavior). A card limit (matches the web).
