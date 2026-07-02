import XCTest
@testable import PADDictionary

final class LeaderSkillScaleTests: XCTestCase {
    private func skill(_ id: Int, type: Int, params: [Int]) -> Skill {
        Skill(id: id, name: "S\(id)", description: "", type: type, maxLevel: 1, initialCooldown: 0, params: params)
    }

    func testHPScaleLastParamCase() {
        let s = skill(1, type: 23, params: [1, 2, 300])
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 3.0, accuracy: 0.0001)
    }

    func testHPScaleDefaultsToOneForUnknownType() {
        let s = skill(1, type: 999, params: [])
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 1.0, accuracy: 0.0001)
    }

    func testHPScaleType136MultipliesTwoFactorsWithZeroFallback() {
        let s = skill(1, type: 136, params: [0, 0, 0, 0, 0, 200])
        // sk[1] is 0 -> falls back to 1; sk[5] is 200 -> 2.0
        XCTAssertEqual(LeaderSkillScale.hpScale(s, skills: [:]), 2.0, accuracy: 0.0001)
    }

    func testHPScaleType138RecursesThroughOtherLeaderSkill() {
        let inner = skill(2, type: 23, params: [0, 0, 400])
        let wrapper = skill(1, type: 138, params: [2])
        XCTAssertEqual(LeaderSkillScale.hpScale(wrapper, skills: [2: inner]), 4.0, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalShieldType16() {
        let s = skill(1, type: 16, params: [50])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, skills: [:]), 0.5, accuracy: 0.0001)
    }

    func testReduceScaleAllAttrZeroesOutSingleAttrShield() {
        let s = skill(1, type: 17, params: [0, 75])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, allAttr: true, skills: [:]), 0, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, allAttr: false, skills: [:]), 0.75, accuracy: 0.0001)
    }

    func testReduceScaleNoHPneedZeroesOutHPConditionalShield() {
        let s = skill(1, type: 38, params: [0, 0, 60])
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, noHPneed: true, skills: [:]), 0, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScale(s, noHPneed: false, skills: [:]), 0.6, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalIgnoresConditionalShieldTypes() {
        // type 38 is a conditional shield handled by reduceScale but NOT by reduceScale_unconditional
        let s = skill(1, type: 38, params: [0, 0, 60])
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(s, skills: [:]), 0, accuracy: 0.0001)
    }

    func testReduceScaleUnconditionalType129ChecksAllAttrBitmask() {
        let allAttrs = skill(1, type: 129, params: [0, 0, 0, 0, 0, 31, 80])
        let notAllAttrs = skill(2, type: 129, params: [0, 0, 0, 0, 0, 15, 80])
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(allAttrs, skills: [:]), 0.8, accuracy: 0.0001)
        XCTAssertEqual(LeaderSkillScale.reduceScaleUnconditional(notAllAttrs, skills: [:]), 0, accuracy: 0.0001)
    }
}
