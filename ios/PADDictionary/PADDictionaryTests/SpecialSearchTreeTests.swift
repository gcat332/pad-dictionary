import XCTest
@testable import PADDictionary

final class SpecialSearchTreeTests: XCTestCase {
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], awakenings: [Int] = [], superAwakenings: [Int] = [], activeSkillId: Int = 0, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil, evoMaterials: [Int] = [0, 0, 0, 0, 0], isUltEvo: Bool = false, evoBaseId: Int = 0, syncAwakening: Int? = nil, is8Latent: Bool? = nil, searchFlags: [Int]? = nil) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: evoMaterials, isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: syncAwakening, is8Latent: is8Latent, searchFlags: searchFlags)
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
        XCTAssertEqual(evoLeaves.count, 10)
        XCTAssertEqual(awakeningLeaves.count, 12)
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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 263)
    }

    private func withOrbSkinOrBgmId(_ card: Card, _ value: Int) -> Card {
        Card(id: card.id, name: card.name, otLangName: card.otLangName, attrs: card.attrs, types: card.types, rarity: card.rarity, cost: card.cost, maxLevel: card.maxLevel, isEmpty: card.isEmpty, enabled: card.enabled, hp: card.hp, atk: card.atk, rcv: card.rcv, activeSkillId: card.activeSkillId, leaderSkillId: card.leaderSkillId, evoRootId: card.evoRootId, awakenings: card.awakenings, superAwakenings: card.superAwakenings, canAssist: card.canAssist, henshinTo: card.henshinTo, henshinFrom: card.henshinFrom, orbSkinOrBgmId: value, badgeId: card.badgeId, feedExp: card.feedExp, sellPrice: card.sellPrice, limitBreakIncr: card.limitBreakIncr, sellMP: card.sellMP, latentAwakeningId: card.latentAwakeningId, stackable: card.stackable, skillBanner: card.skillBanner, evoMaterials: card.evoMaterials, isUltEvo: card.isUltEvo, evoBaseId: card.evoBaseId, syncAwakening: card.syncAwakening, is8Latent: card.is8Latent, searchFlags: card.searchFlags)
    }

    private func makeCardWithMaxLevel(_ maxLevel: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
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
        XCTAssertEqual(matching.count, 12)
        XCTAssertEqual(restriction.count, 13)
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
        XCTAssertEqual(extra.count, 18)
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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 263)
    }

    private func makeCardWithActiveSkill(_ activeSkillId: Int) -> Card {
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
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
        Card(id: 1, name: "Card", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: leaderSkillId, evoRootId: 1, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
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
        XCTAssertEqual(SpecialSearchTree.leaves.count, 263)
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
        XCTAssertEqual(other.count, 7)
        XCTAssertEqual(SpecialSearchTree.leaves.count, 263)
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

    func testReincarnationLeaf() {
        let card = makeCard(id: 123, isUltEvo: false, evoBaseId: 122)
        // (existing makeCard doesn't take is8Latent/awakenings for evo-base wiring directly;
        // build the card manually here to set is8Latent and a matching cardsById)
        let reincarnated = Card(id: 123, name: "Card 123", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 122, awakenings: [52, 12, 12], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 122, syncAwakening: nil, is8Latent: true, searchFlags: nil)
        let ctx = SpecialSearchContext(cardsById: [123: reincarnated], skillsJA: [:])
        XCTAssertTrue(leaf("Evo type > Reincarnation/Super Rein..").matches(reincarnated, ctx))
        XCTAssertFalse(leaf("Evo type > Reincarnation/Super Rein..").matches(card, ctx))
    }

    func testThreeSameKillerOrTwoWithLatentLeaf() {
        // real example: card 396 — 4 killer-32(god) awakenings among its 9, is8Latent true, isUltEvo true
        let threeKillers = Card(id: 396, name: "Card 396", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 130, awakenings: [32, 32, 32], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: true, evoBaseId: 131, syncAwakening: nil, is8Latent: true, searchFlags: nil)
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertTrue(leaf("Awakenings > 3 same Killer, or 2 with latent").matches(threeKillers, ctx))
        XCTAssertFalse(leaf("Awakenings > 3 same Killer, or 2 with latent").matches(makeCard(), ctx))
    }

    func testLeaderSkillFlagLeaves() {
        // real example: card 290, searchFlags [35651593, 0] — bits 0 (Multiple Att.) and 3 (Same Attr Combo) set
        let multiAttrCard = Card(id: 290, name: "Card 290", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 288, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 289, syncAwakening: nil, is8Latent: nil, searchFlags: [35651593, 0])
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Multiple Att.").matches(multiAttrCard, ctx))
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Same Attribute Combo Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Orb Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Combo Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > L Shape Matching").matches(multiAttrCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Multiple Att.").matches(makeCard(), ctx))

        // real example: card 187, searchFlags [8192, 0] — bit 13 (HP Percentage Activation)
        let hpActivationCard = Card(id: 187, name: "Card 187", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 187, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [8192, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > HP Percentage Activation").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Attribute Enchantment").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Type Enchantment").matches(hpActivationCard, ctx))
        XCTAssertFalse(leaf("Leader Skills > Restriction/Bind > Skill Use Activation").matches(hpActivationCard, ctx))

        // real example: card 221, searchFlags [1024, 0] — bit 10 (Type Enchantment)
        let typeEnchantCard = Card(id: 221, name: "Card 221", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 221, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [1024, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Type Enchantment").matches(typeEnchantCard, ctx))

        // real example: card 700, searchFlags [17408, 0] — bit 14 (Skill Use Activation) is also set alongside bit 13
        let skillUseCard = Card(id: 700, name: "Card 700", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 699, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 699, syncAwakening: nil, is8Latent: nil, searchFlags: [17408, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Skill Use Activation").matches(skillUseCard, ctx))

        // real example: card 441, searchFlags [4, 0] — bit 2 (Combo Matching)
        let comboCard = Card(id: 441, name: "Card 441", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 441, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [4, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Combo Matching").matches(comboCard, ctx))

        // real example: card 451, searchFlags [33554946, 0] — bit 1 (Orb Matching)
        let orbMatchCard = Card(id: 451, name: "Card 451", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 451, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: [33554946, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > Orb Matching").matches(orbMatchCard, ctx))

        // real example: card 2170, searchFlags [1040, 0] — bit 4 (L Shape Matching)
        let lShapeCard = Card(id: 2170, name: "Card 2170", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 2169, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 2169, syncAwakening: nil, is8Latent: nil, searchFlags: [1040, 0])
        XCTAssertTrue(leaf("Leader Skills > Matching Style > L Shape Matching").matches(lShapeCard, ctx))

        // real example: card 1, searchFlags [1049088, 0] — bit 9 (Attribute Enchantment) among others
        let attrEnchantCard = Card(id: 1, name: "Card 1", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: 1929, awakenings: [21, 21], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 1929, syncAwakening: nil, is8Latent: nil, searchFlags: [1049088, 0])
        XCTAssertTrue(leaf("Leader Skills > Restriction/Bind > Attribute Enchantment").matches(attrEnchantCard, ctx))

        // nil searchFlags never matches any bit
        XCTAssertFalse(leaf("Leader Skills > Matching Style > Multiple Att.").matches(makeCard(), ctx))
    }

    func testFixedDamageInflictsAndAddsComboLeaves() {
        let skills: SkillLookup = [
            1953: Skill(id: 1953, name: "S", description: "", type: 201, maxLevel: 1, initialCooldown: 0, params: [16, 16, 0, 0, 2, 5000000]),
            2378: Skill(id: 2378, name: "S", description: "", type: 194, maxLevel: 1, initialCooldown: 0, params: [24, 2, 800, 3]),
        ]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Fixed damage inflicts").matches(makeCardWithLeaderSkill(1953), ctx))
        XCTAssertFalse(leaf("Leader Skills > Extra Effects > Adds combo").matches(makeCardWithLeaderSkill(1953), ctx))
        XCTAssertTrue(leaf("Leader Skills > Extra Effects > Adds combo").matches(makeCardWithLeaderSkill(2378), ctx))
        XCTAssertFalse(leaf("Leader Skills > Extra Effects > Fixed damage inflicts").matches(makeCardWithLeaderSkill(2378), ctx))
    }

    func testSeamlessBuffLeaf() {
        let skills: SkillLookup = [10881: Skill(id: 10881, name: "S", description: "", type: 51, maxLevel: 11, initialCooldown: 13, params: [3])]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: skills)
        XCTAssertTrue(leaf("Active Skill > Seamless Buff (Round ≥CD)").matches(makeCardWithActiveSkill(10881), ctx))
        XCTAssertFalse(leaf("Active Skill > Seamless Buff (Round ≥CD)").matches(makeCard(), ctx))
    }
}
