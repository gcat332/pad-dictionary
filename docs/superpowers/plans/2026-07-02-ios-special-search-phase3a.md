# iOS Special-Search Phase 3a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role:** implementation is done by dispatching to a Claude subagent running Opus 4.8, which has real Simulator access on this machine. It should run real `xcodebuild test`/`build` commands itself. Claude (Sonnet, the orchestrator) reviews and independently re-verifies visual/critical results.

**Goal:** Port the first slice of the web's "Active Skill" special-search group — Voids Absorption, Recovers Bind Status, Player's HP change, Buff, For Enemy (29 leaves) — into `SpecialSearchTree.leaves`.

**Architecture:** `SkillChainMatcher` gains `resolveAll()` (returns every matching skill, not just the first). `ActiveSkillEffects` ports 7 aggregate helper functions from `engine.js` that each inspect multiple skill types and return a small computed result. 29 new `SpecialSearchLeaf` entries are appended to the existing tree.

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file declaring an `ObservableObject`/`@Published` type must explicitly `import Combine`.
- No third-party dependencies.
- Every leaf/helper must match the exact JS source quoted per-task below.
- `atkBuffSkillType`/`rcvBuffSkillType` only compute the `skilltype` field of the web's richer result object (the other fields — `types`/`attrs`/`awoken`/`rate`/`turns` — only feed the dropped sort/display features) but preserve the original's "first skill among matches whose computed rate is non-zero" selection order, since that governs which skill's `skilltype` wins.

---

## Task 1: `SkillChainMatcher.resolveAll()`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift`

**Interfaces:**
- Produces: `static func resolveAll(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = false) -> [Skill]` — ports `getActuallySkills` returning EVERY matching skill (not just the first). Consumed by `ActiveSkillEffects` (Task 2).

This ports (for reference — same recursion as the existing `resolve`, but collecting all matches):
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
function getCardActiveSkills(card, skillTypes, searchRandom = false) {
  if (!card) return [];
  return getActuallySkills(Skills[card.activeSkillId], skillTypes, searchRandom);
}
```

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift`:

```swift
    func testResolveAllReturnsEveryMatchAcrossBranches() {
        let skills: SkillLookup = [
            1: skill(1, type: 232, params: [2, 3]),
            2: skill(2, type: 236),
            3: skill(3, type: 236),
        ]
        let all = SkillChainMatcher.resolveAll(skillId: 1, types: [236], skills: skills)
        XCTAssertEqual(Set(all.map(\.id)), [2, 3])
    }

    func testResolveAllReturnsEmptyWhenNoMatch() {
        let skills: SkillLookup = [1: skill(1, type: 5)]
        XCTAssertEqual(SkillChainMatcher.resolveAll(skillId: 1, types: [236], skills: skills), [])
    }
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SkillChainMatcherTests
```

- [ ] **Step 3: Implement**

Add this method inside `enum SkillChainMatcher` in `ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift` (alongside `matches`/`resolve`):

```swift
    static func resolveAll(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = false) -> [Skill] {
        guard let skill = skills[skillId] else { return [] }
        if types.contains(skill.type) { return [skill] }
        guard wrapperTypes.contains(skill.type) else { return [] }
        if skill.type == 118 && !searchRandom { return [] }
        let params = skill.type == 248 ? Array(skill.params.dropFirst()) : skill.params
        return params.reversed().flatMap { resolveAll(skillId: $0, types: types, skills: skills, searchRandom: searchRandom) }
    }
```

`Skill` needs to be `Equatable` for the `XCTAssertEqual(..., [])` in the test to compile — it already is (`struct Skill: Codable, Identifiable, Equatable` from sub-project 2).

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 10 tests (8 pre-existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SkillChainMatcher.swift ios/PADDictionary/PADDictionaryTests/SkillChainMatcherTests.swift
git commit -m "Add SkillChainMatcher.resolveAll() returning every matching skill"
```

---

## Task 2: `ActiveSkillEffects`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift`

**Interfaces:**
- Consumes: `SkillChainMatcher.resolve`/`resolveAll` (existing/Task 1), `Skill`, `SkillLookup`.
- Produces: `enum ActiveSkillEffects` with `struct VoidsAbsorptionTurns { var attrAbsorb, comboAbsorb, damageAbsorb, damageVoid, superGravity: Int }`, `static func voidsAbsorptionTurns(_ card: Card, skills: SkillLookup) -> VoidsAbsorptionTurns`; `struct UnbindTurns { var normal, awakenings, matches: Int }`, `static func unbindTurns(_ card: Card, skills: SkillLookup) -> UnbindTurns`; `struct HealImmediatelyRate { var vampire, selfRcv, constValue, scale: Int }`, `static func healImmediatelyRate(_ card: Card, skills: SkillLookup) -> HealImmediatelyRate`; `static func damageSelfRate(_ card: Card, skills: SkillLookup) -> Int`; `struct ChangeEnemiesAttr { var attr: Int?; var turns: Int }`, `static func changeEnemiesAttrAttr(_ card: Card, skills: SkillLookup) -> ChangeEnemiesAttr`; `static func atkBuffSkillType(_ card: Card, skills: SkillLookup) -> Int`; `static func rcvBuffSkillType(_ card: Card, skills: SkillLookup) -> Int` — consumed by the leaves in Tasks 3-4.

This ports (JS source, for reference):
```js
function voidsAbsorption_Turns(card) {
  const outObj = {"attr-absorb":0,"combo-absorb":0,"damage-absorb":0,"damage-void":0,"super-gravity":0};
  const searchTypeArray = [173, 191, 278];
  const skills = getCardActiveSkills(card, searchTypeArray);
  skills.reduce((pre,skill)=>{
    if (skill.type === 173) {
      if(skill.params[1]) pre["attr-absorb"] ||= skill.params[0];
      if(skill.params[2]) pre["combo-absorb"] ||= skill.params[0];
      if(skill.params[3]) pre["damage-absorb"] ||= skill.params[0];
    } else if (skill.type === 191) { pre["damage-void"] ||= skill.params[0]; }
    else if (skill.type === 278) { pre["super-gravity"] ||= skill.params[0]; }
    return pre;
  }, outObj);
  return outObj;
}
function unbind_Turns(card) {
  // directParseSkills for types 117/179/196 resolves to unbind(bind, awokenBind[, matches]) nodes;
  // ported directly via each type's known positional params rather than the generic DSL parser:
  //   type 117: [117](bind, rcv, constant, hp, awokenBind) -> normal=params[0], awakenings=params[4]
  //   type 179: [179](turns, value, percent, bind, awokenBind) -> normal=params[3], awakenings=params[4]
  //   type 196: [196](matches) -> matches=params[0]
  const outObj = { normal: 0, awakenings: 0, matches: 0 };
  const skills = getCardActiveSkills(card, [117, 179, 196]);
  skills.forEach(skill => {
    if (skill.type === 117) { outObj.normal ||= skill.params[0]; outObj.awakenings ||= skill.params[4]; }
    else if (skill.type === 179) { outObj.normal ||= skill.params[3]; outObj.awakenings ||= skill.params[4]; }
    else if (skill.type === 196) { outObj.matches ||= skill.params[0]; }
  });
  return outObj;
}
function healImmediately_Rate(card) {
  const searchTypeArray = [7, 8, 35, 115, 117];
  const skills = getCardActiveSkills(card, searchTypeArray);
  const outObj = { vampire: 0, selfRcv: 0, const: 0, scale: 0 };
  if (!skills.length) return outObj;
  skills.forEach(skill=>{
    const sk = skill.params;
    if (skill.type == 7) outObj.selfRcv += sk[0];
    else if(skill.type == 8) outObj.const += sk[0];
    else if(skill.type == 35) outObj.vampire += sk[1];
    else if(skill.type == 115) outObj.vampire += sk[2];
    else if(skill.type == 117) { outObj.selfRcv += sk[1] || 0; outObj.const += sk[2] || 0; outObj.scale += sk[3] || 0; }
  });
  return outObj;
}
function damageSelf_Rate(card) {
  const searchTypeArray = [84,85,86,87,195];
  const skill = getCardActiveSkill(card, searchTypeArray);
  if (!skill) return 0;
  const sk = skill.params;
  return 100 - (sk[skill.type == 195 ? 0 : 3] || 0);
}
function changeEnemiesAttr_Attr(card) {
  const outObj = { attr: null, turns: 0 };
  const searchTypeArray = [153, 224];
  const skill = getCardActiveSkill(card, searchTypeArray);
  if (!skill) return outObj;
  const sk = skill.params;
  if (skill.type == 153) outObj.attr = sk[0];
  else if (skill.type == 224) { outObj.attr = sk[1] || 0; outObj.turns = sk[0]; }
  return outObj;
}
function atkBuff_Rate(card) {
  const searchTypeArray = [88,92,50,90,156,168,231,228];
  const skills = getCardActiveSkills(card, searchTypeArray);
  return skills.map(atkBuffParse).find(s=>s.rate != 0) || atkBuffParse();
  function atkBuffParse(skill) {
    const outObj = { skilltype: 0, rate: 0 }; // (types/attrs/awoken/turns omitted — display/sort only)
    if (!skill) return outObj;
    const sk = skill.params;
    if (skill.type == 88 || skill.type == 92) { outObj.skilltype = 2; outObj.rate = sk[skill.type == 88 ? 2 : 3]; }
    else if(skill.type == 50 || skill.type == 90) {
      const attrs = sk.slice(1, skill.type == 50 ? 2 : 3).filter(a=>a !== 5);
      if (!attrs.length) return outObj;
      outObj.skilltype = 2; outObj.rate = sk[skill.type == 50 ? 2 : 3];
    } else if(skill.type == 156 && sk[4] == 2 || skill.type == 168) {
      outObj.skilltype = 1; outObj.rate = skill.type == 168 ? sk[7] : sk[5] - 100;
    } else if(skill.type == 228 && sk[3] > 0) { outObj.skilltype = 1; outObj.rate = sk[3]; }
    else if(skill.type == 231 && sk[6] > 0) { outObj.skilltype = 1; outObj.rate = sk[6]; }
    return outObj;
  }
}
function rcvBuff_Rate(card) {
  const searchTypeArray = [50,90,228,231];
  const skills = getCardActiveSkills(card, searchTypeArray);
  return skills.map(rcvBuffParse).find(s=>s.rate != 0) || rcvBuffParse();
  function rcvBuffParse(skill) {
    const outObj = { skilltype: 0, rate: 0 };
    if (!skill) return outObj;
    const sk = skill.params;
    if (skill.type == 228 && sk[4] > 0) { outObj.skilltype = 1; outObj.rate = sk[4]; }
    else if (skill.type == 231 && sk[7] > 0) { outObj.skilltype = 1; outObj.rate = sk[7]; }
    else if (skill.type == 50 || skill.type == 90) {
      outObj.skilltype = sk.slice(1,sk.length>2?-1:undefined).includes(5) ? 2 : 0;
      outObj.rate = sk.length > 2 ? sk[sk.length-1] : 0;
    }
    return outObj;
  }
}
```

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class ActiveSkillEffectsTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int]) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    private func makeCard(activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

    func testVoidsAbsorptionTurnsType173SplitsThreeFlags() {
        let skills: SkillLookup = [10: skill(10, type: 173, params: [5, 1, 1, 0])]
        let result = ActiveSkillEffects.voidsAbsorptionTurns(makeCard(activeSkillId: 10), skills: skills)
        XCTAssertEqual(result.attrAbsorb, 5)
        XCTAssertEqual(result.comboAbsorb, 5)
        XCTAssertEqual(result.damageAbsorb, 0)
    }

    func testVoidsAbsorptionTurnsType191And278() {
        let skills: SkillLookup = [
            10: skill(10, type: 191, params: [7]),
            11: skill(11, type: 278, params: [3]),
        ]
        XCTAssertEqual(ActiveSkillEffects.voidsAbsorptionTurns(makeCard(activeSkillId: 10), skills: skills).damageVoid, 7)
        XCTAssertEqual(ActiveSkillEffects.voidsAbsorptionTurns(makeCard(activeSkillId: 11), skills: skills).superGravity, 3)
    }

    func testUnbindTurnsType117() {
        let skills: SkillLookup = [10: skill(10, type: 117, params: [4, 0, 0, 0, 2])]
        let result = ActiveSkillEffects.unbindTurns(makeCard(activeSkillId: 10), skills: skills)
        XCTAssertEqual(result.normal, 4)
        XCTAssertEqual(result.awakenings, 2)
    }

    func testUnbindTurnsType196() {
        let skills: SkillLookup = [10: skill(10, type: 196, params: [6])]
        XCTAssertEqual(ActiveSkillEffects.unbindTurns(makeCard(activeSkillId: 10), skills: skills).matches, 6)
    }

    func testHealImmediatelyRateAggregatesAcrossTypes() {
        let skills: SkillLookup = [10: skill(10, type: 8, params: [500])]
        let result = ActiveSkillEffects.healImmediatelyRate(makeCard(activeSkillId: 10), skills: skills)
        XCTAssertEqual(result.constValue, 500)
    }

    func testDamageSelfRateType195UsesParam0() {
        let skills: SkillLookup = [10: skill(10, type: 195, params: [30])]
        XCTAssertEqual(ActiveSkillEffects.damageSelfRate(makeCard(activeSkillId: 10), skills: skills), 70)
    }

    func testDamageSelfRateOtherTypesUseParam3() {
        let skills: SkillLookup = [10: skill(10, type: 84, params: [0, 0, 0, 40])]
        XCTAssertEqual(ActiveSkillEffects.damageSelfRate(makeCard(activeSkillId: 10), skills: skills), 60)
    }

    func testChangeEnemiesAttrType153() {
        let skills: SkillLookup = [10: skill(10, type: 153, params: [2])]
        let result = ActiveSkillEffects.changeEnemiesAttrAttr(makeCard(activeSkillId: 10), skills: skills)
        XCTAssertEqual(result.attr, 2)
    }

    func testChangeEnemiesAttrReturnsNilWhenNoMatch() {
        let result = ActiveSkillEffects.changeEnemiesAttrAttr(makeCard(activeSkillId: 999), skills: [:])
        XCTAssertNil(result.attr)
    }

    func testAtkBuffSkillTypeForTypedAttrBuff() {
        let skills: SkillLookup = [10: skill(10, type: 88, params: [3, 1, 1, 50])]
        XCTAssertEqual(ActiveSkillEffects.atkBuffSkillType(makeCard(activeSkillId: 10), skills: skills), 2)
    }

    func testAtkBuffSkillTypeZeroWhenRateIsZero() {
        let skills: SkillLookup = [10: skill(10, type: 88, params: [3, 1, 1, 0])]
        XCTAssertEqual(ActiveSkillEffects.atkBuffSkillType(makeCard(activeSkillId: 10), skills: skills), 0)
    }

    func testRcvBuffSkillTypeForJewelPrincessType228() {
        let skills: SkillLookup = [10: skill(10, type: 228, params: [3, 0, 0, 0, 25])]
        XCTAssertEqual(ActiveSkillEffects.rcvBuffSkillType(makeCard(activeSkillId: 10), skills: skills), 1)
    }
}
```

- [ ] **Step 2: Run test to verify it fails (real simulator)**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/ActiveSkillEffectsTests
```

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift`:

```swift
import Foundation

private extension Array where Element == Int {
    subscript(safe index: Int) -> Int? {
        indices.contains(index) ? self[index] : nil
    }
}

enum ActiveSkillEffects {
    struct VoidsAbsorptionTurns {
        var attrAbsorb = 0
        var comboAbsorb = 0
        var damageAbsorb = 0
        var damageVoid = 0
        var superGravity = 0
    }

    static func voidsAbsorptionTurns(_ card: Card, skills: SkillLookup) -> VoidsAbsorptionTurns {
        var out = VoidsAbsorptionTurns()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [173, 191, 278], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 173:
                if (sk[safe: 1] ?? 0) != 0, out.attrAbsorb == 0 { out.attrAbsorb = sk[safe: 0] ?? 0 }
                if (sk[safe: 2] ?? 0) != 0, out.comboAbsorb == 0 { out.comboAbsorb = sk[safe: 0] ?? 0 }
                if (sk[safe: 3] ?? 0) != 0, out.damageAbsorb == 0 { out.damageAbsorb = sk[safe: 0] ?? 0 }
            case 191:
                if out.damageVoid == 0 { out.damageVoid = sk[safe: 0] ?? 0 }
            case 278:
                if out.superGravity == 0 { out.superGravity = sk[safe: 0] ?? 0 }
            default:
                break
            }
        }
        return out
    }

    struct UnbindTurns {
        var normal = 0
        var awakenings = 0
        var matches = 0
    }

    static func unbindTurns(_ card: Card, skills: SkillLookup) -> UnbindTurns {
        var out = UnbindTurns()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [117, 179, 196], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 117:
                if out.normal == 0 { out.normal = sk[safe: 0] ?? 0 }
                if out.awakenings == 0 { out.awakenings = sk[safe: 4] ?? 0 }
            case 179:
                if out.normal == 0 { out.normal = sk[safe: 3] ?? 0 }
                if out.awakenings == 0 { out.awakenings = sk[safe: 4] ?? 0 }
            case 196:
                if out.matches == 0 { out.matches = sk[safe: 0] ?? 0 }
            default:
                break
            }
        }
        return out
    }

    struct HealImmediatelyRate {
        var vampire = 0
        var selfRcv = 0
        var constValue = 0
        var scale = 0
    }

    static func healImmediatelyRate(_ card: Card, skills: SkillLookup) -> HealImmediatelyRate {
        var out = HealImmediatelyRate()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [7, 8, 35, 115, 117], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 7: out.selfRcv += sk[safe: 0] ?? 0
            case 8: out.constValue += sk[safe: 0] ?? 0
            case 35: out.vampire += sk[safe: 1] ?? 0
            case 115: out.vampire += sk[safe: 2] ?? 0
            case 117:
                out.selfRcv += sk[safe: 1] ?? 0
                out.constValue += sk[safe: 2] ?? 0
                out.scale += sk[safe: 3] ?? 0
            default:
                break
            }
        }
        return out
    }

    static func damageSelfRate(_ card: Card, skills: SkillLookup) -> Int {
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [84, 85, 86, 87, 195], skills: skills, searchRandom: true) else { return 0 }
        let idx = skill.type == 195 ? 0 : 3
        return 100 - (skill.params[safe: idx] ?? 0)
    }

    struct ChangeEnemiesAttr {
        var attr: Int?
        var turns = 0
    }

    static func changeEnemiesAttrAttr(_ card: Card, skills: SkillLookup) -> ChangeEnemiesAttr {
        var out = ChangeEnemiesAttr()
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [153, 224], skills: skills, searchRandom: true) else { return out }
        let sk = skill.params
        if skill.type == 153 {
            out.attr = sk[safe: 0] ?? 0
        } else if skill.type == 224 {
            out.attr = sk[safe: 1] ?? 0
            out.turns = sk[safe: 0] ?? 0
        }
        return out
    }

    private static func atkBuffParse(_ skill: Skill?) -> (skilltype: Int, rate: Int) {
        guard let skill else { return (0, 0) }
        let sk = skill.params
        func at(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        switch skill.type {
        case 88, 92:
            return (2, at(skill.type == 88 ? 2 : 3))
        case 50, 90:
            let sliceEnd = skill.type == 50 ? 2 : 3
            let attrs = sk.count > 1 ? Array(sk[1..<min(sliceEnd, sk.count)]).filter { $0 != 5 } : []
            guard !attrs.isEmpty else { return (0, 0) }
            return (2, at(skill.type == 50 ? 2 : 3))
        case 156:
            guard at(4) == 2 else { return (0, 0) }
            return (1, at(5) - 100)
        case 168:
            return (1, at(7))
        case 228:
            guard at(3) > 0 else { return (0, 0) }
            return (1, at(3))
        case 231:
            guard at(6) > 0 else { return (0, 0) }
            return (1, at(6))
        default:
            return (0, 0)
        }
    }

    static func atkBuffSkillType(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [88, 92, 50, 90, 156, 168, 231, 228], skills: skills)
        let parsed = matched.map(atkBuffParse)
        return parsed.first(where: { $0.rate != 0 })?.skilltype ?? atkBuffParse(nil).skilltype
    }

    private static func rcvBuffParse(_ skill: Skill?) -> (skilltype: Int, rate: Int) {
        guard let skill else { return (0, 0) }
        let sk = skill.params
        func at(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        switch skill.type {
        case 228:
            guard at(4) > 0 else { return (0, 0) }
            return (1, at(4))
        case 231:
            guard at(7) > 0 else { return (0, 0) }
            return (1, at(7))
        case 50, 90:
            let sliceEnd = sk.count > 2 ? sk.count - 1 : sk.count
            let relevant = sk.count > 1 ? Array(sk[1..<max(1, sliceEnd)]) : []
            let skilltype = relevant.contains(5) ? 2 : 0
            let rate = sk.count > 2 ? (sk.last ?? 0) : 0
            return (skilltype, rate)
        default:
            return (0, 0)
        }
    }

    static func rcvBuffSkillType(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [50, 90, 228, 231], skills: skills)
        let parsed = matched.map(rcvBuffParse)
        return parsed.first(where: { $0.rate != 0 })?.skilltype ?? rcvBuffParse(nil).skilltype
    }
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 11 tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/ActiveSkillEffects.swift ios/PADDictionary/PADDictionaryTests/ActiveSkillEffectsTests.swift
git commit -m "Add ActiveSkillEffects porting the web's multi-type aggregate skill helpers"
```

---

## Task 3: Voids Absorption + Recovers Bind Status + Player's HP change leaves (14)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `ActiveSkillEffects` (Task 2), `SkillChainMatcher` (existing).
- Produces: appends `activeVoidsAbsorptionLeaves` (6) + `activeRecoversBindLeaves` (4) + `activePlayerHPChangeLeaves` (4) to `SpecialSearchTree.leaves`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift` (reusing `makeCardWithLeaderSkill` — add an analogous `makeCardWithActiveSkill(_:)` helper too):

```swift
    private func makeCardWithActiveSkill(_ activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

    func testTwoVoidsRequiresAttrAndDamageAbsorb() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 173, maxLevel: 1, initialCooldown: 0, params: [5, 1, 0, 1])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Voids Absorption > Combination > 2 Voids (attr. & damage)").matches(makeCardWithActiveSkill(10), ctx))
        XCTAssertFalse(leaf("Active Skill > Voids Absorption > Combination > 3 Voids (attr. & damage & void)").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testThreeUnbinds() {
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "S", description: "", type: 117, maxLevel: 1, initialCooldown: 0, params: [3, 0, 0, 0, 2]),
            11: Skill(id: 11, name: "S", description: "", type: 196, maxLevel: 1, initialCooldown: 0, params: [4]),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Recovers Bind Status > Other > Unbind menber bind").matches(makeCardWithActiveSkill(10), ctx))
        XCTAssertTrue(leaf("Active Skill > Recovers Bind Status > Other > Unbind unmatchable").matches(makeCardWithActiveSkill(11), ctx))
    }

    func testDamageSelf() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 195, maxLevel: 1, initialCooldown: 0, params: [50])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Player's HP change > Damage self").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testActiveSkillFirstSliceLeafCounts() {
        let voids = SpecialSearchTree.leaves.filter { $0.groupPath.starts(with: ["Active Skill", "Voids Absorption"]) }
        let recovers = SpecialSearchTree.leaves.filter { $0.groupPath.starts(with: ["Active Skill", "Recovers Bind Status"]) }
        let hpChange = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Player's HP change"] }
        XCTAssertEqual(voids.count, 6)
        XCTAssertEqual(recovers.count, 4)
        XCTAssertEqual(hpChange.count, 4)
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
private let activeVoidsAbsorptionLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Combination > 2 Voids (attr. & damage)", label: "2 Voids (attr. & damage)", groupPath: ["Active Skill", "Voids Absorption", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA)
        return t.attrAbsorb > 0 && t.damageAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Combination > 3 Voids (attr. & damage & void)", label: "3 Voids (attr. & damage & void)", groupPath: ["Active Skill", "Voids Absorption", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA)
        return t.attrAbsorb > 0 && t.damageAbsorb > 0 && t.damageVoid > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids attribute absorption", label: "Voids attribute absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).attrAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids combo absorption", label: "Voids combo absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).comboAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids damage absorption", label: "Voids damage absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).damageAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Pierce through damage void", label: "Pierce through damage void", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).damageVoid > 0
    },
]

private let activeRecoversBindLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Combination > 3 Unbinds", label: "3 Unbinds", groupPath: ["Active Skill", "Recovers Bind Status", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA)
        return t.normal > 0 && t.awakenings > 0 && t.matches > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind menber bind", label: "Unbind menber bind", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).normal > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind awakenings bind", label: "Unbind awakenings bind", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).awakenings > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind unmatchable", label: "Unbind unmatchable", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).matches > 0
    },
]

private let activePlayerHPChangeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Heal after turn", label: "Heal after turn", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [179], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Heal immediately", label: "Heal immediately", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        let h = ActiveSkillEffects.healImmediatelyRate(card, skills: ctx.skillsJA)
        return h.vampire != 0 || h.selfRcv != 0 || h.constValue != 0 || h.scale != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Change team maximum HP", label: "Change team maximum HP", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [237], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Damage self", label: "Damage self", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        ActiveSkillEffects.damageSelfRate(card, skills: ctx.skillsJA) > 0
    },
]
```

And change the `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Update any pre-existing total-leaf-count assertion to the new correct total (90 + 14 = 104) so the suite goes green — same pattern as prior phases.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Voids Absorption, Recovers Bind Status, Player's HP change leaves (14 total)"
```

---

## Task 4: Buff + For Enemy leaves (15)

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift`

**Interfaces:**
- Consumes: `ActiveSkillEffects` (Task 2), `SkillChainMatcher` (existing).
- Produces: appends `activeBuffLeaves` (9) + `activeForEnemyLeaves` (6) to `SpecialSearchTree.leaves` — FINAL append for this phase; total reaches 119 (90 Phases 1-2 + 29 Phase 3a).

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift` (reusing `makeCardWithActiveSkill`):

```swift
    func testReduce100PercentDamage() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 3, maxLevel: 1, initialCooldown: 0, params: [0, 100])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Buff > Reduce 100% Damage").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testChangeEnemiesAttrLeaf() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 153, maxLevel: 1, initialCooldown: 0, params: [2])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > For Enemy > Change enemies's Attr").matches(makeCardWithActiveSkill(10), ctx))
    }

    func testFinalPhase3aLeafCounts() {
        let buff = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "Buff"] }
        let forEnemy = SpecialSearchTree.leaves.filter { $0.groupPath == ["Active Skill", "For Enemy"] }
        XCTAssertEqual(buff.count, 9)
        XCTAssertEqual(forEnemy.count, 6)
        XCTAssertEqual(SpecialSearchTree.leaves.count, 119)
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
private let activeBuffLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Buff > RCV rate change", label: "RCV rate change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        ActiveSkillEffects.rcvBuffSkillType(card, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Team ATK rate change", label: "Team ATK rate change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        ActiveSkillEffects.atkBuffSkillType(card, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Move time change", label: "Move time change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [132], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Adds combo", label: "Adds combo", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [160], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce Damage for all Attr", label: "Reduce Damage for all Attr", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [3, 156], skills: ctx.skillsJA, searchRandom: true) else { return false }
        if skill.type == 156 { return (skill.params.indices.contains(4) ? skill.params[4] : 0) == 3 }
        return true
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce 100% Damage", label: "Reduce 100% Damage", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [3], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) >= 100
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce all Damage for designated Attr", label: "Reduce all Damage for designated Attr", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [21], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Mass Attacks", label: "Mass Attacks", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [51], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Rate by state count(Jewel Princess)", label: "Rate by state count(Jewel Princess)", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [156, 168, 228, 231], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeForEnemyLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Menace", label: "Menace", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [18], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Reduces enemies' DEF", label: "Reduces enemies' DEF", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [19, 282], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Poisons enemies", label: "Poisons enemies", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [4], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Change enemies's Attr", label: "Change enemies's Attr", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        ActiveSkillEffects.changeEnemiesAttrAttr(card, skills: ctx.skillsJA).attr != nil
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Counterattack buff", label: "Counterattack buff", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [60], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Voids Super Gravity", label: "Voids Super Gravity", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).superGravity > 0
    },
]
```

And change the final `SpecialSearchTree.leaves` composition to:

```swift
enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves
}
```

- [ ] **Step 4: Run test to verify it passes (real simulator)**

Same command as Step 2. Update the total-leaf-count assertion to 119. Expected: `** TEST SUCCEEDED **` for all tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/SpecialSearchTree.swift ios/PADDictionary/PADDictionaryTests/SpecialSearchTreeTests.swift
git commit -m "Add Active Skill Buff and For Enemy leaves — Phase 3a complete (119 total leaves)"
```

---

## Task 5: Full verify + screenshot

**Files:** none — verification only.

- [ ] **Step 1: Run the full test suite for real**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target.

Report back the real test output. Do NOT do screenshot verification yourself — the orchestrator does that separately.

## Self-Review Notes

- **Spec coverage:** `resolveAll` (Task 1), all 7 `ActiveSkillEffects` functions (Task 2), Voids Absorption/Recovers Bind/Player's HP change leaves (Task 3), Buff/For Enemy leaves (Task 4) — every leaf in this phase's scope has a task.
- **Type consistency:** `ActiveSkillEffects`'s function signatures are fixed in Task 2 and reused identically in Tasks 3-4. `SpecialSearchTree.leaves` composition is edited incrementally and correctly at each task.
- **No placeholders:** every leaf and helper has its literal ported logic, matching the quoted JS source.
