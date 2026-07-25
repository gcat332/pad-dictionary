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

    func testResolveComboAndNail() {
        XCTAssertEqual(SkillToken.resolve("Combo"), .orb(x: 53, y: 180, w: 19, h: 16))  // combo-drop roller glyph
        XCTAssertEqual(SkillToken.resolve("Nail"), .orb(x: 36, y: 235, w: 17, h: 17))
        XCTAssertEqual(SkillToken.resolve("Nail Drops"), .orb(x: 36, y: 235, w: 17, h: 17))  // translated alias
    }

    func testResolveSurge() {
        // "X Surge" -> orb + drop-rate overlay, keyed by attribute row.
        XCTAssertEqual(SkillToken.resolve("Fire Surge"), .surge(orbRow: 0))
        XCTAssertEqual(SkillToken.resolve("Dark Surge"), .surge(orbRow: 4))
        XCTAssertEqual(SkillToken.resolve("Heal Surge"), .surge(orbRow: 5))
        XCTAssertNil(SkillToken.resolve("Enhanced Surge"))  // no orb -> plain text
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
        XCTAssertEqual(SkillToken.resolve("attack type"), .type(6))   // case-insensitive (Google varies case)
        XCTAssertEqual(SkillToken.resolve("Demon type"), .type(7))    // translated alias -> Devil
        XCTAssertEqual(SkillToken.resolve("fire"), .orb(x: 0, y: 0, w: 36, h: 36))  // lowercase orb
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

    func testResolveMistranslatedAttributePairAttacks() {
        // Google mangles 水木同時攻撃/木火同時攻撃/火水同時攻撃 into odd English phrases.
        let waterWood = try! XCTUnwrap(AwakeningNames.id(forName: "Water & Wood Attack"))
        let woodFire = try! XCTUnwrap(AwakeningNames.id(forName: "Wood & Fire Attack"))
        let fireWater = try! XCTUnwrap(AwakeningNames.id(forName: "Fire & Water Attack"))
        XCTAssertEqual(SkillToken.resolve("Mizuki simultaneous attack"), .awoken(waterWood))
        XCTAssertEqual(SkillToken.resolve("Mizuki-Thursday attack"), .awoken(waterWood))
        XCTAssertEqual(SkillToken.resolve("Thursday and fire simultaneous attack"), .awoken(woodFire))
        XCTAssertEqual(SkillToken.resolve("Fire and water simultaneous attack"), .awoken(fireWater))
    }

    func testResolveAliasedAwoken() {
        // "4-color attack enhancement" (translated) -> "4 Att. Enhanced Attack"
        let atkId = try! XCTUnwrap(AwakeningNames.id(forName: "4 Att. Enhanced Attack"))
        XCTAssertEqual(SkillToken.resolve("4-color attack enhancement"), .awoken(atkId))
        // "Extended Move Time+" (EN token variant) -> "Extend Time+"
        let timeId = try! XCTUnwrap(AwakeningNames.id(forName: "Extend Time+"))
        XCTAssertEqual(SkillToken.resolve("Extended Move Time+"), .awoken(timeId))
    }

    func testEnhancedLightRowsFixedInData() {
        // awoken_names.json used to mislabel id 25 as "Enhanced Water Rows" (a duplicate of 15).
        XCTAssertEqual(AwakeningNames.name(for: 25), "Enhanced Light Rows")
        XCTAssertNotNil(SkillToken.resolve("Enhanced Light Rows"))
    }

    func testSubAttributeLightFixedInData() {
        // awoken_names.json used to mislabel id 94 as "Change Sub Attribute: Water" (a
        // duplicate of 92), which also made the name -> id map order-dependent.
        XCTAssertEqual(AwakeningNames.name(for: 94), "Change Sub Attribute: Light")
        XCTAssertEqual(SkillToken.resolve("Sub-attribute change/Light"), .awoken(94))
        XCTAssertEqual(SkillToken.resolve("Sub-attribute change: Water"), .awoken(92))
    }

    func testResolveAwokenIsCaseInsensitive() {
        // Google varies the casing of otherwise-exact awakening names.
        let id = try! XCTUnwrap(AwakeningNames.id(forName: "Skill Delay Resistance"))
        XCTAssertEqual(SkillToken.resolve("Skill delay resistance"), .awoken(id))
        XCTAssertEqual(SkillToken.resolve("skill delay resistance"), .awoken(id))
    }

    func testGeneratedAttributeFamilies() {
        // ドロップ強化 / 列強化 / コンボ強化 come back with the noun and verb swapped around;
        // all permutations are generated, so any of them lands on the same awakening.
        for token in ["Dark drop reinforcement +", "Dark Drop Enhancement +", "dark attribute enhancement +"] {
            XCTAssertEqual(SkillToken.resolve(token), .awoken(103), token)   // Enhanced Dark Orbs+
        }
        for token in ["Light row reinforcement", "Light line reinforcement", "Light Row Enhancement"] {
            XCTAssertEqual(SkillToken.resolve(token), .awoken(25), token)    // Enhanced Light Rows
        }
        for token in ["Dark column reinforcement x3", "Dark Row Enhancement x3", "dark row reinforcement ×3"] {
            XCTAssertEqual(SkillToken.resolve(token), .awoken(120), token)   // Triple Enhanced Dark Rows
        }
        XCTAssertEqual(SkillToken.resolve("Dark Combo Enhancement"), .awoken(77))
        XCTAssertEqual(SkillToken.resolve("Water Combo Enhancement +"), .awoken(122))  // the + variant, not 74
        XCTAssertEqual(SkillToken.resolve("recovery drop enhancement"), .awoken(29))
        XCTAssertNil(SkillToken.resolve("recovery row enhancement"))   // no heal row awakening exists
    }

    func testGeneratedTypeFamilies() {
        XCTAssertEqual(SkillToken.resolve("Machine type"), .type(8))
        XCTAssertEqual(SkillToken.resolve("Physicality type"), .type(2))   // 体力タイプ
        XCTAssertEqual(SkillToken.resolve("Recovery type"), .type(3))
        XCTAssertEqual(SkillToken.resolve("Dragon type added"), .awoken(83))
        XCTAssertEqual(SkillToken.resolve("Balance type added"), .awoken(87))
        XCTAssertEqual(SkillToken.resolve("Machine type added"), .awoken(86))
    }

    func testGeneratedMultiColorAttackFamily() {
        // N色攻撃強化 — with or without the hyphen, either verb.
        for token in ["4-color attack enhancement", "4 color attack enhancement", "4 color attack reinforcement"] {
            XCTAssertEqual(SkillToken.resolve(token), .awoken(80), token)   // 4 Att. Enhanced Attack
        }
        XCTAssertEqual(SkillToken.resolve("3 color attack reinforcement"), .awoken(79))
        XCTAssertEqual(SkillToken.resolve("5-color attack enhancement"), .awoken(81))
        XCTAssertEqual(SkillToken.resolve("5 color attack enhancement +"), .awoken(114))
    }

    func testResolveIrregularPhrasings() {
        // Irregular translations that can't be generated — each seen in skill_tr.json.
        XCTAssertEqual(SkillToken.resolve("T-shaped erase attack"), .awoken(126))    // [T] Increased Attack
        XCTAssertEqual(SkillToken.resolve("All parameter enhancement"), .awoken(127))  // Enhanced Stats
        XCTAssertEqual(SkillToken.resolve("Enhances all parameters"), .awoken(127))
        XCTAssertEqual(SkillToken.resolve("Floating"), .awoken(106))                 // 浮遊 -> Levitation
        XCTAssertEqual(SkillToken.resolve("2-target attack +"), .awoken(96))         // Two-Pronged Attack+
        // 暗闇耐性 — "Darkness" here is 暗闇 (blindness), not the 闇 attribute
        XCTAssertEqual(SkillToken.resolve("Darkness resistance +"), .awoken(68))     // Resistance-Blind+
        XCTAssertEqual(SkillToken.resolve("Darkness"), .orb(x: 0, y: 144, w: 36, h: 36))  // still the Dark orb
    }

    func testResolveUnknownReturnsNil() {
        // Condition labels stay literal text — they aren't awakenings.
        XCTAssertNil(SkillToken.resolve("7x6 squares"))
        XCTAssertNil(SkillToken.resolve("Operation time 12 seconds"))
        XCTAssertNil(SkillToken.resolve("No falling con"))
        XCTAssertNil(SkillToken.resolve("7x6 board"))
    }
}
