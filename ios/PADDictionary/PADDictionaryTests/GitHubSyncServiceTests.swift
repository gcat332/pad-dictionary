import XCTest
@testable import PADDictionary

final class GitHubSyncServiceTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testDownloadLatestDataWritesAllFilesIntoDirectory() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        MockURLProtocol.requestHandler = { request in
            let path = request.url!.path
            if path.hasSuffix("/contents/images/cards_ja") {
                let body = #"[{"name":"1.webp","download_url":"https://example.com/1.webp"}]"#.data(using: .utf8)!
                let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
                return (response, body)
            }
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, Data("stub-\(path)".utf8))
        }

        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        let expectedPaths = [
            "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
            "monsters-info/skill_en.json", "monsters-info/skill_tr.json",
            "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
            "images/CARDFRAME2.png", "images/CARDFRAMEW.png",
            "images/cards_ja/1.webp"
        ]
        for path in expectedPaths {
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(path).path), "missing \(path)")
        }
    }

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
