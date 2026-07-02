# iOS Special-Search Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role:** implementation is done by dispatching to a Claude subagent running Opus 4.8, which has real Simulator access on this machine. It should run real `xcodebuild test`/`build` commands itself. Claude (Sonnet, the orchestrator) reviews and independently re-verifies visual/critical results.

**Goal:** Port the web's "Leader Skills" special-search group (47 of its 58 leaves — 11 are broken in the web reference itself, see Global Constraints) into `SpecialSearchTree.leaves`.

**Architecture:** `SkillChainMatcher` gains a `resolve()` that returns the matched `Skill` (not just a bool). `LeaderSkillScale` ports the web's `getHPScale`/`getReduceScale`/`getReduceScale_unconditional` skill-type switch statements verbatim. 47 new `SpecialSearchLeaf` entries are appended to the existing tree — no new UI code, `SpecialSearchView` already renders whatever's in the tree.

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file declaring an `ObservableObject`/`@Published` type must explicitly `import Combine`.
- No third-party dependencies.
- Every leaf's filter logic must match the exact JS source in `engine.js` quoted per-task below — this is a port. 11 web leaves are excluded because their JS reference is broken (calls undefined `card.leaderSkillTypes.*` or undefined `getSkillFixedDamage`/`getSkillAddCombo`) — there's nothing correct to port.
- `Reduce Shield > Reduce Damage - Exclude chance` is ported identically to the plain (no-`allAttr`/no-`noHPneed`) `reduceScale` call — the web's own 4th argument to `getReduceScale` is a no-op (the function only declares 2 parameters), not a real "exclude chance" behavior.
- UI must be genuinely usable — no changes needed this phase since `SpecialSearchView` already renders any leaves present in the tree, grouped by `groupPath`.

---

## Task 1: `SkillChainMatcher.resolve()`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift`

**Interfaces:**
- Produces: `static func resolve(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Skill?` — the existing `matches(...)` becomes `resolve(...) != nil` (same signature, same tested behavior). Consumed by Leader Skills leaves needing `skill.params[n]` (Task 3-4).

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift` (inside `final class SkillChainMatcherTests`):

```swift
    func testResolveReturnsTheActualMatchedSkill() {
        let skills: SkillLookup = [
            1: skill(1, type: 232, params: [2, 3]),
            2: skill(2, type: 5),
            3: skill(3, type: 236),
        ]
        let resolved = SkillChainMatcher.resolve(skillId: 1, types: [236], skills: skills)
        XCTAssertEqual(resolved?.id, 3)
    }

    func testResolveReturnsNilWhenNoMatch() {
        let skills: SkillLookup = [1: skill(1, type: 5)]
        XCTAssertNil(SkillChainMatcher.resolve(skillId: 1, types: [236], skills: skills))
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SkillChainMatcherTests
```

- [ ] **Step 3: Implement**

Replace the full contents of `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift` with:

```swift
import Foundation

enum SkillChainMatcher {
    private static let wrapperTypes: Set<Int> = [116, 118, 138, 232, 233, 248]

    static func matches(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Bool {
        resolve(skillId: skillId, types: types, skills: skills, searchRandom: searchRandom) != nil
    }

    static func resolve(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Skill? {
        guard let skill = skills[skillId] else { return nil }
        if types.contains(skill.type) { return skill }
        guard wrapperTypes.contains(skill.type) else { return nil }
        if skill.type == 118 && !searchRandom { return nil }
        let params = skill.type == 248 ? Array(skill.params.dropFirst()) : skill.params
        for id in params.reversed() {
            if let found = resolve(skillId: id, types: types, skills: skills, searchRandom: searchRandom) { return found }
        }
        return nil
    }
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 8 tests (6 pre-existing `matches` tests must stay green, unchanged — they now exercise `resolve` transitively).

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift
git commit -m "Add SkillChainMatcher.resolve() returning the matched Skill"
```

---

## Task 2: `LeaderSkillScale`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/LeaderSkillScale.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/LeaderSkillScaleTests.swift`

**Interfaces:**
- Consumes: `Skill`, `SkillLookup` (existing).
- Produces: `enum LeaderSkillScale { static func hpScale(_ skill: Skill, skills: SkillLookup) -> Double; static func reduceScale(_ skill: Skill, allAttr: Bool = false, noHPneed: Bool = false, skills: SkillLookup) -> Double; static func reduceScaleUnconditional(_ skill: Skill, skills: SkillLookup) -> Double }` and a private `Array.subscript(safe:)` helper — consumed by HP Scale / Reduce Shield leaves (Task 5).

This ports `getHPScale`, `getReduceScale`, `getReduceScale_unconditional` from `engine.js` verbatim (same switch cases, same param indices):

```js
function getHPScale(ls) {
  const sk = ls.params; let scale = 1;
  switch (ls.type) {
    case 23: case 30: case 62: case 77: case 63: case 65:
    case 29: case 114: case 45: case 111: case 46: case 48: case 67:
      scale = sk[sk.length-1]/100; break;
    case 73: case 76: case 121: case 129: case 163: case 177: case 186: case 155:
      scale = sk[2]/100; break;
    case 106: case 107: case 108: scale = sk[0]/100; break;
    case 125: scale = sk[5]/100; break;
    case 136: case 137: scale = (sk[1]/100 || 1) * (sk[5]/100 || 1); break;
    case 158: scale = sk[4]/100; break;
    case 175: case 178: case 185: scale = sk[3]/100; break;
    case 203: case 217: scale = sk[1]/100; break;
    case 245: scale = sk[3]/100; break;
    case 138: scale = sk.reduce((pmul,skid)=>pmul * getHPScale(Skills[skid]),1); break;
    default:
  }
  return scale || 1;
}

function getReduceScale(ls, allAttr = false, noHPneed = false) {
  const sk = ls.params; let scale = 0;
  switch (ls.type) {
    case 16: scale = sk[0]/100; break;
    case 17: scale = allAttr ? 0 : sk[1]/100; break;
    case 36: scale = allAttr ? 0 : sk[2]/100; break;
    case 38: case 43: scale = (noHPneed || allAttr) ? 0 : sk[2]/100; break;
    case 129: case 163: scale = (allAttr && (sk[5] & 31) != 31) ? 0 : sk[6]/100; break;
    case 178: scale = (allAttr && (sk[6] & 31) != 31) ? 0 : sk[7]/100; break;
    case 130: case 131: scale = (noHPneed || allAttr && (sk[5] & 31) != 31) ? 0 : sk[6]/100; break;
    case 151: case 169: case 198: case 271: scale = sk[2]/100; break;
    case 170: case 182: case 193: scale = sk[3]/100; break;
    case 171: scale = sk[6]/100; break;
    case 183: scale = noHPneed ? 0 : sk[4]/100; break;
    case 210: scale = sk[1]/100; break;
    case 235: scale = (sk[4] || 0) / 100; break;
    case 138: scale = sk.reduce((pmul,skid)=> 1 - (1-pmul) * (1-getReduceScale(Skills[skid], allAttr, noHPneed)),0); break;
    default:
  }
  return scale || 0;
}

function getReduceScale_unconditional(ls) {
  const sk = ls.params; let scale = 0;
  switch (ls.type) {
    case 16: scale = sk[0]/100; break;
    case 129: case 163: scale = (sk[5] & 31) != 31 ? 0 : sk[6]/100; break;
    case 178: scale = (sk[6] & 31) != 31 ? 0 : sk[7]/100; break;
    case 138: scale = sk.reduce((pmul,skid)=> 1 - (1-pmul) * (1-getReduceScale_unconditional(Skills[skid])),0); break;
    default:
  }
  return scale || 0;
}
```

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/LeaderSkillScaleTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class LeaderSkillScaleTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int]) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    func testHPScaleLastParamCase() {
        let s = skill(1, type: 23, params: [1, 2, 300])
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 3.0, accuracy: 0.0001)
    }

    func testHPScaleDefaultsToOneForUnknownType() {
        let s = skill(1, type: 999, params: [])
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 1.0, accuracy: 0.0001)
    }

    func testHPScaleType136MultipliesTwoFactorsWithZeroFallback() {
        let s = skill(1, type: 136, params: [0, 0, 0, 0, 0, 200])
        // sk[1] is 0 -> falls back to 1; sk[5] is 200 -> 2.0
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 2.0, accuracy: 0.0001)
    }

    func testHPScaleType138RecursesThroughOtherLeaderSkill() {
        let inner = skill(2, type: 23, params: [0, 0, 400])
        let wrapper = skill(1, type: 138, params: [2])
        XCTAssertEqual(LeaderSkillScale.hpScale(wrapper, skills: [2: inner]), 4.0, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalShieldType16() {
        let s = skill(1, type: 16, params: [50])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, skills: [:]), 0.5, accuracy: 0.0001)
    }

    func testReduceScaleAllAttrZeroesOutSingleAttrShield() {
        let s = skill(1, type: 17, params: [0, 75])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, allAttr: true, skills: [:]), 0, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, allAttr: false, skills: [:]), 0.75, accuracy: 0.0001)
    }

    func testReduceScaleNoHPneedZeroesOutHPConditionalShield() {
        let s = skill(1, type: 38, params: [0, 0, 60])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, noHPneed: true, skills: [:]), 0, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, noHPneed: false, skills: [:]), 0.6, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalIgnoresConditionalShieldTypes() {
        // type 38 is a conditional shield handled by reduceScale but NOT by reduceScale_unconditional
        let s = skill(1, type: 38, params: [0, 0, 60])
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(s, skills: [:]), 0, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalType129ChecksAllAttrBitmask() {
        let allAttrs = skill(1, type: 129, params: [0, 0, 0, 0, 0, 31, 80])
        let notAllAttrs = skill(2, type: 129, params: [0, 0, 0, 0, 0, 15, 80])
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(allAttrs, skills: [:]), 0.8, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(notAllAttrs, skills: [:]), 0, accuracy: 0.0001)
    }
}
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/LeaderSkillScaleTests
```

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/LeaderSkillScale.swift`:

```swift
import Foundation

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

enum LeaderSkillScale {
    static func hpScale(_ skill: Skill, skills: SkillLookup) -> Double {
        let sk = skill.params
        var scale = 1.0
        switch skill.type {
        case 23, 30, 62, 77, 63, 65, 29, 114, 45, 111, 46, 48, 67:
            scale = Double(sk.last ?? 100) / 100
        case 73, 76, 121, 129, 163, 177, 186, 155:
            scale = Double(sk[safe: 2] ?? 100) / 100
        case 106, 107, 108:
            scale = Double(sk[safe: 0] ?? 100) / 100
        case 125:
            scale = Double(sk[safe: 5] ?? 100) / 100
        case 136, 137:
            func factor(_ idx: Int) -> Double {
                let raw = sk[safe: idx] ?? 0
                return raw == 0 ? 1 : Double(raw) / 100
            }
            scale = factor(1) * factor(5)
        case 158:
            scale = Double(sk[safe: 4] ?? 100) / 100
        case 175, 178, 185:
            scale = Double(sk[safe: 3] ?? 100) / 100
        case 203, 217:
            scale = Double(sk[safe: 1] ?? 100) / 100
        case 245:
            scale = Double(sk[safe: 3] ?? 100) / 100
        case 138:
            scale = sk.reduce(1.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return partial * hpScale(inner, skills: skills)
            }
        default:
            break
        }
        return scale == 0 ? 1 : scale
    }

    static func reduceScale(_ skill: Skill, allAttr: Bool = false, noHPneed: Bool = false, skills: SkillLookup) -> Double {
        let sk = skill.params
        func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        var scale = 0.0
        switch skill.type {
        case 16:
            scale = Double(p(0)) / 100
        case 17:
            scale = allAttr ? 0 : Double(p(1)) / 100
        case 36:
            scale = allAttr ? 0 : Double(p(2)) / 100
        case 38, 43:
            scale = (noHPneed || allAttr) ? 0 : Double(p(2)) / 100
        case 129, 163:
            scale = (allAttr && (p(5) & 31) != 31) ? 0 : Double(p(6)) / 100
        case 178:
            scale = (allAttr && (p(6) & 31) != 31) ? 0 : Double(p(7)) / 100
        case 130, 131:
            scale = (noHPneed || (allAttr && (p(5) & 31) != 31)) ? 0 : Double(p(6)) / 100
        case 151, 169, 198, 271:
            scale = Double(p(2)) / 100
        case 170, 182, 193:
            scale = Double(p(3)) / 100
        case 171:
            scale = Double(p(6)) / 100
        case 183:
            scale = noHPneed ? 0 : Double(p(4)) / 100
        case 210:
            scale = Double(p(1)) / 100
        case 235:
            scale = Double(p(4)) / 100
        case 138:
            scale = sk.reduce(0.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return 1 - (1 - partial) * (1 - reduceScale(inner, allAttr: allAttr, noHPneed: noHPneed, skills: skills))
            }
        default:
            break
        }
        return scale
    }

    static func reduceScaleUnconditional(_ skill: Skill, skills: SkillLookup) -> Double {
        let sk = skill.params
        func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        var scale = 0.0
        switch skill.type {
        case 16:
            scale = Double(p(0)) / 100
        case 129, 163:
            scale = (p(5) & 31) != 31 ? 0 : Double(p(6)) / 100
        case 178:
            scale = (p(6) & 31) != 31 ? 0 : Double(p(7)) / 100
        case 138:
            scale = sk.reduce(0.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return 1 - (1 - partial) * (1 - reduceScaleUnconditional(inner, skills: skills))
            }
        default:
            break
        }
        return scale
    }
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 9 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/LeaderSkillScale.swift ios/PADDictionary/PADDictionaryTests/LeaderSkillScaleTests.swift
git commit -m "Add LeaderSkillScale porting getHPScale/getReduceScale/getReduceScale_unconditional"
```

---

## Task 3: Matching Style + Restriction/Bind leaves (16)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher` (Task 1).
- Produces: appends `leaderMatchingStyleLeaves` (7) + `leaderRestrictionLeaves` (9) to `SpecialSearchTree.leaves`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testFiveOrbsIncludingEnhancedMatching() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 150, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        var card = makeCard()
        card = Card(id: card.id, name: card.name, otLangName: nil, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: 10, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: card.orbSkinOrBgmId, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening)
        XCTAssertTrue(leaf("Leader Skills > Matching Style > 5 Orbs including enhanced Matching").matches(card, ctx))
    }

    func testStackingMultiplierOfMatchingRequiresNonDefaultParam() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 235, maxLevel: 1, initialCooldown: 0, params: [0, 0, 0, 150]),
            11: Skill(id: 11, name: "S", description: "", type: 235, maxLevel: 1, initialCooldown: 0, params: [0, 0, 0, 100]),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        let leafObj = leaf("Leader Skills > Matching Style > Stacking multiplier of Matching")
        XCTAssertTrue(leafObj.matches(makeCardWithLeaderSkill(10), ctx))
        XCTAssertFalse(leafObj.matches(makeCardWithLeaderSkill(11), ctx))
    }

    func testDesignateMemberId() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 125, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Designate member ID").matches(makeCardWithLeaderSkill(10), ctx))
    }

    func testMatchingStyleAndRestrictionLeafCounts() {
        let matching = SpecialSearchTree.leaves.filter { $0.groupPath == ["Leader Skills", "Matching Style"] }
        let restriction = SpecialSearchTree.leaves.filter { $0.groupPath == ["Leader Skills", "Restriction/Bind"] }
        XCTAssertEqual(matching.count, 7)
        XCTAssertEqual(restriction.count, 9)
    }
```

Also add this helper to the test class (constructs a card with a given `leaderSkillId`, reusing all other defaults):

```swift
    private func makeCardWithLeaderSkill(_ leaderSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests
```

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`, add these two new private arrays (alongside the existing ones):

```swift
private let leaderMatchingStyleLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > 5 Orbs including enhanced Matching", label: "5 Orbs including enhanced Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [150], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Cross(十) of Heal Orbs", label: "Cross(十) of Heal Orbs", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [151, 209], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacked Magnifications of Cross(十)", label: "Stacked Magnifications of Cross(十)", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [157], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Less remain on the board", label: "Less remain on the board", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [177], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(5) ? skill.params[5] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacking multiplier of Matching", label: "Stacking multiplier of Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [235], skills: ctx.skillsJA) else { return false }
        let param3 = skill.params.indices.contains(3) ? skill.params[3] : 0
        return param3 != 0 && param3 != 100
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Awakening active", label: "Awakening active", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [271], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacking multiplier of Awakening active", label: "Stacking multiplier of Awakening active", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [280], skills: ctx.skillsJA)
    },
]

private let leaderRestrictionLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > [7×6 board]", label: "[7×6 board]", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [162, 186], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > [No skyfall]", label: "[No skyfall]", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [163, 177], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Unable to less match", label: "Unable to less match", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [158], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate member ID", label: "Designate member ID", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [125], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate collab ID", label: "Designate collab ID", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [175], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate Evo type", label: "Designate Evo type", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [203], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Floating rate based on the number of attrs/types", label: "Floating rate based on the number of attrs/types", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [229], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Limit the total rarity of the team", label: "Limit the total rarity of the team", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [217], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Team's rarity required different", label: "Team's rarity required different", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [245], skills: ctx.skillsJA)
    },
]
```

And change the `SpecialSearchTree.leaves` composition line to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Leader Skills Matching Style and Restriction/Bind leaves (16 total)"
```

---

## Task 4: Extra Effects leaves (16)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher` (Task 1).
- Produces: appends `leaderExtraEffectsLeaves` (16) to `SpecialSearchTree.leaves`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testReduceDamageWhenRcvChecksParam2() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 198, maxLevel: 1, initialCooldown: 0, params: [0, 0, 50, 0])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Reduce damage when rcv").matches(makeCardWithLeaderSkill(10), ctx))
        XCTAssertFalse(leaf("Leader Skills > Extra Effects > Recover Awkn Skill bind when rcv").matches(makeCardWithLeaderSkill(10), ctx))
    }

    func testCounterattack() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 41, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Counterattack").matches(makeCardWithLeaderSkill(10), ctx))
    }

    func testExtraEffectsLeafCount() {
        let extra = SpecialSearchTree.leaves.filter { $0.groupPath.starts(with: ["Leader Skills", "Extra Effects"]) }
        XCTAssertEqual(extra.count, 16)
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests
```

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`, add:

```swift
private let leaderExtraEffectsLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Item Drop rate", label: "Increase Item Drop rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [53], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Coin rate", label: "Increase Coin rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [54], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Exp rate", label: "Increase Exp rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [148], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Plus Point rate", label: "Increase Plus Point rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [264], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Part Break drop rate", label: "Increase Part Break drop rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [265], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Move time changes", label: "Move time changes", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [15, 185], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Fixed move time", label: "Fixed move time", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [178], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Impart Awakenings", label: "Impart Awakenings", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [213], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Bonus attack when matching Orbs", label: "Bonus attack when matching Orbs", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [12], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Recovers HP when matching Orbs", label: "Recovers HP when matching Orbs", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [13], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Reduce damage when rcv", label: "Reduce damage when rcv", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [198], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Recover Awkn Skill bind when rcv", label: "Recover Awkn Skill bind when rcv", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [198], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(3) ? skill.params[3] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Counterattack", label: "Counterattack", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [41], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Voids Poison dmg", label: "Voids Poison dmg", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [197], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Resolve", label: "Resolve", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [14], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Prediction of falling (LS)", label: "Prediction of falling (LS)", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [254], skills: ctx.skillsJA)
    },
]
```

And change the `SpecialSearchTree.leaves` line to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Leader Skills Extra Effects leaves (16 total)"
```

---

## Task 5: HP Scale + Reduce Shield leaves (15)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `LeaderSkillScale` (Task 2).
- Produces: appends `leaderHPScaleLeaves` (6) + `leaderReduceShieldLeaves` (9) to `SpecialSearchTree.leaves` — this is the FINAL append; `SpecialSearchTree.leaves` reaches its full Phase 2 count of 90 (43 Phase 1 + 47 Phase 2).

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testHPScaleBucket() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 23, maxLevel: 1, initialCooldown: 0, params: [0, 0, 250])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > HP Scale > HP Scale [2, 3)").matches(makeCardWithLeaderSkill(10), ctx))
        XCTAssertFalse(leaf("Leader Skills > HP Scale > HP Scale [3, ∞)").matches(makeCardWithLeaderSkill(10), ctx))
    }

    func testReduceShieldBucket() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 16, maxLevel: 1, initialCooldown: 0, params: [80])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Reduce Shield > Reduce Damage [75%, 100%]").matches(makeCardWithLeaderSkill(10), ctx))
    }

    func testFinalLeafCounts() {
        let hpScale = SpecialSearchTree.leaves.filter { $0.groupPath == ["Leader Skills", "HP Scale"] }
        let reduceShield = SpecialSearchTree.leaves.filter { $0.groupPath == ["Leader Skills", "Reduce Shield"] }
        XCTAssertEqual(hpScale.count, 6)
        XCTAssertEqual(reduceShield.count, 9)
        XCTAssertEqual(SpecialSearchTree.leaves.count, 90)
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SpecialSearchTreeTests
```

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`, add:

```swift
private let leaderHPScaleLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [3, ∞)", label: "HP Scale [3, ∞)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) >= 3
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [2, 3)", label: "HP Scale [2, 3)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale >= 2 && scale < 3
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [1.5, 2)", label: "HP Scale [1.5, 2)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale >= 1.5 && scale < 2
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale (1, 1.5)", label: "HP Scale (1, 1.5)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale > 1 && scale < 1.5
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale == 1", label: "HP Scale == 1", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) == 1
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [0, 1)", label: "HP Scale [0, 1)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) < 1
    },
]

private let leaderReduceShieldLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [75%, 100%]", label: "Reduce Damage [75%, 100%]", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) >= 0.75
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [50%, 75%)", label: "Reduce Damage [50%, 75%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale >= 0.5 && scale < 0.75
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [25%, 50%)", label: "Reduce Damage [25%, 50%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale >= 0.25 && scale < 0.5
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage (0%, 25%)", label: "Reduce Damage (0%, 25%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale > 0 && scale < 0.25
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage == 0", label: "Reduce Damage == 0", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) == 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Must all Att.", label: "Reduce Damage - Must all Att.", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, allAttr: true, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Exclude HP-line", label: "Reduce Damage - Exclude HP-line", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, noHPneed: true, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Exclude chance", label: "Reduce Damage - Exclude chance", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        // Web's 4th argument to getReduceScale here is a no-op (function only declares 2 params) — ported as identical to the base call.
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Unconditional", label: "Reduce Damage - Unconditional", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScaleUnconditional(skill, skills: ctx.skillsJA) > 0
    },
]
```

And change the final `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests, including `testFinalLeafCounts` confirming exactly 90 total leaves.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Leader Skills HP Scale and Reduce Shield leaves — Phase 2 complete (90 total leaves)"
```

---

## Task 6: Full verify + screenshot

**Files:** none — this task is verification only.

- [ ] **Step 1: Run the full test suite for real**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target.

Report back the real test output. Do NOT do screenshot verification yourself — the orchestrator does that separately (build+install+launch+screenshot the Browse tab's special-search sheet to confirm the "Leader Skills" sections now appear alongside "Evo type"/"Awakenings"/"Others Search").

## Self-Review Notes

- **Spec coverage:** `resolve()` (Task 1), `LeaderSkillScale` (Task 2), Matching Style + Restriction/Bind (Task 3), Extra Effects (Task 4), HP Scale + Reduce Shield (Task 5) — every portable Leader Skills leaf has a task. The 11 broken web leaves are explicitly absent, documented in this plan's Global Constraints and the spec.
- **Type consistency:** `SkillChainMatcher.resolve`'s signature is fixed in Task 1 and reused identically in Tasks 3-4. `LeaderSkillScale`'s three function signatures are fixed in Task 2 and reused identically in Task 5. `SpecialSearchTree.leaves`'s composition line is edited incrementally and correctly at each task (Task 3 appends 2 arrays, Task 4 appends 1, Task 5 appends 2 — final line has all 8 arrays).
- **No placeholders:** every leaf has its literal ported filter closure, matching the quoted JS source in each task.
