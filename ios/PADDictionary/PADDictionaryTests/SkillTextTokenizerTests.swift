import XCTest
@testable import PADDictionary

final class SkillTextTokenizerTests: XCTestCase {
    func testParseSplitsTextAndTokens() {
        let runs = SkillTextTokenizer.parse("Deal {Fire} damage {Two-Pronged Attack}!")
        XCTAssertEqual(runs, [
            .text("Deal "), .token("Fire"), .text(" damage "),
            .token("Two-Pronged Attack"), .text("!"),
        ])
    }

    func testParsePlainTextHasNoTokens() {
        XCTAssertEqual(SkillTextTokenizer.parse("no tokens here"), [.text("no tokens here")])
    }

    func testResolveOrb() {
        XCTAssertEqual(SkillToken.resolve("Fire"), .orb(col: 0, row: 0))
        XCTAssertEqual(SkillToken.resolve("Bombs"), .orb(col: 0, row: 9))
        XCTAssertEqual(SkillToken.resolve("Lethal Poison"), .orb(col: 0, row: 8))
        XCTAssertEqual(SkillToken.resolve("locks"), .orb(col: 1, row: 1))
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
