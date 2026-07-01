import XCTest
@testable import PADDictionary

final class CardHenshinDecodingTests: XCTestCase {
    func testDecodesHenshinToWhenPresent() throws {
        let json = #"{"id":5630,"name":"Test","attrs":[3],"types":[4],"rarity":7,"cost":28,"maxLevel":99,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":1,"leaderSkillId":1,"evoRootId":5630,"awakenings":[],"superAwakenings":[],"canAssist":false,"henshinTo":[5631]}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertEqual(card.henshinTo, [5631])
        XCTAssertNil(card.henshinFrom)
    }

    func testHenshinFieldsDefaultToNilWhenAbsent() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertNil(card.henshinTo)
        XCTAssertNil(card.henshinFrom)
    }
}
