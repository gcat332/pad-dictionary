# iOS Special-Search Phase 3b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role:** implementation is done by dispatching to a Claude subagent running Opus 4.8, which has real Simulator access on this machine. It should run real `xcodebuild test`/`build` commands itself. Claude (Sonnet, the orchestrator) reviews and independently re-verifies visual/critical results.

**Goal:** Port the second slice of the web's "Active Skill" special-search group — For player team, Orbs States Change, Board States Change, Skill use is conditional, Other (46 leaves) — into `SpecialSearchTree.leaves`.

**Architecture:** Almost all 46 leaves are built directly on the existing `SkillChainMatcher.matches`/`resolve` plus inline bitmask reads — no new aggregate helpers needed except two small `ActiveSkillEffects` additions (`getSkillMinCD`, `hasOneCD`, `hasSkillLoopLessThan4`) for 2 leaves that need a one-level type-232 unwrap.

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file declaring an `ObservableObject`/`@Published` type must explicitly `import Combine`.
- No third-party dependencies.
- Every leaf/helper must match the exact JS source quoted per-task below.
- `Other > Seamless Buff (Round ≥CD)` is deferred (needs the full generic skill DSL parser, not yet built) — NOT ported in this phase, not counted as "broken."

---

## Task 1: `ActiveSkillEffects` additions (`getSkillMinCD`, `hasOneCD`, `hasSkillLoopLessThan4`)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift`

**Interfaces:**
- Produces: `static func getSkillMinCD(_ skill: Skill) -> Int`, `static func hasOneCD(_ card: Card, skills: SkillLookup) -> Bool`, `static func hasSkillLoopLessThan4(_ card: Card, skills: SkillLookup) -> Bool` — consumed by the "Other" leaves (Task 4).

This ports:
```js
function getSkillMinCD(skill) { return skill.initialCooldown - (skill.maxLevel - 1); }

// "1 CD" leaf:
cards=>cards.filter(card=>{
  if (card.activeSkillId == 0) return false;
  let skill = Skills[card.activeSkillId];
  if (skill.type == 232) skill = Skills[skill.params.at(-1)]; // one-level unwrap only
  return getSkillMinCD(skill) <= 1;
})

// "Skill Loop less than 4 card" leaf:
cards=>cards.filter(card=>{
  if (card.activeSkillId == 0) return false;
  let skill = Skills[card.activeSkillId];
  if (skill.type === 232) skill = Skills[skill.params.at(-1)];
  const cantLoopSkill = getActuallySkills(skill, [202, 214, 218, 250, 268]); // default searchRandom=true
  if (cantLoopSkill.length) return false;
  const minCD = getSkillMinCD(skill);
  let realCD = minCD;
  const skillBoost = getActuallySkills(skill, [146], false); // searchRandom=false
  if (skillBoost.length) {
    realCD = skillBoost.reduce((cd,subSkill)=> cd - subSkill.params[0] * 3, realCD);
  }
  return minCD > 1 && realCD <= 4;
})
```

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift` (reusing existing `skill(_:type:params:)` and `makeCard(activeSkillId:)` helpers):

```swift
    func testGetSkillMinCD() {
        let s = skill(1, type: 5, params: [])
        let withLevels = Skill(id: 1, name: "S", description: "", type: 5, maxLevel: 6, initialCooldown: 8, params: [])
        XCTAssertEqual(ActiveSkillEffects.getSkillMinCD(withLevels), 3)
        _ = s
    }

    func testHasOneCDUnwrapsType232Once() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 232, maxLevel: 1, initialCooldown: 99, params: [20]),
            20: Skill(id: 20, name: "S", description: "", type: 5, maxLevel: 1, initialCooldown: 1, params: []),
        ]
        XCTAssertTrue(ActiveSkillEffects.hasOneCD(makeCard(activeSkillId: 10), skills: skills))
    }

    func testHasOneCDFalseWhenNoActiveSkill() {
        XCTAssertFalse(ActiveSkillEffects.hasOneCD(makeCard(activeSkillId: 0), skills: [:]))
    }

    func testHasSkillLoopLessThan4() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 5, maxLevel: 6, initialCooldown: 8, params: [])]
        // minCD = 8 - 5 = 3, no boost, no cant-loop types present -> minCD>1 (true) && realCD<=4 (3<=4, true)
        XCTAssertTrue(ActiveSkillEffects.hasSkillLoopLessThan4(makeCard(activeSkillId: 10), skills: skills))
    }

    func testHasSkillLoopLessThan4FalseWhenCantLoopTypePresent() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 214, maxLevel: 1, initialCooldown: 8, params: [])]
        XCTAssertFalse(ActiveSkillEffects.hasSkillLoopLessThan4(makeCard(activeSkillId: 10), skills: skills))
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/ActiveSkillEffectsTests
```

- [ ] **Step 3: Implement**

Add these to `enum ActiveSkillEffects` in `ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift` (alongside the existing functions — do not remove or change those):

```swift
    static func getSkillMinCD(_ skill: Skill) -> Int {
        skill.initialCooldown - (skill.maxLevel - 1)
    }

    private static func unwrapOnceForLoopCheck(_ skill: Skill, skills: SkillLookup) -> Skill {
        guard skill.type == 232, let lastParam = skill.params.last, let unwrapped = skills[lastParam] else { return skill }
        return unwrapped
    }

    static func hasOneCD(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, let baseSkill = skills[card.activeSkillId] else { return false }
        let skill = unwrapOnceForLoopCheck(baseSkill, skills: skills)
        return getSkillMinCD(skill) <= 1
    }

    static func hasSkillLoopLessThan4(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, let baseSkill = skills[card.activeSkillId] else { return false }
        let skill = unwrapOnceForLoopCheck(baseSkill, skills: skills)
        let cantLoop = SkillChainMatcher.resolveAll(skillId: skill.id, types: [202, 214, 218, 250, 268], skills: skills, searchRandom: true)
        guard cantLoop.isEmpty else { return false }
        let minCD = getSkillMinCD(skill)
        var realCD = minCD
        let skillBoost = SkillChainMatcher.resolveAll(skillId: skill.id, types: [146], skills: skills, searchRandom: false)
        if !skillBoost.isEmpty {
            realCD = skillBoost.reduce(realCD) { cd, subSkill in cd - (subSkill.params.first ?? 0) * 3 }
        }
        return minCD > 1 && realCD <= 4
    }
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests (11 pre-existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift
git commit -m "Add getSkillMinCD/hasOneCD/hasSkillLoopLessThan4 to ActiveSkillEffects"
```

---

## Task 2: For player team leaves (18)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher` (existing).
- Produces: appends `activePlayerTeamLeaves` (18) to `SpecialSearchTree.leaves`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift` (reusing `makeCardWithActiveSkill`):

```swift
    func testIncreaseDamageCapLeaderUsesBitmask() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 258, maxLevel: 1, initialCooldown: 0, params: [0, 0, 0b110])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Leader").matches(makeCardWithActiveSkill(10), ctx))
        XCTAssertFalse(leaf("Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Sub").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testIncreaseDamageCapSelfSwitchesOnType() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 258, maxLevel: 1, initialCooldown: 0, params: [0, 0, 0b1]),
            11: Skill(id: 11, name: "S", description: "", type: 241, maxLevel: 1, initialCooldown: 0, params: []),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        let leafObj = leaf("Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Self")
        XCTAssertTrue(leafObj.matches(makeCardWithActiveSkill(10), ctx))
        XCTAssertTrue(leafObj.matches(makeCardWithActiveSkill(11), ctx)) // default branch: any match counts
    }

    func testBindTeamActiveSkill() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 214, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > For player team > Bind team active skill").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testForPlayerTeamLeafCount() {
        let count = SpecialSearchTree.leaves.filter { $0.groupPath.starts(with: ["Active Skill", "For player team"]) }.count
        XCTAssertEqual(count, 18)
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
private let activePlayerTeamLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Any", label: "Increase Damage Cap - Any", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [241, 246, 247, 258, 263, 266], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Self", label: "Increase Damage Cap - Self", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [241, 246, 247, 258, 266], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 258: return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b1 != 0
        case 266: return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b100 != 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Leader", label: "Increase Damage Cap - Leader", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [258], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b110 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Sub", label: "Increase Damage Cap - Sub", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [258], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Neighbor", label: "Increase Damage Cap - Neighbor", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [266], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b11 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Attr./Types", label: "Increase Damage Cap - Attr./Types", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [263], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Any", label: "Card slot ATK rate change - Any", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [230, 269], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Self", label: "Card slot ATK rate change - Self", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230, 269], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 230: return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b1 != 0
        case 269: return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b100 != 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Leader", label: "Card slot ATK rate change - Leader", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b110 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Sub", label: "Card slot ATK rate change - Sub", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Neighbor", label: "Card slot ATK rate change - Neighbor", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [269], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b11 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > ↑Increase skills charge", label: "↑Increase skills charge", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [146], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Change Leader", label: "Change Leader", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [93, 227], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Change member's Attr", label: "Change member's Attr", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [142, 274], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > ↓Reduce skills charge", label: "↓Reduce skills charge", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [218], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Bind team active skill", label: "Bind team active skill", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [214], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Bind card self", label: "Bind card self", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [267], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Remove card self's assist", label: "Remove card self's assist", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [250], skills: ctx.skillsJA, searchRandom: true)
    },
]
```

And change the `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Update any pre-existing total-leaf-count assertion to the new correct total (119 + 18 = 137).

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill For player team leaves (18 total)"
```

---

## Task 3: Orbs States Change + Board States Change leaves (16)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher` (existing).
- Produces: appends `activeOrbsStatesLeaves` (7) + `activeBoardStatesLeaves` (9) to `SpecialSearchTree.leaves`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testLockAnyColorVsSixColor() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 152, maxLevel: 1, initialCooldown: 0, params: [0b111111]),
            11: Skill(id: 11, name: "S", description: "", type: 152, maxLevel: 1, initialCooldown: 0, params: [0b1]),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Orbs States Change > Lock(Any color)").matches(makeCardWithActiveSkill(11), ctx))
        XCTAssertFalse(leaf("Active Skill > Orbs States Change > Lock(≥6 color)").matches(makeCardWithActiveSkill(11), ctx))
        XCTAssertTrue(leaf("Active Skill > Orbs States Change > Lock(≥6 color)").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testCreatesCloud() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 238, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Board States Change > Creates Cloud").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testOrbsAndBoardStatesLeafCounts() {
        let orbs = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Orbs States Change"] }
        let board = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Board States Change"] }
        XCTAssertEqual(orbs.count, 7)
        XCTAssertEqual(board.count, 9)
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
private let activeOrbsStatesLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Unlock", label: "Unlock", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [172], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Lock(Any color)", label: "Lock(Any color)", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [152], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Lock(≥6 color)", label: "Lock(≥6 color)", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [152], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let param0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return (param0 & 0b111111) == 0b111111
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Enhanced Orbs", label: "Enhanced Orbs", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [52, 91, 140], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Add Combo Drop", label: "Add Combo Drop", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [190], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Add Nail", label: "Add Nail", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [262], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Bind self matchable", label: "Bind self matchable", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [215], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeBoardStatesLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Replaces all Orbs", label: "Replaces all Orbs", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [10], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Destory Orbs", label: "Destory Orbs", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [277], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > No Skyfall", label: "No Skyfall", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [184], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Roulette Orb", label: "Creates Roulette Orb", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [207, 249], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Cloud", label: "Creates Cloud", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [238], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Seal", label: "Creates Seal", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [239], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Deep Dark Orb", label: "Creates Deep Dark Orb", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [251], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Change Board Size", label: "Change Board Size", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [244], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Fixed starting position", label: "Fixed starting position", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [273], skills: ctx.skillsJA, searchRandom: true)
    },
]
```

And change the `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Update the total-leaf-count assertion to 137 + 16 = 153.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Orbs States Change and Board States Change leaves (16 total)"
```

---

## Task 4: Skill use is conditional + Other leaves (12)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher`, `ActiveSkillEffects.hasOneCD`/`hasSkillLoopLessThan4` (Task 1).
- Produces: appends `activeSkillConditionalLeaves` (6) + `activeOtherLeaves` (6) to `SpecialSearchTree.leaves` — FINAL append for Phase 3b; total reaches 165 (119 + 46).

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`:

```swift
    func testEnableRequireHPRange() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 225, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Skill use is conditional > Enable require HP range").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testEvolvedVsNotEvolvedActive() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 232, maxLevel: 1, initialCooldown: 0, params: [20]),
            11: Skill(id: 11, name: "S", description: "", type: 5, maxLevel: 1, initialCooldown: 0, params: []),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Other > Evolved active").matches(makeCardWithActiveSkill(10), ctx))
        XCTAssertTrue(leaf("Active Skill > Other > Not Evolved active").matches(makeCardWithActiveSkill(11), ctx))
    }

    func testOneCDLeaf() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 5, maxLevel: 1, initialCooldown: 1, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Other > 1 CD").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testPhase3bFinalLeafCounts() {
        let conditional = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Skill use is conditional"] }
        let other = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Other"] }
        XCTAssertEqual(conditional.count, 6)
        XCTAssertEqual(other.count, 6)
        XCTAssertEqual(SpecialSearchTree.leaves.count, 165)
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
private let activeSkillConditionalLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require HP range", label: "Enable require HP range", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [225], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require Dungeon Stage", label: "Enable require Dungeon Stage", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [234], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Delay active after skill use", label: "Delay active after skill use", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [248], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require number of Orbs", label: "Enable require number of Orbs", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [255], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Has limit of times a skill can be used", label: "Has limit of times a skill can be used", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [268], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require BUFF state", label: "Enable require BUFF state", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [275], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeOtherLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Other > 1 CD", label: "1 CD", groupPath: ["Active Skill", "Other"]) { card, ctx in
        ActiveSkillEffects.hasOneCD(card, skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Skill Loop less than 4 card", label: "Skill Loop less than 4 card", groupPath: ["Active Skill", "Other"]) { card, ctx in
        ActiveSkillEffects.hasSkillLoopLessThan4(card, skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Time pause", label: "Time pause", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [5, 246, 247], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Random effect active", label: "Random effect active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [118], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Evolved active", label: "Evolved active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [232, 233], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Not Evolved active", label: "Not Evolved active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        !SkillChainMatcher.matches(skillId: card.activeSkillId, types: [232, 233], skills: ctx.skillsJA, searchRandom: true)
    },
]
```

And change the final `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves + activeSkillConditionalLeaves + activeOtherLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Update the total-leaf-count assertion to 165.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill conditional-use and Other leaves — Phase 3b complete (165 total leaves)"
```

---

## Task 5: Full verify + screenshot

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite for real**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target. Report back the real test output. Do NOT do screenshot verification yourself — the orchestrator does that separately.

## Self-Review Notes

- **Spec coverage:** `getSkillMinCD`/`hasOneCD`/`hasSkillLoopLessThan4` (Task 1), For player team (Task 2), Orbs/Board States Change (Task 3), Skill use is conditional + Other (Task 4) — every leaf in this phase's scope has a task. `Seamless Buff` is explicitly absent (deferred, documented in the spec).
- **Type consistency:** `ActiveSkillEffects`'s new function signatures are fixed in Task 1 and reused identically in Task 4. `SpecialSearchTree.leaves` composition is edited incrementally and correctly at each task.
- **No placeholders:** every leaf and helper has its literal ported logic, matching the quoted JS source.
