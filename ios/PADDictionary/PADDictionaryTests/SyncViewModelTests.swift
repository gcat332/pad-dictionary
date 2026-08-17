import XCTest
@testable import PADDictionary

private final class FakeGitHubSyncing: GitHubSyncing {
    var downloadError: Error?
    private(set) var downloadedTo: URL?

    func downloadLatestData(to directory: URL) async throws {
        if let downloadError { throw downloadError }
        downloadedTo = directory
    }
}

final class SyncViewModelTests: XCTestCase {
    private var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    @MainActor
    func testSuccessfulSyncEndsInDoneAndMarksDataStoreSynced() async {
        let fake = FakeGitHubSyncing()
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .done)
        XCTAssertNotNil(dataStore.lastSyncedAt)
        XCTAssertEqual(fake.downloadedTo, tempDir)
    }

    @MainActor
    func testDownloadFailureSurfacesReadableError() async {
        let fake = FakeGitHubSyncing()
        struct StubError: LocalizedError { var errorDescription: String? { "network unreachable" } }
        fake.downloadError = StubError()
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .error("network unreachable"))
    }
}
