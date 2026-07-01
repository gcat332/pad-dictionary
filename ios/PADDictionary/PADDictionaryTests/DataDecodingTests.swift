import XCTest
@testable import PADDictionary

final class DataDecodingTests: XCTestCase {
    private func loadFixture(_ name: String) -> Data {
        let url = Bundle(for: Self.self).url(forResource: name, withExtension: "json")!
        return try! Data(contentsOf: url)
    }

    func testDecodesCardsFromFixture() throws {
        let cards = try JSONDecoder().decode([Card].self, from: loadFixture("mon_ja_sample"))
        XCTAssertEqual(cards.count, 2)
        XCTAssertEqual(cards[0].id, 0)
        XCTAssertTrue(cards[0].isEmpty)
        XCTAssertNil(cards[0].otLangName)

        let tyrra = cards[1]
        XCTAssertEqual(tyrra.id, 1)
        XCTAssertEqual(tyrra.displayName, "Tyrra")
        XCTAssertEqual(tyrra.hp, StatRange(min: 52, max: 144, scale: 1))
        XCTAssertEqual(tyrra.awakenings, [21, 21])
    }

    func testDecodesSkillsFromFixture() throws {
        let skillsJA = try JSONDecoder().decode([Skill].self, from: loadFixture("skill_ja_sample"))
        let skillsEN = try JSONDecoder().decode([Skill].self, from: loadFixture("skill_en_sample"))
        XCTAssertEqual(skillsJA[1].id, 1)
        XCTAssertEqual(skillsJA[1].params, [0, 1000])
        XCTAssertEqual(skillsEN[1].name, "Heat Breath")
    }

    func testDecodesTranslationsFromFixture() throws {
        let translations = try JSONDecoder().decode([String: String].self, from: loadFixture("skill_tr_sample"))
        XCTAssertEqual(translations["61847"], "[Lock] is released and the board changes to [Darkness] and [Recovery].")
    }
}
