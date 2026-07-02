import XCTest
@testable import PADDictionary

final class CompareStoreTests: XCTestCase {
    @MainActor
    func testAddAppendsUniqueId() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.add(1)
        XCTAssertEqual(store.ids, [1, 2])
    }

    @MainActor
    func testRemoveDeletesId() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.remove(1)
        XCTAssertEqual(store.ids, [2])
    }

    @MainActor
    func testToggleAddsWhenAbsentRemovesWhenPresent() {
        let store = CompareStore()
        store.toggle(1)
        XCTAssertEqual(store.ids, [1])
        store.toggle(1)
        XCTAssertEqual(store.ids, [])
    }

    @MainActor
    func testClearEmptiesIds() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.clear()
        XCTAssertTrue(store.ids.isEmpty)
    }

    @MainActor
    func testContainsReflectsMembership() {
        let store = CompareStore()
        XCTAssertFalse(store.contains(1))
        store.add(1)
        XCTAssertTrue(store.contains(1))
    }
}
