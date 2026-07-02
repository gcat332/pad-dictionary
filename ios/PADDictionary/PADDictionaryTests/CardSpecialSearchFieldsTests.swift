import XCTest
@testable import PADDictionary

final class CardSpecialSearchFieldsTests: XCTestCase {
    func testDecodesAllThirteenFields() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":28,"badgeId":5,"feedExp":400,"sellPrice":700,"limitBreakIncr":30,"sellMP":1,"latentAwakeningId":2,"stackable":true,"skillBanner":true,"evoMaterials":[152,0,0,0,0],"isUltEvo":true,"evoBaseId":1929,"syncAwakening":130}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertEqual(card.orbSkinOrBgmId, 28)
        XCTAssertEqual(card.badgeId, 5)
        XCTAssertEqual(card.feedExp, 400)
        XCTAssertEqual(card.sellPrice, 700)
        XCTAssertEqual(card.limitBreakIncr, 30)
        XCTAssertEqual(card.sellMP, 1)
        XCTAssertEqual(card.latentAwakeningId, 2)
        XCTAssertTrue(card.stackable)
        XCTAssertTrue(card.skillBanner)
        XCTAssertEqual(card.evoMaterials, [152, 0, 0, 0, 0])
        XCTAssertTrue(card.isUltEvo)
        XCTAssertEqual(card.evoBaseId, 1929)
        XCTAssertEqual(card.syncAwakening, 130)
    }

    func testSyncAwakeningDefaultsToNilWhenAbsent() throws {
        let json = #"{"id":1,"name":"Test","attrs":[0],"types":[1],"rarity":1,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false,"orbSkinOrBgmId":0,"badgeId":0,"feedExp":0,"sellPrice":0,"limitBreakIncr":0,"sellMP":0,"latentAwakeningId":0,"stackable":false,"skillBanner":false,"evoMaterials":[0,0,0,0,0],"isUltEvo":false,"evoBaseId":0}"#
        let card = try JSONDecoder().decode(Card.self, from: Data(json.utf8))
        XCTAssertNil(card.syncAwakening)
    }
}
