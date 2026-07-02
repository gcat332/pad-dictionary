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
        // Type 88 reads its rate from params[2] (see JS reference atkBuff_Rate:189),
        // so the zero must live at index 2 to exercise the "rate is zero" path.
        let skills: SkillLookup = [10: skill(10, type: 88, params: [3, 1, 0, 50])]
        XCTAssertEqual(ActiveSkillEffects.atkBuffSkillType(makeCard(activeSkillId: 10), skills: skills), 0)
    }

    func testRcvBuffSkillTypeForJewelPrincessType228() {
        let skills: SkillLookup = [10: skill(10, type: 228, params: [3, 0, 0, 0, 25])]
        XCTAssertEqual(ActiveSkillEffects.rcvBuffSkillType(makeCard(activeSkillId: 10), skills: skills), 1)
    }
}
