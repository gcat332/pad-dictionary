import XCTest
@testable import PADDictionary

final class SettingsViewModelTests: XCTestCase {
    private let keychain = KeychainStore()

    override func tearDown() {
        keychain.delete()
        super.tearDown()
    }

    @MainActor
    func testSaveStoresTokenInKeychain() {
        let viewModel = SettingsViewModel(keychain: keychain)
        viewModel.tokenInput = "ghp_abc"
        viewModel.save()
        XCTAssertTrue(viewModel.isSaved)
        XCTAssertEqual(keychain.read(), "ghp_abc")
    }

    @MainActor
    func testClearRemovesTokenFromKeychain() {
        keychain.save(token: "ghp_abc")
        let viewModel = SettingsViewModel(keychain: keychain)
        XCTAssertTrue(viewModel.isSaved)
        viewModel.clear()
        XCTAssertFalse(viewModel.isSaved)
        XCTAssertNil(keychain.read())
    }
}
