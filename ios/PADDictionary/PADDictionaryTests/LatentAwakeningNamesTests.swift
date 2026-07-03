import XCTest
@testable import PADDictionary

final class LatentAwakeningNamesTests: XCTestCase {
    func testKnownLatentAwakeningReturnsName() {
        XCTAssertEqual(LatentAwakeningNames.name(for: 1), "HP+")
    }

    func testUnknownLatentAwakeningFallsBackToNumberedLabel() {
        XCTAssertEqual(LatentAwakeningNames.name(for: 99999), "Latent Awakening 99999")
    }

    func testAllIdsIsSortedAndNonEmpty() {
        let ids = LatentAwakeningNames.allIds
        XCTAssertEqual(ids, ids.sorted())
        XCTAssertFalse(ids.isEmpty)
    }

    private func makeCard(id: Int, name: String, latentAwakeningId: Int) -> Card {
        Card(id: id, name: name, otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: latentAwakeningId, stackable: false, skillBanner: false, evoMaterials: [0, 0, 0, 0, 0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testRepresentativeCardFindsMatchingLatentTamadra() {
        let material = makeCard(id: 2207, name: "潜在たまドラ☆HP強化", latentAwakeningId: 1)
        let unrelated = makeCard(id: 5, name: "Some Monster", latentAwakeningId: 0)
        let found = LatentAwakeningNames.representativeCard(for: 1, in: [unrelated, material])
        XCTAssertEqual(found?.id, 2207)
    }

    func testRepresentativeCardReturnsNilWhenNotSynced() {
        let unrelated = makeCard(id: 5, name: "Some Monster", latentAwakeningId: 0)
        XCTAssertNil(LatentAwakeningNames.representativeCard(for: 1, in: [unrelated]))
    }
}
