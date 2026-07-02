import XCTest
@testable import PADDictionary

final class ActiveSkillEffectsTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int]) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    private func makeCard(activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    private func makeCardWithActiveSkill(_ activeSkillId: Int) -> Card {
        makeCard(activeSkillId: activeSkillId)
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

    func testGetSkillMinCD() {
        let withLevels = Skill(id: 1, name: "S", description: "", type: 5, maxLevel: 6, initialCooldown: 8, params: [])
        XCTAssertEqual(ActiveSkillEffects.getSkillMinCD(withLevels), 3)
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
        XCTAssertTrue(ActiveSkillEffects.hasSkillLoopLessThan4(makeCard(activeSkillId: 10), skills: skills))
    }

    func testHasSkillLoopLessThan4FalseWhenCantLoopTypePresent() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 214, maxLevel: 1, initialCooldown: 8, params: [])]
        XCTAssertFalse(ActiveSkillEffects.hasSkillLoopLessThan4(makeCard(activeSkillId: 10), skills: skills))
    }

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
}
