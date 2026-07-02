import XCTest
@testable import PADDictionary

final class EvoFamilyTests: XCTestCase {
    private func makeCard(id: Int, evoRootId: Int, henshinTo: [Int]? = nil, henshinFrom: [Int]? = nil) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: [0], types: [1], rarity: 1, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: evoRootId, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: henshinTo, henshinFrom: henshinFrom, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testGroupsCardsSharingEvoRootId() {
        let cards = [
            makeCard(id: 100, evoRootId: 100),
            makeCard(id: 101, evoRootId: 100),
            makeCard(id: 200, evoRootId: 200),
        ]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(Set(family.map(\.id)), [100, 101])
    }

    func testFollowsHenshinLinksAcrossDifferentEvoRootIds() {
        let cards = [
            makeCard(id: 1, evoRootId: 1, henshinTo: [2]),
            makeCard(id: 2, evoRootId: 2, henshinFrom: [1]),
        ]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(Set(family.map(\.id)), [1, 2])
    }

    func testSingleCardWithNoRelativesReturnsJustItself() {
        let cards = [makeCard(id: 5, evoRootId: 0)]
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertEqual(family.map(\.id), [5])
    }

    func testCapsAt40Nodes() {
        // A henshin chain (each card links to the next), not a shared evoRootId group —
        // sharing one evoRootId pulls in ALL siblings in a single BFS step (matches the
        // web's behavior), so the cap only meaningfully limits growth across chain-like
        // transform links, one new node per step.
        var cards: [Card] = []
        for i in 1...60 {
            let henshinTo = i < 60 ? [i + 1] : nil
            cards.append(makeCard(id: i, evoRootId: i, henshinTo: henshinTo))
        }
        let family = evoFamily(of: cards[0], in: cards)
        XCTAssertLessThanOrEqual(family.count, 40)
    }
}
