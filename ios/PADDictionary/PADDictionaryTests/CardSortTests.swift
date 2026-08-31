import XCTest
@testable import PADDictionary

final class CardSortTests: XCTestCase {
    private func makeCard(id: Int, rarity: Int = 1, cost: Int = 1, attrs: [Int] = [0], hp: Int = 100, atk: Int = 100, rcv: Int = 100, activeSkillId: Int = 0) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: [1], rarity: rarity, cost: cost, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: hp, max: hp, scale: 1), atk: StatRange(min: atk, max: atk, scale: 1), rcv: StatRange(min: rcv, max: rcv, scale: 1), activeSkillId: activeSkillId, leaderSkillId: 0, evoRootId: id, awakenings: [], superAwakenings: [], canAssist: false, henshinTo: nil, henshinFrom: nil, orbSkinOrBgmId: 0, badgeId: 0, feedExp: 0, sellPrice: 0, limitBreakIncr: 0, sellMP: 0, latentAwakeningId: 0, stackable: false, skillBanner: false, evoMaterials: [0,0,0,0,0], isUltEvo: false, evoBaseId: 0, syncAwakening: nil, is8Latent: nil, searchFlags: nil)
    }

    private func sort(_ id: String) -> CardSort {
        CardSort.all.first { $0.id == id }!
    }

    private func context(skills: SkillLookup = [:], updatedDates: [Int: String] = [:]) -> SortContext {
        SortContext(skills: skills, updatedDates: updatedDates)
    }

    func testIdComparatorIsAscendingById() {
        let a = makeCard(id: 1), b = makeCard(id: 2)
        XCTAssertTrue(sort("id").compare(a, b, context()))
        XCTAssertFalse(sort("id").compare(b, a, context()))
    }

    func testRarityCostHpAtkRcvComparators() {
        let a = makeCard(id: 1, rarity: 3, cost: 5, hp: 100, atk: 200, rcv: 50)
        let b = makeCard(id: 2, rarity: 6, cost: 10, hp: 300, atk: 100, rcv: 80)
        XCTAssertTrue(sort("rarity").compare(a, b, context()))
        XCTAssertTrue(sort("cost").compare(a, b, context()))
        XCTAssertTrue(sort("hp").compare(a, b, context()))
        XCTAssertFalse(sort("atk").compare(a, b, context()))
        XCTAssertTrue(sort("rcv").compare(a, b, context()))
    }

    func testAttrComparatorFallsBackToSecondAttribute() {
        let a = makeCard(id: 1, attrs: [0, 1])
        let b = makeCard(id: 2, attrs: [0, 2])
        XCTAssertTrue(sort("attr").compare(a, b, context()))
        let c = makeCard(id: 3, attrs: [1])
        XCTAssertTrue(sort("attr").compare(a, c, context()))
    }

    func testCdComparatorUsesSkillLookup() {
        let a = makeCard(id: 1, activeSkillId: 10)
        let b = makeCard(id: 2, activeSkillId: 20)
        let skills: SkillLookup = [
            10: Skill(id: 10, name: "A", description: "", type: 0, maxLevel: 1, initialCooldown: 3, params: []),
            20: Skill(id: 20, name: "B", description: "", type: 0, maxLevel: 1, initialCooldown: 8, params: []),
        ]
        XCTAssertTrue(sort("cd").compare(a, b, context(skills: skills)))
        XCTAssertFalse(sort("cd").compare(b, a, context(skills: skills)))
    }

    func testUpdatedComparatorOrdersByDateAscending() {
        let a = makeCard(id: 1)
        let b = makeCard(id: 2)
        let ctx = context(updatedDates: [1: "2024-01-01", 2: "2024-06-01"])
        XCTAssertTrue(sort("updated").compare(a, b, ctx))
        XCTAssertFalse(sort("updated").compare(b, a, ctx))
    }

    func testUpdatedComparatorFallsBackToIdWhenDatesAreEqual() {
        let a = makeCard(id: 1)
        let b = makeCard(id: 2)
        let ctx = context(updatedDates: [1: "2024-01-01", 2: "2024-01-01"])
        XCTAssertTrue(sort("updated").compare(a, b, ctx))
        XCTAssertFalse(sort("updated").compare(b, a, ctx))
    }

    func testUpdatedComparatorTreatsMissingDateAsOldest() {
        let dated = makeCard(id: 1)
        let missing = makeCard(id: 99)
        let ctx = context(updatedDates: [1: "2024-01-01"])
        XCTAssertTrue(sort("updated").compare(missing, dated, ctx))
        XCTAssertFalse(sort("updated").compare(dated, missing, ctx))
    }

    func testAllNineSortsExist() {
        let ids = Set(CardSort.all.map(\.id))
        XCTAssertEqual(ids, ["updated", "id", "rarity", "cost", "attr", "hp", "atk", "rcv", "cd"])
    }
}
