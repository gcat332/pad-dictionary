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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 75)
    }

    private func withOrbSkinOrBgmId(_ card: Card, _ value: Int) -> Card {
        Card(id: card.id, name: card.name, otLangName: card.otLangName, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: card.leaderSkillId, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: value, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening)
    }

    private func makeCardWithMaxLevel(_ maxLevel: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

    func testFiveOrbsIncludingEnhancedMatching() {
        let skills: SkillLookup = [10: Skill(id: 10, name: "S", description: "", type: 150, maxLevel: 1, initialCooldown: 0, params: [])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Matching Style > 5 Orbs including enhanced Matching").matches(makeCardWithLeaderSkill(10), ctx))
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

    private func makeCardWithLeaderSkill(_ leaderSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }
}
