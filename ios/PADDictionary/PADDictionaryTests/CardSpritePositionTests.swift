import XCTest
@testable import PADDictionary

final class CardSpritePositionTests: XCTestCase {
    func testFirstCardIsSheetOneTopLeft() {
        let pos = CardSprite.position(forCardId: 1)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_001.webp", column: 0, row: 0))
    }

    func testCard100IsLastSlotOfSheetOne() {
        let pos = CardSprite.position(forCardId: 100)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_001.webp", column: 9, row: 9))
    }

    func testCard101RollsOverToSheetTwo() {
        let pos = CardSprite.position(forCardId: 101)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_002.webp", column: 0, row: 0))
    }

    func testCard115IsRowOneColumnFourOfSheetTwo() {
        let pos = CardSprite.position(forCardId: 115)
        XCTAssertEqual(pos, CardSpritePosition(sheetFile: "CARDS_002.webp", column: 4, row: 1))
    }

    func testAttributeFrameMainOffset() {
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 0)?.x, 0)
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 0)?.y, 0)
        XCTAssertEqual(AttributeFramePosition.mainOffset(forAttr: 2)!.x, -2.04, accuracy: 0.0001)
        XCTAssertNil(AttributeFramePosition.mainOffset(forAttr: 6))
        XCTAssertNil(AttributeFramePosition.mainOffset(forAttr: -1))
    }

    func testAttributeFrameSubOffset() {
        XCTAssertEqual(AttributeFramePosition.subOffset(forAttr: 2)!.x, -2.04, accuracy: 0.0001)
        XCTAssertEqual(AttributeFramePosition.subOffset(forAttr: 2)!.y, -1.04, accuracy: 0.0001)
    }

    func testAttributeFrameThirdOffset() {
        XCTAssertEqual(AttributeFramePosition.thirdOffset(forAttr: 2)!.x, -2.04, accuracy: 0.0001)
        XCTAssertEqual(AttributeFramePosition.thirdOffset(forAttr: 2)!.y, -2.07, accuracy: 0.0001)
        XCTAssertNil(AttributeFramePosition.thirdOffset(forAttr: 6))
        XCTAssertNil(AttributeFramePosition.thirdOffset(forAttr: -1))
    }

    func testAwakeningSpriteOffset() {
        XCTAssertEqual(AwakeningSprite.yOffset(forAwakeningId: 0), 0)
        XCTAssertEqual(AwakeningSprite.yOffset(forAwakeningId: 143), -4576)
        XCTAssertNil(AwakeningSprite.yOffset(forAwakeningId: 144))
        XCTAssertNil(AwakeningSprite.yOffset(forAwakeningId: -1))
    }
}
