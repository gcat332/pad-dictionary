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
| Orb / gimmick orb | 11 | `{Fire}`, `{Jammers}`, `{locks}` | `attrs.png` + `icon-orbs.png` (NEW) |
| Unmatched | 18 | `{Combo}`, `{Nail}`, `{Fire Surge}` | plain text fallback |

The 11 orbs: `Fire Water Wood Light Dark Heal` (attrs.png) + `Jammers Poison "Lethal Poison" Bombs locks` (icon-orbs.png).

**Decision:** the 18 unmatched tokens render as plain text with braces stripped. They are rare and
several are awoken variants; hand-mapping is deferred until usage shows which matter (add later, cheap).

## Existing infrastructure (reused, not rebuilt)

- Images are downloaded from the user's GitHub repo at runtime by `GitHubSyncService` into the app
  Documents dir, then read by `SpriteSheetCache` / `TypeIconCache`.
- `AwakeningIconView` already crops `awoken.png` (32px cells) by id. `AwakeningNames` maps id→name.
- `TypeIconCache` already produces a per-type `UIImage` from `icon-type.svg`.

## Design

### 1. Assets (2 new files from existing upstream `Mapaler/PADDashFormation`)

- Add `/images/attrs.png` and `/images/icon-orbs.png` to `update-data.sh`
  (sparse-checkout `patterns` + copy step).
- Add both to `GitHubSyncService.fixedImageFiles` so the app downloads them on sync.

Exact cell geometry (`attrs.png` 72×252, `icon-orbs.png` 72×360) is pinned during implementation by
inspecting the sheets — likely 36px cells, but verify against the real image before committing offsets.

### 2. `OrbIconSprite` (new SwiftUI view)

Crops one cell from `attrs.png` / `icon-orbs.png` (same pattern as `AwakeningIconView`) → renders at a
given size. Backs both the skill-text orb tokens and the filter attribute buttons.

### 3. Token resolution — `SkillToken` (new)

`SkillToken.icon(for name: String) -> Resolved?` tries, in order:
1. orb name → `.orb(sheet, cell)`  (small hardcoded dict, ~11 entries)
2. type name → `.type(id)`  (name→id from existing type table)
3. awoken name → `.awoken(id)`  (reverse map added to `AwakeningNames`)
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
(Fire…Dark) from `attrs.png`. No logic change; presentation only.

## Testing

One `SkillTextTests` (assert-based):
- tokenizer splits `"a {Fire} b {Two-Pronged Attack} c {Nonexistent}"` into the expected run sequence
- `SkillToken.icon(for:)` resolves `Fire`→orb, a known awoken name→its id, type name→its id,
  `Nonexistent`→nil (plain-text path)

## Out of scope

- Web viewer (`dict.js`) token rendering.
- Hand-mapping the 18 unmatched tokens.
- The many other upstream icons (bind/poison/dungeon gimmick `icon-*.png`) not referenced by `{tokens}`.
