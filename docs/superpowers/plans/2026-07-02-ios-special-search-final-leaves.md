# SP4 Phase 4: Final 13 leaves + Seamless Buff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the 13 web leaves fixed in commit `01f6a9d` plus the previously-deferred
"Seamless Buff" leaf, bringing `SpecialSearchTree.leaves` from 249 to 263 (the only leaf
left out of 264 is the web's own `"No Filter"` sentinel, which is intentionally not a
selectable leaf on either platform).

**Architecture:** Two new `Card` fields (`is8Latent`, `searchFlags`) as `Optional` types
(no inline default — see Global Constraints for why), 4 new small models
(`CardReincarnation.swift`, `TypeKiller.swift`, `SeamlessBuff.swift`, plus additions to
`LeaderSkillScale.swift`), and 14 new `SpecialSearchLeaf` entries.

**Tech Stack:** Swift 6, SwiftUI, XCTest, Xcode project at
`ios/PADDictionary/PADDictionary.xcodeproj`.

## Global Constraints

- Any Swift file declaring `ObservableObject`/`@Published` must `import Combine` explicitly
  — not applicable to any file touched in this plan, but check before adding new files.
- **`Card`'s two new fields MUST be `Bool?`/`[Int]?` with NO inline default value**
  (`let is8Latent: Bool?`, not `let is8Latent: Bool? = nil` and not `let is8Latent: Bool = false`).
  This was verified empirically: Swift's synthesized `Decodable` conformance treats ANY
  stored property with an inline default value expression as "already satisfied" and
  **silently ignores the real JSON value even when the key IS present** — confirmed with a
  standalone reproduction (`Card(id:2,...,is8Latent:true,...)` decoded as `is8Latent: false`
  when the property had `= false` as its default). Plain `Bool?`/`[Int]?` with no default
  decodes correctly in both directions (present → real value, absent → nil) and matches the
  codebase's existing precedent (`syncAwakening: Int?`, also no inline default). The
  trade-off: unlike an inline-default approach, this means every existing full-memberwise
  `Card(...)` call site in the test target must be updated to pass these two new named
  arguments explicitly (enumerated exhaustively in Task 1 — do not assume there are fewer
  than the 11 listed; a previous phase in this project shipped a plan that assumed fixtures
  wouldn't need updates and was wrong).
- Match the codebase's existing idiom for safe array access:
  `array.indices.contains(i) ? array[i] : 0` (or `array[safe: i]` where a `subscript(safe:)`
  extension already exists in that specific file, e.g. `LeaderSkillScale.swift`) — do not
  introduce a new one elsewhere.
- `SkillChainMatcher.resolveAll(...)` defaults `searchRandom` to `false`; pass it explicitly
  in every call in this plan regardless, per established project convention.
- Every task that adds leaves to `SpecialSearchTree.swift` MUST update all 4
  `XCTAssertEqual(SpecialSearchTree.leaves.count, N)` assertions in
  `PADDictionaryTests/SpecialSearchTreeTests.swift` (currently at 249) — search the whole
  file for every occurrence, there are exactly 4.
- Group paths for new leaves must match each *specific group's existing Swift convention*,
  not the raw web engine tree path — some groups bundle loose leaves under a synthetic
  "Other" node in this codebase (e.g. `Active Skill`, `Leader Skills > Extra Effects`),
  others don't (e.g. `Evo type`, `Awakenings`, `Leader Skills > Matching Style`,
  `Leader Skills > Restriction/Bind`). Every group path below has already been verified
  against that group's current leaves in `SpecialSearchTree.swift` — use them exactly as
  given, do not re-derive from the raw web tree.

---

### Task 1: Add `Card.is8Latent`/`Card.searchFlags` + update every affected call site

**Files:**
- Modify: `PADDictionary/Models/Card.swift`
- Modify: `PADDictionaryTests/ActiveSkillEffectsTests.swift`
- Modify: `PADDictionaryTests/CardSortTests.swift`
- Modify: `PADDictionaryTests/EvoFamilyTests.swift`
- Modify: `PADDictionaryTests/FilterStateTests.swift`
- Modify: `PADDictionaryTests/SpecialSearchEngineTests.swift`
- Modify: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Produces: `Card.is8Latent: Bool?`, `Card.searchFlags: [Int]?`. Tasks 2 and 3 consume both.

- [ ] **Step 1: Add the two fields to `Card`**

In `PADDictionary/Models/Card.swift`, change:

```swift
    let syncAwakening: Int?

    var displayName: String { otLangName?.en ?? name }
```

to:

```swift
    let syncAwakening: Int?
    let is8Latent: Bool?
    let searchFlags: [Int]?

    var displayName: String { otLangName?.en ?? name }
```

- [ ] **Step 2: Update every full-memberwise `Card(...)` call site in the test target**

There are exactly 11. Each needs `, is8Latent: X, searchFlags: Y` inserted right before its
closing `)`, replacing the final `syncAwakening: ...)`. For "fresh construction" sites, use
`is8Latent: nil, searchFlags: nil`. For sites that copy an existing card's fields, copy
`is8Latent`/`searchFlags` from that same source card (matching how `syncAwakening` is
already copied there).

In `PADDictionaryTests/ActiveSkillEffectsTests.swift`, change:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

In `PADDictionaryTests/CardSortTests.swift`, change:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: [1], rarity: rarity, cost: cost, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: hp, max: hp, scale: 1), atk: StatRange(min: atk, max: atk, scale: 1), rcv: StatRange(min: rcv, max: rcv, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: [1], rarity: rarity, cost: cost, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: hp, max: hp, scale: 1), atk: StatRange(min: atk, max: atk, scale: 1), rcv: StatRange(min: rcv, max: rcv, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

In `PADDictionaryTests/EvoFamilyTests.swift`, change:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

In `PADDictionaryTests/FilterStateTests.swift`, change:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: rarity, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: canAssist, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: rarity, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: canAssist, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

In `PADDictionaryTests/SpecialSearchEngineTests.swift`, change (the `makeCard` helper):
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

Also in `PADDictionaryTests/SpecialSearchEngineTests.swift`, change the `c2` mutation (copies
`syncAwakening` from `c2` — copy the two new fields from `c2` the same way):
```swift
        c2 = Card(id: 2, name: c2.name, otLangName: nil, attrs: c2.attrs, types: c2.types, rarity: c2.rarity, cost: c2.cost, maxLevel: c2.maxLevel, isEmpty: c2.isEmpty, enabled: c2.enabled, hp: c2.hp, atk: c2.atk, rcv: c2.rcv, activeSkillId: c2.activeSkillId, leaderSkillId: c2.leaderSkillId, evoRootId: c2.evoRootId, awakenings: c2.awakenings, superAwakenings: c2.superAwakenings, canAssist: c2.canAssist, henshinTo: [3], henshinFrom: c2.henshinFrom, orbSkinOrBgmId: c2.orbSkinOrBgmId, badgeId: c2.badgeId, feedExp: c2.feedExp, sellPrice: c2.sellPrice, limitBreakIncr: c2.limitBreakIncr, sellMP: c2.sellMP, latentAwakeningId: c2.latentAwakeningId, stackable: c2.stackable, skillBanner: c2.skillBanner, evoMaterials: c2.evoMaterials, isUltEvo: c2.isUltEvo, evoBaseId: c2.evoBaseId, syncAwakening: c2.syncAwakening)
```
to:
```swift
        c2 = Card(id: 2, name: c2.name, otLangName: nil, attrs: c2.attrs, types: c2.types, rarity: c2.rarity, cost: c2.cost, maxLevel: c2.maxLevel, isEmpty: c2.isEmpty, enabled: c2.enabled, hp: c2.hp, atk: c2.atk, rcv: c2.rcv, activeSkillId: c2.activeSkillId, leaderSkillId: c2.leaderSkillId, evoRootId: c2.evoRootId, awakenings: c2.awakenings, superAwakenings: c2.superAwakenings, canAssist: c2.canAssist, henshinTo: [3], henshinFrom: c2.henshinFrom, orbSkinOrBgmId: c2.orbSkinOrBgmId, badgeId: c2.badgeId, feedExp: c2.feedExp, sellPrice: c2.sellPrice, limitBreakIncr: c2.limitBreakIncr, sellMP: c2.sellMP, latentAwakeningId: c2.latentAwakeningId, stackable: c2.stackable, skillBanner: c2.skillBanner, evoMaterials: c2.evoMaterials, isUltEvo: c2.isUltEvo, evoBaseId: c2.evoBaseId, syncAwakening: c2.syncAwakening, is8Latent: c2.is8Latent, searchFlags: c2.searchFlags)
```

In `PADDictionaryTests/SpecialSearchTreeTests.swift`, there are 5 sites. Change the `makeCard`
helper:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: evoMaterials, isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: syncAwakening)
```
to:
```swift
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: evoMaterials, isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: syncAwakening, is8Latent: is8Latent, searchFlags: searchFlags)
```
And its signature, from:
```swift
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], awakenings: [Int] = [], superAwakenings: [Int] = [], activeSkillId: Int = 0, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil, evoMaterials: [Int] = [0, 0, 0, 0, 0], isUltEvo: Bool = false, evoBaseId: Int = 0, syncAwakening: Int? = nil) -> Card {
```
to:
```swift
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], awakenings: [Int] = [], superAwakenings: [Int] = [], activeSkillId: Int = 0, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil, evoMaterials: [Int] = [0, 0, 0, 0, 0], isUltEvo: Bool = false, evoBaseId: Int = 0, syncAwakening: Int? = nil, is8Latent: Bool? = nil, searchFlags: [Int]? = nil) -> Card {
```

Change the `withOrbSkinOrBgmId` mutation (copies `card.syncAwakening` — copy the two new
fields from `card` the same way):
```swift
        Card(id: card.id, name: card.name, otLangName: card.otLangName, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: card.leaderSkillId, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: value, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening)
```
to:
```swift
        Card(id: card.id, name: card.name, otLangName: card.otLangName, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: card.leaderSkillId, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: value, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening, is8Latent: card.is8Latent, searchFlags: card.searchFlags)
```

Change `makeCardWithMaxLevel`:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

    private func makeCardWithActiveSkill(_ activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }
```
to:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    private func makeCardWithActiveSkill(_ activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }
```

Change `makeCardWithLeaderSkill`:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
```
to:
```swift
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
```

- [ ] **Step 3: Build the whole project to catch any missed call site**

Run: `cd ios/PADDictionary && xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' build 2>&1 | tail -40`
Expected: `** BUILD SUCCEEDED **`. If it fails with "missing argument for parameter
'is8Latent'/'searchFlags'" anywhere, that's a 12th call site this plan missed — find it,
fix it the same way (nil for fresh construction, copy-from-source for mutation helpers),
and rebuild. Do not skip this — treat a build failure here as a real gap in this task, not
grounds to move on.

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **` (no new tests yet — this only confirms the Card change
didn't break existing ones).

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/Card.swift ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift ios/PADDictionary/PADDictionaryTests/CardSortTests.swift ios/PADDictionary/PADDictionaryTests/EvoFamilyTests.swift ios/PADDictionary/PADDictionaryTests/FilterStateTests.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchEngineTests.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Card.is8Latent/searchFlags needed by the final special-search leaves"
```

---

### Task 2: `isReincarnated` + `TypeKiller` + 2 leaves

**Files:**
- Create: `PADDictionary/Models/CardReincarnation.swift`
- Create: `PADDictionary/Models/TypeKiller.swift`
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/CardReincarnationTests.swift` (new)
- Test: `PADDictionaryTests/TypeKillerTests.swift` (new)
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `Card.is8Latent`/`searchFlags` (Task 1).
- Produces: `isReincarnated(_ card: Card, cardsById: [Int: Card]) -> Bool`,
  `TypeKillerEntry` struct + `TypeKiller.all: [TypeKillerEntry]` +
  `TypeKiller.entry(forType:) -> TypeKillerEntry?`. Used only within this task.

- [ ] **Step 1: Write the failing tests**

`PADDictionaryTests/CardReincarnationTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class CardReincarnationTests: XCTestCase {
    private func makeCard(id: Int, is8Latent: Bool, isUltEvo: Bool, evoBaseId: Int, evoRootId: Int, awakenings: [Int] = []) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: awakenings, superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: nil, is8Latent: is8Latent, searchFlags: nil)
    }

    func testFalseWhenNotIs8Latent() {
        let card = makeCard(id: 1, is8Latent: false, isUltEvo: false, evoBaseId: 0, evoRootId: 1)
        XCTAssertFalse(isReincarnated(card, cardsById: [1: card]))
    }

    func testFalseWhenIsUltEvo() {
        let card = makeCard(id: 1, is8Latent: true, isUltEvo: true, evoBaseId: 0, evoRootId: 1)
        XCTAssertFalse(isReincarnated(card, cardsById: [1: card]))
    }

    func testFalseWhenBaseOrRootEqualsSelf() {
        // real example: card 1 (Tyrra), is8Latent false anyway, but also evoBaseId==evoRootId==1929 != id(1) is not the point here —
        // this covers the "evoBaseId == evoRootId == 0 (no evo) and evoRootId == own id" self-reference case
        let card = makeCard(id: 5, is8Latent: true, isUltEvo: false, evoBaseId: 0, evoRootId: 5)
        XCTAssertFalse(isReincarnated(card, cardsById: [5: card]))
    }

    func testTrueForSimpleReincarnation() {
        // real example: card 123, is8Latent true, isUltEvo false, evoBaseId 122, evoRootId 122, no awakening-49
        let card = makeCard(id: 123, is8Latent: true, isUltEvo: false, evoBaseId: 122, evoRootId: 122, awakenings: [52, 12, 12])
        XCTAssertTrue(isReincarnated(card, cardsById: [123: card]))
    }

    func testRecursesThroughAwakening49ToEvoBase() {
        let base = makeCard(id: 10, is8Latent: false, isUltEvo: false, evoBaseId: 0, evoRootId: 10)
        let card = makeCard(id: 20, is8Latent: true, isUltEvo: false, evoBaseId: 10, evoRootId: 10, awakenings: [49])
        // recurses into base (id 10), which has is8Latent:false -> false
        XCTAssertFalse(isReincarnated(card, cardsById: [10: base, 20: card]))
    }

    func testMissingEvoBaseCardTreatedAsFalse() {
        let card = makeCard(id: 20, is8Latent: true, isUltEvo: false, evoBaseId: 999, evoRootId: 10, awakenings: [49])
        XCTAssertFalse(isReincarnated(card, cardsById: [20: card]))
    }
}
```

`PADDictionaryTests/TypeKillerTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class TypeKillerTests: XCTestCase {
    func testEntryLookupByType() {
        let entry = TypeKiller.entry(forType: 5)
        XCTAssertEqual(entry?.awoken, 32)
        XCTAssertEqual(entry?.latent, 20)
        XCTAssertEqual(entry?.typeKiller, [7])
    }

    func testAllowableLatentIncludesOwnTypeKillersPlusTheFourSpecials() {
        // type 1 (balanced): typeKiller = [5,4,7,8,1,6,2,3], plus the 4 specials [0,12,14,15]
        let entry = TypeKiller.entry(forType: 1)
        let expectedLatents = [5, 4, 7, 8, 1, 6, 2, 3, 0, 12, 14, 15].compactMap { TypeKiller.entry(forType: $0)?.latent }
        XCTAssertEqual(entry?.allowableLatent, expectedLatents)
    }

    func testUnknownTypeReturnsNil() {
        XCTAssertNil(TypeKiller.entry(forType: 999))
    }

    func testSpecialProtectTypeHasSentinelAwokenAndLatent() {
        let entry = TypeKiller.entry(forType: 9)
        XCTAssertEqual(entry?.awoken, -1)
        XCTAssertEqual(entry?.latent, -1)
    }
}
```

Append to `PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testReincarnationLeaf() {
        let card = makeCard(id: 123, isUltEvo: false, evoBaseId: 122)
        // (existing makeCard doesn't take is8Latent/awakenings for evo-base wiring directly;
        // build the card manually here to set is8Latent and a matching cardsById)
        let reincarnated = Card(id: 123, name: "Card 123", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 122, awakenings: [52, 12, 12], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 122, syncAwakening: nil, is8Latent: true, searchFlags: nil)
        let ctx = SpecialSearchContext(cardsById: [123: reincarnated], skillsJA: [:])
        XCTAssertTrue(leaf("Evo type > Reincarnation/Super Rein..").matches(reincarnated, ctx))
        XCTAssertFalse(leaf("Evo type > Reincarnation/Super Rein..").matches(card, ctx))
    }

    func testThreeSameKillerOrTwoWithLatentLeaf() {
        // real example: card 396 — 4 killer-32(god) awakenings among its 9, is8Latent true, isUltEvo true
        let threeKillers = Card(id: 396, name: "Card 396", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 130, awakenings: [32, 32, 32], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: true, evoBaseId: 131, syncAwakening: nil, is8Latent: true, searchFlags: nil)
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertTrue(leaf("Awakenings > 3 same Killer, or 2 with latent").matches(threeKillers, ctx))
        XCTAssertFalse(leaf("Awakenings > 3 same Killer, or 2 with latent").matches(makeCard(), ctx))
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CardReincarnationTests -only-testing:PADDictionaryTests/TypeKillerTests 2>&1 | tail -40`
Expected: FAIL — symbols not found.

- [ ] **Step 3: Implement `CardReincarnation.swift`**

```swift
import Foundation

func isReincarnated(_ card: Card, cardsById: [Int: Card]) -> Bool {
    guard card.is8Latent == true, card.isUltEvo == false else { return false }
    let baseOrRoot = card.evoBaseId != 0 ? card.evoBaseId : card.evoRootId
    guard baseOrRoot != card.id else { return false }
    if card.awakenings.contains(49) {
        guard let baseCard = cardsById[card.evoBaseId] else { return false }
        return isReincarnated(baseCard, cardsById: cardsById)
    }
    return true
}
```

- [ ] **Step 4: Implement `TypeKiller.swift`**

```swift
import Foundation

struct TypeKillerEntry {
    let type: Int
    let awoken: Int
    let latent: Int
    let typeKiller: [Int]
    let allowableLatent: [Int]
}

enum TypeKiller {
    private static let base: [(type: Int, awoken: Int, latent: Int, typeKiller: [Int])] = [
        (0, 39, 16, []),
        (12, 40, 17, []),
        (14, 41, 18, []),
        (15, 42, 19, []),
        (5, 32, 20, [7]),
        (4, 31, 21, [8, 3]),
        (7, 33, 22, [5]),
        (8, 34, 23, [5, 1]),
        (1, 35, 24, [5, 4, 7, 8, 1, 6, 2, 3]),
        (6, 36, 25, [7, 2]),
        (2, 37, 26, [8, 3]),
        (3, 38, 27, [4, 6]),
        (9, -1, -1, []),
    ]

    static let all: [TypeKillerEntry] = base.map { entry in
        let allowableLatent = (entry.typeKiller + [0, 12, 14, 15]).compactMap { tn in
            base.first(where: { $0.type == tn })?.latent
        }
        return TypeKillerEntry(type: entry.type, awoken: entry.awoken, latent: entry.latent, typeKiller: entry.typeKiller, allowableLatent: allowableLatent)
    }

    static func entry(forType type: Int) -> TypeKillerEntry? {
        all.first { $0.type == type }
    }
}
```

- [ ] **Step 5: Add the 2 new leaves to `SpecialSearchTree.swift`**

Add `isReincarnated(_:cardsById:)` to `evoTypeLeaves` — find the array's closing `]` (the
last entry is `"Evo type > Ordeal Evo"`) and insert before it:

```swift
    SpecialSearchLeaf(id: "Evo type > Reincarnation/Super Rein..", label: "Reincarnation/Super Rein..", groupPath: ["Evo type"]) { card, ctx in
        isReincarnated(card, cardsById: ctx.cardsById)
    },
```

Add the killer-awakening leaf to `awakeningLeaves` — find its array and insert an entry
(anywhere in the array is fine, group path is a direct child of "Awakenings"):

```swift
    SpecialSearchLeaf(id: "Awakenings > 3 same Killer, or 2 with latent", label: "3 same Killer, or 2 with latent", groupPath: ["Awakenings"]) { card, _ in
        func count(_ awoken: Int) -> Int {
            card.awakenings.filter { $0 == awoken }.count + (card.superAwakenings.contains(awoken) ? 1 : 0)
        }
        guard let hasAwokenKiller = TypeKiller.all.first(where: { count($0.awoken) >= 2 }) else { return false }
        if count(hasAwokenKiller.awoken) >= 3 { return true }
        return card.types.filter { $0 >= 0 }
            .compactMap { TypeKiller.entry(forType: $0)?.allowableLatent }
            .contains { $0.contains(hasAwokenKiller.latent) }
    },
```

- [ ] **Step 6: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 249)` to `251` (249 + 2).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 8: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/CardReincarnation.swift ios/PADDictionary/PADDictionary/Models/TypeKiller.swift ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/CardReincarnationTests.swift ios/PADDictionary/PADDictionaryTests/TypeKillerTests.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add isReincarnated + TypeKiller and their 2 special-search leaves"
```

---

### Task 3: `leaderSkillFlag` + 9 Leader Skills leaves

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `Card.searchFlags` (Task 1).
- Produces: `private func leaderSkillFlag(_ card: Card, bit: Int) -> Bool` (file-private to
  `SpecialSearchTree.swift`, used only by this task's 9 leaves).

- [ ] **Step 1: Write the failing test**

Append to `PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testLeaderSkillFlagLeaves() {
        // real example: card 290, searchFlags [35651593, 0] — bits 0 (Multiple Att.) and 3 (Same Attr Combo) set
        let multiAttrCard = Card(id: 290, name: "Card 290", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 288, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 289, syncAwakening: nil, is8Latent: nil, searchFlags: [35651593, 0])
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Multiple Att.").matches(multiAttrCard, ctx))
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Same Attribute Combo Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Orb Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Combo Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > L Shape Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Multiple Att.").matches(makeCard(), ctx))

        // real example: card 187, searchFlags [8192, 0] — bit 13 (HP Percentage Activation)
        let hpActivationCard = Card(id: 187, name: "Card 187", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 187, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [8192, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > HP Percentage Activation").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Attribute Enchantment").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Type Enchantment").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Skill Use Activation").matches(hpActivationCard, ctx))

        // real example: card 221, searchFlags [1024, 0] — bit 10 (Type Enchantment)
        let typeEnchantCard = Card(id: 221, name: "Card 221", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 221, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [1024, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Type Enchantment").matches(typeEnchantCard, ctx))

        // real example: card 700, searchFlags [17408, 0] — bit 14 (Skill Use Activation) is also set alongside bit 13
        let skillUseCard = Card(id: 700, name: "Card 700", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 699, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 699, syncAwakening: nil, is8Latent: nil, searchFlags: [17408, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Skill Use Activation").matches(skillUseCard, ctx))

        // real example: card 441, searchFlags [4, 0] — bit 2 (Combo Matching)
        let comboCard = Card(id: 441, name: "Card 441", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 441, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [4, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Combo Matching").matches(comboCard, ctx))

        // real example: card 451, searchFlags [33554946, 0] — bit 1 (Orb Matching)
        let orbMatchCard = Card(id: 451, name: "Card 451", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 451, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [33554946, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Orb Matching").matches(orbMatchCard, ctx))

        // real example: card 2170, searchFlags [1040, 0] — bit 4 (L Shape Matching)
        let lShapeCard = Card(id: 2170, name: "Card 2170", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 2169, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 2169, syncAwakening: nil, is8Latent: nil, searchFlags: [1040, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > L Shape Matching").matches(lShapeCard, ctx))

        // real example: card 1, searchFlags [1049088, 0] — bit 9 (Attribute Enchantment) among others
        let attrEnchantCard = Card(id: 1, name: "Card 1", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1929, awakenings: [21, 21], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 1929, syncAwakening: nil, is8Latent: nil, searchFlags: [1049088, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Attribute Enchantment").matches(attrEnchantCard, ctx))

        // nil searchFlags never matches any bit
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Multiple Att.").matches(makeCard(), ctx))
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testLeaderSkillFlagLeaves 2>&1 | tail -40`
Expected: FAIL — leaves not found (force-unwrap nil).

- [ ] **Step 3: Add `leaderSkillFlag` and the 9 leaves to `SpecialSearchTree.swift`**

Add this private function near the top of the file, right after the `SpecialSearchLeaf`
struct definition:

```swift
private func leaderSkillFlag(_ card: Card, bit: Int) -> Bool {
    guard let flags = card.searchFlags, flags.indices.contains(0) else { return false }
    return flags[0] & (1 << bit) != 0
}
```

Add these 5 leaves into `leaderMatchingStyleLeaves` (anywhere in the array — group path is
`["Leader Skills", "Matching Style"]`, matching that group's existing direct-child leaves
like "5 Orbs including enhanced Matching"):

```swift
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Multiple Att.", label: "Multiple Att.", groupPath: ["Leader Skills", "Matching Style"]) { card, _ in
        leaderSkillFlag(card, bit: 0)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Orb Matching", label: "Orb Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, _ in
        leaderSkillFlag(card, bit: 1)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Combo Matching", label: "Combo Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, _ in
        leaderSkillFlag(card, bit: 2)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Same Attribute Combo Matching", label: "Same Attribute Combo Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, _ in
        leaderSkillFlag(card, bit: 3)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > L Shape Matching", label: "L Shape Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, _ in
        leaderSkillFlag(card, bit: 4)
    },
```

Add these 4 leaves into `leaderRestrictionLeaves` (group path
`["Leader Skills", "Restriction/Bind"]`, matching that group's existing direct-child leaves
like "[7×6 board]"):

```swift
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Attribute Enchantment", label: "Attribute Enchantment", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, _ in
        leaderSkillFlag(card, bit: 9)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Type Enchantment", label: "Type Enchantment", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, _ in
        leaderSkillFlag(card, bit: 10)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > HP Percentage Activation", label: "HP Percentage Activation", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, _ in
        leaderSkillFlag(card, bit: 13)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Skill Use Activation", label: "Skill Use Activation", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, _ in
        leaderSkillFlag(card, bit: 14)
    },
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 251)` to `260` (251 + 9).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add leaderSkillFlag and 9 Leader Skills searchFlags-based leaves"
```

---

### Task 4: `LeaderSkillScale.skillFixedDamage`/`skillAddCombo` + 2 leaves

**Files:**
- Modify: `PADDictionary/Models/LeaderSkillScale.swift`
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/LeaderSkillScaleTests.swift` (append if it exists, else this task
  creates it — check first)
- Modify: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolveAll` (existing).
- Produces: `LeaderSkillScale.skillFixedDamage(_ card: Card, skills: SkillLookup) -> Int`,
  `LeaderSkillScale.skillAddCombo(_ card: Card, skills: SkillLookup) -> Int`.

- [ ] **Step 1: Confirm `LeaderSkillScaleTests.swift`'s existing content**

This file already exists with a `final class LeaderSkillScaleTests: XCTestCase` and a
`private func skill(_ id: Int, type: Int, params: [Int]) -> Skill` helper (returns
`Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)`).
Append the new tests and the new `makeCardWithLeaderSkill` helper below directly inside the
existing class body — do not redeclare `skill(...)`, reuse it as-is.

- [ ] **Step 2: Write the failing tests**

```swift
    private func makeCardWithLeaderSkill(_ leaderSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testSkillFixedDamageType201ReadsParamIndex5() {
        // real example: skill id 1953, type 201, params [16, 16, 0, 0, 2, 5000000]
        let skills: SkillLookup = [1953: skill(1953, type: 201, params: [16, 16, 0, 0, 2, 5000000])]
        let card = makeCardWithLeaderSkill(1953)
        XCTAssertEqual(LeaderSkillScale.skillFixedDamage(card, skills: skills), 5000000)
    }

    func testSkillFixedDamageZeroWhenNoMatchingType() {
        let skills: SkillLookup = [1: skill(1, type: 0, params: [0, 1000])]
        let card = makeCardWithLeaderSkill(1)
        XCTAssertEqual(LeaderSkillScale.skillFixedDamage(card, skills: skills), 0)
    }

    func testSkillAddComboType194ReadsParamIndex3() {
        // real example: skill id 2378, type 194, params [24, 2, 800, 3]
        let skills: SkillLookup = [2378: skill(2378, type: 194, params: [24, 2, 800, 3])]
        let card = makeCardWithLeaderSkill(2378)
        XCTAssertEqual(LeaderSkillScale.skillAddCombo(card, skills: skills), 3)
    }

    func testSkillAddComboZeroWhenNoMatchingType() {
        let skills: SkillLookup = [1: skill(1, type: 0, params: [0, 1000])]
        let card = makeCardWithLeaderSkill(1)
        XCTAssertEqual(LeaderSkillScale.skillAddCombo(card, skills: skills), 0)
    }
```

Append to `PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testFixedDamageInflictsAndAddsComboLeaves() {
        let skills: SkillLookup = [
            1953: Skill(id: 1953, name: "S", description: "", type: 201, maxLevel: 1, initialCooldown: 0, params: [16, 16, 0, 0, 2, 5000000]),
            2378: Skill(id: 2378, name: "S", description: "", type: 194, maxLevel: 1, initialCooldown: 0, params: [24, 2, 800, 3]),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Fixed damage inflicts").matches(makeCardWithLeaderSkill(1953), ctx))
        XCTAssertFalse(leaf("Leader Skills > Extra Effects > Adds combo").matches(makeCardWithLeaderSkill(1953), ctx))
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Adds combo").matches(makeCardWithLeaderSkill(2378), ctx))
        XCTAssertFalse(leaf("Leader Skills > Extra Effects > Fixed damage inflicts").matches(makeCardWithLeaderSkill(2378), ctx))
    }
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/LeaderSkillScaleTests 2>&1 | tail -40`
Expected: FAIL — `skillFixedDamage`/`skillAddCombo` not found.

- [ ] **Step 4: Add the two functions to `LeaderSkillScale.swift`**

Append inside `enum LeaderSkillScale { ... }`, after `reduceScaleUnconditional`:

```swift
    static func skillAddCombo(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.leaderSkillId, types: [192, 194, 206, 209, 210, 219, 220, 235, 271, 280], skills: skills, searchRandom: false)
        return matched.reduce(0) { total, skill in
            let sk = skill.params
            func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
            switch skill.type {
            case 192, 194, 271, 280: return total + p(3)
            case 206: return total + p(6)
            case 209: return total + p(0)
            case 210, 219: return total + p(2)
            case 220: return total + p(1)
            case 235: return total + p(5)
            default: return total
            }
        }
    }

    static func skillFixedDamage(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.leaderSkillId, types: [199, 200, 201, 223, 235, 271, 280], skills: skills, searchRandom: false)
        return matched.reduce(0) { total, skill in
            let sk = skill.params
            func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
            switch skill.type {
            case 199, 200: return total + p(2)
            case 201: return total + p(5)
            case 223: return total + p(1)
            case 235: return total + p(6)
            case 271, 280: return total + p(4)
            default: return total
            }
        }
    }
```

(`sk[safe: i]` uses the `private extension Array` subscript already defined at the top of
this file — no new helper needed.)

- [ ] **Step 5: Add the 2 leaves to `SpecialSearchTree.swift`**

Add into `leaderExtraEffectsLeaves` with `groupPath: ["Leader Skills", "Extra Effects", "Other"]`
(matching this group's existing "Other"-bundled siblings like "Move time changes"):

```swift
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Fixed damage inflicts", label: "Fixed damage inflicts", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        LeaderSkillScale.skillFixedDamage(card, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Adds combo", label: "Adds combo", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        LeaderSkillScale.skillAddCombo(card, skills: ctx.skillsJA) > 0
    },
```

- [ ] **Step 6: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 260)` to `262` (260 + 2).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 8: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/LeaderSkillScale.swift ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/LeaderSkillScaleTests.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add LeaderSkillScale.skillFixedDamage/skillAddCombo and their 2 leaves"
```

---

### Task 5: `SeamlessBuff` + 1 leaf

**Files:**
- Create: `PADDictionary/Models/SeamlessBuff.swift`
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SeamlessBuffTests.swift` (new)
- Modify: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Produces: `SeamlessBuff.matches(_ card: Card, skills: SkillLookup) -> Bool`.

This is a targeted 48-skill-type subset of the web's full generic skill-semantics DSL —
NOT that whole DSL. See the design spec for why this subset is sufficient: every one of
the 48 types' "turns" parameter position was verified empirically against real skill data
via a modified copy of `engine.js` exposing its internal `skillParser`, and the resulting
Swift-equivalent logic was cross-checked against the real `engine.js` leaf on all ~13,878
real cards with zero discrepancies (1973/1973 exact match).

- [ ] **Step 1: Write the failing tests**

```swift
import XCTest
@testable import PADDictionary

final class SeamlessBuffTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int], cd: Int = 0, maxLevel: Int = 1) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: maxLevel, initialCooldown: cd, params: params)
    }

    private func makeCard(activeSkillId: Int, henshinTo: [Int]? = nil) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: henshinTo, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testFalseWhenNoActiveSkill() {
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 0), skills: [:]))
    }

    func testFalseWhenTransformsIntoAnotherCard() {
        let skills: SkillLookup = [10: skill(10, type: 51, params: [3], cd: 3, maxLevel: 1)]
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 10, henshinTo: [2]), skills: skills))
    }

    func testDirectActiveTurnsTypeTrueWhenTurnsGeCd() {
        // real example: type 51 (mass attack buff), turns=params[0]=3, cd = initialCooldown(13) - (maxLevel(11)-1) = 3
        let skills: SkillLookup = [10881: skill(10881, type: 51, params: [3], cd: 13, maxLevel: 11)]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 10881), skills: skills))
    }

    func testDirectActiveTurnsTypeFalseWhenTurnsLtCd() {
        let skills: SkillLookup = [10881: skill(10881, type: 51, params: [2], cd: 13, maxLevel: 11)]
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 10881), skills: skills))
    }

    func testType205ReadsTurnsFromParamIndex1() {
        // type 205 declared as (attrs, turns) — turns is params[1], not params[0]
        let skills: SkillLookup = [1: skill(1, type: 205, params: [4, 10], cd: 10, maxLevel: 1)]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
        let skillsLow: SkillLookup = [1: skill(1, type: 205, params: [4, 5], cd: 10, maxLevel: 1)]
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skillsLow))
    }

    func testType239ReadsTurnsFromParamIndex1() {
        // type 239 declared as (colum, turns, row) — turns is params[1]
        let skills: SkillLookup = [1: skill(1, type: 239, params: [1, 2, 0], cd: 2, maxLevel: 1)]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testType126EqualTurnsMatches() {
        // type 126 declared as (attrs, turns, turns2, percent) — when turns==turns2, that value is used
        let skills: SkillLookup = [1: skill(1, type: 126, params: [18, 5, 5, 10], cd: 5, maxLevel: 1)]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testType126DifferingTurnsNeverMatches() {
        // JS quirk ported faithfully: when turns != turns2, activeTurns receives an array,
        // and `[t1,t2] >= cd` is always false via JS array-to-number coercion — never a loop buff
        let skills: SkillLookup = [1: skill(1, type: 126, params: [18, 2, 10, 10], cd: 1, maxLevel: 1)]
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testRandomSkillsWrapperRequiresEveryBranchToLoopBuff() {
        // type 118 (random effect): every sub-id must itself be a qualifying ActiveTurns skill
        let skills: SkillLookup = [
            1: skill(1, type: 118, params: [2, 3], cd: 5, maxLevel: 1),
            2: skill(2, type: 51, params: [5], cd: 5, maxLevel: 1),
            3: skill(3, type: 51, params: [5], cd: 5, maxLevel: 1),
        ]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testRandomSkillsWrapperFalseWhenOneBranchDoesNotQualify() {
        let skills: SkillLookup = [
            1: skill(1, type: 118, params: [2, 3], cd: 5, maxLevel: 1),
            2: skill(2, type: 51, params: [5], cd: 5, maxLevel: 1),
            3: skill(3, type: 51, params: [1], cd: 5, maxLevel: 1),
        ]
        XCTAssertFalse(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testEvolvedSkillsNonLoopUsesOnlyLastStage() {
        // type 232 (one-way evolved skill), not looped: only the LAST sub-skill's own cd/turns matters
        let skills: SkillLookup = [
            1: skill(1, type: 232, params: [2, 3], cd: 0, maxLevel: 1),
            2: skill(2, type: 51, params: [1], cd: 5, maxLevel: 1),   // first stage: would fail (1 < 5), but ignored since non-loop
            3: skill(3, type: 51, params: [5], cd: 5, maxLevel: 1),   // last stage: qualifies (5 >= 5)
        ]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testEvolvedSkillsLoopSumsAllStageCooldowns() {
        // type 233 (looping evolved skill): subCd = sum of every stage's own cd; any stage may satisfy it
        let skills: SkillLookup = [
            1: skill(1, type: 233, params: [2, 3], cd: 0, maxLevel: 1),
            2: skill(2, type: 51, params: [10], cd: 5, maxLevel: 1),
            3: skill(3, type: 51, params: [4], cd: 5, maxLevel: 1),
        ]
        // subCd = 5 + 5 = 10; stage 2's turns=10 >= 10 -> true
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }

    func testType116FlatMapsOverAllIds() {
        // type 116 (generic multi-effect wrapper): flatMaps parse over every id in params
        let skills: SkillLookup = [
            1: skill(1, type: 116, params: [2, 3], cd: 0, maxLevel: 1),
            2: skill(2, type: 0, params: [], cd: 0, maxLevel: 1),
            3: skill(3, type: 51, params: [5], cd: 5, maxLevel: 1),
        ]
        XCTAssertTrue(SeamlessBuff.matches(makeCard(activeSkillId: 1), skills: skills))
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SeamlessBuffTests 2>&1 | tail -60`
Expected: FAIL — `SeamlessBuff` not found.

- [ ] **Step 3: Implement `SeamlessBuff.swift`**

```swift
import Foundation

enum SeamlessBuff {
    private enum Effect {
        case activeTurns(Int)
        case randomSkills([Int])
        case evolvedSkills(loop: Bool, ids: [Int])
        case other
    }

    private static func activeTurnsValue(for skill: Skill) -> Int? {
        let sk = skill.params
        func at(_ i: Int) -> Int? { sk.indices.contains(i) ? sk[i] : nil }
        switch skill.type {
        case 126:
            guard let t1 = at(1) else { return nil }
            let t2 = at(2) ?? t1
            return t1 == t2 ? t1 : nil
        case 205, 239:
            return at(1)
        case 3, 18, 19, 21, 50, 51, 60, 88, 90, 92, 132, 142, 156, 160, 168, 173, 179, 180,
             184, 191, 207, 214, 215, 224, 226, 228, 230, 231, 237, 238, 241, 243, 244, 249,
             251, 253, 258, 263, 266, 267, 269, 273, 274, 278:
            return at(0)
        default:
            return nil
        }
    }

    private static func parse(_ skillId: Int, skills: SkillLookup) -> [Effect] {
        guard let skill = skills[skillId] else { return [] }
        if skill.type == 116 {
            return skill.params.flatMap { parse($0, skills: skills) }
        }
        if let turns = activeTurnsValue(for: skill) {
            return [.activeTurns(turns)]
        }
        switch skill.type {
        case 118: return [.randomSkills(skill.params)]
        case 232: return [.evolvedSkills(loop: false, ids: skill.params)]
        case 233: return [.evolvedSkills(loop: true, ids: skill.params)]
        default: return [.other]
        }
    }

    private static func isLoopBuff(_ effects: [Effect], cd: Int) -> Bool {
        effects.contains {
            if case .activeTurns(let turns) = $0 { return turns >= cd }
            return false
        }
    }

    static func matches(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, (card.henshinTo?.isEmpty ?? true) else { return false }
        guard let skill = skills[card.activeSkillId] else { return false }
        let cd = skill.initialCooldown - (skill.maxLevel - 1)
        let parsedActive = parse(card.activeSkillId, skills: skills)
        if isLoopBuff(parsedActive, cd: cd) { return true }
        guard let group = parsedActive.first else { return false }
        switch group {
        case .randomSkills(let ids):
            return ids.allSatisfy { isLoopBuff(parse($0, skills: skills), cd: cd) }
        case .evolvedSkills(let loop, let ids):
            let subSkills = ids.compactMap { skills[$0] }
            guard !subSkills.isEmpty else { return false }
            if loop {
                let subCd = subSkills.reduce(0) { $0 + ($1.initialCooldown - ($1.maxLevel - 1)) }
                return ids.contains { isLoopBuff(parse($0, skills: skills), cd: subCd) }
            } else {
                guard let lastSkill = subSkills.last, let lastId = ids.last else { return false }
                let subCd = lastSkill.initialCooldown - (lastSkill.maxLevel - 1)
                return isLoopBuff(parse(lastId, skills: skills), cd: subCd)
            }
        default:
            return false
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Add the leaf to `SpecialSearchTree.swift`**

Add into `activeOtherLeaves`, matching its existing "Other"-bundled siblings ("1 CD",
"Time pause", etc.):

```swift
    SpecialSearchLeaf(id: "Active Skill > Seamless Buff (Round ≥CD)", label: "Seamless Buff (Round ≥CD)", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SeamlessBuff.matches(card, skills: ctx.skillsJA)
    },
```

Append to `PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testSeamlessBuffLeaf() {
        let skills: SkillLookup = [10881: Skill(id: 10881, name: "S", description: "", type: 51, maxLevel: 11, initialCooldown: 13, params: [3])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Seamless Buff (Round ≥CD)").matches(makeCardWithActiveSkill(10881), ctx))
        XCTAssertFalse(leaf("Active Skill > Seamless Buff (Round ≥CD)").matches(makeCard(), ctx))
    }
```

- [ ] **Step 6: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 262)` to `263` (262 + 1).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`, total leaf count 263.

- [ ] **Step 8: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SeamlessBuff.swift ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SeamlessBuffTests.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add SeamlessBuff and its leaf — special-search port complete (263 leaves)"
```

---

### Task 6: Full verify + screenshot + web-parity report

**Files:** None modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tee /tmp/test_full_final.log | tail -40`
Expected: `** TEST SUCCEEDED **`, 0 failures.

- [ ] **Step 2: Build, install, and launch on the specific Simulator device**

```bash
xcrun simctl bootstatus A909C90E-EB7B-42E0-9840-CFF59F901A94 -b
cd ios/PADDictionary
xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'id=A909C90E-EB7B-42E0-9840-CFF59F901A94' -derivedDataPath /tmp/pad-build build
xcrun simctl terminate A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary || true
xcrun simctl install A909C90E-EB7B-42E0-9840-CFF59F901A94 /tmp/pad-build/Build/Products/Debug-iphonesimulator/PADDictionary.app
xcrun simctl launch A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary
```

Expected: `** BUILD SUCCEEDED **`, app launches without crashing (this matters — a broken
new leaf closure would crash on first Browse-tab render since `SpecialSearchTree.leaves`
is a `static let` evaluated eagerly).

- [ ] **Step 3: Screenshot the Browse tab and the special-search sheet**

```bash
sleep 3
xcrun simctl io A909C90E-EB7B-42E0-9840-CFF59F901A94 screenshot /tmp/final-1-browse.png
```

Read `/tmp/final-1-browse.png` — confirm the grid renders cleanly with no crash.

- [ ] **Step 4: Report the web-parity numbers**

This step has no command — it's a reporting requirement. State plainly, in the final
summary to the user, the exact verification numbers already established during design:
"249 → 263 of 264 web leaves ported; the Seamless Buff logic was cross-checked against
the real `engine.js` leaf on all ~13,878 real cards with zero discrepancies (1973/1973
exact match)." This directly answers "does iOS match web" with a full-dataset result, not
a spot check — do not understate it as merely "unit tests pass."

- [ ] **Step 5: No commit needed**

This task is verification-only.
