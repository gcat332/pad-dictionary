# iOS Special-Search Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role:** implementation is done by dispatching to a Claude subagent running Opus 4.8, which has real Simulator access on this machine. It should run real `xcodebuild test`/`build` commands itself. Claude (Sonnet, the orchestrator) reviews and independently re-verifies visual/critical results.

**Goal:** Port the web's special-search taxonomy tree shell plus its 3 simplest groups (Evo type, Awakenings, Others Search — 43 leaves total) so users can multi-select taxonomy filters with AND/OR matching, exactly like the web dictionary's "Search Filter" section.

**Architecture:** 13 additive `Card` fields feed 43 individually-ported filter closures (`SpecialSearchLeaf`), organized in a flat `SpecialSearchTree.leaves` array grouped by `groupPath` for display. `SpecialSearchEngine.filter` composes selected leaves with AND (intersect) / OR (union), mirroring the web's `filterCardsByLeaves`. A `SkillChainMatcher` ports the one shared skill-type-resolution helper (`getActuallySkills`) needed by exactly one Phase 1 leaf and by all of Phase 2/3.

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file declaring an `ObservableObject`/`@Published` type must explicitly `import Combine`, even alongside `import SwiftUI`.
- No third-party dependencies.
- Every leaf's filter logic must match the exact JS source in `engine.js` (quoted per-leaf below) — this is a port, not a reinterpretation. 2 web leaves (`Reincarnation/Super Rein..`, `3 same Killer, or 2 with latent`) are excluded because their JS reference calls undefined globals (`isReincarnated`, `typekiller_for_type`) and throws if ever invoked — there's nothing correct to port.
- UI must be genuinely usable: grouped sections, clear AND/OR control, working Clear button.

---

## Task 1: `Card` gains 13 fields needed by special-search leaves

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/Card.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/CardSpecialSearchFieldsTests.swift`

**Interfaces:**
- Produces: 13 new `Card` properties (all present in every `mon_ja.json` entry except `syncAwakening`, which is sparse and therefore `Int?`): `orbSkinOrBgmId: Int`, `badgeId: Int`, `feedExp: Int`, `sellPrice: Int`, `limitBreakIncr: Int`, `sellMP: Int`, `latentAwakeningId: Int`, `stackable: Bool`, `skillBanner: Bool`, `evoMaterials: [Int]`, `isUltEvo: Bool`, `evoBaseId: Int`, `syncAwakening: Int?` — consumed by special-search leaves (Tasks 3-4).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/CardSpecialSearchFieldsTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class CardSpecialSearchFieldsTests: XCTestCase {
    func testDecodesAllThirteenFields() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":28,"badgeId":5,"feedExp":400,"sellPrice":700,"limitBreakIncr":30,"sellMP":1,"latentAwakeningId":2,"stackable":true,"skillBanner":true,"evoMaterials":[152,0,0,0,0],"isUltEvo":true,"evoBaseId":1929,"syncAwakening":130}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertEqual(card.orbSkinOrBgmId, 28)
        XCTAssertEqual(card.badgeId, 5)
        XCTAssertEqual(card.feedExp, 400)
        XCTAssertEqual(card.sellPrice, 700)
        XCTAssertEqual(card.limitBreakIncr, 30)
        XCTAssertEqual(card.sellMP, 1)
        XCTAssertEqual(card.latentAwakeningId, 2)
        XCTAssertTrue(card.stackable)
        XCTAssertTrue(card.skillBanner)
        XCTAssertEqual(card.evoMaterials, [152, 0, 0, 0, 0])
        XCTAssertTrue(card.isUltEvo)
        XCTAssertEqual(card.evoBaseId, 1929)
        XCTAssertEqual(card.syncAwakening, 130)
    }

    func testSyncAwakeningDefaultsToNilWhenAbsent() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertNil(card.syncAwakening)
    }
}
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CardSpecialSearchFieldsTests
```

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/Card.swift`, add these 13 properties at the END of the `Card` struct (after `henshinFrom`, before the closing brace — append-only, same rule as sub-project 2):

```swift
    let orbSkinOrBgmId: Int
    let badgeId: Int
    let feedExp: Int
    let sellPrice: Int
    let limitBreakIncr: Int
    let sellMP: Int
    let latentAwakeningId: Int
    let stackable: Bool
    let skillBanner: Bool
    let evoMaterials: [Int]
    let isUltEvo: Bool
    let evoBaseId: Int
    let syncAwakening: Int?
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for both tests. NOTE: adding non-optional required fields to `Card` means every OTHER test file that constructs a `Card` via its memberwise initializer (`CardSortTests`, `EvoFamilyTests`, `FilterStateTests`, `BrowseViewModelTests`'s JSON fixtures, `DataDecodingTests`'s fixture JSON, `CardHenshinDecodingTests`) will now fail to compile until they're updated. Run the FULL test suite, not just this file:

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Fix every other broken call site by adding the 13 new arguments at the end of each `Card(...)` call (Swift structs) or the 13 new keys to each fixture JSON string literal (JSON), using representative values (e.g. `orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil` for Swift call sites, or the equivalent JSON keys with zero/false values) — until the full suite is `** TEST SUCCEEDED **` again.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/Card.swift ios/PADDictionary/PADDictionaryTests/
git commit -m "Add 13 Card fields needed by special-search leaves"
```

---

## Task 2: `SkillChainMatcher`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift`

**Interfaces:**
- Consumes: `Skill`, `SkillLookup` (existing).
- Produces: `enum SkillChainMatcher { static func matches(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Bool }` — consumed by the "Random Transform" leaf (Task 3) and reused heavily by future Phase 2/3 work.

This ports `getActuallySkills()` from `engine.js`:
```js
function getActuallySkills(skill, skillTypes, searchRandom = true) {
  if (!skill) return [];
  if (skillTypes.includes(skill.type)) return [skill];
  if (skill.type === 116 || (searchRandom && skill.type === 118) || skill.type === 138 || skill.type === 232 || skill.type === 233 || skill.type === 248) {
    const params = skill.type === 248 ? skill.params.slice(1) : skill.params.concat();
    params.reverse();
    return params.flatMap((id) => getActuallySkills(Skills[id], skillTypes, searchRandom)).filter(Boolean);
  }
  return [];
}
```

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class SkillChainMatcherTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int] = []) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    func testDirectTypeMatch() {
        let skills: SkillLookup = [1: skill(1, type: 236)]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testNoMatchWhenNotAWrapperType() {
        let skills: SkillLookup = [1: skill(1, type: 5)]
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testResolvesThroughType232Wrapper() {
        let skills: SkillLookup = [
            1: skill(1, type: 232, params: [2, 3]),
            2: skill(2, type: 5),
            3: skill(3, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testType118RequiresSearchRandomTrue() {
        let skills: SkillLookup = [
            1: skill(1, type: 118, params: [2]),
            2: skill(2, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills, searchRandom: true))
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills, searchRandom: false))
    }

    func testType248DropsFirstParam() {
        let skills: SkillLookup = [
            1: skill(1, type: 248, params: [99, 2]), // first param (99) is dropped, not resolved as a skill id
            2: skill(2, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testUnknownSkillIdReturnsFalse() {
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 999, types: [236], skills: [:]))
    }
}
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SkillChainMatcherTests
```

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift`:

```swift
import Foundation

enum SkillChainMatcher {
    private static let wrapperTypes: Set<Int> = [116, 118, 138, 232, 233, 248]

    static func matches(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Bool {
        guard let skill = skills[skillId] else { return false }
        if types.contains(skill.type) { return true }
        guard wrapperTypes.contains(skill.type) else { return false }
        if skill.type == 118 && !searchRandom { return false }
        let params = skill.type == 248 ? Array(skill.params.dropFirst()) : skill.params
        for id in params.reversed() {
            if matches(skillId: id, types: types, skills: skills, searchRandom: searchRandom) { return true }
        }
        return false
    }
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift
git commit -m "Add SkillChainMatcher porting getActuallySkills() skill-type resolution"
```

---

## Task 3: `SpecialSearchLeaf`/`SpecialSearchContext` + Evo type + Awakenings leaves

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `Card` (Task 1), `SkillChainMatcher` (Task 2), `SkillLookup` (existing).
- Produces: `struct SpecialSearchContext { let cardsById: [Int: Card]; let skillsJA: SkillLookup }`, `struct SpecialSearchLeaf: Identifiable { let id: String; let label: String; let groupPath: [String]; let matches: (Card, SpecialSearchContext) -> Bool }`, `enum SpecialSearchTree { static let leaves: [SpecialSearchLeaf] }` — this task populates `leaves` with the 9 Evo-type + 11 Awakening leaves (20 total); Task 4 appends the 23 Others-Search leaves to the SAME `leaves` array in the SAME file.

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class SpecialSearchTreeTests: XCTestCase {
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], awakenings: [Int] = [], superAwakenings: [Int] = [], activeSkillId: Int = 0, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil, evoMaterials: [Int] = [0, 0, 0, 0, 0], isUltEvo: Bool = false, evoBaseId: Int = 0, syncAwakening: Int? = nil) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: evoMaterials, isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: syncAwakening)
    }

    private func leaf(_ id: String) -> SpecialSearchLeaf {
        SpecialSearchTree.leaves.first { $0.id == id }!
    }

    private let emptyContext = SpecialSearchContext(cardsById: [:], skillsJA: [:])

    func testNoTransform() {
        XCTAssertTrue(leaf("Evo type > Transform > No Transform").matches(makeCard(), emptyContext))
        XCTAssertFalse(leaf("Evo type > Transform > No Transform").matches(makeCard(henshinTo: [2]), emptyContext))
    }

    func testAfterBeforeTransform() {
        XCTAssertTrue(leaf("Evo type > Transform > After Transform").matches(makeCard(henshinFrom: [1]), emptyContext))
        XCTAssertTrue(leaf("Evo type > Transform > Before Transform").matches(makeCard(henshinTo: [2]), emptyContext))
        XCTAssertTrue(leaf("Evo type > Transform > Not Before Transform").matches(makeCard(), emptyContext))
    }

    func testRandomTransformUsesSkillChainMatcher() {
        let skills: SkillLookup = [5: Skill(id: 5, name: "S", description: "", type: 236, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Evo type > Transform > Random Transform").matches(makeCard(activeSkillId: 5), ctx))
        XCTAssertFalse(leaf("Evo type > Transform > Random Transform").matches(makeCard(activeSkillId: 999), ctx))
    }

    func testPixelEvo() {
        XCTAssertTrue(leaf("Evo type > Pixel Evo").matches(makeCard(evoMaterials: [3826, 0, 0, 0, 0]), emptyContext))
        XCTAssertFalse(leaf("Evo type > Pixel Evo").matches(makeCard(), emptyContext))
    }

    func testSuperUltEvoLooksUpEvoBaseCard() {
        let base = makeCard(id: 10, isUltEvo: true)
        let ctx = SpecialSearchContext(cardsById: [10: base], skillsJA: [:])
        XCTAssertTrue(leaf("Evo type > Super Ult Evo").matches(makeCard(isUltEvo: true, evoBaseId: 10), ctx))
        XCTAssertFalse(leaf("Evo type > Super Ult Evo").matches(makeCard(isUltEvo: false, evoBaseId: 10), ctx))
    }

    func testEvoFromWeaponChecksBaseCardAwakening49() {
        let base = makeCard(id: 10, awakenings: [49])
        let ctx = SpecialSearchContext(cardsById: [10: base], skillsJA: [:])
        XCTAssertTrue(leaf("Evo type > Evo from Weapon").matches(makeCard(isUltEvo: true, evoBaseId: 10), ctx))
    }

    func testOrdealEvo() {
        XCTAssertTrue(leaf("Evo type > Ordeal Evo").matches(makeCard(evoMaterials: [0xFFFF, 0, 0, 0, 0]), emptyContext))
        XCTAssertFalse(leaf("Evo type > Ordeal Evo").matches(makeCard(), emptyContext))
    }

    func testReduceAttrDamageAwakening() {
        XCTAssertTrue(leaf("Awakenings > Kind of Awakening (No Super Awoken) > Any Reduce Attr. Damage Awakening").matches(makeCard(awakenings: [6]), emptyContext))
        XCTAssertFalse(leaf("Awakenings > Kind of Awakening (No Super Awoken) > Any Reduce Attr. Damage Awakening").matches(makeCard(awakenings: [1]), emptyContext))
    }

    func testHaveSyncAwoken() {
        XCTAssertTrue(leaf("Awakenings > Have Sync Awoken").matches(makeCard(syncAwakening: 130), emptyContext))
        XCTAssertFalse(leaf("Awakenings > Have Sync Awoken").matches(makeCard(syncAwakening: nil), emptyContext))
    }

    func testFullAwakeningAccountsForWeaponAssistAwakening49() {
        let normalFull = makeCard(awakenings: Array(repeating: 1, count: 9))
        let weaponFull = makeCard(awakenings: Array(repeating: 1, count: 7) + [49])
        XCTAssertTrue(leaf("Awakenings > Full Awakening (9 / 8 for weapon)").matches(normalFull, emptyContext))
        XCTAssertTrue(leaf("Awakenings > Full Awakening (9 / 8 for weapon)").matches(weaponFull, emptyContext))
        XCTAssertFalse(leaf("Awakenings > Full Awakening (9 / 8 for weapon)").matches(makeCard(awakenings: [1]), emptyContext))
    }

    func testEvoTypeAndAwakeningsLeafCounts() {
        let evoLeaves = SpecialSearchTree.leaves.filter { $0.groupPath.first == "Evo type" }
        let awakeningLeaves = SpecialSearchTree.leaves.filter { $0.groupPath.first == "Awakenings" }
        XCTAssertEqual(evoLeaves.count, 9)
        XCTAssertEqual(awakeningLeaves.count, 11)
    }
}
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests
```

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`:

```swift
import Foundation

struct SpecialSearchContext {
    let cardsById: [Int: Card]
    let skillsJA: SkillLookup
}

struct SpecialSearchLeaf: Identifiable {
    let id: String
    let label: String
    let groupPath: [String]
    let matches: (Card, SpecialSearchContext) -> Bool
}

private let evoTypeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Evo type > Transform > No Transform", label: "No Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinFrom == nil && card.henshinTo == nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > After Transform", label: "After Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinFrom != nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Before Transform", label: "Before Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinTo != nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Not Before Transform", label: "Not Before Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinTo == nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Random Transform", label: "Random Transform", groupPath: ["Evo type", "Transform"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [236], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Evo type > Pixel Evo", label: "Pixel Evo", groupPath: ["Evo type"]) { card, _ in
        card.evoMaterials.contains(3826)
    },
    SpecialSearchLeaf(id: "Evo type > Super Ult Evo", label: "Super Ult Evo", groupPath: ["Evo type"]) { card, ctx in
        card.isUltEvo && (ctx.cardsById[card.evoBaseId]?.isUltEvo ?? false)
    },
    SpecialSearchLeaf(id: "Evo type > Evo from Weapon", label: "Evo from Weapon", groupPath: ["Evo type"]) { card, ctx in
        card.isUltEvo && (ctx.cardsById[card.evoBaseId]?.awakenings.contains(49) ?? false)
    },
    SpecialSearchLeaf(id: "Evo type > Ordeal Evo", label: "Ordeal Evo", groupPath: ["Evo type"]) { card, _ in
        card.evoMaterials.first == 0xFFFF
    },
]

private let awakeningLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Reduce Attr. Damage Awakening", label: "Any Reduce Attr. Damage Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 4 && $0 <= 8 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Killer Awakening", label: "Any Killer Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 31 && $0 <= 42 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Orbs Awakening", label: "Any Enhanced Orbs Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 14 && $0 <= 18) || $0 == 29 || ($0 >= 99 && $0 <= 104) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Rows Awakening", label: "Any Enhanced Rows Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 22 && $0 <= 26) || ($0 >= 116 && $0 <= 120) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Combos Awakening", label: "Any Enhanced Combos Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 73 && $0 <= 77) || ($0 >= 121 && $0 <= 125) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Multi Attr. Enhanced Awakening", label: "Any Multi Attr. Enhanced Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 == 44 || $0 == 51 || ($0 >= 79 && $0 <= 81) || $0 == 97 || ($0 >= 112 && $0 <= 114) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Add Type Awakening", label: "Any Add Type Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 83 && $0 <= 90 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Change Sub Attr. Awakening", label: "Any Change Sub Attr. Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 91 && $0 <= 95 }
    },
    SpecialSearchLeaf(id: "Awakenings > Have Sync Awoken", label: "Have Sync Awoken", groupPath: ["Awakenings"]) { card, _ in
        (card.syncAwakening ?? 0) != 0
    },
    SpecialSearchLeaf(id: "Awakenings > Full Awakening (9 / 8 for weapon)", label: "Full Awakening (9 / 8 for weapon)", groupPath: ["Awakenings"]) { card, _ in
        card.awakenings.count >= (card.awakenings.contains(49) ? 8 : 9)
    },
    SpecialSearchLeaf(id: "Awakenings > Has, but not full Awakening", label: "Has, but not full Awakening", groupPath: ["Awakenings"]) { card, _ in
        card.awakenings.count > 0 && card.awakenings.count < (card.awakenings.contains(49) ? 8 : 9)
    },
]

enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add SpecialSearchTree with Evo type and Awakenings leaves (20 total)"
```

---

## Task 4: Others Search leaves (23)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `Card` (Task 1).
- Produces: appends 23 more entries to `SpecialSearchTree.leaves` (total 43) — same file/type as Task 3, no new externally-consumed symbols.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift` (inside `final class SpecialSearchTreeTests`, reusing the existing `makeCard`/`leaf`/`emptyContext` helpers — extend `makeCard` if needed, see Step 3 note):

```swift
    func testWillGetOrbsSkinVsBgm() {
        var card = makeCard()
        card = withOrbSkinOrBgmId(card, 500)
        XCTAssertTrue(leaf("Others Search > Sold in stores > Will get Orbs skin").matches(card, emptyContext))
        card = withOrbSkinOrBgmId(card, 20000)
        XCTAssertTrue(leaf("Others Search > Sold in stores > Will get BGM").matches(card, emptyContext))
        XCTAssertFalse(leaf("Others Search > Sold in stores > Will get Orbs skin").matches(card, emptyContext))
    }

    func testHave3TypesAnd3Attrs() {
        let card = makeCard(attrs: [0, 1, 2], types: [1, 2, 3])
        XCTAssertTrue(leaf("Others Search > Have 3 types").matches(card, emptyContext))
        XCTAssertTrue(leaf("Others Search > Have 3 Attrs").matches(card, emptyContext))
        XCTAssertTrue(leaf("Others Search > 3 attrs are different").matches(card, emptyContext))
    }

    func testMaxLevelIsLv1() {
        XCTAssertTrue(leaf("Others Search > Max level is lv1").matches(makeCardWithMaxLevel(1), emptyContext))
        XCTAssertFalse(leaf("Others Search > Max level is lv1").matches(makeCardWithMaxLevel(10), emptyContext))
    }

    func testOthersSearchLeafCount() {
        let othersLeaves = SpecialSearchTree.leaves.filter { $0.groupPath.first == "Others Search" }
        XCTAssertEqual(othersLeaves.count, 23)
        XCTAssertEqual(SpecialSearchTree.leaves.count, 43)
    }
```

Also add these two small helpers to the test class (they patch a couple of fields `makeCard` doesn't parameterize, keeping `makeCard`'s existing signature from Task 3 unchanged):

```swift
    private func withOrbSkinOrBgmId(_ card: Card, _ value: Int) -> Card {
        Card(id: card.id, name: card.name, otLangName: card.otLangName, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: card.leaderSkillId, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: value, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening)
    }

    private func makeCardWithMaxLevel(_ maxLevel: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests
```

Expected: fails — the "Others Search" leaves don't exist yet, so `leaf(...)` force-unwraps `nil`.

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`, add this new private array (alongside `evoTypeLeaves`/`awakeningLeaves`):

```swift
private let othersSearchLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get Orbs skin", label: "Will get Orbs skin", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.orbSkinOrBgmId > 0 && card.orbSkinOrBgmId < 10000
    },
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get BGM", label: "Will get BGM", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.orbSkinOrBgmId >= 10000
    },
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get Team Badge", label: "Will get Team Badge", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.badgeId != 0
    },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Original Name", label: "Show Original Name", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Feed EXP", label: "Show Feed EXP", groupPath: ["Others Search", "Only Additional display"]) { card, _ in card.feedExp > 0 },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Sell Price", label: "Show Sell Price", groupPath: ["Others Search", "Only Additional display"]) { card, _ in card.sellPrice > 0 },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Sell Monster Point(MP)", label: "Show Sell Monster Point(MP)", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Types", label: "Show Card Types", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Cost", label: "Show Card Cost", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Group ID", label: "Show Card Group ID", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Water Att. & Attacker Type(Tanjiro)", label: "Water Att. & Attacker Type(Tanjiro)", groupPath: ["Others Search"]) { card, _ in
        card.attrs.contains(1) || card.types.contains(6)
    },
    SpecialSearchLeaf(id: "Others Search > Level limit unable break", label: "Level limit unable break", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr == 0
    },
    SpecialSearchLeaf(id: "Others Search > Able to lv110, but no Super Awoken", label: "Able to lv110, but no Super Awoken", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr > 0 && card.superAwakenings.isEmpty
    },
    SpecialSearchLeaf(id: "Others Search > Raise ≥50% at lv110", label: "Raise ≥50% at lv110", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr >= 50
    },
    SpecialSearchLeaf(id: "Others Search > Max level is lv1", label: "Max level is lv1", groupPath: ["Others Search"]) { card, _ in
        card.maxLevel == 1
    },
    SpecialSearchLeaf(id: "Others Search > Tradable(Less than 100MP)", label: "Tradable(Less than 100MP)", groupPath: ["Others Search"]) { card, _ in
        card.sellMP < 100
    },
    SpecialSearchLeaf(id: "Others Search > Have 3 types", label: "Have 3 types", groupPath: ["Others Search"]) { card, _ in
        card.types.filter { $0 >= 0 }.count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > Have 3 Attrs", label: "Have 3 Attrs", groupPath: ["Others Search"]) { card, _ in
        card.attrs.filter { $0 >= 0 && $0 < 6 }.count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > 3 attrs are different", label: "3 attrs are different", groupPath: ["Others Search"]) { card, _ in
        Set(card.attrs.filter { $0 >= 0 && $0 < 6 }).count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > All Latent TAMADRA", label: "All Latent TAMADRA", groupPath: ["Others Search"]) { card, _ in
        card.latentAwakeningId > 0
    },
    SpecialSearchLeaf(id: "Others Search > Stacked material", label: "Stacked material", groupPath: ["Others Search"]) { card, _ in
        card.stackable
    },
    SpecialSearchLeaf(id: "Others Search > Not stacked material", label: "Not stacked material", groupPath: ["Others Search"]) { card, _ in
        !card.stackable && card.types.contains { [0, 12, 14, 15].contains($0) }
    },
    SpecialSearchLeaf(id: "Others Search > Hava banner when use skill", label: "Hava banner when use skill", groupPath: ["Others Search"]) { card, _ in
        card.skillBanner
    },
]
```

And change the `SpecialSearchTree.leaves` line from:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves
}
```

to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests, including `testOthersSearchLeafCount` confirming exactly 43 total leaves.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Others Search leaves — SpecialSearchTree now has all 43 Phase 1 leaves"
```

---

## Task 5: `SpecialSearchEngine` + wire into `BrowseViewModel`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/DataStore.swift`
- Create: `ios/PADDictionary/PADDictionary/Models/SpecialSearchEngine.swift`
- Modify: `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SpecialSearchEngineTests.swift`

**Interfaces:**
- Consumes: `SpecialSearchTree`, `SpecialSearchLeaf`, `SpecialSearchContext` (Tasks 3-4).
- Produces: `DataStore.cardsById: [Int: Card]` (`@Published`, rebuilt in `reload()`); `enum MatchMode { case and, or }`; `enum SpecialSearchEngine { static func filter(_ cards: [Card], selectedKeys: Set<String>, mode: MatchMode, context: SpecialSearchContext) -> [Card] }`; `BrowseViewModel.selectedSpecialSearchKeys: Set<String>` and `BrowseViewModel.specialSearchMode: MatchMode` — consumed by `SpecialSearchView` (Task 6).

- [ ] **Step 1: Modify `DataStore`**

Add this published property to `DataStore` (alongside `skillLookup`/`skillLookupEN`):

```swift
    @Published private(set) var cardsById: [Int: Card] = [:]
```

And add this line to `reload()` (alongside the existing `skillLookup = ...` line):

```swift
        cardsById = Dictionary(uniqueKeysWithValues: cards.map { ($0.id, $0) })
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SpecialSearchEngineTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class SpecialSearchEngineTests: XCTestCase {
    private func makeCard(id: Int, maxLevel: Int = 1) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

    func testEmptySelectionReturnsAllCards() {
        let cards = [makeCard(id: 1), makeCard(id: 2)]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertEqual(SpecialSearchEngine.filter(cards, selectedKeys: [], mode: .and, context: ctx).map(\.id), [1, 2])
    }

    func testAndModeRequiresAllSelectedLeavesToMatch() {
        let cards = [makeCard(id: 1, maxLevel: 1), makeCard(id: 2, maxLevel: 1)]
        var c2 = cards[1]
        // card 2 also has henshinTo set, satisfying "Before Transform" too
        c2 = Card(id: 2, name: c2.name, otLangName: nil, attrs: c2.attrs, types: c2.types, rarity: c2.rarity, cost: c2.cost, maxLevel: c2.maxLevel, isEmpty: c2.isEmpty, enabled: c2.enabled, hp: c2.hp, atk: c2.atk, rcv: c2.rcv, activeSkillId: c2.activeSkillId, leaderSkillId: c2.leaderSkillId, evoRootId: c2.evoRootId, awakenings: c2.awakenings, superAwakenings: c2.superAwakenings, canAssist: c2.canAssist, henshinTo: [3], henshinFrom: c2.henshinFrom, orbSkinOrBgmId: c2.orbSkinOrBgmId, badgeId: c2.badgeId, feedExp: c2.feedExp, sellPrice: c2.sellPrice, limitBreakIncr: c2.limitBreakIncr, sellMP: c2.sellMP, latentAwakeningId: c2.latentAwakeningId, stackable: c2.stackable, skillBanner: c2.skillBanner, evoMaterials: c2.evoMaterials, isUltEvo: c2.isUltEvo, evoBaseId: c2.evoBaseId, syncAwakening: c2.syncAwakening)
        let all = [cards[0], c2]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        let keys: Set<String> = ["Others Search > Max level is lv1", "Evo type > Transform > Before Transform"]
        let result = SpecialSearchEngine.filter(all, selectedKeys: keys, mode: .and, context: ctx)
        XCTAssertEqual(result.map(\.id), [2])
    }

    func testOrModeUnionsMatches() {
        let cards = [makeCard(id: 1, maxLevel: 1), makeCard(id: 2, maxLevel: 5)]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        let keys: Set<String> = ["Others Search > Max level is lv1", "Others Search > Level limit unable break"]
        let result = SpecialSearchEngine.filter(cards, selectedKeys: keys, mode: .or, context: ctx)
        XCTAssertEqual(Set(result.map(\.id)), [1, 2])
    }
}
```

- [ ] **Step 3: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchEngineTests
```

- [ ] **Step 4: Implement `SpecialSearchEngine`**

Create `ios/PADDictionary/PADDictionary/Models/SpecialSearchEngine.swift`:

```swift
import Foundation

enum MatchMode {
    case and, or
}

enum SpecialSearchEngine {
    static func filter(_ cards: [Card], selectedKeys: Set<String>, mode: MatchMode, context: SpecialSearchContext) -> [Card] {
        guard !selectedKeys.isEmpty else { return cards }
        let selectedLeaves = SpecialSearchTree.leaves.filter { selectedKeys.contains($0.id) }
        switch mode {
        case .and:
            return cards.filter { card in selectedLeaves.allSatisfy { $0.matches(card, context) } }
        case .or:
            return cards.filter { card in selectedLeaves.contains { $0.matches(card, context) } }
        }
    }
}
```

- [ ] **Step 5: Wire into `BrowseViewModel`**

In `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`, add these two published properties to `BrowseViewModel`:

```swift
    @Published var selectedSpecialSearchKeys: Set<String> = []
    @Published var specialSearchMode: MatchMode = .and
```

And change the `cards` computed property (which currently ends with the `FilterState` filter, then sort) to insert special-search filtering between the `FilterState` filter and the sort:

```swift
    var cards: [Card] {
        let searched = searchText.isEmpty
            ? dataStore.cards
            : dataStore.cards.filter { String($0.id).contains(searchText) }
        let filtered = searched.filter { filterState.matches($0) }
        let context = SpecialSearchContext(cardsById: dataStore.cardsById, skillsJA: dataStore.skillLookup)
        let specialFiltered = SpecialSearchEngine.filter(filtered, selectedKeys: selectedSpecialSearchKeys, mode: specialSearchMode, context: context)
        let sort = CardSort.all[sortIndex]
        let ascending = specialFiltered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
```

- [ ] **Step 6: Run test to verify it passes (real simulator)**

Same command as Step 3, then run the FULL suite (this touches `DataStore` and `BrowseViewModel`, shared by many tests):

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/DataStore.swift ios/PADDictionary/PADDictionary/Models/SpecialSearchEngine.swift ios/PADDictionary/PADDictionary/Views/BrowseView.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchEngineTests.swift
git commit -m "Add SpecialSearchEngine and wire it into BrowseViewModel.cards"
```

---

## Task 6: `SpecialSearchView` UI, wire into `BrowseView`, full verify, screenshot

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Views/SpecialSearchView.swift`
- Modify: `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`

**Interfaces:**
- Consumes: `SpecialSearchTree`, `ToggleChip` (existing, from `FilterView.swift`), `BrowseViewModel` (now with `selectedSpecialSearchKeys`/`specialSearchMode`).
- Produces: `struct SpecialSearchView: View { @ObservedObject var viewModel: BrowseViewModel }` — terminal for this phase.

This is UI wiring, not unit-testable — verify with a real Simulator screenshot.

- [ ] **Step 1: Implement `SpecialSearchView`**

Create `ios/PADDictionary/PADDictionary/Views/SpecialSearchView.swift`:

```swift
import SwiftUI

struct SpecialSearchView: View {
    @ObservedObject var viewModel: BrowseViewModel
    @Environment(\.dismiss) private var dismiss

    private var groupedLeaves: [(String, [SpecialSearchLeaf])] {
        var order: [String] = []
        var groups: [String: [SpecialSearchLeaf]] = [:]
        for leaf in SpecialSearchTree.leaves {
            let key = leaf.groupPath.joined(separator: " › ")
            if groups[key] == nil { order.append(key) }
            groups[key, default: []].append(leaf)
        }
        return order.map { ($0, groups[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Match", selection: $viewModel.specialSearchMode) {
                        Text("AND").tag(MatchMode.and)
                        Text("OR").tag(MatchMode.or)
                    }
                    .pickerStyle(.segmented)
                }
                ForEach(groupedLeaves, id: \.0) { title, leaves in
                    Section(title) {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                            ForEach(leaves) { leaf in
                                ToggleChip(label: leaf.label, isOn: viewModel.selectedSpecialSearchKeys.contains(leaf.id)) {
                                    if viewModel.selectedSpecialSearchKeys.contains(leaf.id) {
                                        viewModel.selectedSpecialSearchKeys.remove(leaf.id)
                                    } else {
                                        viewModel.selectedSpecialSearchKeys.insert(leaf.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search Filter")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") { viewModel.selectedSpecialSearchKeys = [] }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
```

`MatchMode` needs to work as a `Picker` selection tag — it's a plain `enum MatchMode { case and, or }` (no associated values), which is `Hashable` for free, so this compiles as-is.

- [ ] **Step 2: Wire into `BrowseView`**

Add a `@State private var showingSpecialSearch = false` property to `BrowseView`, a new toolbar button (SF Symbol `"list.bullet.rectangle"` inactive / `"list.bullet.rectangle.fill"` when `!viewModel.selectedSpecialSearchKeys.isEmpty`) that sets it `true`, and `.sheet(isPresented: $showingSpecialSearch) { SpecialSearchView(viewModel: viewModel) }`.

- [ ] **Step 3: Run the full test suite for real**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target.

- [ ] **Step 4: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/SpecialSearchView.swift ios/PADDictionary/PADDictionary/Views/BrowseView.swift
git commit -m "Add SpecialSearchView and wire it into BrowseView"
```

Report back real test output and the commit hash. Do NOT do screenshot verification yourself — the orchestrator does that separately afterward.

## Self-Review Notes

- **Spec coverage:** 13 Card fields (Task 1), skill-chain helper (Task 2), Evo type + Awakenings leaves (Task 3), Others Search leaves (Task 4), AND/OR engine + DataStore/BrowseViewModel wiring (Task 5), UI (Task 6) — every spec section has a task. The 2 excluded broken web leaves are explicitly absent, not silently dropped — documented in the spec and this plan's Global Constraints.
- **Type consistency:** `Card`'s memberwise init order is fixed once in Task 1 (13 new fields appended after `henshinFrom`) and reused identically across every later task's test fixtures. `SpecialSearchLeaf`/`SpecialSearchContext` are defined once in Task 3 and reused as-is in Tasks 4-6. `MatchMode` is defined once in Task 5.
- **No placeholders:** every leaf has its literal ported filter closure, not a description. Task 1's Step 4 explicitly calls out that other test files will need mechanical updates (13 new constructor args / JSON keys) — this is real, necessary work, not hand-waved as "add appropriate fields."
