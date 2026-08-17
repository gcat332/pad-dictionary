# `[<Attr> Awakening]` → Orb Alias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SkillToken.resolve` recognize `"<attr> Awakening"` (Google's rendering of `目覚め`, "while `<attr>` is active" inside multi-part active skills) for every attribute/weekday-kanji spelling already tracked in the tokenizer, so `[Fire Awakening]` (card 14014) and `[Water Awakening]` (card with skill id 64449) render as the matching orb icon instead of literal bracketed text.

**Architecture:** One generated line inside the existing `attrAliases` closure in `SkillTextTokenizer.swift` — reuses the per-attribute word list (`attrs`) already there, so every known mistranslation spelling of an attribute (`wood`/`tree`/`thursday`, `water`/`wednesday`, `dark`/`darkness`, plus `recovery`/`heal`/`healing`) automatically gets an `"<word> awakening"` → canonical-attribute-name alias, which `resolve(_:)` then routes straight to the plain orb.

**Tech Stack:** Swift, XCTest.

## Global Constraints

- Only `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift` and its test file change — no changes to `AwakeningNames.swift` (this phrase is not a real awakening skill) or any View.
- The generated alias is unconditional across all six `attrs` entries (including Heal) — do not gate it on `rowCombo`, since "while Heal is active" is semantically the same "this state is active" meaning even though there's no Heal row/combo awakening.
- Do not add aliases for verb translations other than "awakening" (e.g. "wake up") — none have been observed yet; see the spec's "Why a generated rule" section for why guessing is worse than waiting for a real example.
- Test command (adjust simulator name if needed):
  ```
  xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:PADDictionaryTests/SkillTextTokenizerTests 2>&1 | tail -30
  ```

---

## File Structure

- **Modify** `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift` — add the generated `"<word> awakening"` alias inside `attrAliases`.
- **Modify** `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift` — add coverage for the new aliases.

---

## Task 1: Generate `<attr> Awakening` aliases and verify against real card data

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift`

**Interfaces:**
- Consumes: the existing `attrs: [(words: [String], canon: String, rowCombo: Bool)]` list inside `attrAliases` (`SkillTextTokenizer.swift`, current lines 70-77) — unchanged.
- Produces: no new public symbols. `SkillToken.resolve("Fire Awakening")`, `.resolve("Water Awakening")`, `.resolve("Thursday Awakening")`, etc. now return `.orb(...)` instead of `nil`.

- [ ] **Step 1: Write the failing tests**

In `ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift`, add a new test method after `testGeneratedAttributeFamilies()`:

```swift
    func testGeneratedAwakeningStateAliases() {
        // <attr>目覚め ("while <attr> is active", inside multi-part active skills) —
        // Google renders 目覚め as "Awakening". Card 14014 has [Fire Awakening];
        // skill id 64449 has [Water Awakening]. Resolves straight to the plain orb.
        XCTAssertEqual(SkillToken.resolve("Fire Awakening"), .orb(x: 0, y: 0, w: 36, h: 36))
        XCTAssertEqual(SkillToken.resolve("Water Awakening"), .orb(x: 0, y: 36, w: 36, h: 36))
        // Weekday-kanji mistranslation aliases (already tracked for Wood/Water elsewhere
        // in this file) must resolve the same way, proving this is generated, not two
        // one-off literal entries.
        XCTAssertEqual(SkillToken.resolve("Thursday Awakening"), .orb(x: 0, y: 72, w: 36, h: 36))   // Wood
        XCTAssertEqual(SkillToken.resolve("Wednesday Awakening"), .orb(x: 0, y: 36, w: 36, h: 36))  // Water
        XCTAssertEqual(SkillToken.resolve("Darkness Awakening"), .orb(x: 0, y: 144, w: 36, h: 36))  // Dark
        // Case-insensitive, like every other lookup in this file.
        XCTAssertEqual(SkillToken.resolve("fire awakening"), .orb(x: 0, y: 0, w: 36, h: 36))
    }
```

- [ ] **Step 2: Run the tests to verify the new one fails**

```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SkillTextTokenizerTests/testGeneratedAwakeningStateAliases 2>&1 | tail -30
```
Expected: FAIL — `SkillToken.resolve("Fire Awakening")` returns `nil`, not `.orb(...)`.

- [ ] **Step 3: Add the generated alias**

In `ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift`, inside the `attrAliases` closure, current code (lines 79-87):

```swift
        for (words, canon, rowCombo) in attrs {
            for w in words {
                for noun in ["drop", "attribute"] {
                    for verb in ["enhancement", "reinforcement"] {
                        out["\(w) \(noun) \(verb)"] = "Enhanced \(canon) Orbs"
                        out["\(w) \(noun) \(verb) +"] = "Enhanced \(canon) Orbs+"
                        out["\(w) \(noun) \(verb)+"] = "Enhanced \(canon) Orbs+"
                    }
                }
```

Change to:

```swift
        for (words, canon, rowCombo) in attrs {
            for w in words {
                // <attr>目覚め ("while <attr> is active", used inside multi-part active
                // skills) — Google renders 目覚め as "Awakening"; resolves straight to
                // the plain attribute orb, same as the bare attribute name would.
                out["\(w) awakening"] = canon
                for noun in ["drop", "attribute"] {
                    for verb in ["enhancement", "reinforcement"] {
                        out["\(w) \(noun) \(verb)"] = "Enhanced \(canon) Orbs"
                        out["\(w) \(noun) \(verb) +"] = "Enhanced \(canon) Orbs+"
                        out["\(w) \(noun) \(verb)+"] = "Enhanced \(canon) Orbs+"
                    }
                }
```

(Only the new `out["\(w) awakening"] = canon` line is added; everything else in the closure — the `guard rowCombo else { continue }` row/column block, the combo block below it — is unchanged. The new line sits *before* that guard, so it runs for all six `attrs` entries including Heal.)

- [ ] **Step 4: Run the tests to verify they pass**

```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SkillTextTokenizerTests 2>&1 | tail -40
```
Expected: PASS — all tests in the file, including `testGeneratedAwakeningStateAliases`.

- [ ] **Step 5: Pull the upstream data commits and verify against the real cards**

Local `main` was 2 commits behind `origin/main` (the two commits that add card 14014 and the sibling `[Water Awakening]` card) at the time this plan was written. Bring them in:

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git pull --ff-only origin main
```
Expected: a fast-forward merge (no conflicts — these are bot-authored data-only commits). If it's no longer 2 commits behind (someone already pulled), this is a no-op and that's fine.

Then confirm the raw skill text is present:
```bash
grep -o '"id":64485[^}]*"description":"[^"]*"' monsters-info/skill_tr.json | head -c 300
grep -o '"id":64449[^}]*"description":"[^"]*"' monsters-info/skill_tr.json | head -c 300
```
Expected: both greps print a description containing `[Fire Awakening]` / `[Water Awakening]` respectively (skill 64485 is card 14014's active skill; run the app, open card 14014's detail screen — via /run or Xcode, with a data sync/refresh done at least once so `icon-orbs.png` is present — and confirm `[Fire Awakening]` now renders as the Fire orb icon rather than literal bracketed text).

- [ ] **Step 6: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add ios/PADDictionary/PADDictionary/Models/SkillTextTokenizer.swift \
        ios/PADDictionary/PADDictionaryTests/SkillTextTokenizerTests.swift
git commit -m "Map [<Attr> Awakening] skill-text phrasing to the matching orb icon"
```

---

## Self-Review

**Spec coverage:**
- Generated (not hand-listed) alias covering every tracked attribute-word spelling → Step 3. ✓
- Unconditional across all six `attrs` entries, including Heal → Step 3 (placed before the `rowCombo` guard). ✓
- No verb-translation guessing beyond "awakening" → not added; called out explicitly in Global Constraints. ✓
- Card 14014 / skill 64449 actually verified against real (pulled) data, not just unit tests → Step 5. ✓
- No `AwakeningNames.swift` change → confirmed, File Structure lists only the tokenizer + its test. ✓

**Placeholder scan:** No TBD/TODO; full code and exact before/after shown for the one production change.

**Type consistency:** `SkillToken.resolve(_:) -> SkillTokenKind?` and `.orb(x:y:w:h:)` — same signature used in the new tests as in every existing test in the file (e.g. `testResolveOrb`, `testResolveIrregularPhrasings`). Row math (`y = row * 36`) matches `orbRow` (`Fire: 0, Water: 1, Wood: 2, Dark: 4`) exactly as used elsewhere in the same test file.
