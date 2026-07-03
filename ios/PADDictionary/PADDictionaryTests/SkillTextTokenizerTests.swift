import XCTest
@testable import PADDictionary

final class SkillTextTokenizerTests: XCTestCase {
    func testParseSplitsTextAndTokens() {
        let runs = SkillTextTokenizer.parse("Deal {Fire} damage {Two-Pronged Attack}!")
        XCTAssertEqual(runs, [
            .text("Deal "), .token(name: "Fire", square: false), .text(" damage "),
            .token(name: "Two-Pronged Attack", square: false), .text("!"),
        ])
    }

    func testParsePlainTextHasNoTokens() {
        XCTAssertEqual(SkillTextTokenizer.parse("no tokens here"), [.text("no tokens here")])
    }

    func testParseSquareBrackets() {
        // Google-translated JP skills use [Fire] instead of {Fire}.
        let runs = SkillTextTokenizer.parse("changes to [Fire], [Recovery] | 5 attributes")
        XCTAssertEqual(runs, [
            .text("changes to "), .token(name: "Fire", square: true), .text(", "),
            .token(name: "Recovery", square: true), .text(" | 5 attributes"),
        ])
    }

    func testResolveOrb() {
        XCTAssertEqual(SkillToken.resolve("Fire"), .orb(col: 0, row: 0))
        XCTAssertEqual(SkillToken.resolve("Bombs"), .orb(col: 0, row: 9))
        XCTAssertEqual(SkillToken.resolve("Lethal Poison"), .orb(col: 0, row: 8))
        XCTAssertEqual(SkillToken.resolve("Recovery"), .orb(col: 0, row: 5))  // translated name for Heal
    }

    func testResolveLockSymbol() {
        XCTAssertEqual(SkillToken.resolve("locks"), .symbol("lock.fill"))
        XCTAssertEqual(SkillToken.resolve("Lock"), .symbol("lock.fill"))
    }

    func testResolveType() {
        XCTAssertEqual(SkillToken.resolve("Devil"), .type(7))
        XCTAssertEqual(SkillToken.resolve("Enhance Material"), .type(14))
    }

    func testResolveAwoken() {
        // "Two-Pronged Attack" is a known awakening name in awoken_names.json
        guard let id = AwakeningNames.id(forName: "Two-Pronged Attack") else {
            return XCTFail("expected a known awakening id")
        }
        XCTAssertEqual(SkillToken.resolve("Two-Pronged Attack"), .awoken(id))
    }

    func testResolveUnknownReturnsNil() {
        XCTAssertNil(SkillToken.resolve("Change Sub Attribute: Light"))
        XCTAssertNil(SkillToken.resolve("Combo"))
    }
}
