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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 219)
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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 219)
    }

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

    private func makeCardWithLeaderSkill(_ leaderSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil)
    }

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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 219)
    }

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
        XCTAssertTrue(leafObj.matches(makeCardWithActiveSkill(11), ctx))
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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 219)
    }

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

    func testChangeAllOrbsOnBoardLeaves() {
        let skills: SkillLookup = [
            1: Skill(id: 1, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, -1]),
            2: Skill(id: 2, name: "S", description: "", type: 71, maxLevel: 1, initialCooldown: 0, params: [0, 1, -1]),
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
}
