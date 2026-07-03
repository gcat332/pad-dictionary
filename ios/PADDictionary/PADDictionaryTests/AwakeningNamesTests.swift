import XCTest
@testable import PADDictionary

final class AwakeningNamesTests: XCTestCase {
    func testKnownAwakeningReturnsBundledName() {
        XCTAssertEqual(AwakeningNames.name(for: 1), "Enhanced HP")
    }

    func testUnknownAwakeningFallsBackToNumberedLabel() {
        XCTAssertEqual(AwakeningNames.name(for: 99999), "Awoken 99999")
    }
}
