import XCTest
@testable import PADDictionary

final class SpecialSearchEngineTests: XCTestCase {
    private func makeCard(id: Int, maxLevel: Int = 1) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: maxLevel, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testEmptySelectionReturnsAllCards() {
        let cards = [makeCard(id: 1), makeCard(id: 2)]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        XCTAssertEqual(SpecialSearchEngine.filter(cards, selectedKeys: [], mode: .and, context: ctx).map(\.id), [1, 2])
    }

    func testAndModeRequiresAllSelectedLeavesToMatch() {
        let cards = [makeCard(id: 1, maxLevel: 1), makeCard(id: 2, maxLevel: 1)]
        var c2 = cards[1]
        // card 2 also has henshinTo set, satisfying "Before Transform" too
        c2 = Card(id: 2, name: c2.name, otLangName: nil, attrs: c2.attrs, types: c2.types, rarity: c2.rarity, cost: c2.cost, maxLevel: c2.maxLevel, isEmpty: c2.isEmpty, enabled: c2.enabled, hp: c2.hp, atk: c2.atk, rcv: c2.rcv, activeSkillId: c2.activeSkillId, leaderSkillId: c2.leaderSkillId, evoRootId: c2.evoRootId, awakenings: c2.awakenings, superAwakenings: c2.superAwakenings, canAssist: c2.canAssist, henshinTo: [3], henshinFrom: c2.henshinFrom, orbSkinOrBgmId: c2.orbSkinOrBgmId, badgeId: c2.badgeId, feedExp: c2.feedExp, sellPrice: c2.sellPrice, limitBreakIncr: c2.limitBreakIncr, sellMP: c2.sellMP, latentAwakeningId: c2.latentAwakeningId, stackable: c2.stackable, skillBanner: c2.skillBanner, evoMaterials: c2.evoMaterials, isUltEvo: c2.isUltEvo, evoBaseId: c2.evoBaseId, syncAwakening: c2.syncAwakening, is8Latent: c2.is8Latent, searchFlags: c2.searchFlags)
        let all = [cards[0], c2]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        let keys: Set<String> = ["Others Search > Max level is lv1", "Evo type > Transform > Before Transform"]
        let result = SpecialSearchEngine.filter(all, selectedKeys: keys, mode: .and, context: ctx)
        XCTAssertEqual(result.map(\.id), [2])
    }

    func testOrModeUnionsMatches() {
        let cards = [makeCard(id: 1, maxLevel: 1), makeCard(id: 2, maxLevel: 5)]
        let ctx = SpecialSearchContext(cardsById: [:], skillsJA: [:])
        let keys: Set<String> = ["Others Search > Max level is lv1", "Others Search > Level limit unable break"]
        let result = SpecialSearchEngine.filter(cards, selectedKeys: keys, mode: .or, context: ctx)
        XCTAssertEqual(Set(result.map(\.id)), [1, 2])
    }
}
