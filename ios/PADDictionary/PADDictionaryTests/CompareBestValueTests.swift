import XCTest
@testable import PADDictionary

final class CompareBestValueTests: XCTestCase {
    func testMarksSingleMax() {
        XCTAssertEqual(CompareBestValue.bestIndices([10, 30, 20]), [1])
    }

    func testMarksTies() {
        XCTAssertEqual(CompareBestValue.bestIndices([30, 10, 30]), [0, 2])
    }

    func testEmptyWhenOnlyOneValue() {
        XCTAssertEqual(CompareBestValue.bestIndices([42]), [])
    }

    func testEmptyForEmptyInput() {
        XCTAssertEqual(CompareBestValue.bestIndices([]), [])
    }
}
