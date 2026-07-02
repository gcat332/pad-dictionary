import XCTest
@testable import PADDictionary

final class BinTests: XCTestCase {
    func testUnflagsZeroIsEmpty() {
        XCTAssertEqual(Bin.unflags(0), [])
    }

    func testUnflagsDecodesSetBits() {
        XCTAssertEqual(Bin.unflags(0b101), [0, 2])
        XCTAssertEqual(Bin.unflags(0b111111), [0, 1, 2, 3, 4, 5])
    }

    func testNotNeighbourMasksAdjacentBits() {
        // JS: (0b111).notNeighbour() === 0b1000 (the bit immediately left of a 3-wide block)
        XCTAssertEqual((0b111).notNeighbour(), 0b1000)
    }
}
