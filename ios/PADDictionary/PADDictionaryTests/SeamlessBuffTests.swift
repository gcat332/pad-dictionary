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
