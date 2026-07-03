import Foundation

struct CardSpritePosition: Equatable {
    let sheetFile: String
    let column: Int
    let row: Int
}

enum CardSprite {
    static let cardsPerSheet = 100
    static let columns = 10

    static func position(forCardId id: Int) -> CardSpritePosition {
        let sheetIndex = (id - 1) / cardsPerSheet + 1
        let sheetFile = "CARDS_\(String(format: "%03d", sheetIndex)).webp"
        let indexInSheet = (id - 1) % cardsPerSheet
        return CardSpritePosition(sheetFile: sheetFile, column: indexInSheet % columns, row: indexInSheet / columns)
    }
}

enum AttributeFramePosition {
    static func mainOffset(forAttr attr: Int) -> (x: Double, y: Double)? {
        guard attr >= 0, attr <= 4 else { return nil }
        return (x: -1.02 * Double(attr), y: 0)
    }

    static func subOffset(forAttr attr: Int) -> (x: Double, y: Double)? {
        guard attr >= 0, attr <= 4 else { return nil }
        return (x: -1.02 * Double(attr), y: -1.04)
    }

    static func thirdOffset(forAttr attr: Int) -> (x: Double, y: Double)? {
        guard attr >= 0, attr <= 4 else { return nil }
        return (x: -1.02 * Double(attr), y: -2.07)
    }
}

enum AwakeningSprite {
    static func yOffset(forAwakeningId id: Int) -> Double? {
        guard id >= 0, id <= 143 else { return nil }
        return -32 * Double(id)
    }
}
