# iOS App — Sub-project 2: Core Browse UI

## Context

Sub-project 1 (data & sync foundation) shipped `Card`/`Skill` models, `DataStore`,
`GitHubSyncService`, and Settings/Sync screens. The app can now fetch and cache the
same JSON + sprites the web dictionary uses, but has no way to browse them.

This sub-project adds the actual card-browsing experience: a searchable, sortable
grid of all cards, and a detail view per card — with no filters yet (attribute/type/
rarity/awoken filters are sub-project 3) and no compare mode (sub-project 5).

## Goal

- Browse all ~13,878 cached cards in a grid, rendered with the same card-art +
  attribute-frame visuals as the web version.
- Search by card ID, sort by the same 8 keys the web version supports, toggle
  direction.
- Tap a card to see a detail view at web parity: stats, awakenings, active/leader
  skill text (merged JA/EN/translated, matching `resolvedSkill()`), and the
  evolution-line strip (tap another card in the line to navigate to it).

## Sprite rendering

The web version draws card art and attribute frames with a single CSS trick:
position a full sprite sheet as a background image and offset it so only one
cell shows through a fixed-size box. We port that exact trick to SwiftUI instead
of cropping images with CoreGraphics — same math, same visual result, less code.

- **Card art** (`images/cards_ja/CARDS_XXX.webp`, confirmed 1024×1024, 10×10 grid,
  102px step, 100px art): sheet file for card `id` is
  `CARDS_{ceil(id/100)}.webp`; index within the sheet is `(id-1) % 100`, column
  `index % 10`, row `index / 10`. Displayed at cell size `s`: scale the full sheet
  `Image` to `10.24s × 10.24s`, `.offset(x: -1.02s*col, y: -1.02s*row)`, then
  `.frame(width: s, height: s).clipped()`.
- **Attribute frame overlay** (`images/CARDFRAME2.png`, confirmed 712×412 — i.e.
  `7.12s × 4.12s` at `s=100`): same offset/clip trick, scaled to `7.12s × 4.12s`,
  offset `x: -1.02s*attr`, `y: 0` for the main-attribute layer, `y: -1.04s` for a
  second "sub-attribute" layer (drawn on top when the card has a second attribute).
  Attribute value `6` (no attribute) instead uses `images/CARDFRAMEW.png`
  (confirmed 128×128), scaled directly to `s × s` — no offset needed.
- **Awakening icons** (`images/awoken.png`, confirmed 96×4608 — 144 cells of 32px
  stacked in one column): cell for awakening id `n` is offset `y: -32*n` at native
  scale, no horizontal offset.
- `SpriteSheetCache`: a small `NSCache<NSString, UIImage>` keyed by filename,
  loading each sheet from the synced `Documents/` cache once and reusing the
  decoded `UIImage` across every grid cell that needs it — avoids re-decoding the
  same 1024×1024 webp per cell in a scrolling grid.
- `CardArtworkView` (art + frame layers) and `AwakeningIconView` are the only two
  sprite-consuming SwiftUI views; both are pure presentation wrapping
  `SpriteSheetCache`.

## Data layer additions

Small, additive changes — no existing sub-project 1 interface changes.

- `Card` gains two fields confirmed present in `mon_ja.json`: `henshinTo: [Int]`
  and `henshinFrom: [Int]` (both default to `[]` when absent from the JSON, since
  most cards don't have transform links).
- `SkillResolver` — a pure function mirroring `resolvedSkill()`/`cdText()` from
  `dict.js`: given a skill id and the `DataStore`'s three skill collections,
  returns the merged name/description (EN text wins, else pre-translated text
  tagged `(translated)`, else blank) and the CD range string (`"CD 8"` or
  `"CD 8→3"` if level-up reduces it). Also strips PAD's inline formatting codes
  (`^ff3600^` color, `^p` reset) that leak into translated text.
- `evoFamily(card:, in: [Card])` — BFS over cards sharing `evoRootId` plus
  `henshinTo`/`henshinFrom` transform links, capped at 40 nodes — ported
  line-for-line from `dict.js`'s `evoFamily()`.
- `CardSort` — the 8 comparators from the web's `SORTS` array (id, rarity, cost,
  attribute, HP, ATK, RCV, skill CD), each a pure `(Card, Card) -> Bool` usable
  with `Array.sorted(by:)`. CD compares each card's `activeSkillId`'s
  `initialCooldown` (0 if the skill doesn't exist).

## UI

- Root becomes a `TabView` with three tabs: **Browse** (new, default), **Sync**,
  **Settings** (both existing, unchanged).
- **Browse tab**: a search field (matches card ID only — e.g. typing "630" shows
  card 630 and any card whose ID contains "630"), a sort menu (8 keys) + direction
  toggle button, and a `LazyVGrid` of `CardArtworkView` cells. `LazyVGrid` handles
  virtualization natively — no manual pagination needed for ~13,878 cards.
- Tapping a cell pushes a `CardDetailView` via `NavigationLink`: header (art +
  frame, EN name with JP fallback, `#id · JPname`, type chips, rarity star, cost
  chip), a stats row (HP/ATK/RCV max), an awakenings row (+ a separate "Super"
  row if any), active-skill and leader-skill blocks (name, CD text, merged
  description via `SkillResolver`), and — if the evolution family has more than
  one member — an evolution-line strip of small `CardArtworkView` thumbnails
  (current card highlighted) that navigate to the tapped card's own detail view
  when pressed.

## Error handling

- Empty `DataStore.cards` (no sync yet) shows the same empty-state prompt as the
  Sync tab, reusing that copy — the Browse tab just has nothing to render, no new
  error states to invent.
- Missing/undecodable skill for an id (e.g. `activeSkillId == 0`, meaning "no
  skill") renders the block with a dim "—" placeholder, matching the web's
  behavior — never a crash from a missing dictionary entry.
- A sprite sheet file missing from the local cache (e.g. sync never fully
  finished) renders an empty gray box for that cell instead of crashing —
  `SpriteSheetCache` returns `nil` and the view falls back to a placeholder.

## Out of scope for this sub-project

- No attribute/type/rarity/awoken filters (sub-project 3).
- No special-search skill taxonomy (sub-project 4).
- No compare mode, no saved presets (sub-project 5).
- No SVG type-icon rendering — the detail view uses plain text chips for types
  (matching the web's detail dialog, which also uses text chips, not the SVG
  icons); the SVG icons are only used in the *filter* buttons, which belong to
  sub-project 3.

## Testing

Unit tests (no simulator rendering needed) for every pure function: `SkillResolver`
merge precedence (EN > translated > blank, formatting-code stripping), `evoFamily`
BFS (root siblings, transform links, the 40-node cap), each `CardSort` comparator,
and the sprite position math (sheet filename + offset for a handful of known card
IDs, e.g. id 1 → `CARDS_001.webp` col 0 row 0; id 101 → `CARDS_002.webp` col 0 row
0). SwiftUI views stay thin wiring over these and aren't independently unit tested.
