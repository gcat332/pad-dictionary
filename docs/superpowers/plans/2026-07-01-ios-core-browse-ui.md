# iOS Core Browse UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role override:** Tasks 1-6 were implemented by dispatching to the `codex:codex-rescue` agent (`--model gpt-5.5 --write`). From Task 7 onward, per user instruction, implementation is done by dispatching to a Claude subagent running Opus 4.8 instead. In both cases Claude (Sonnet, the orchestrator) acts as SA/BA: hand the coder one task at a time (its Files/Interfaces/Steps block verbatim), then review the resulting diff and test output against this plan's acceptance criteria before moving on.

**Goal:** Browse all cached cards in a grid with the same card-art/attribute-frame visuals as the web dictionary, search by ID, sort by the same 8 keys, and view a full detail screen per card including the evolution line.

**Architecture:** Pure-Swift model/logic additions (sort comparators, skill-text merge, evolution BFS, sprite-position math) get unit tests with no simulator rendering involved. A small sprite-sheet cache + two SwiftUI views (`CardArtworkView`, `AwakeningIconView`) port the web's CSS `background-position` trick to `Image` offset+clip. `BrowseView` and `CardDetailView` wire everything together; `ContentView` becomes a `TabView` (Browse / Sync / Settings).

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file that declares an `ObservableObject`/`@Published` type must explicitly `import Combine`, even if it also imports `SwiftUI`/`Foundation` — confirmed by three real build failures in the prior sub-project; `swiftc -parse` does NOT catch this (it's a type-check error, not a syntax error).
- No third-party dependencies.
- Every non-trivial type/function name introduced in one task must be reused with the exact same spelling in later tasks (see each task's **Interfaces** block).
- UI must be genuinely usable: standard iOS layout/spacing, `NavigationStack`/`TabView`, SF Symbols, visible empty/loading states — not a wireframe.
- Sprite math is ported exactly from the web's CSS (confirmed pixel dimensions): card art sheets are 1024×1024 webp, 10×10 grid, 102px step, 100px art; `CARDFRAME2.png` is 712×412 (`7.12×4.12` at cell=100, main row at y-offset 0, sub row at y-offset `-1.04`); `CARDFRAMEW.png` is 128×128, scaled 1:1 to the cell box, no offset; `awoken.png` is 96×4608, 144 cells of 32px stacked in one column.

---

## Task 1: `Card` gains `henshinTo`/`henshinFrom`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/Card.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/CardHenshinDecodingTests.swift`

**Interfaces:**
- Produces: `Card.henshinTo: [Int]?` and `Card.henshinFrom: [Int]?` (both `nil` when the JSON key is absent — most cards don't have transform links) — consumed by the `evoFamily` function (Task 4).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/CardHenshinDecodingTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class CardHenshinDecodingTests: XCTestCase {
    func testDecodesHenshinToWhenPresent() throws {
        let json = #"{"id":5630,"name":"Test","attrs":[3],"types":[4],"rarity":7,"cost":28,"maxLevel":99,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":1,"leaderSkillId":1,"evoRootId":5630,"awakenings":[],"superAwakenings":[],"canAssist":false,"henshinTo":[5631]}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertEqual(card.henshinTo, [5631])
        XCTAssertNil(card.henshinFrom)
    }

    func testHenshinFieldsDefaultToNilWhenAbsent() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertNil(card.henshinTo)
        XCTAssertNil(card.henshinFrom)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CardHenshinDecodingTests
```

Expected: build/test failure — decoding an unknown extra key `henshinTo` is harmless, but `card.henshinTo` doesn't exist yet, so this fails to compile.

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/Card.swift`, add two properties at the END of the `Card` struct's property list (after `canAssist`, before the closing brace, so the memberwise initializer's parameter order stays append-only for later tasks):

```swift
    let henshinTo: [Int]?
    let henshinFrom: [Int]?
```

The full struct should read:

```swift
struct Card: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let otLangName: LocalizedNames?
    let attrs: [Int]
    let types: [Int]
    let rarity: Int
    let cost: Int
    let maxLevel: Int
    let isEmpty: Bool
    let enabled: Bool
    let hp: StatRange
    let atk: StatRange
    let rcv: StatRange
    let activeSkillId: Int
    let leaderSkillId: Int
    let evoRootId: Int
    let awakenings: [Int]
    let superAwakenings: [Int]
    let canAssist: Bool
    let henshinTo: [Int]?
    let henshinFrom: [Int]?

    var displayName: String { otLangName?.en ?? name }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for both tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/Card.swift ios/PADDictionary/PADDictionaryTests/CardHenshinDecodingTests.swift
git commit -m "Add henshinTo/henshinFrom to Card for evolution-line traversal"
```

---

## Task 2: `CardSort` comparators

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/CardSort.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/CardSortTests.swift`

**Interfaces:**
- Consumes: `Card` (existing, now with `henshinTo`/`henshinFrom` at the end of its memberwise init), `Skill` (existing).
- Produces: `typealias SkillLookup = [Int: Skill]` and `struct CardSort { let id: String; let label: String; let compare: (Card, Card, SkillLookup) -> Bool }` with `static let all: [CardSort]` (8 entries: id, rarity, cost, attr, hp, atk, rcv, cd) — consumed by `BrowseViewModel` (Task 8) and `DataStore` (Task 8, for the `SkillLookup` type).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/CardSortTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class CardSortTests: XCTestCase {
    private func makeCard(id: Int, rarity: Int = 1, cost: Int = 1, attrs: [Int] = [0], hp: Int = 100, atk: Int = 100, rcv: Int = 100, activeSkillId: Int = 0) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: [1], rarity: rarity, cost: cost, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: hp, max: hp, scale: 1), atk: StatRange(min: atk, max: atk, scale: 1), rcv: StatRange(min: rcv, max: rcv, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil)
    }

    private func sort(_ id: String) -> CardSort {
        CardSort.all.first { $0.id == id }!
    }

    func testIdComparatorIsAscendingById() {
        let a = makeCard(id: 1), b = makeCard(id: 2)
        XCTAssertTrue(sort("id").compare(a, b, [:]))
        XCTAssertFalse(sort("id").compare(b, a, [:]))
    }

    func testRarityCostHpAtkRcvComparators() {
        let a = makeCard(id: 1, rarity: 3, cost: 5, hp: 100, atk: 200, rcv: 50)
        let b = makeCard(id: 2, rarity: 6, cost: 10, hp: 300, atk: 100, rcv: 80)
        XCTAssertTrue(sort("rarity").compare(a, b, [:]))
        XCTAssertTrue(sort("cost").compare(a, b, [:]))
        XCTAssertTrue(sort("hp").compare(a, b, [:]))
        XCTAssertFalse(sort("atk").compare(a, b, [:]))
        XCTAssertTrue(sort("rcv").compare(a, b, [:]))
    }

    func testAttrComparatorFallsBackToSecondAttribute() {
        let a = makeCard(id: 1, attrs: [0, 1])
        let b = makeCard(id: 2, attrs: [0, 2])
        XCTAssertTrue(sort("attr").compare(a, b, [:]))
        let c = makeCard(id: 3, attrs: [1])
        XCTAssertTrue(sort("attr").compare(a, c, [:]))
    }

    func testCdComparatorUsesSkillLookup() {
        let a = makeCard(id: 1, activeSkillId: 10)
        let b = makeCard(id: 2, activeSkillId: 20)
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "A", description: "", type: 0, maxLevel: 1, initialCooldown: 3, params: []),
            20: Skill(id: 20, name: "B", description: "", type: 0, maxLevel: 1, initialCooldown: 8, params: []),
        ]
        XCTAssertTrue(sort("cd").compare(a, b, skills))
        XCTAssertFalse(sort("cd").compare(b, a, skills))
    }

    func testAllEightSortsExist() {
        let ids = Set(CardSort.all.map(\.id))
        XCTAssertEqual(ids, ["id", "rarity", "cost", "attr", "hp", "atk", "rcv", "cd"])
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CardSortTests
```

Expected: build failure — `CardSort`/`SkillLookup` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/CardSort.swift`:

```swift
import Foundation

typealias SkillLookup = [Int: Skill]

struct CardSort {
    let id: String
    let label: String
    let compare: (Card, Card, SkillLookup) -> Bool

    static let all: [CardSort] = [
        CardSort(id: "id", label: "Card ID") { a, b, _ in a.id < b.id },
        CardSort(id: "rarity", label: "Rarity") { a, b, _ in a.rarity < b.rarity },
        CardSort(id: "cost", label: "Cost") { a, b, _ in a.cost < b.cost },
        CardSort(id: "attr", label: "Attribute") { a, b, _ in
            let a0 = a.attrs.first ?? -1
            let b0 = b.attrs.first ?? -1
            if a0 != b0 { return a0 < b0 }
            let a1 = a.attrs.count > 1 ? a.attrs[1] : -1
            let b1 = b.attrs.count > 1 ? b.attrs[1] : -1
            return a1 < b1
        },
        CardSort(id: "hp", label: "HP") { a, b, _ in a.hp.max < b.hp.max },
        CardSort(id: "atk", label: "ATK") { a, b, _ in a.atk.max < b.atk.max },
        CardSort(id: "rcv", label: "RCV") { a, b, _ in a.rcv.max < b.rcv.max },
        CardSort(id: "cd", label: "Skill CD") { a, b, skills in
            let cdA = skills[a.activeSkillId]?.initialCooldown ?? 0
            let cdB = skills[b.activeSkillId]?.initialCooldown ?? 0
            return cdA < cdB
        },
    ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/CardSort.swift ios/PADDictionary/PADDictionaryTests/CardSortTests.swift
git commit -m "Add CardSort with the 8 web-parity sort comparators"
```

---

## Task 3: `SkillResolver`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/SkillResolver.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SkillResolverTests.swift`

**Interfaces:**
- Consumes: `Skill`, `SkillLookup` (existing, from Task 2).
- Produces: `struct ResolvedSkill: Equatable { let name: String; let description: String; let source: Source }` with `enum Source: Equatable { case en, translated, none }`, and `enum SkillResolver { static func resolve(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup, translations: [String: String]) -> ResolvedSkill?; static func cooldownText(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup) -> String }` — consumed by `CardDetailView` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SkillResolverTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class SkillResolverTests: XCTestCase {
    func testEnglishDescriptionWins() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "JA Name", description: "JA desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let en: SkillLookup = [1: Skill(id: 1, name: "EN Name", description: "EN desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: ja, skillsEN: en, translations: [:])
        XCTAssertEqual(resolved?.name, "EN Name")
        XCTAssertEqual(resolved?.description, "EN desc")
        XCTAssertEqual(resolved?.source, .en)
    }

    func testFallsBackToTranslatedTextWhenNoEnglishDescription() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "JA Name", description: "JA desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: ja, skillsEN: [:], translations: ["1": "Translated desc"])
        XCTAssertEqual(resolved?.name, "JA Name")
        XCTAssertEqual(resolved?.description, "Translated desc")
        XCTAssertEqual(resolved?.source, .translated)
    }

    func testStripsInlineFormattingCodesFromDescription() {
        let en: SkillLookup = [1: Skill(id: 1, name: "Name", description: "^ff3600^Red text^p normal", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: [:], skillsEN: en, translations: [:])
        XCTAssertEqual(resolved?.description, "Red text normal")
    }

    func testReturnsNilWhenSkillUnknownInBothSources() {
        XCTAssertNil(SkillResolver.resolve(skillId: 999, skillsJA: [:], skillsEN: [:], translations: [:]))
    }

    func testCooldownTextShowsRangeWhenLevelingReducesIt() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 6, initialCooldown: 8, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "CD 8→3")
    }

    func testCooldownTextShowsSingleValueWhenMaxLevelIsOne() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "CD 5")
    }

    func testCooldownTextIsEmptyWhenNoCooldown() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 1, initialCooldown: 0, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "")
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SkillResolverTests
```

Expected: build failure — `SkillResolver`/`ResolvedSkill` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/SkillResolver.swift`:

```swift
import Foundation

struct ResolvedSkill: Equatable {
    let name: String
    let description: String
    let source: Source

    enum Source: Equatable {
        case en, translated, none
    }
}

enum SkillResolver {
    static func resolve(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup, translations: [String: String]) -> ResolvedSkill? {
        let ja = skillsJA[skillId]
        let en = skillsEN[skillId]
        guard ja != nil || en != nil else { return nil }

        let enDesc = clean(en?.description)
        let trDesc = clean(translations[String(skillId)])
        let description = enDesc ?? trDesc ?? ""
        let source: ResolvedSkill.Source = enDesc != nil ? .en : (trDesc != nil ? .translated : .none)

        let name = trimmedNonEmpty(en?.name) ?? ja?.name ?? ""

        return ResolvedSkill(name: name, description: description, source: source)
    }

    static func cooldownText(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup) -> String {
        guard let skill = skillsJA[skillId] ?? skillsEN[skillId], skill.initialCooldown != 0 else { return "" }
        let effectiveMaxLevel = skill.maxLevel == 0 ? 1 : skill.maxLevel
        let minCooldown = skill.initialCooldown - (effectiveMaxLevel - 1)
        return minCooldown == skill.initialCooldown ? "CD \(minCooldown)" : "CD \(skill.initialCooldown)→\(minCooldown)"
    }

    private static func trimmedNonEmpty(_ raw: String?) -> String? {
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
        return trimmed
    }

    private static func clean(_ raw: String?) -> String? {
        guard var s = trimmedNonEmpty(raw) else { return nil }
        s = s.replacingOccurrences(of: "\\^[0-9a-fA-F]{6}\\^", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "\\^p", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "[ \\t]{2,}", with: " ", options: .regularExpression)
        return trimmedNonEmpty(s)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SkillResolver.swift ios/PADDictionary/PADDictionaryTests/SkillResolverTests.swift
git commit -m "Add SkillResolver merging JA/EN/translated skill text"
```

---

## Task 4: `evoFamily`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/EvoFamily.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/EvoFamilyTests.swift`

**Interfaces:**
- Consumes: `Card` (existing, with `henshinTo`/`henshinFrom`).
- Produces: `func evoFamily(of card: Card, in cards: [Card]) -> [Card]` — consumed by `CardDetailView` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/EvoFamilyTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class EvoFamilyTests: XCTestCase {
    private func makeCard(id: Int, evoRootId: Int, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom)
    }

    func testGroupsCardsSharingEvoRootId() {
        let cards = [
            makeCard(id: 100, evoRootId: 100),
            makeCard(id: 101, evoRootId: 100),
            makeCard(id: 200, evoRootId: 200),
        ]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(Set(family.map(\.id)), [100, 101])
    }

    func testFollowsHenshinLinksAcrossDifferentEvoRootIds() {
        let cards = [
            makeCard(id: 1, evoRootId: 1, henshinTo: [2]),
            makeCard(id: 2, evoRootId: 2, henshinFrom: [1]),
        ]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(Set(family.map(\.id)), [1, 2])
    }

    func testSingleCardWithNoRelativesReturnsJustItself() {
        let cards = [makeCard(id: 5, evoRootId: 0)]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(family.map(\.id), [5])
    }

    func testCapsAt40Nodes() {
        // A henshin chain (each card links to the next), not a shared evoRootId group —
        // sharing one evoRootId pulls in ALL siblings in a single BFS step (matches the
        // web's behavior), so the cap only meaningfully limits growth across chain-like
        // transform links, one new node per step.
        var cards: [Card] = []
        for i in 1...60 {
            let henshinTo = i < 60 ? [i + 1] : nil
            cards.append(makeCard(id: i, evoRootId: i, henshinTo: henshinTo))
        }
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertLessThanOrEqual(family.count, 40)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/EvoFamilyTests
```

Expected: build failure — `evoFamily` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/EvoFamily.swift`:

```swift
import Foundation

func evoFamily(of card: Card, in cards: [Card]) -> [Card] {
    let byId = Dictionary(uniqueKeysWithValues: cards.map { ($0.id, $0) })
    var seen: Set<Int> = [card.id]
    var queue: [Card] = [card]

    while !queue.isEmpty && seen.count < 40 {
        let current = queue.removeFirst()
        var related: [Int] = []
        if current.evoRootId > 0 {
            for candidate in cards where candidate.evoRootId == current.evoRootId {
                related.append(candidate.id)
            }
        }
        related.append(contentsOf: current.henshinTo ?? [])
        related.append(contentsOf: current.henshinFrom ?? [])

        for id in related where !seen.contains(id) {
            if let match = byId[id] {
                seen.insert(id)
                queue.append(match)
            }
        }
    }

    return seen.compactMap { byId[$0] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/EvoFamily.swift ios/PADDictionary/PADDictionaryTests/EvoFamilyTests.swift
git commit -m "Add evoFamily BFS over evoRootId siblings and henshin transform links"
```

---

## Task 5: Sprite position math

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Sprites/CardSpritePosition.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/CardSpritePositionTests.swift`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `struct CardSpritePosition: Equatable { let sheetFile: String; let column: Int; let row: Int }`, `enum CardSprite { static func position(forCardId id: Int) -> CardSpritePosition }`, `enum AttributeFramePosition { static func mainOffset(forAttr attr: Int) -> (x: Double, y: Double)?; static func subOffset(forAttr attr: Int) -> (x: Double, y: Double)? }`, `enum AwakeningSprite { static func yOffset(forAwakeningId id: Int) -> Double? }` — all consumed by `CardArtworkView` (Task 6) and `AwakeningIconView` (Task 7). Offsets are in units of "cell size" — multiply by the on-screen cell size (points) to get the actual SwiftUI offset.

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/CardSpritePositionTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class CardSpritePositionTests: XCTestCase {
    func testFirstCardIsSheetOneTopLeft() {
        let pos = CardSprite.position(forCardId: 1)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_001.webp", column: 0, row: 0))
    }

    func testCard100IsLastSlotOfSheetOne() {
        let pos = CardSprite.position(forCardId: 100)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_001.webp", column: 9, row: 9))
    }

    func testCard101RollsOverToSheetTwo() {
        let pos = CardSprite.position(forCardId: 101)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_002.webp", column: 0, row: 0))
    }

    func testCard115IsRowOneColumnFourOfSheetTwo() {
        let pos = CardSprite.position(forCardId: 115)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_002.webp", column: 4, row: 1))
    }

    func testAttributeFrameMainOffset() {
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 0)?.x, 0)
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 0)?.y, 0)
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 2)?.x, -2.04, accuracy: 0.0001)
        XCTAssertNil(AttributeFramePosition.mainOffset(forAttr: 6))
        XCTAssertNil(AttributeFramePosition.mainOffset(forAttr: -1))
    }

    func testAttributeFrameSubOffset() {
        XCTAssertEqual(AttributeFramePosition.subOffset(forAttr: 2)?.x, -2.04, accuracy: 0.0001)
        XCTAssertEqual(AttributeFramePosition.subOffset(forAttr: 2)?.y, -1.04, accuracy: 0.0001)
    }

    func testAwakeningSpriteOffset() {
        XCTAssertEqual(AwakeningSprite.yOffset(forAwakeningId: 0), 0)
        XCTAssertEqual(AwakeningSprite.yOffset(forAwakeningId: 143), -4576)
        XCTAssertNil(AwakeningSprite.yOffset(forAwakeningId: 144))
        XCTAssertNil(AwakeningSprite.yOffset(forAwakeningId: -1))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CardSpritePositionTests
```

Expected: build failure — `CardSprite`/`AttributeFramePosition`/`AwakeningSprite` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Sprites/CardSpritePosition.swift`:

```swift
import Foundation

struct CardSpritePosition: Equatable {
    let sheetFile: String
    let column: Int
    let row: Int
}

enum CardSprite {
    static let cardsPerSheet = 100
    static let columns = 10

    static func position(forCardId id: Int) -> CardSpritePosition {
        let sheetIndex = (id - 1) / cardsPerSheet + 1
        let sheetFile = "CARDS_\(String(format: "%03d", sheetIndex)).webp"
        let indexInSheet = (id - 1) % cardsPerSheet
        return CardSpritePosition(sheetFile: sheetFile, column: indexInSheet % columns, row: indexInSheet / columns)
    }
}

enum AttributeFramePosition {
    static func mainOffset(forAttr attr: Int) -> (x: Double, y: Double)? {
        guard attr >= 0, attr <= 4 else { return nil }
        return (x: -1.02 * Double(attr), y: 0)
    }

    static func subOffset(forAttr attr: Int) -> (x: Double, y: Double)? {
        guard attr >= 0, attr <= 4 else { return nil }
        return (x: -1.02 * Double(attr), y: -1.04)
    }
}

enum AwakeningSprite {
    static func yOffset(forAwakeningId id: Int) -> Double? {
        guard id >= 0, id <= 143 else { return nil }
        return -32 * Double(id)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Sprites/CardSpritePosition.swift ios/PADDictionary/PADDictionaryTests/CardSpritePositionTests.swift
git commit -m "Add pure sprite-position math ported from the web's CSS offsets"
```

---

## Task 6: `SpriteSheetCache` + `CardArtworkView`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Sprites/SpriteSheetCache.swift`
- Create: `ios/PADDictionary/PADDictionary/Sprites/CardArtworkView.swift`

**Interfaces:**
- Consumes: `CardSprite`, `AttributeFramePosition` (Task 5), `Card` (existing).
- Produces: `final class SpriteSheetCache { static let shared: SpriteSheetCache; func image(relativePath: String) -> UIImage? }` and `struct CardArtworkView: View { let card: Card; var cellSize: CGFloat }` — consumed by `BrowseView` (Task 8) and `CardDetailView` (Task 9).

This task has no unit test of its own — the math it renders with was already tested in Task 5, and `CardArtworkView` is pure SwiftUI wiring. It's verified visually once it's actually on screen in Task 8 (there's nowhere to see it render before then). Do a `swiftc -parse` sanity check instead.

- [ ] **Step 1: Implement `SpriteSheetCache`**

Create `ios/PADDictionary/PADDictionary/Sprites/SpriteSheetCache.swift`:

```swift
import UIKit

final class SpriteSheetCache {
    static let shared = SpriteSheetCache()

    private let cache = NSCache<NSString, UIImage>()
    private let baseDirectory: URL

    init(baseDirectory: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]) {
        self.baseDirectory = baseDirectory
    }

    func image(relativePath: String) -> UIImage? {
        let key = relativePath as NSString
        if let cached = cache.object(forKey: key) { return cached }
        guard let loaded = UIImage(contentsOfFile: baseDirectory.appendingPathComponent(relativePath).path) else { return nil }
        cache.setObject(loaded, forKey: key)
        return loaded
    }
}
```

- [ ] **Step 2: Implement `CardArtworkView`**

Create `ios/PADDictionary/PADDictionary/Sprites/CardArtworkView.swift`:

```swift
import SwiftUI

struct CardArtworkView: View {
    let card: Card
    var cellSize: CGFloat = 64

    var body: some View {
        ZStack {
            artLayer
            frameLayer(attr: card.attrs.first, sub: false)
            if card.attrs.count > 1 {
                frameLayer(attr: card.attrs[1], sub: true)
            }
        }
        .frame(width: cellSize, height: cellSize)
    }

    @ViewBuilder
    private var artLayer: some View {
        let position = CardSprite.position(forCardId: card.id)
        if let sheet = SpriteSheetCache.shared.image(relativePath: "images/cards_ja/\(position.sheetFile)") {
            Image(uiImage: sheet)
                .resizable()
                .frame(width: cellSize * 10.24, height: cellSize * 10.24)
                .offset(x: -1.02 * cellSize * CGFloat(position.column), y: -1.02 * cellSize * CGFloat(position.row))
                .frame(width: cellSize, height: cellSize)
                .clipped()
        } else {
            Color.gray.opacity(0.2)
        }
    }

    @ViewBuilder
    private func frameLayer(attr: Int?, sub: Bool) -> some View {
        if let attr, attr == 6, let whiteFrame = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAMEW.png") {
            Image(uiImage: whiteFrame)
                .resizable()
                .frame(width: cellSize, height: cellSize)
        } else if let attr,
                  let offset = sub ? AttributeFramePosition.subOffset(forAttr: attr) : AttributeFramePosition.mainOffset(forAttr: attr),
                  let frameSheet = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAME2.png") {
            Image(uiImage: frameSheet)
                .resizable()
                .frame(width: cellSize * 7.12, height: cellSize * 4.12)
                .offset(x: cellSize * CGFloat(offset.x), y: cellSize * CGFloat(offset.y))
                .frame(width: cellSize, height: cellSize)
                .clipped()
        } else {
            Color.clear
        }
    }
}
```

- [ ] **Step 3: Sanity-check compilation**

```bash
swiftc -parse ios/PADDictionary/PADDictionary/Sprites/SpriteSheetCache.swift ios/PADDictionary/PADDictionary/Sprites/CardArtworkView.swift
```

Expected: exit 0. (This only catches syntax errors, not missing imports/type errors — full verification happens once `BrowseView` puts this on screen in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Sprites/SpriteSheetCache.swift ios/PADDictionary/PADDictionary/Sprites/CardArtworkView.swift
git commit -m "Add SpriteSheetCache and CardArtworkView porting the web's sprite CSS trick"
```

---

## Task 7: Awakening names + `AwakeningIconView`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Resources/awoken_names.json` (copy of the repo's existing `monsters-info/awoken_names.json` — this is this repo's own static English-name lookup, not upstream data, so it's bundled with the app rather than synced over network)
- Create: `ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift`
- Create: `ios/PADDictionary/PADDictionary/Sprites/AwakeningIconView.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/AwakeningNamesTests.swift`

**Interfaces:**
- Consumes: `AwakeningSprite` (Task 5).
- Produces: `enum AwakeningNames { static func name(for id: Int) -> String }` (loads the bundled JSON once, lazily) and `struct AwakeningIconView: View { let awakeningId: Int }` — consumed by `CardDetailView` (Task 9).

- [ ] **Step 1: Copy the resource file**

```bash
cp monsters-info/awoken_names.json ios/PADDictionary/PADDictionary/Resources/awoken_names.json
```

In Xcode, ensure this file's target membership is `PADDictionary` (the app target, not the test target) so it ships inside the app bundle.

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/AwakeningNamesTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class AwakeningNamesTests: XCTestCase {
    func testKnownAwakeningReturnsBundledName() {
        XCTAssertEqual(AwakeningNames.name(for: 1), "Enhanced HP")
    }

    func testUnknownAwakeningFallsBackToNumberedLabel() {
        XCTAssertEqual(AwakeningNames.name(for: 99999), "Awakening 99999")
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/AwakeningNamesTests
```

Expected: build failure — `AwakeningNames` not defined.

- [ ] **Step 4: Implement**

Create `ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift`:

```swift
import Foundation

enum AwakeningNames {
    private static let names: [String: String] = {
        guard let url = Bundle.main.url(forResource: "awoken_names", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else {
            return [:]
        }
        return decoded
    }()

    static func name(for id: Int) -> String {
        names[String(id)] ?? "Awakening \(id)"
    }
}
```

Create `ios/PADDictionary/PADDictionary/Sprites/AwakeningIconView.swift`:

```swift
import SwiftUI

struct AwakeningIconView: View {
    let awakeningId: Int

    var body: some View {
        Group {
            if let yOffset = AwakeningSprite.yOffset(forAwakeningId: awakeningId),
               let sheet = SpriteSheetCache.shared.image(relativePath: "images/awoken.png") {
                Image(uiImage: sheet)
                    .resizable()
                    .frame(width: 32, height: 4608)
                    .offset(y: CGFloat(yOffset))
                    .frame(width: 32, height: 32)
                    .clipped()
            } else {
                Text("\(awakeningId)")
                    .font(.caption2)
                    .frame(width: 32, height: 32)
                    .background(.secondary.opacity(0.2))
                    .clipShape(Circle())
            }
        }
        .accessibilityLabel(AwakeningNames.name(for: awakeningId))
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Same command as Step 3. Expected: `** TEST SUCCEEDED **` for both tests.

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Resources/awoken_names.json ios/PADDictionary/PADDictionary/Sprites/AwakeningNames.swift ios/PADDictionary/PADDictionary/Sprites/AwakeningIconView.swift ios/PADDictionary/PADDictionaryTests/AwakeningNamesTests.swift
git commit -m "Bundle awoken_names.json and add AwakeningIconView"
```

---

## Task 8: `DataStore.skillLookup` + `BrowseView`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/DataStore.swift`
- Create: `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift`

**Interfaces:**
- Consumes: `CardSort`, `SkillLookup` (Task 2), `CardArtworkView` (Task 6), `DataStore` (existing).
- Produces: `DataStore.skillLookup: SkillLookup` and `DataStore.skillLookupEN: SkillLookup` (both `@Published private(set)`, rebuilt in `reload()`) — consumed by `CardDetailView` (Task 9). `@MainActor final class BrowseViewModel: ObservableObject { @Published var searchText: String; @Published var sortIndex: Int; @Published var isDescending: Bool; var cards: [Card] { get } }` and `struct BrowseView: View` — `BrowseView` consumed by `ContentView` (Task 10).

- [ ] **Step 1: Modify `DataStore`**

Replace the full contents of `ios/PADDictionary/PADDictionary/DataStore.swift` with:

```swift
import Foundation
import Combine

@MainActor
final class DataStore: ObservableObject {
    @Published private(set) var cards: [Card] = []
    @Published private(set) var skillsJA: [Skill] = []
    @Published private(set) var skillsEN: [Skill] = []
    @Published private(set) var skillTranslations: [String: String] = [:]
    @Published private(set) var skillLookup: SkillLookup = [:]
    @Published private(set) var skillLookupEN: SkillLookup = [:]
    @Published private(set) var lastSyncedAt: Date?

    private let documentsDirectory: URL
    private let userDefaults: UserDefaults
    private let lastSyncedKey = "lastSyncedAt"

    init(documentsDirectory: URL, userDefaults: UserDefaults = .standard) {
        self.documentsDirectory = documentsDirectory
        self.userDefaults = userDefaults
        if let stored = userDefaults.object(forKey: lastSyncedKey) as? Date {
            lastSyncedAt = stored
        }
        reload()
    }

    func reload() {
        let decoder = JSONDecoder()
        func load<T: Decodable>(_ relativePath: String, as type: T.Type) -> T? {
            guard let data = try? Data(contentsOf: documentsDirectory.appendingPathComponent(relativePath)) else { return nil }
            return try? decoder.decode(type, from: data)
        }
        cards = load("monsters-info/mon_ja.json", as: [Card].self) ?? []
        skillsJA = load("monsters-info/skill_ja.json", as: [Skill].self) ?? []
        skillsEN = load("monsters-info/skill_en.json", as: [Skill].self) ?? []
        skillTranslations = load("monsters-info/skill_tr.json", as: [String: String].self) ?? [:]
        skillLookup = Dictionary(uniqueKeysWithValues: skillsJA.map { ($0.id, $0) })
        skillLookupEN = Dictionary(uniqueKeysWithValues: skillsEN.map { ($0.id, $0) })
    }

    func markSynced(at date: Date) {
        lastSyncedAt = date
        userDefaults.set(date, forKey: lastSyncedKey)
    }
}
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class BrowseViewModelTests: XCTestCase {
    private var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    private func writeCards(_ json: String) throws {
        try Data(json.utf8).write(to: tempDir.appendingPathComponent("monsters-info/mon_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_en.json"))
        try Data("{}".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_tr.json"))
    }

    @MainActor
    func testSearchTextFiltersByIdSubstring() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false},{"id":21,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.searchText = "2"
        XCTAssertEqual(viewModel.cards.map(\.id), [21])
    }

    @MainActor
    func testDefaultSortIsIdDescending() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false},{"id":2,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        XCTAssertEqual(viewModel.cards.map(\.id), [2, 1])
    }

    @MainActor
    func testToggleDirectionReversesOrder() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false},{"id":2,"name":"B","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.isDescending = false
        XCTAssertEqual(viewModel.cards.map(\.id), [1, 2])
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/BrowseViewModelTests
```

Expected: build failure — `BrowseViewModel` not defined.

- [ ] **Step 4: Implement `BrowseView.swift`**

Create `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`:

```swift
import SwiftUI
import Combine

@MainActor
final class BrowseViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var sortIndex: Int = 0
    @Published var isDescending: Bool = true

    let dataStore: DataStore

    init(dataStore: DataStore) {
        self.dataStore = dataStore
    }

    var cards: [Card] {
        let filtered = searchText.isEmpty
            ? dataStore.cards
            : dataStore.cards.filter { String($0.id).contains(searchText) }
        let sort = CardSort.all[sortIndex]
        let ascending = filtered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
}

struct BrowseView: View {
    @ObservedObject var dataStore: DataStore
    @StateObject private var viewModel: BrowseViewModel

    init(dataStore: DataStore) {
        self.dataStore = dataStore
        _viewModel = StateObject(wrappedValue: BrowseViewModel(dataStore: dataStore))
    }

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 5)

    var body: some View {
        NavigationStack {
            Group {
                if dataStore.cards.isEmpty {
                    ContentUnavailableView(
                        "No cards yet",
                        systemImage: "square.stack.3d.up.slash",
                        description: Text("Run an update on the Sync tab to get started.")
                    )
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                NavigationLink {
                                    CardDetailView(card: card, dataStore: dataStore)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 64)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Search by ID")
            .navigationTitle("Browse")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach(Array(CardSort.all.enumerated()), id: \.offset) { index, sort in
                            Button(sort.label) { viewModel.sortIndex = index }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.isDescending.toggle()
                    } label: {
                        Image(systemName: viewModel.isDescending ? "arrow.down" : "arrow.up")
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Same command as Step 3. Expected: `** TEST SUCCEEDED **` for all 3 tests.

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/DataStore.swift ios/PADDictionary/PADDictionary/Views/BrowseView.swift ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift
git commit -m "Add DataStore.skillLookup and the Browse grid with search/sort"
```

**Note for the orchestrator (Claude, not Codex):** `BrowseView` references `CardDetailView`, which doesn't exist until Task 9 — this task alone will NOT compile standalone. Codex should still write and commit it as specified (matching the plan's task boundaries); the full-suite build only needs to succeed after Task 9. Skip the full-project build verification for this task and only confirm `-only-testing:PADDictionaryTests/BrowseViewModelTests` — if that target alone can't build because `CardDetailView` is missing, tell Codex to add a temporary placeholder `struct CardDetailView: View { let card: Card; let dataStore: DataStore; var body: some View { Text("#\(card.id)") } }` in a new file `ios/PADDictionary/PADDictionary/Views/CardDetailView.swift` for now — Task 9 replaces it with the real implementation.

---

## Task 9: `CardDetailView`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/CardTypeNames.swift`
- Modify (or create, if Task 8 left a placeholder): `ios/PADDictionary/PADDictionary/Views/CardDetailView.swift`

**Interfaces:**
- Consumes: `SkillResolver` (Task 3), `evoFamily` (Task 4), `AwakeningIconView` (Task 7), `CardArtworkView` (Task 6), `DataStore.skillLookup`/`skillLookupEN` (Task 8).
- Produces: `enum CardTypeNames { static func name(for type: Int) -> String }` and the real `struct CardDetailView: View { let card: Card; let dataStore: DataStore }` — consumed by `BrowseView` (existing) and itself recursively (evolution-line navigation).

This task is UI wiring over already-tested pure functions — no new unit test. Verify with a real screenshot once it's on screen (Step 3 below).

- [ ] **Step 1: Implement `CardTypeNames`**

Create `ios/PADDictionary/PADDictionary/Models/CardTypeNames.swift`:

```swift
import Foundation

enum CardTypeNames {
    private static let names: [Int: String] = [
        0: "Evo Material", 1: "Balanced", 2: "Physical", 3: "Healer", 4: "Dragon", 5: "God",
        6: "Attacker", 7: "Devil", 8: "Machine", 12: "Awoken", 14: "Enhance", 15: "Redeemable",
    ]

    static func name(for type: Int) -> String {
        names[type] ?? "Type \(type)"
    }
}
```

- [ ] **Step 2: Implement `CardDetailView`**

Replace `ios/PADDictionary/PADDictionary/Views/CardDetailView.swift` (deleting any Task 8 placeholder) with:

```swift
import SwiftUI

struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                statsRow
                awakeningsSection
                skillSection(title: "Active skill", skillId: card.activeSkillId)
                skillSection(title: "Leader skill", skillId: card.leaderSkillId)
                evolutionSection
            }
            .padding()
        }
        .navigationTitle("#\(card.id)")
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            CardArtworkView(card: card, cellSize: 80)
            VStack(alignment: .leading, spacing: 4) {
                Text(card.displayName).font(.title2.bold())
                Text("#\(card.id) · \(card.name)").font(.caption).foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    ForEach(card.types.filter { $0 >= 0 }, id: \.self) { type in
                        chip(CardTypeNames.name(for: type))
                    }
                    chip("★\(card.rarity)")
                    chip("Cost \(card.cost)")
                }
            }
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.secondary.opacity(0.2))
            .clipShape(Capsule())
    }

    private var statsRow: some View {
        HStack {
            statBox("HP", card.hp.max)
            statBox("ATK", card.atk.max)
            statBox("RCV", card.rcv.max)
        }
    }

    private func statBox(_ label: String, _ value: Int) -> some View {
        VStack {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text("\(value)").font(.headline)
        }
        .frame(maxWidth: .infinity)
    }

    private var awakeningsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Awakenings").font(.headline)
            if card.awakenings.isEmpty {
                Text("None").foregroundStyle(.secondary)
            } else {
                HStack {
                    ForEach(card.awakenings, id: \.self) { AwakeningIconView(awakeningId: $0) }
                }
            }
            if !card.superAwakenings.isEmpty {
                HStack(spacing: 6) {
                    Text("Super").font(.caption).foregroundStyle(.secondary)
                    ForEach(card.superAwakenings, id: \.self) { AwakeningIconView(awakeningId: $0) }
                }
            }
        }
    }

    private func skillSection(title: String, skillId: Int) -> some View {
        let resolved = SkillResolver.resolve(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
        let cd = SkillResolver.cooldownText(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN)
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.headline)
                if !cd.isEmpty {
                    Text(cd).font(.caption).foregroundStyle(.secondary)
                }
            }
            Text(resolved.map { $0.name.isEmpty ? "—" : $0.name } ?? "—").font(.subheadline.bold())
            if let resolved, !resolved.description.isEmpty {
                Text(resolved.description + (resolved.source == .translated ? " (translated)" : ""))
                    .font(.body)
            } else {
                Text("— no English text").foregroundStyle(.secondary)
            }
        }
    }

    private var evolutionSection: some View {
        let family = evoFamily(of: card, in: dataStore.cards).sorted { $0.id < $1.id }
        return Group {
            if family.count > 1 {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Evolution line (\(family.count))").font(.headline)
                    ScrollView(.horizontal) {
                        HStack(spacing: 12) {
                            ForEach(family) { member in
                                NavigationLink {
                                    CardDetailView(card: member, dataStore: dataStore)
                                } label: {
                                    VStack(spacing: 2) {
                                        CardArtworkView(card: member, cellSize: 56)
                                        Text("#\(member.id)").font(.caption2)
                                    }
                                }
                                .disabled(member.id == card.id)
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Sanity-check compilation**

```bash
swiftc -parse ios/PADDictionary/PADDictionary/Models/CardTypeNames.swift ios/PADDictionary/PADDictionary/Views/CardDetailView.swift
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/CardTypeNames.swift ios/PADDictionary/PADDictionary/Views/CardDetailView.swift
git commit -m "Add the real CardDetailView with stats, skills, and evolution line"
```

---

## Task 10: `ContentView` becomes a `TabView`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/ContentView.swift`

**Interfaces:**
- Consumes: `BrowseView` (Task 8), `SyncView`, `SettingsView`, `GitHubSyncService`, `DataStore` (all existing).
- Produces: the app's root `TabView` — terminal, nothing else consumes this.

- [ ] **Step 1: Implement**

Replace `ios/PADDictionary/PADDictionary/ContentView.swift` with:

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )

    var body: some View {
        TabView {
            BrowseView(dataStore: dataStore)
                .tabItem { Label("Browse", systemImage: "square.grid.2x2") }

            NavigationStack {
                SyncView(dataStore: dataStore, syncService: GitHubSyncService())
            }
            .tabItem { Label("Sync", systemImage: "arrow.triangle.2.circlepath") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
```

- [ ] **Step 2: Run the full test suite**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target — this is the first point where the whole project (including `BrowseView` + real `CardDetailView` together) must build clean.

- [ ] **Step 3: Commit**

```bash
git add ios/PADDictionary/PADDictionary/ContentView.swift
git commit -m "Wire Browse/Sync/Settings into a TabView root"
```

**Note for the orchestrator:** after this commits and the full suite passes, launch the app in Simulator (`xcrun simctl` boot + `xcodebuild -scheme PADDictionary run`, or just build-and-run via Xcode) and take a screenshot of the Browse tab and a card's detail view — this is the first real visual confirmation that `CardArtworkView`'s sprite offset math (Task 6) actually renders correctly, since it was only sanity-checked for compilation until now.

---

## Self-Review Notes

- **Spec coverage:** sprite rendering (Tasks 5-7), data layer additions (`henshinTo`/`henshinFrom` in Task 1, `SkillResolver` in Task 3, `evoFamily` in Task 4, `CardSort` in Task 2), UI (`BrowseView` in Task 8, `CardDetailView` in Task 9, `TabView` in Task 10), error handling (empty-state in Task 8, missing-skill dim placeholder in Task 9, missing-sprite gray box in Task 6) — every spec section maps to a task.
- **Type consistency:** `Card`'s memberwise init order is fixed once in Task 1 (append-only) and reused identically in Tasks 2, 4, and 8's test helpers. `SkillLookup` is defined once in Task 2 and reused by `DataStore` (Task 8), `SkillResolver` (Task 3), and `CardSort` itself. `evoFamily`'s signature `(of:in:)` is used identically in Task 9.
- **No placeholders:** every step has literal Swift/JSON/bash. The one intentional placeholder (Task 8's temporary `CardDetailView` stub, to be used ONLY if `BrowseViewModelTests` can't compile without it) is explicitly flagged as temporary and fully replaced by Task 9 — not a spec gap.
