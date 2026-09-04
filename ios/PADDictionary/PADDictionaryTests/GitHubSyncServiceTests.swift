import XCTest
@testable import PADDictionary

final class GitHubSyncServiceTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        MockURLProtocol.recordedRequests = []
        super.tearDown()
    }

    // MARK: - Mock GitHub server helpers

    private struct FileEntry {
        let name: String
        let sha: String
    }

    private static let dataFileEntries = [
        FileEntry(name: "mon_ja.json", sha: "sha-mon-ja"),
        FileEntry(name: "skill_ja.json", sha: "sha-skill-ja"),
        FileEntry(name: "skill_en.json", sha: "sha-skill-en"),
        FileEntry(name: "skill_tr.json", sha: "sha-skill-tr"),
        FileEntry(name: "card-updates.json", sha: "sha-card-updates")
    ]
    private static let fixedImageEntries = [
        FileEntry(name: "awoken.png", sha: "sha-awoken"),
        FileEntry(name: "icon-orbs.png", sha: "sha-icon-orbs"),
        FileEntry(name: "icon-type.svg", sha: "sha-icon-type"),
        FileEntry(name: "CARDFRAME2.png", sha: "sha-cardframe2"),
        FileEntry(name: "CARDFRAMEW.png", sha: "sha-cardframew")
    ]
    private static let spriteEntries = [
        FileEntry(name: "1.webp", sha: "sha-sprite-1"),
        FileEntry(name: "2.webp", sha: "sha-sprite-2")
    ]

    private static func expectedShaMap(sprites: [FileEntry] = spriteEntries) -> [String: String] {
        var map: [String: String] = [:]
        for entry in dataFileEntries { map["monsters-info/\(entry.name)"] = entry.sha }
        for entry in fixedImageEntries { map["images/\(entry.name)"] = entry.sha }
        for entry in sprites { map["images/cards_ja/\(entry.name)"] = entry.sha }
        return map
    }

    private static func jsonArray(_ entries: [FileEntry]) -> Data {
        let items = entries.map { #"{"name":"\#($0.name)","sha":"\#($0.sha)","type":"file"}"# }
        return "[\(items.joined(separator: ","))]".data(using: .utf8)!
    }

    /// Installs a mock handler that serves the three GitHub contents-listing endpoints
    /// (`images/cards_ja`, `monsters-info`, `images`) from the given entries, and serves
    /// raw.githubusercontent.com downloads with stub content — unless `failingRawSuffix`
    /// matches the request path, in which case it returns `failingStatus`.
    private func installMockServer(
        dataFiles: [FileEntry] = dataFileEntries,
        fixedImages: [FileEntry] = fixedImageEntries,
        sprites: [FileEntry] = spriteEntries,
        failingRawSuffix: String? = nil,
        failingStatus: Int = 500
    ) {
        MockURLProtocol.requestHandler = { request in
            let url = request.url!
            let path = url.path
            let ok = HTTPURLResponse(url: url, statusCode: 200, httpVersion: nil, headerFields: nil)!
            if url.host == "api.github.com" {
                if path.hasSuffix("/contents/images/cards_ja") {
                    return (ok, Self.jsonArray(sprites))
                } else if path.hasSuffix("/contents/monsters-info") {
                    return (ok, Self.jsonArray(dataFiles))
                } else if path.hasSuffix("/contents/images") {
                    return (ok, Self.jsonArray(fixedImages))
                }
                XCTFail("unexpected listing request: \(path)")
                return (HTTPURLResponse(url: url, statusCode: 404, httpVersion: nil, headerFields: nil)!, Data())
            }
            if let failingRawSuffix, path.hasSuffix(failingRawSuffix) {
                return (HTTPURLResponse(url: url, statusCode: failingStatus, httpVersion: nil, headerFields: nil)!, Data())
            }
            return (ok, Data("stub-\(path)".utf8))
        }
    }

    private func readManifest(in directory: URL) -> [String: String]? {
        let url = directory.appendingPathComponent("sync-manifest.json")
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode([String: String].self, from: data)
    }

    private func rawRequests() -> [URLRequest] {
        MockURLProtocol.recordedRequests.filter { $0.url?.host == "raw.githubusercontent.com" }
    }

    private func listingRequests() -> [URLRequest] {
        MockURLProtocol.recordedRequests.filter { $0.url?.host == "api.github.com" }
    }

    // MARK: - Tests (brief order)

    /// 1. Fresh sync (no manifest on disk) downloads all wanted files and writes a
    /// manifest whose entries match the mocked shas.
    func testFreshSyncDownloadsAllFilesAndWritesManifest() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        installMockServer()

        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        for path in Self.expectedShaMap().keys {
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(path).path), "missing \(path)")
        }
        XCTAssertEqual(readManifest(in: tempDir), Self.expectedShaMap())
    }

    /// 2. Second sync with identical shas and files present downloads zero files from
    /// raw.githubusercontent.com; the three api.github.com listing calls still happen.
    func testSecondSyncWithUnchangedShasDownloadsNothing() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        installMockServer()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        MockURLProtocol.recordedRequests = []
        try await service.downloadLatestData(to: tempDir)

        XCTAssertEqual(rawRequests().count, 0, "expected zero raw.githubusercontent.com requests on an unchanged sync")
        XCTAssertEqual(listingRequests().count, 3)
    }

    /// 3. One sprite's sha changed -> exactly that file is re-downloaded and the
    /// manifest entry updates.
    func testChangedSpriteShaRedownloadsOnlyThatFile() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        installMockServer()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        let updatedSprites = [
            FileEntry(name: "1.webp", sha: "sha-sprite-1-changed"),
            FileEntry(name: "2.webp", sha: "sha-sprite-2")
        ]
        MockURLProtocol.recordedRequests = []
        installMockServer(sprites: updatedSprites)
        try await service.downloadLatestData(to: tempDir)

        let raw = rawRequests()
        XCTAssertEqual(raw.count, 1)
        XCTAssertTrue(raw.first?.url?.path.hasSuffix("images/cards_ja/1.webp") == true)

        let manifest = readManifest(in: tempDir)
        XCTAssertEqual(manifest?["images/cards_ja/1.webp"], "sha-sprite-1-changed")
        XCTAssertEqual(manifest?["images/cards_ja/2.webp"], "sha-sprite-2")
    }

    /// 4. Sha unchanged but the local file was deleted -> that file is re-downloaded.
    func testUnchangedShaButMissingLocalFileRedownloads() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        installMockServer()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        let deletedPath = "monsters-info/mon_ja.json"
        try FileManager.default.removeItem(at: tempDir.appendingPathComponent(deletedPath))

        MockURLProtocol.recordedRequests = []
        try await service.downloadLatestData(to: tempDir)

        let raw = rawRequests()
        XCTAssertEqual(raw.count, 1)
        XCTAssertTrue(raw.first?.url?.path.hasSuffix(deletedPath) == true)
        XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(deletedPath).path))
    }

    /// 5. A download failure mid-sync (one raw URL returns 500) leaves the pre-existing
    /// manifest unchanged on disk.
    func testDownloadFailureMidSyncLeavesManifestUnchanged() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }
        installMockServer()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        let manifestBefore = readManifest(in: tempDir)
        XCTAssertNotNil(manifestBefore)

        let updatedSprites = [
            FileEntry(name: "1.webp", sha: "sha-sprite-1-changed"),
            FileEntry(name: "2.webp", sha: "sha-sprite-2")
        ]
        installMockServer(sprites: updatedSprites, failingRawSuffix: "images/cards_ja/1.webp", failingStatus: 500)

        do {
            try await service.downloadLatestData(to: tempDir)
            XCTFail("expected download failure")
        } catch GitHubSyncError.unexpectedStatus(500) {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }

        XCTAssertEqual(readManifest(in: tempDir), manifestBefore)
    }

    // MARK: - Preserved from before the SHA-manifest change

    func testDownloadLatestDataThrowsOnNon200() async {
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 404, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        do {
            try await service.downloadLatestData(to: FileManager.default.temporaryDirectory)
            XCTFail("expected unexpectedStatus error")
        } catch GitHubSyncError.unexpectedStatus(404) {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }
}
