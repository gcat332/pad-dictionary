import XCTest
@testable import PADDictionary

final class CardReincarnationTests: XCTestCase {
    private func makeCard(id: Int, is8Latent: Bool, isUltEvo: Bool, evoBaseId: Int, evoRootId: Int, awakenings: [Int] = []) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: awakenings, superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: isUltEvo, evoBaseId: evoBaseId, syncAwakening: nil, is8Latent: is8Latent, searchFlags: nil)
    }

    func testFalseWhenNotIs8Latent() {
        let card = makeCard(id: 1, is8Latent: false, isUltEvo: false, evoBaseId: 0, evoRootId: 1)
        XCTAssertFalse(isReincarnated(card, cardsById: [1: card]))
    }

    func testFalseWhenIsUltEvo() {
        let card = makeCard(id: 1, is8Latent: true, isUltEvo: true, evoBaseId: 0, evoRootId: 1)
        XCTAssertFalse(isReincarnated(card, cardsById: [1: card]))
    }

    func testFalseWhenBaseOrRootEqualsSelf() {
        // real example: card 1 (Tyrra), is8Latent false anyway, but also evoBaseId==evoRootId==1929 != id(1) is not the point here —
        // this covers the "evoBaseId == evoRootId == 0 (no evo) and evoRootId == own id" self-reference case
        let card = makeCard(id: 5, is8Latent: true, isUltEvo: false, evoBaseId: 0, evoRootId: 5)
        XCTAssertFalse(isReincarnated(card, cardsById: [5: card]))
    }

    func testTrueForSimpleReincarnation() {
        // real example: card 123, is8Latent true, isUltEvo false, evoBaseId 122, evoRootId 122, no awakening-49
        let card = makeCard(id: 123, is8Latent: true, isUltEvo: false, evoBaseId: 122, evoRootId: 122, awakenings: [52, 12, 12])
        XCTAssertTrue(isReincarnated(card, cardsById: [123: card]))
    }

    func testRecursesThroughAwakening49ToEvoBase() {
        let base = makeCard(id: 10, is8Latent: false, isUltEvo: false, evoBaseId: 0, evoRootId: 10)
        let card = makeCard(id: 20, is8Latent: true, isUltEvo: false, evoBaseId: 10, evoRootId: 10, awakenings: [49])
        // recurses into base (id 10), which has is8Latent:false -> false
        XCTAssertFalse(isReincarnated(card, cardsById: [10: base, 20: card]))
    }

    func testMissingEvoBaseCardTreatedAsFalse() {
        let card = makeCard(id: 20, is8Latent: true, isUltEvo: false, evoBaseId: 999, evoRootId: 10, awakenings: [49])
        XCTAssertFalse(isReincarnated(card, cardsById: [20: card]))
    }
}
