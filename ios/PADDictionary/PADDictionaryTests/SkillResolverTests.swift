import XCTest
@testable import PADDictionary

final class SkillResolverTests: XCTestCase {
    func testEnglishDescriptionWins() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "JA Name", description: "JA desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let en: SkillLookup = [1: Skill(id: 1, name: "EN Name", description: "EN desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: ja, skillsEN: en, translations: [:])
        XCTAssertEqual(resolved?.name, "EN Name")
        XCTAssertEqual(resolved?.description, "EN desc")
        XCTAssertEqual(resolved?.source, .en)
    }

    func testFallsBackToTranslatedTextWhenNoEnglishDescription() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "JA Name", description: "JA desc", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: ja, skillsEN: [:], translations: ["1": "Translated desc"])
        XCTAssertEqual(resolved?.name, "JA Name")
        XCTAssertEqual(resolved?.description, "Translated desc")
        XCTAssertEqual(resolved?.source, .translated)
    }

    func testStripsInlineFormattingCodesFromDescription() {
        let en: SkillLookup = [1: Skill(id: 1, name: "Name", description: "^ff3600^Red text^p normal", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        let resolved = SkillResolver.resolve(skillId: 1, skillsJA: [:], skillsEN: en, translations: [:])
        XCTAssertEqual(resolved?.description, "Red text normal")
    }

    func testReturnsNilWhenSkillUnknownInBothSources() {
        XCTAssertNil(SkillResolver.resolve(skillId: 999, skillsJA: [:], skillsEN: [:], translations: [:]))
    }

    func testCooldownTextShowsRangeWhenLevelingReducesIt() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 6, initialCooldown: 8, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "CD 8→3")
    }

    func testCooldownTextShowsSingleValueWhenMaxLevelIsOne() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 1, initialCooldown: 5, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "CD 5")
    }

    func testCooldownTextIsEmptyWhenNoCooldown() {
        let ja: SkillLookup = [1: Skill(id: 1, name: "N", description: "", type: 0, maxLevel: 1, initialCooldown: 0, params: [])]
        XCTAssertEqual(SkillResolver.cooldownText(skillId: 1, skillsJA: ja, skillsEN: [:]), "")
    }
}
