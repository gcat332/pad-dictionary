import XCTest
@testable import PADDictionary

final class FilterStateTests: XCTestCase {
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], rarity: Int = 5, awakenings: [Int] = [], superAwakenings: [Int] = [], canAssist: Bool = false) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: rarity, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: canAssist, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    func testDefaultFilterMatchesEverything() {
        XCTAssertTrue(FilterState().matches(makeCard()))
    }

    func testAttrSlotMatchesOnlySelectedValues() {
        var f = FilterState()
        f.attr[0] = [1, 2]
        XCTAssertFalse(f.matches(makeCard(attrs: [0])))
        XCTAssertTrue(f.matches(makeCard(attrs: [1])))
    }

    func testAttrSlotFailsWhenCardHasNoValueAtThatPosition() {
        var f = FilterState()
        f.attr[1] = [3]
        XCTAssertFalse(f.matches(makeCard(attrs: [0]))) // card has no attrs[1]
    }

    func testTypeIsOrMatchAcrossCardsTypes() {
        var f = FilterState()
        f.types = [4, 7]
        XCTAssertTrue(f.matches(makeCard(types: [1, 4])))
        XCTAssertFalse(f.matches(makeCard(types: [1, 2])))
    }

    func testRarityMatch() {
        var f = FilterState()
        f.rarities = [6, 7]
        XCTAssertTrue(f.matches(makeCard(rarity: 6)))
        XCTAssertFalse(f.matches(makeCard(rarity: 5)))
    }

    func testAwakeningRequiresCount() {
        var f = FilterState()
        f.awakenings = [21, 21] // needs 2 copies
        XCTAssertFalse(f.matches(makeCard(awakenings: [21])))
        XCTAssertTrue(f.matches(makeCard(awakenings: [21, 21, 5])))
    }

    func testAwakeningIncludesSuperWhenToggleOn() {
        var f = FilterState()
        f.awakenings = [21]
        f.includeSuper = true
        XCTAssertTrue(f.matches(makeCard(awakenings: [], superAwakenings: [21])))
        f.includeSuper = false
        XCTAssertFalse(f.matches(makeCard(awakenings: [], superAwakenings: [21])))
    }

    func testCanAssistOnly() {
        var f = FilterState()
        f.canAssistOnly = true
        XCTAssertFalse(f.matches(makeCard(canAssist: false)))
        XCTAssertTrue(f.matches(makeCard(canAssist: true)))
    }
}
