import XCTest
@testable import PADDictionary

private final class FakeGitHubSyncing: GitHubSyncing {
    var triggerError: Error?
    var pollResult: Result<WorkflowConclusion, Error> = .success(.success)
    var downloadError: Error?
    private(set) var downloadedTo: URL?

    func triggerUpdate() async throws {
        if let triggerError { throw triggerError }
    }

    func pollRunStatus() async throws -> WorkflowConclusion {
        try pollResult.get()
    }

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
    func testMissingTokenSurfacesReadableError() async {
        let fake = FakeGitHubSyncing()
        fake.triggerError = GitHubSyncError.missingToken
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .error("No GitHub token set. Add one in Settings."))
    }

    @MainActor
    func testWorkflowFailureSurfacesError() async {
        let fake = FakeGitHubSyncing()
        fake.pollResult = .success(.failure)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        if case .error = viewModel.state {
            // expected
        } else {
            XCTFail("expected .error state, got \(viewModel.state)")
        }
    }
}
