# iOS App — SP4 Phase 3c: Special-Search Active Skill (final slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the remaining 84 "Active Skill" leaves (Orbs Drop, Change all Orbs on
Board, Orbs Color Change, Random Create Orbs, Create Fixed Position Orbs, Damage Enemy ×3)
from `engine.js` into `SpecialSearchTree.swift`, bringing the tree from 165 to 249 leaves.

**Architecture:** New pure-function helpers land in `ActiveSkillEffects.swift` (and a new
tiny `Bin.swift`); 84 new `SpecialSearchLeaf` entries land in `SpecialSearchTree.swift` in
8 new private arrays, appended to the final `SpecialSearchTree.leaves` composition.

**Tech Stack:** Swift 6, SwiftUI, XCTest, Xcode project at
`ios/PADDictionary/PADDictionary.xcodeproj`.

## Global Constraints

- Any Swift file declaring `ObservableObject`/`@Published` must `import Combine` explicitly
  (not implied by `import SwiftUI`/`Foundation`) — not applicable to files touched in this
  plan, but check before adding new files.
- Match the existing codebase idiom for optional-index param reads exactly:
  `skill.params.indices.contains(i) ? skill.params[i] : 0` (NOT a new `subscript(safe:)`
  extension in `SpecialSearchTree.swift` — that pattern already exists 15+ times in the
  file; stay consistent with it).
- `SpecialSearchLeaf.matches` closures only port the web's `function:` (filter predicate).
  The web's `addition:` (extra display column) and `.sort(...)` comparators are OUT OF
  SCOPE — established simplification from every prior phase (display/sort order doesn't
  affect which cards match).
- Every task that adds leaves to `SpecialSearchTree.swift` MUST update all 4
  `XCTAssertEqual(SpecialSearchTree.leaves.count, N)` assertions in
  `PADDictionaryTests/SpecialSearchTreeTests.swift` (currently at lines 105, 182, 242, 325,
  all asserting 165 — this has moved before in every prior phase, so search for ALL
  occurrences, don't assume there's only one).
- `SkillChainMatcher.resolveAll(...)` defaults `searchRandom` to `false` (matches the web's
  `getCardActiveSkills(card, skillTypes, searchRandom = false)`). `SkillChainMatcher.resolve`/
  `.matches` default `searchRandom` to `true` (matches the web's `getCardActiveSkill(card,
  skillTypes, searchRandom = true)`). Pass `searchRandom` explicitly in every call in this
  plan — never rely on the default silently matching intent.
- Real values for `Skill.params` are 0-indexed `[Int]`; `Skill.id`/`Skill.type` are `Int`.

---

### Task 1: New primitives — `Bin.unflags`, `Int.notNeighbour`, orb/shape parsers

**Files:**
- Create: `PADDictionary/Models/Bin.swift`
- Modify: `PADDictionary/Models/ActiveSkillEffects.swift`
- Test: `PADDictionaryTests/BinTests.swift` (new)
- Test: `PADDictionaryTests/ActiveSkillEffectsTests.swift` (existing — append)

**Interfaces:**
- Produces: `Bin.unflags(_ number: Int) -> [Int]`, `Int.notNeighbour() -> Int`,
  `ActiveSkillEffects.boardChangeColorTypes(_ skill: Skill?) -> [Int]`,
  `ActiveSkillEffects.orbsChangeParse(_ skill: Skill) -> [(from: [Int], to: [Int])]`,
  `ActiveSkillEffects.generateOrbsParse(_ card: Card, skills: SkillLookup) -> [(count: Int, to: Int, exclude: Int)]`,
  `ActiveSkillEffects.shapeThisRowOk(_ line: Int, _ lineNumber: Int) -> Bool`,
  `ActiveSkillEffects.shapeUpsideDownRowOk(_ line: Int, _ lineNumber: Int) -> Bool`,
  `ActiveSkillEffects.shapeIsCross(_ sk: [Int]) -> Bool`,
  `ActiveSkillEffects.shapeIsLShape(_ sk: [Int]) -> Bool`. Tasks 2–7 consume all of these.

- [ ] **Step 1: Write failing tests for `Bin.unflags`**

```swift
import XCTest
@testable import PADDictionary

final class BinTests: XCTestCase {
    func testUnflagsZeroIsEmpty() {
        XCTAssertEqual(Bin.unflags(0), [])
    }

    func testUnflagsDecodesSetBits() {
        XCTAssertEqual(Bin.unflags(0b101), [0, 2])
        XCTAssertEqual(Bin.unflags(0b111111), [0, 1, 2, 3, 4, 5])
    }

    func testNotNeighbourMasksAdjacentBits() {
        // JS: (0b111).notNeighbour() === 0b1000 (the bit immediately left of a 3-wide block)
        XCTAssertEqual((0b111).notNeighbour(), 0b1000)
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/BinTests 2>&1 | tail -40`
Expected: FAIL — `Bin` / `notNeighbour` not found in scope.

- [ ] **Step 3: Implement `Bin.swift`**

```swift
import Foundation

enum Bin {
    static func unflags(_ number: Int) -> [Int] {
        guard number > 0 else { return [] }
        var result: [Int] = []
        var i = 0
        while (1 << i) <= number {
            if number & (1 << i) != 0 { result.append(i) }
            i += 1
        }
        return result
    }
}

extension Int {
    func notNeighbour() -> Int {
        ~self & (self << 1 | self >> 1)
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Write failing tests for the orb/shape parsers**

Append to `PADDictionaryTests/ActiveSkillEffectsTests.swift` (use whatever `Skill(...)`
construction helper already exists in that file; if none exists, construct directly:
`Skill(id: 1, name: "S", description: "", type: T, maxLevel: 1, initialCooldown: 0, params: P)`):

```swift
func testBoardChangeColorTypesStopsAtSentinel() {
    let skill = Skill(id: 1, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, 2, -1, 0])
    XCTAssertEqual(ActiveSkillEffects.boardChangeColorTypes(skill), [0, 2])
}

func testBoardChangeColorTypesNoSentinelReturnsAll() {
    let skill = Skill(id: 1, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, 1, 2])
    XCTAssertEqual(ActiveSkillEffects.boardChangeColorTypes(skill), [0, 1, 2])
}

func testBoardChangeColorTypesNilSkill() {
    XCTAssertEqual(ActiveSkillEffects.boardChangeColorTypes(nil), [])
}

func testOrbsChangeParseType9() {
    let skill = Skill(id: 1, name: "S", description: "", type: 9, maxLevel: 1, initialCooldown: 0, params: [0, 3])
    let parsed = ActiveSkillEffects.orbsChangeParse(skill)
    XCTAssertEqual(parsed.count, 1)
    XCTAssertEqual(parsed[0].from, [0])
    XCTAssertEqual(parsed[0].to, [3])
}

func testOrbsChangeParseType20MergesWhenTargetsMatch() {
    let skill = Skill(id: 1, name: "S", description: "", type: 20, maxLevel: 1, initialCooldown: 0, params: [0, 5, 2, 5])
    let parsed = ActiveSkillEffects.orbsChangeParse(skill)
    XCTAssertEqual(parsed.count, 1)
    XCTAssertEqual(parsed[0].from, [0, 2])
    XCTAssertEqual(parsed[0].to, [5])
}

func testOrbsChangeParseType20SplitsWhenTargetsDiffer() {
    let skill = Skill(id: 1, name: "S", description: "", type: 20, maxLevel: 1, initialCooldown: 0, params: [0, 5, 2, 3])
    let parsed = ActiveSkillEffects.orbsChangeParse(skill)
    XCTAssertEqual(parsed.count, 2)
    XCTAssertEqual(parsed[0].from, [0])
    XCTAssertEqual(parsed[0].to, [5])
    XCTAssertEqual(parsed[1].from, [2])
    XCTAssertEqual(parsed[1].to, [3])
}

func testOrbsChangeParseType154UsesBitmasks() {
    let skill = Skill(id: 1, name: "S", description: "", type: 154, maxLevel: 1, initialCooldown: 0, params: [0b101, 0b10])
    let parsed = ActiveSkillEffects.orbsChangeParse(skill)
    XCTAssertEqual(parsed.count, 1)
    XCTAssertEqual(parsed[0].from, [0, 2])
    XCTAssertEqual(parsed[0].to, [1])
}

func testGenerateOrbsParseType141() {
    let skills: SkillLookup = [1: Skill(id: 1, name: "S", description: "", type: 141, maxLevel: 1, initialCooldown: 0, params: [15, 0b11, 0])]
    let card = makeCardWithActiveSkill(1) // reuse this file's existing card-builder helper
    let parsed = ActiveSkillEffects.generateOrbsParse(card, skills: skills)
    XCTAssertEqual(parsed.count, 1)
    XCTAssertEqual(parsed[0].count, 15)
    XCTAssertEqual(parsed[0].to, 0b11)
}

func testGenerateOrbsParseType208ProducesTwoEntries() {
    let skills: SkillLookup = [1: Skill(id: 1, name: "S", description: "", type: 208, maxLevel: 1, initialCooldown: 0, params: [5, 0b1, 0, 10, 0b10, 0])]
    let card = makeCardWithActiveSkill(1)
    let parsed = ActiveSkillEffects.generateOrbsParse(card, skills: skills)
    XCTAssertEqual(parsed.count, 2)
    XCTAssertEqual(parsed[0].count, 5)
    XCTAssertEqual(parsed[0].to, 0b1)
    XCTAssertEqual(parsed[1].count, 10)
    XCTAssertEqual(parsed[1].to, 0b10)
}

func testShapeThisRowOkRequiresContainmentAndNoNeighbours() {
    XCTAssertTrue(ActiveSkillEffects.shapeThisRowOk(0b111, 0b111))
    XCTAssertFalse(ActiveSkillEffects.shapeThisRowOk(0b1111, 0b111)) // has a neighbour bit set
    XCTAssertTrue(ActiveSkillEffects.shapeThisRowOk(0, 0)) // lineNumber <= 0 always ok
}

func testShapeUpsideDownRowOkTreatsZeroAsNoConflict() {
    XCTAssertTrue(ActiveSkillEffects.shapeUpsideDownRowOk(0, 0b111))
    XCTAssertFalse(ActiveSkillEffects.shapeUpsideDownRowOk(0b111, 0b111))
}

func testShapeIsCrossDetectsCenteredCross() {
    // Row layout (5 rows, only rows 1-3 matter for the center scan):
    // row1: 0b010, row2: 0b111, row3: 0b010 — classic plus shape at columns 1-3
    let sk = [0, 0b010, 0b111, 0b010, 0]
    XCTAssertTrue(ActiveSkillEffects.shapeIsCross(sk))
}

func testShapeIsCrossRejectsPlainBlock() {
    let sk = [0, 0b110, 0b110, 0, 0]
    XCTAssertFalse(ActiveSkillEffects.shapeIsCross(sk))
}

func testShapeIsLShapeDetectsLShape() {
    // row0: 0b001, row1: 0b001, row2: 0b111 — L rotated
    let sk = [0b001, 0b001, 0b111, 0, 0]
    XCTAssertTrue(ActiveSkillEffects.shapeIsLShape(sk))
}

func testShapeIsLShapeRejectsStraightLine() {
    let sk = [0, 0, 0b111, 0, 0]
    XCTAssertFalse(ActiveSkillEffects.shapeIsLShape(sk))
}
```

If `ActiveSkillEffectsTests.swift` has no `makeCardWithActiveSkill` helper, check
`SpecialSearchTreeTests.swift` for one and either import-share the pattern or add a local
private helper matching the `Card(...)` memberwise initializer used elsewhere in the test
target (see `SpecialSearchTreeTests.swift`'s `makeCard` for the full field list).

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/ActiveSkillEffectsTests 2>&1 | tail -60`
Expected: FAIL — new functions not found in scope.

- [ ] **Step 7: Implement the parsers in `ActiveSkillEffects.swift`**

Append inside the `enum ActiveSkillEffects { ... }` body (after the existing
`hasSkillLoopLessThan4` function, before the closing brace):

```swift
    static func boardChangeColorTypes(_ skill: Skill?) -> [Int] {
        guard let skill else { return [] }
        let sk = skill.params
        if let sentinelIndex = sk.firstIndex(of: -1) {
            return Array(sk[0..<sentinelIndex])
        }
        return sk
    }

    static func orbsChangeParse(_ skill: Skill) -> [(from: [Int], to: [Int])] {
        let sk = skill.params
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        switch skill.type {
        case 9:
            return [(from: [at(0)], to: [at(1)])]
        case 20:
            if sk.count >= 3 && at(1) == at(3) {
                return [(from: [at(0), at(2)], to: [at(1)])]
            } else {
                return [(from: [at(0)], to: [at(1)]), (from: [at(2)], to: [at(3)])]
            }
        case 154:
            let from = at(0) != 0 ? at(0) : 1
            let to = at(1) != 0 ? at(1) : 1
            return [(from: Bin.unflags(from), to: Bin.unflags(to))]
        default:
            return []
        }
    }

    static func generateOrbsParse(_ card: Card, skills: SkillLookup) -> [(count: Int, to: Int, exclude: Int)] {
        var out: [(count: Int, to: Int, exclude: Int)] = []
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [141, 208], skills: skills, searchRandom: false)
        for skill in matched {
            let sk = skill.params
            func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
            if skill.type == 141 {
                out.append((count: at(0), to: at(1) != 0 ? at(1) : 1, exclude: at(2)))
            } else {
                out.append((count: at(0), to: at(1) != 0 ? at(1) : 1, exclude: at(2)))
                out.append((count: at(3), to: at(4) != 0 ? at(4) : 1, exclude: at(5)))
            }
        }
        return out
    }

    static func shapeThisRowOk(_ line: Int, _ lineNumber: Int) -> Bool {
        if lineNumber <= 0 { return true }
        return line >= 0 && (line & lineNumber) == lineNumber && (line & lineNumber.notNeighbour()) == 0
    }

    static func shapeUpsideDownRowOk(_ line: Int, _ lineNumber: Int) -> Bool {
        if lineNumber <= 0 { return true }
        return line > 0 ? (line & lineNumber) == 0 : true
    }

    private static func shapeLineCandidates() -> [Int] {
        var arr: [Int] = []
        var lineNum = 0b111
        while lineNum < 0b1000000 { arr.append(lineNum); lineNum <<= 1 }
        return arr
    }

    static func shapeIsCross(_ sk: [Int]) -> Bool {
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        let lineNumArr = shapeLineCandidates()
        for ri in 1..<4 {
            let candidates = lineNumArr.filter { shapeThisRowOk(at(ri), $0) }
            if candidates.isEmpty { continue }
            let filtered = candidates.filter { ln in
                let ln2 = (ln << 1) & (ln >> 1)
                return shapeThisRowOk(at(ri - 1), ln2)
                    && shapeThisRowOk(at(ri + 1), ln2)
                    && shapeUpsideDownRowOk(at(ri - 2), ln2)
                    && shapeUpsideDownRowOk(at(ri + 2), ln2)
            }
            if !filtered.isEmpty { return true }
        }
        return false
    }

    static func shapeIsLShape(_ sk: [Int]) -> Bool {
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        let lineNumArr = shapeLineCandidates()
        for ri in 0..<5 {
            let candidates = lineNumArr.filter { shapeThisRowOk(at(ri), $0) }
            if candidates.isEmpty { continue }
            let filtered = candidates.filter { ln in
                let ln2 = ln & ~(ln >> 1)
                let ln3 = ln & ~(ln << 1)
                let up = shapeUpsideDownRowOk(at(ri + 1), ln) && (
                    (shapeThisRowOk(at(ri - 1), ln2) && shapeThisRowOk(at(ri - 2), ln2) && shapeUpsideDownRowOk(at(ri - 3), ln2))
                    || (shapeThisRowOk(at(ri - 1), ln3) && shapeThisRowOk(at(ri - 2), ln3) && shapeUpsideDownRowOk(at(ri - 3), ln3))
                )
                let down = shapeUpsideDownRowOk(at(ri - 1), ln) && (
                    (shapeThisRowOk(at(ri + 1), ln2) && shapeThisRowOk(at(ri + 2), ln2) && shapeUpsideDownRowOk(at(ri + 3), ln2))
                    || (shapeThisRowOk(at(ri + 1), ln3) && shapeThisRowOk(at(ri + 2), ln3) && shapeUpsideDownRowOk(at(ri + 3), ln3))
                )
                return up || down
            }
            if !filtered.isEmpty { return true }
        }
        return false
    }
```

`at(_:)` here treats a negative or out-of-range index as `0` — verified behaviorally
identical to the JS `undefined` reads for both `shapeThisRowOk` and `shapeUpsideDownRowOk`
(see design spec's "New primitives needed" section for the argument).

- [ ] **Step 8: Run tests to verify they pass**

Run: same command as Step 6.
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/Bin.swift ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift ios/PADDictionary/PADDictionaryTests/BinTests.swift ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift
git commit -m "Add Bin.unflags, notNeighbour, and orb/shape parsers for SP4 Phase 3c"
```

---

### Task 2: Orbs Drop leaves (16)

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.matches`/`.resolve` (existing), `Bin.unflags` (Task 1).
- Produces: `private let activeOrbsDropLeaves: [SpecialSearchLeaf]`, appended into
  `SpecialSearchTree.leaves` in Task 7.

- [ ] **Step 1: Write failing tests**

Append to `SpecialSearchTreeTests.swift`:

```swift
func testOrbsDropLeaves() {
    let skills: SkillLookup = [
        1: Skill(id: 1, name: "S", description: "", type: 180, maxLevel: 1, initialCooldown: 0, params: []),
        2: Skill(id: 2, name: "S", description: "", type: 205, maxLevel: 1, initialCooldown: 0, params: [0b11_1111]),
        3: Skill(id: 3, name: "S", description: "", type: 205, maxLevel: 1, initialCooldown: 0, params: [0b1]),
        4: Skill(id: 4, name: "S", description: "", type: 126, maxLevel: 1, initialCooldown: 0, params: [0b1, 99, 0, 100]),
        5: Skill(id: 5, name: "S", description: "", type: 126, maxLevel: 1, initialCooldown: 0, params: [0b10, 1, 0, 50]),
        6: Skill(id: 6, name: "S", description: "", type: 226, maxLevel: 1, initialCooldown: 0, params: []),
        7: Skill(id: 7, name: "S", description: "", type: 243, maxLevel: 1, initialCooldown: 0, params: []),
        8: Skill(id: 8, name: "S", description: "", type: 253, maxLevel: 1, initialCooldown: 0, params: []),
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop Enhanced Orbs").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop locked orbs(any color)").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop locked orbs(≥6 color)").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Drop > Drop locked orbs(≥6 color)").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate increases").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Fire").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Fire").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Water").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - 99 turns").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - 99 turns").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - 100% rate").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Drop > Drop rate increases > Drop rate - 100% rate").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop Nail Orbs").matches(makeCardWithActiveSkill(6), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Drop Thorn Orbs").matches(makeCardWithActiveSkill(7), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Drop > Prediction of falling").matches(makeCardWithActiveSkill(8), ctx))
}
```

(`makeCardWithActiveSkill` should already exist in this file from prior phases — if named
differently, use whatever helper builds a `Card` with a given `activeSkillId`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testOrbsDropLeaves 2>&1 | tail -40`
Expected: FAIL — leaf not found (`leaf(...)` force-unwraps to nil).

- [ ] **Step 3: Add `activeOrbsDropLeaves` to `SpecialSearchTree.swift`**

Insert this new private array right after `activeOtherLeaves` (before the
`enum SpecialSearchTree { ... }` block):

```swift
private let activeOrbsDropLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Enhanced Orbs", label: "Drop Enhanced Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [180], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop locked orbs(any color)", label: "Drop locked orbs(any color)", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [205], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop locked orbs(≥6 color)", label: "Drop locked orbs(≥6 color)", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [205], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return (p0 & 0b11_1111) == 0b11_1111
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate increases", label: "Drop rate increases", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Fire", label: "Drop rate - Attr. - Fire", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Water", label: "Drop rate - Attr. - Water", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b10 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Wood", label: "Drop rate - Attr. - Wood", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b100 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Light", label: "Drop rate - Attr. - Light", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Dark", label: "Drop rate - Attr. - Dark", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Heart", label: "Drop rate - Attr. - Heart", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b10_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Jammers/Poison", label: "Drop rate - Attr. - Jammers/Poison", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b11_1100_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - 99 turns", label: "Drop rate - 99 turns", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p1 = skill.params.indices.contains(1) ? skill.params[1] : 0
        return p1 >= 99
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - 100% rate", label: "Drop rate - 100% rate", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p3 = skill.params.indices.contains(3) ? skill.params[3] : 0
        return p3 == 100
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Nail Orbs", label: "Drop Nail Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [226], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Thorn Orbs", label: "Drop Thorn Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [243], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Prediction of falling", label: "Prediction of falling", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [253], skills: ctx.skillsJA, searchRandom: true)
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

In `SpecialSearchTreeTests.swift`, change all 4 occurrences of
`XCTAssertEqual(SpecialSearchTree.leaves.count, 165)` to `181` (165 + 16).

- [ ] **Step 5: Add `activeOrbsDropLeaves` to the tree composition**

In `SpecialSearchTree.swift`, change:
```swift
static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves + activeSkillConditionalLeaves + activeOtherLeaves
```
to:
```swift
static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves + activeSkillConditionalLeaves + activeOtherLeaves + activeOrbsDropLeaves
```
(Tasks 3–7 each append one more `+ activeXxxLeaves` here — expect this line to be touched
again in every subsequent task.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`, all tests pass including `testOrbsDropLeaves` and the
updated count assertions.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Orbs Drop leaves (16 total)"
```

---

### Task 3: Change all Orbs on Board leaves (14)

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.matches`/`.resolve`, `ActiveSkillEffects.boardChangeColorTypes` (Task 1).
- Produces: `private let activeChangeBoardLeaves: [SpecialSearchLeaf]`.

- [ ] **Step 1: Write failing tests**

```swift
func testChangeAllOrbsOnBoardLeaves() {
    let skills: SkillLookup = [
        1: Skill(id: 1, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, -1]),
        2: Skill(id: 2, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, 1, 2, -1]),
        3: Skill(id: 3, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, 1, 2, 3, 4, 6]),
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Changes all Orbs to any").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Colors Count > To 1 color(Farm)").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Change all Orbs on Board > Colors Count > To 1 color(Farm)").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Colors Count > To 2 color").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Colors Count > To ≥6 color").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertFalse(leaf("Active Skill > Change all Orbs on Board > Colors Count > To ≥6 color").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Include Color > Include Fire").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Change all Orbs on Board > Include Color > Include Water").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Include Color > Include Water").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Change all Orbs on Board > Include Color > Include Jammers/Poison").matches(makeCardWithActiveSkill(3), ctx))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testChangeAllOrbsOnBoardLeaves 2>&1 | tail -40`
Expected: FAIL.

- [ ] **Step 3: Add `activeChangeBoardLeaves`**

Insert after `activeOrbsDropLeaves`:

```swift
private let activeChangeBoardLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Changes all Orbs to any", label: "Changes all Orbs to any", groupPath: ["Active Skill", "Change all Orbs on Board"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 1 color(Farm)", label: "To 1 color(Farm)", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 1
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 2 color", label: "To 2 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 2
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 3 color", label: "To 3 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 3
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 4 color", label: "To 4 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 4
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 5 color", label: "To 5 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 5
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To ≥6 color", label: "To ≥6 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count >= 6
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Fire", label: "Include Fire", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(0)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Water", label: "Include Water", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(1)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Wood", label: "Include Wood", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(2)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Light", label: "Include Light", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(3)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Dark", label: "Include Dark", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(4)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Heart", label: "Include Heart", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(5)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Jammers/Poison", label: "Include Jammers/Poison", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        let colors = ActiveSkillEffects.boardChangeColorTypes(skill)
        return colors.contains(6) || colors.contains(7) || colors.contains(8) || colors.contains(9)
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 181)` to `195` (181 + 14).

- [ ] **Step 5: Append `+ activeChangeBoardLeaves` to `SpecialSearchTree.leaves`**

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Change all Orbs on Board leaves (14 total)"
```

---

### Task 4: Orbs Color Change leaves (14)

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolveAll`, `ActiveSkillEffects.orbsChangeParse` (Task 1).
- Produces: `private let activeOrbsColorChangeLeaves: [SpecialSearchLeaf]`.

- [ ] **Step 1: Write failing tests**

```swift
func testOrbsColorChangeLeaves() {
    let skills: SkillLookup = [
        1: Skill(id: 1, name: "S", description: "", type: 9, maxLevel: 1, initialCooldown: 0, params: [1, 0]), // Water -> Fire
        2: Skill(id: 2, name: "S", description: "", type: 9, maxLevel: 1, initialCooldown: 0, params: [4, 5]), // Dark -> Heal
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Orbs Color Change > To Color > To Fire").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Color Change > To Color > To Water").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Color Change > From Color > From Water").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Color Change > To Color > To Heal").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Orbs Color Change > From Color > From Dark").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertFalse(leaf("Active Skill > Orbs Color Change > From Color > From Jammers/Poison").matches(makeCardWithActiveSkill(2), ctx))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testOrbsColorChangeLeaves 2>&1 | tail -40`
Expected: FAIL.

- [ ] **Step 3: Add `activeOrbsColorChangeLeaves`**

Insert after `activeChangeBoardLeaves`. Note the web's own `From Jammers/Poison` leaf has a
copy-paste bug (`skill.type != 9,20,154` param check mixes `.from`/`.to` — line reads
`p.from.includes(6) || p.to.includes(7) || p.to.includes(8) || p.to.includes(9)`, NOT all
`.from`). Port it EXACTLY as written in the web, bug included — this mirrors the session's
established practice of preserving on-purpose (well, accidental-but-live) web quirks
rather than "fixing" them silently:

```swift
private let activeOrbsColorChangeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Fire", label: "To Fire", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(0) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Water", label: "To Water", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(1) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Wood", label: "To Wood", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(2) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Light", label: "To Light", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(3) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Dark", label: "To Dark", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(4) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Heal", label: "To Heal", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(5) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Jammers/Poison", label: "To Jammers/Poison", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(6) || $0.to.contains(7) || $0.to.contains(8) || $0.to.contains(9) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Fire", label: "From Fire", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(0) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Water", label: "From Water", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(1) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Wood", label: "From Wood", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(2) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Light", label: "From Light", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(3) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Dark", label: "From Dark", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(4) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Heart", label: "From Heart", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(5) }
    },
    // Web bug ported verbatim: this leaf checks `.from.includes(6)` but `.to.includes(7/8/9)` — NOT a typo we fix.
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Jammers/Poison", label: "From Jammers/Poison", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(6) || $0.to.contains(7) || $0.to.contains(8) || $0.to.contains(9) }
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 195)` to `209` (195 + 14).

- [ ] **Step 5: Append `+ activeOrbsColorChangeLeaves` to `SpecialSearchTree.leaves`**

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Orbs Color Change leaves (14 total)"
```

---

### Task 5: Random Create Orbs leaves (10)

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolve`, `Bin.unflags`, `ActiveSkillEffects.generateOrbsParse` (Task 1).
- Produces: `private let activeRandomCreateOrbsLeaves: [SpecialSearchLeaf]`.

- [ ] **Step 1: Write failing tests**

```swift
func testRandomCreateOrbsLeaves() {
    let skills: SkillLookup = [
        1: Skill(id: 1, name: "S", description: "", type: 141, maxLevel: 1, initialCooldown: 0, params: [15, 0b11, 0]),
        2: Skill(id: 2, name: "S", description: "", type: 141, maxLevel: 1, initialCooldown: 0, params: [10, 0b111, 0]),
        3: Skill(id: 3, name: "S", description: "", type: 141, maxLevel: 1, initialCooldown: 0, params: [5, 0b1, 0]),
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Random Create Orbs > Create 15×2 color Orbs").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Random Create Orbs > Create 15×2 color Orbs").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Random Create Orbs > Create 30 Orbs").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Random Create Orbs > Orb Color > Fire Orbs").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertFalse(leaf("Active Skill > Random Create Orbs > Orb Color > Water Orbs").matches(makeCardWithActiveSkill(3), ctx))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testRandomCreateOrbsLeaves 2>&1 | tail -40`
Expected: FAIL.

- [ ] **Step 3: Add `activeRandomCreateOrbsLeaves`**

Insert after `activeOrbsColorChangeLeaves`:

```swift
private let activeRandomCreateOrbsLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Create 15×2 color Orbs", label: "Create 15×2 color Orbs", groupPath: ["Active Skill", "Random Create Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [141], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        let p0 = sk.indices.contains(0) ? sk[0] : 0
        let p1 = sk.indices.contains(1) ? sk[1] : 0
        return Bin.unflags(p1).count == 2 && p0 == 15
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Create 30 Orbs", label: "Create 30 Orbs", groupPath: ["Active Skill", "Random Create Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [141], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        let p0 = sk.indices.contains(0) ? sk[0] : 0
        let p1 = sk.indices.contains(1) ? sk[1] : 0
        return Bin.unflags(p1).count * p0 == 30
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > 6 color Orbs", label: "6 color Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { ($0.to & 0b11_1111) == 0b11_1111 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Fire Orbs", label: "Fire Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b1 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Water Orbs", label: "Water Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b10 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Wood Orbs", label: "Wood Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b100 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Light Orbs", label: "Light Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b1000 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Dark Orbs", label: "Dark Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b1_0000 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Heart Orbs", label: "Heart Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b10_0000 != 0 }
    },
    SpecialSearchLeaf(id: "Active Skill > Random Create Orbs > Orb Color > Jammers/Poison Orbs", label: "Jammers/Poison Orbs", groupPath: ["Active Skill", "Random Create Orbs", "Orb Color"]) { card, ctx in
        ActiveSkillEffects.generateOrbsParse(card, skills: ctx.skillsJA).contains { $0.to & 0b11_1100_0000 != 0 }
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 209)` to `219` (209 + 10).

- [ ] **Step 5: Append `+ activeRandomCreateOrbsLeaves` to `SpecialSearchTree.leaves`**

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Random Create Orbs leaves (10 total)"
```

---

### Task 6: Create Fixed Position Orbs leaves (12) — shape matching

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolve`/`.resolveAll`, `ActiveSkillEffects.shapeThisRowOk`/
  `.shapeUpsideDownRowOk`/`.shapeIsCross`/`.shapeIsLShape`/`.boardChangeColorTypes` (Task 1).
- Produces: `private let activeCreateFixedPositionOrbsLeaves: [SpecialSearchLeaf]`.

This is the most complex task in the phase — all 12 leaves key off skill type 176 (or
128/71/176 for the last one), with 6 of them doing real geometry on the 5-row bitmask
layout. Take extra care matching indices exactly against the plan code below; there is no
shortcut here, it must be transcribed precisely.

- [ ] **Step 1: Write failing tests**

```swift
func testCreateFixedPositionOrbsLeaves() {
    let skills: SkillLookup = [
        // Outer edges: row0 full 6-bit line, rows1-3 have only the two end bits (0b100001), row4 full line
        1: Skill(id: 1, name: "S", description: "", type: 176, maxLevel: 1, initialCooldown: 0, params: [0b111111, 0b100001, 0b100001, 0b100001, 0b111111, 0]),
        // 3x3 block at rows 0-2, columns 0-2 (0b111), rows 3-4 empty
        2: Skill(id: 2, name: "S", description: "", type: 176, maxLevel: 1, initialCooldown: 0, params: [0b111, 0b111, 0b111, 0, 0, 0]),
        // Cross centered at rows 1-3
        3: Skill(id: 3, name: "S", description: "", type: 176, maxLevel: 1, initialCooldown: 0, params: [0, 0b010, 0b111, 0b010, 0, 0]),
        // Vertical column with heart bit (bit 5) at odd index 1
        4: Skill(id: 4, name: "S", description: "", type: 127, maxLevel: 1, initialCooldown: 0, params: [0, 0b10_0000]),
        // Two horizontals via a 3-param skill (params.count == 3, triggers >=2 horizontals via length check)
        5: Skill(id: 5, name: "S", description: "", type: 128, maxLevel: 1, initialCooldown: 0, params: [0b1, 0, 0]),
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create designated shape").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create outer edges").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Create Fixed Position Orbs > Create outer edges").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create 3×3 block").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create cross").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertFalse(leaf("Active Skill > Create Fixed Position Orbs > Create cross").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create verticals").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create vertical Heart").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create horizontals").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Create Fixed Position Orbs > Create ≥2 horizontals").matches(makeCardWithActiveSkill(5), ctx))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testCreateFixedPositionOrbsLeaves 2>&1 | tail -40`
Expected: FAIL.

- [ ] **Step 3: Add `activeCreateFixedPositionOrbsLeaves`**

Insert after `activeRandomCreateOrbsLeaves`:

```swift
private let activeCreateFixedPositionOrbsLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create designated shape", label: "Create designated shape", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [176], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create outer edges", label: "Create outer edges", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [176], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        let baseLineNum1 = 0b111111
        let baseLineNum2 = 0b100001
        return ActiveSkillEffects.shapeThisRowOk(at(0), baseLineNum1)
            && ActiveSkillEffects.shapeThisRowOk(at(1), baseLineNum2)
            && ActiveSkillEffects.shapeThisRowOk(at(2), baseLineNum2)
            && ActiveSkillEffects.shapeThisRowOk(at(3), baseLineNum2)
            && ActiveSkillEffects.shapeThisRowOk(at(4), baseLineNum1)
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create 3×3 block", label: "Create 3×3 block", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [176], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = Array(skill.params.prefix(5))
        func at(_ i: Int) -> Int { (0..<sk.count).contains(i) ? sk[i] : 0 }
        var lineNumArr: [Int] = []
        var lineNum = 0b111
        while lineNum < 0b1000000 { lineNumArr.append(lineNum); lineNum <<= 1 }
        for ri in 0..<3 {
            let candidates = lineNumArr.filter { ActiveSkillEffects.shapeThisRowOk(at(ri), $0) }
            if candidates.isEmpty { continue }
            let filtered = candidates.filter { ln in
                ActiveSkillEffects.shapeUpsideDownRowOk(at(ri - 1), ln)
                    && ActiveSkillEffects.shapeUpsideDownRowOk(at(ri + 3), ln)
                    && ActiveSkillEffects.shapeThisRowOk(at(ri + 1), ln)
                    && ActiveSkillEffects.shapeThisRowOk(at(ri + 2), ln)
            }
            if !filtered.isEmpty { return true }
        }
        return false
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create cross", label: "Create cross", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [176], skills: ctx.skillsJA, searchRandom: false)
            .contains { ActiveSkillEffects.shapeIsCross(Array($0.params.prefix(5))) }
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create L shape", label: "Create L shape", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [176], skills: ctx.skillsJA, searchRandom: false)
            .contains { ActiveSkillEffects.shapeIsLShape(Array($0.params.prefix(5))) }
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create verticals", label: "Create verticals", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [127], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create vertical Heart", label: "Create vertical Heart", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [127], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        var i = 1
        while i < sk.count {
            if sk[i] & 32 != 0 { return true }
            i += 2
        }
        return false
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create horizontals", label: "Create horizontals", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [128], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create ≥2 horizontals", label: "Create ≥2 horizontals", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [128], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        let p0 = sk.indices.contains(0) ? sk[0] : 0
        return sk.count >= 3 || Bin.unflags(p0).count >= 2
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create 2 color horizontals", label: "Create 2 color horizontals", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [128], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        guard sk.indices.contains(3) else { return false }
        let p1 = sk.indices.contains(1) ? sk[1] : 0
        return sk[3] >= 0 && (p1 & sk[3]) != p1
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Create horizontal not Top or Bottom", label: "Create horizontal not Top or Bottom", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [128], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let sk = skill.params
        let p0 = sk.indices.contains(0) ? sk[0] : 0
        let p2 = sk.indices.contains(2) ? sk[2] : 0
        return (p0 | p2) & 0b1110 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Create Fixed Position Orbs > Extensive horizontal(Farm and outer edges)", label: "Extensive horizontal(Farm and outer edges)", groupPath: ["Active Skill", "Create Fixed Position Orbs"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [128, 71, 176], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 128: return true
        case 71: return ActiveSkillEffects.boardChangeColorTypes(skill).count == 1
        case 176: return skill.params.contains { ($0 & 0b11_1111) == 0b11_1111 }
        default: return false
        }
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 219)` to `231` (219 + 12).

- [ ] **Step 5: Append `+ activeCreateFixedPositionOrbsLeaves` to `SpecialSearchTree.leaves`**

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`. If the shape tests fail, do NOT adjust `shapeIsCross`/
`shapeIsLShape` — re-check the test fixture's bit layout against the JS reference in the
design spec/Task 1 first; these functions were unit-tested directly in Task 1 and are
almost certainly correct if Task 1 passed.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Create Fixed Position Orbs leaves (12 total)"
```

---

### Task 7: Damage Enemy leaves — Gravity, Fixed damage, Numerical damage (18)

**Files:**
- Modify: `PADDictionary/Models/SpecialSearchTree.swift`
- Test: `PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolve`/`.matches`.
- Produces: `private let activeDamageEnemyLeaves: [SpecialSearchLeaf]`.

- [ ] **Step 1: Write failing tests**

```swift
func testDamageEnemyLeaves() {
    let skills: SkillLookup = [
        1: Skill(id: 1, name: "S", description: "", type: 6, maxLevel: 1, initialCooldown: 0, params: []),
        2: Skill(id: 2, name: "S", description: "", type: 161, maxLevel: 1, initialCooldown: 0, params: []),
        3: Skill(id: 3, name: "S", description: "", type: 55, maxLevel: 1, initialCooldown: 0, params: [100]),
        4: Skill(id: 4, name: "S", description: "", type: 56, maxLevel: 1, initialCooldown: 0, params: [100]),
        5: Skill(id: 5, name: "S", description: "", type: 110, maxLevel: 1, initialCooldown: 0, params: [1]),
        6: Skill(id: 6, name: "S", description: "", type: 110, maxLevel: 1, initialCooldown: 0, params: [0]),
        7: Skill(id: 7, name: "S", description: "", type: 144, maxLevel: 1, initialCooldown: 0, params: [0, 0, 1]),
        8: Skill(id: 8, name: "S", description: "", type: 42, maxLevel: 1, initialCooldown: 0, params: []),
    ]
    let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Gravity > Any").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Gravity > Current HP").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertFalse(leaf("Active Skill > Damage Enemy - Gravity > Max HP").matches(makeCardWithActiveSkill(1), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Gravity > Max HP").matches(makeCardWithActiveSkill(2), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Fixed damage > Single").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertFalse(leaf("Active Skill > Damage Enemy - Fixed damage > Mass").matches(makeCardWithActiveSkill(3), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Fixed damage > Mass").matches(makeCardWithActiveSkill(4), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Target > Target - Single").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertFalse(leaf("Active Skill > Damage Enemy - Numerical damage > Target > Target - Mass").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Target > Target - Mass").matches(makeCardWithActiveSkill(6), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Target > Target - Single").matches(makeCardWithActiveSkill(7), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Target > Target - Designate Attr").matches(makeCardWithActiveSkill(8), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Damage > Damage - By remaining HP").matches(makeCardWithActiveSkill(5), ctx))
    XCTAssertTrue(leaf("Active Skill > Damage Enemy - Numerical damage > Damage > Damage - Team attrs ATK").matches(makeCardWithActiveSkill(7), ctx))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests/testDamageEnemyLeaves 2>&1 | tail -40`
Expected: FAIL.

- [ ] **Step 3: Add `activeDamageEnemyLeaves`**

Insert after `activeCreateFixedPositionOrbsLeaves`:

```swift
private let activeDamageEnemyLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Gravity > Any", label: "Any", groupPath: ["Active Skill", "Damage Enemy - Gravity"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [6, 161, 261], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Gravity > Current HP", label: "Current HP", groupPath: ["Active Skill", "Damage Enemy - Gravity"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [6, 261], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Gravity > Max HP", label: "Max HP", groupPath: ["Active Skill", "Damage Enemy - Gravity"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [161], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Gravity > Breaking Shield", label: "Breaking Shield", groupPath: ["Active Skill", "Damage Enemy - Gravity"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [259, 272], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Gravity > Park Breaking", label: "Park Breaking", groupPath: ["Active Skill", "Damage Enemy - Gravity"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [276], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Fixed damage > Any", label: "Any", groupPath: ["Active Skill", "Damage Enemy - Fixed damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [55, 188, 56], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Fixed damage > Single", label: "Single", groupPath: ["Active Skill", "Damage Enemy - Fixed damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [55, 188], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Fixed damage > Mass", label: "Mass", groupPath: ["Active Skill", "Damage Enemy - Fixed damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [56], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Target > Target - Single", label: "Target - Single", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Target"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [2, 35, 37, 59, 84, 86, 110, 115, 144], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 110: return (skill.params.first ?? 0) != 0
        case 144: return (skill.params.indices.contains(2) ? skill.params[2] : 0) != 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Target > Target - Mass", label: "Target - Mass", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Target"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [0, 1, 58, 85, 87, 110, 143, 144], skills: ctx.skillsJA, searchRandom: true), skill.id != 0 else { return false }
        switch skill.type {
        case 110: return (skill.params.first ?? 0) == 0
        case 144: return (skill.params.indices.contains(2) ? skill.params[2] : 0) == 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Target > Target - Designate Attr", label: "Target - Designate Attr", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Target"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [42], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Attribute > Actors self attr.", label: "Actors self attr.", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Attribute"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [2, 35], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Damage - Rate by Actors self ATK", label: "Damage - Rate by Actors self ATK", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [0, 2, 35, 37, 58, 59, 84, 85, 115], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return skill.id != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Damage - Fixed Attr Number", label: "Damage - Fixed Attr Number", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [1, 42, 86, 87], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Damage - By remaining HP", label: "Damage - By remaining HP", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [110], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Damage - Team total HP", label: "Damage - Team total HP", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [143], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Damage - Team attrs ATK", label: "Damage - Team attrs ATK", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [144], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Damage Enemy - Numerical damage > Damage > Numerical ATK - Special - Vampire", label: "Numerical ATK - Special - Vampire", groupPath: ["Active Skill", "Damage Enemy - Numerical damage", "Damage"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [35, 115], skills: ctx.skillsJA, searchRandom: true)
    },
]
```

- [ ] **Step 4: Update the 4 leaf-count assertions**

Change all 4 `XCTAssertEqual(SpecialSearchTree.leaves.count, 231)` to `249` (231 + 18).

- [ ] **Step 5: Append `+ activeDamageEnemyLeaves` to `SpecialSearchTree.leaves`**

This is the final append — the composition line should now read:

```swift
static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves + activeSkillConditionalLeaves + activeOtherLeaves + activeOrbsDropLeaves + activeChangeBoardLeaves + activeOrbsColorChangeLeaves + activeRandomCreateOrbsLeaves + activeCreateFixedPositionOrbsLeaves + activeDamageEnemyLeaves
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`, total leaf count is 249.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Damage Enemy leaves — Phase 3c complete (249 total leaves)"
```

---

### Task 8: Full verify + screenshot

**Files:** None modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tee /tmp/test_full_p3c.log | tail -40`
Expected: `** TEST SUCCEEDED **`, 0 failures. Sanity-check the count:
`grep -c "' passed" /tmp/test_full_p3c.log`.

- [ ] **Step 2: Build for the specific Simulator device and verify no crash on launch**

```bash
xcrun simctl bootstatus A909C90E-EB7B-42E0-9840-CFF59F901A94 -b
xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'id=A909C90E-EB7B-42E0-9840-CFF59F901A94' -derivedDataPath /tmp/pad-build build
xcrun simctl terminate A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary || true
xcrun simctl install A909C90E-EB7B-42E0-9840-CFF59F901A94 /tmp/pad-build/Build/Products/Debug-iphonesimulator/PADDictionary.app
xcrun simctl launch A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary
xcrun simctl io A909C90E-EB7B-42E0-9840-CFF59F901A94 screenshot /tmp/pad-phase3c-browse.png
```

Expected: `** BUILD SUCCEEDED **`; the app launches without crashing (this matters because
`SpecialSearchTree.leaves` is a `static let` evaluated eagerly at first access — a broken
array literal or an out-of-bounds default in any of the 84 new leaves would crash on
Browse tab load, not silently no-op).

- [ ] **Step 3: Read the screenshot and confirm the Browse tab renders correctly**

Read `/tmp/pad-phase3c-browse.png` — confirm the search bar, toolbar buttons (sort/filter/
special-search), card grid with clean sprite thumbnails, and bottom tab bar are all
present, matching every prior phase's verification screenshot.

- [ ] **Step 4: No commit needed**

This task is verification-only — nothing to add to git if all checks pass. If anything
fails, return to the failing task above and fix root cause per
`superpowers:systematic-debugging` before re-running this task.
