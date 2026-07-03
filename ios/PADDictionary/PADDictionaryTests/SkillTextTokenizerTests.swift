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
        XCTAssertEqual(SkillToken.resolve("Fire"), .orb(x: 0, y: 0, w: 36, h: 36))
        XCTAssertEqual(SkillToken.resolve("Bombs"), .orb(x: 0, y: 324, w: 36, h: 36))       // row 9
        XCTAssertEqual(SkillToken.resolve("Lethal Poison"), .orb(x: 0, y: 288, w: 36, h: 36)) // row 8
        XCTAssertEqual(SkillToken.resolve("Recovery"), .orb(x: 0, y: 180, w: 36, h: 36))     // alias -> Heal, row 5
    }

    func testResolveLock() {
        // Lock renders from its tight 14x17 glyph, not the full 36px cell.
        XCTAssertEqual(SkillToken.resolve("locks"), .orb(x: 36, y: 36, w: 14, h: 17))
        XCTAssertEqual(SkillToken.resolve("Lock"), .orb(x: 36, y: 36, w: 14, h: 17))  // translated alias
    }

    func testResolveType() {
        XCTAssertEqual(SkillToken.resolve("Devil"), .type(7))
        XCTAssertEqual(SkillToken.resolve("Enhance Material"), .type(14))
        XCTAssertEqual(SkillToken.resolve("Attack type"), .type(6))   // translated alias -> Attacker
        XCTAssertEqual(SkillToken.resolve("Demon type"), .type(7))    // translated alias -> Devil
    }

    func testResolveAwoken() {
        // "Two-Pronged Attack" is a known awakening name in awoken_names.json
        guard let id = AwakeningNames.id(forName: "Two-Pronged Attack") else {
            return XCTFail("expected a known awakening id")
        }
        XCTAssertEqual(SkillToken.resolve("Two-Pronged Attack"), .awoken(id))
        // translated variants resolve via the alias meta table
        XCTAssertEqual(SkillToken.resolve("2-target attack"), .awoken(id))
    }

    func testResolveUnknownReturnsNil() {
        XCTAssertNil(SkillToken.resolve("Change Sub Attribute: Light"))
        XCTAssertNil(SkillToken.resolve("Combo"))
    }
}
