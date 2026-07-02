import XCTest
@testable import PADDictionary

final class SkillChainMatcherTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int] = []) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    func testDirectTypeMatch() {
        let skills: SkillLookup = [1: skill(1, type: 236)]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testNoMatchWhenNotAWrapperType() {
        let skills: SkillLookup = [1: skill(1, type: 5)]
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testResolvesThroughType232Wrapper() {
        let skills: SkillLookup = [
            1: skill(1, type: 232, params: [2, 3]),
            2: skill(2, type: 5),
            3: skill(3, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testType118RequiresSearchRandomTrue() {
        let skills: SkillLookup = [
            1: skill(1, type: 118, params: [2]),
            2: skill(2, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills, searchRandom: true))
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills, searchRandom: false))
    }

    func testType248DropsFirstParam() {
        let skills: SkillLookup = [
            1: skill(1, type: 248, params: [99, 2]), // first param (99) is dropped, not resolved as a skill id
            2: skill(2, type: 236),
        ]
        XCTAssertTrue(SkillChainMatcher.matches(skillId: 1, types: [236], skills: skills))
    }

    func testUnknownSkillIdReturnsFalse() {
        XCTAssertFalse(SkillChainMatcher.matches(skillId: 999, types: [236], skills: [:]))
    }
}
