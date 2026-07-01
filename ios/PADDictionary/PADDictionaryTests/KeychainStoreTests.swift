import XCTest
@testable import PADDictionary

final class KeychainStoreTests: XCTestCase {
    func testSaveReadDeleteRoundTrip() {
        let store = KeychainStore()
        store.delete()
        XCTAssertNil(store.read())

        store.save(token: "ghp_test123")
        XCTAssertEqual(store.read(), "ghp_test123")

        store.save(token: "ghp_replaced")
        XCTAssertEqual(store.read(), "ghp_replaced")

        store.delete()
        XCTAssertNil(store.read())
    }
}
