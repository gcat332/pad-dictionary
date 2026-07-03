import XCTest
@testable import PADDictionary

final class LatentAwakeningNamesTests: XCTestCase {
    func testKnownLatentAwakeningReturnsName() {
        XCTAssertEqual(LatentAwakeningNames.name(for: 1), "HP+")
    }

    func testUnknownLatentAwakeningFallsBackToNumberedLabel() {
        XCTAssertEqual(LatentAwakeningNames.name(for: 99999), "Latent Awakening 99999")
    }

    func testAllIdsIsSortedAndNonEmpty() {
        let ids = LatentAwakeningNames.allIds
        XCTAssertEqual(ids, ids.sorted())
        XCTAssertFalse(ids.isEmpty)
    }
}
