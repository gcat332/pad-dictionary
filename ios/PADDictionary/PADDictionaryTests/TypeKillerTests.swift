import XCTest
@testable import PADDictionary

final class TypeKillerTests: XCTestCase {
    func testEntryLookupByType() {
        let entry = TypeKiller.entry(forType: 5)
        XCTAssertEqual(entry?.awoken, 32)
        XCTAssertEqual(entry?.latent, 20)
        XCTAssertEqual(entry?.typeKiller, [7])
    }

    func testAllowableLatentIncludesOwnTypeKillersPlusTheFourSpecials() {
        // type 1 (balanced): typeKiller = [5,4,7,8,1,6,2,3], plus the 4 specials [0,12,14,15]
        let entry = TypeKiller.entry(forType: 1)
        let expectedLatents = [5, 4, 7, 8, 1, 6, 2, 3, 0, 12, 14, 15].compactMap { TypeKiller.entry(forType: $0)?.latent }
        XCTAssertEqual(entry?.allowableLatent, expectedLatents)
    }

    func testUnknownTypeReturnsNil() {
        XCTAssertNil(TypeKiller.entry(forType: 999))
    }

    func testSpecialProtectTypeHasSentinelAwokenAndLatent() {
        let entry = TypeKiller.entry(forType: 9)
        XCTAssertEqual(entry?.awoken, -1)
        XCTAssertEqual(entry?.latent, -1)
    }
}
