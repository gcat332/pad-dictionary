# Skill-text inline icons + attribute images in filter

**Date:** 2026-07-03
**Platform:** iOS (SwiftUI app) only. Web viewer unchanged.

## Problem

1. **Card detail → skill text** contains `{Token}` markup (e.g. `Deal damage, change {Fire} orbs to {Water}`)
   rendered as literal braces. Map each token to a small inline icon: orb color, awoken skill,
   monster type, gimmick orb.
2. **Filter → attribute selector** shows flat color dots. Replace with the actual attribute orb images.

## Data facts

Skill descriptions (`skill_en.json` / `skill_tr.json`) contain **123 distinct `{...}` tokens**:

| Category | Count | Example | Icon source |
|----------|-------|---------|-------------|
| Awoken skill name | 85 | `{Two-Pronged Attack}` | `awoken.png` (existing) |
| Monster type | 9 | `{Devil}`, `{Dragon}` | `icon-type.svg` (existing) |
| Orb / gimmick orb | 11 | `{Fire}`, `{Jammers}`, `{locks}` | `icon-orbs.png` (NEW) |
| Unmatched | 18 | `{Combo}`, `{Fire Surge}` | awoken alias, else plain text |

**Orb index map** (canonical PAD order, confirmed against upstream `style.css` `.orb-icon[data-orb-icon]`
and by inspecting the sheet). `icon-orbs.png` is 72×360, **36px cells, 2 cols × 10 rows**. The **left
column (col 0), rows 0–9** are every orb we need; the right column holds state overlays:

| idx | token | idx | token |
|-----|-------|-----|-------|
| 0 | Fire | 5 | Heal |
| 1 | Water | 6 | Jammers |
| 2 | Wood | 7 | Poison |
| 3 | Light | 8 | Lethal Poison |
| 4 | Dark | 9 | Bombs |

`{locks}` → the lock state overlay (col 1, row 1). All 11 orb tokens come from this **one** sheet, so
`attrs.png` is not needed. The filter attribute buttons also use col 0 rows 0–4.

**Decision on the 18 unmatched:** several are awoken variants whose skill-text label differs from the
awoken table (`Enhanced Light Rows`, `Heal Enhanced`, `Extended Move Time+`, …) — resolve via a small
alias map into `awoken.png`. The rest (`Combo`, `* Surge`, `Change Sub Attribute: *`) are compound
effects with no single icon → plain text (braces stripped). GameWith is **not** needed; upstream sprites
are cleaner and already vendored via the same sync path.

## Existing infrastructure (reused, not rebuilt)

- Images are downloaded from the user's GitHub repo at runtime by `GitHubSyncService` into the app
  Documents dir, then read by `SpriteSheetCache` / `TypeIconCache`.
- `AwakeningIconView` already crops `awoken.png` (32px cells) by id. `AwakeningNames` maps id→name.
- `TypeIconCache` already produces a per-type `UIImage` from `icon-type.svg`.

## Design

### 1. Assets (1 new file from existing upstream `Mapaler/PADDashFormation`)

- Add `/images/icon-orbs.png` to `update-data.sh` (sparse-checkout `patterns` + copy step).
- Add it to `GitHubSyncService.fixedImageFiles` so the app downloads it on sync.

Geometry is fixed: 72×360, 36px cells, 2 cols × 10 rows (see orb index map above).

### 2. `OrbIconSprite` (new SwiftUI view)

Crops one 36px cell from `icon-orbs.png` at (col,row) (same crop pattern as `AwakeningIconView`) →
renders at a given size. Backs both the skill-text orb tokens (col 0, rows 0–9; `locks` → col 1 row 1)
and the filter attribute buttons (col 0, rows 0–4).

### 3. Token resolution — `SkillToken` (new)

`SkillToken.icon(for name: String) -> Resolved?` tries, in order:
1. orb name → `.orb(col, row)`  (hardcoded dict, 11 entries per the orb index map)
2. type name → `.type(id)`  (name→id from existing type table)
3. awoken name → `.awoken(id)`  (reverse map added to `AwakeningNames`, plus a small alias
   map for the ~8 awoken variants whose skill-text label differs from the table)
4. else → `nil` (caller renders plain text)

Add `AwakeningNames.id(forName:)` — reverse of the existing `names` dict, built once.

### 4. `SkillTextView` (new SwiftUI view)

- Splits the description on `\{([^}]+)\}` into ordered runs (text | token).
- Builds a **single wrapping `Text`** by concatenating: `Text(run)` for text, and
  `Text(Image(uiImage: cellCrop)).baselineOffset(...)` for a resolved token; unmatched tokens append
  `Text(name)` (braces stripped). `Text + Text` composition is the native way to get inline icons that
  flow and line-wrap with the text.
- Icons render at ~font cap-height (≈14px) so they sit inline with the 13px skill text.
- Replaces `Text(resolved.description)` at `CardDetailView.swift:163` (keep the `translated` badge HStack).

### 5. Filter attribute buttons — `FilterView`

Replace the color-dot swatch in the attribute selector with `OrbIconSprite` for attributes 0–4
(Fire…Dark) from `icon-orbs.png` col 0. No logic change; presentation only.

## Testing

One `SkillTextTests` (assert-based):
- tokenizer splits `"a {Fire} b {Two-Pronged Attack} c {Nonexistent}"` into the expected run sequence
- `SkillToken.icon(for:)` resolves `Fire`→orb, a known awoken name→its id, type name→its id,
  `Nonexistent`→nil (plain-text path)

## Out of scope

- Web viewer (`dict.js`) token rendering.
- The compound-effect tokens with no single icon (`Combo`, `* Surge`, `Change Sub Attribute: *`) — text.
- Dungeon-board gimmick icons (`icon-cloud-1.png`, `icon-immobility.png`, `icon-deep-dark.png`, bind,
  etc.) — these are board-render gimmicks, never appear as `{tokens}` in skill text.
