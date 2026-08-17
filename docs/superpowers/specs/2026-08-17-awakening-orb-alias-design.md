# Skill-text fix: `[<Attr> Awakening]` → attribute orb

## Problem

Card 14014 (夕凪の魔女・ドーナ, active skill id 64485) has a machine-translated skill
line containing `[Fire Awakening]` (JP `[火目覚め]`, "while Fire is active" — a
self-referential status name inside a multi-part active skill, not a passive awakening
skill). `SkillToken.resolve` (`SkillTextTokenizer.swift`) doesn't recognize the phrase,
so `SkillTextView`'s unresolved-token fallback prints it literally as `[Fire
Awakening]` instead of an icon.

The same mistranslation pattern (`<attr>目覚め` → "`<Attr> Awakening`") already exists
for at least one sibling — skill id 64449 has `[Water Awakening]` (JP `[水目覚め]`),
also unresolved. Both cards are only on `origin/main` (2 commits ahead of local `main`
at the time of writing) via the upstream data-sync commits, not yet pulled locally.

## Why a generated rule, not two more hand-written aliases

The obvious fix — add `"Fire Awakening": "Fire"` and `"Water Awakening": "Water"` to
the hand-maintained `aliases` dict, the same way `03b97bd` added `"Recovery
Enhancement": "Heal"` — works, but only for the two phrasings already observed. This
translation is per-attribute and Google's phrasing for "attribute" varies (the file
already tracks this for `attrAliases`: `wood` also renders as `tree`/`thursday`,
`water` also renders as `wednesday`, `dark` also renders as `darkness`). Hand-adding
one alias per attribute per card that happens to trip over it is the same
whack-a-mole `attrAliases`' block comment already calls out avoiding: *"generate the
permutations instead of hand-listing ~150 aliases."*

`SkillTextTokenizer.swift`'s `attrAliases` closure already holds exactly the
word-list-per-attribute this needs (`attrs`, lines 70-77). Generating `"<word>
awakening"` for every word in that list — instead of adding two literal dict entries —
means any future card whose skill text uses any of the *already-known* mistranslation
variants for any of the five attributes (or Heal) resolves automatically, with no
further code change.

**Limit of this fix:** it only covers variants where Google renders 目覚め as
"awakening" (the only verb form observed so far). If a future upstream card renders it
as something else entirely (e.g. "wake up", "arousal"), that specific verb won't
auto-resolve — add it as a new entry to the same `attrs` word/verb generation the
first time it's actually seen, per this file's established practice (see the comment
above the `aliases` dict: *"Extend this as new translated phrasings show up"*).
Guessing at unseen verb translations now would risk generating false-positive matches
for phrasings that turn out to mean something else.

## Design

In `SkillTextTokenizer.swift`'s `attrAliases` closure, inside the existing `for w in
words` loop (before the `drop`/`attribute` enhancement generation), add one line per
word:

```swift
for (words, canon, rowCombo) in attrs {
    for w in words {
        // <attr>目覚め ("while <attr> is active", used inside multi-part active
        // skills) — Google renders 目覚め as "Awakening"; resolves straight to the
        // plain attribute orb, same as the bare attribute name would.
        out["\(w) awakening"] = canon
        for noun in ["drop", "attribute"] {
            ...  // unchanged
```

This is unconditional (not gated by `rowCombo`), so it also generates `"recovery
awakening"` / `"heal awakening"` / `"healing awakening"` → `"Heal"` — harmless if that
phrasing never actually appears, and correct if it does (resolves to the heal orb, the
same semantic "this state is active" meaning).

`resolve(_:)` needs no changes: a hit on `"fire awakening"` resolves to canon `"Fire"`,
which then matches `orbRowLower["fire"]` exactly like the bare word does today.

## Testing

- Extend `SkillTextTokenizerTests.swift` with cases for `SkillToken.resolve("Fire
  Awakening")`, `resolve("Water Awakening")`, and one weekday-alias variant (e.g.
  `resolve("Thursday Awakening")` → the Wood orb) to prove the generation, not just
  the two literally-observed phrasings, is what's covered.
- Manual: `git pull` to bring in card 14014 / skill 64485 (and 64449), open the card in
  the app, confirm `[Fire Awakening]` (and `[Water Awakening]` on the other card) now
  render as the Fire/Water orb icon instead of literal bracketed text.

## Out of scope

- No change to `AwakeningNames.swift` or the awoken-skill icon set — this phrase was
  never a real awakening skill, so it doesn't belong there.
- Not pre-generating aliases for verb translations that haven't been observed yet (see
  "Limit of this fix" above).
