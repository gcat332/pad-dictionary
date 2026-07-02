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
