import XCTest
@testable import PADDictionary

final class BadgeNamesTests: XCTestCase {
    func testKnownBadgeReturnsNameAndEffect() {
        XCTAssertEqual(BadgeNames.name(for: 15), "マーベル強化")
        XCTAssertEqual(BadgeNames.effect(for: 15), "+50% ATK, +15% HP/RCV for this collab's characters")
    }

    func testUnknownBadgeReturnsNil() {
        XCTAssertNil(BadgeNames.name(for: 99999))
        XCTAssertNil(BadgeNames.effect(for: 99999))
        XCTAssertNil(BadgeNames.icon(for: 99999))
    }

    func testKnownBadgeIconLoadsFromBundle() {
        XCTAssertNotNil(BadgeNames.icon(for: 15))
    }
}
