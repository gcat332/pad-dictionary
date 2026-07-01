import XCTest
@testable import PADDictionary

final class GitHubSyncServiceTests: XCTestCase {
    private let keychain = KeychainStore()

    override func tearDown() {
        keychain.delete()
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testTriggerUpdateSucceedsOn204() async throws {
        keychain.save(token: "ghp_test")
        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertTrue(request.url!.path.hasSuffix("/actions/workflows/update-data.yml/dispatches"))
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer ghp_test")
            let response = HTTPURLResponse(url: request.url!, statusCode: 204, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        try await service.triggerUpdate()
    }

    func testTriggerUpdateThrowsMissingTokenWhenNoneSaved() async {
        keychain.delete()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            try await service.triggerUpdate()
            XCTFail("expected missingToken error")
        } catch GitHubSyncError.missingToken {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }

    func testTriggerUpdateThrowsUnauthorizedOn401() async {
        keychain.save(token: "ghp_bad")
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 401, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            try await service.triggerUpdate()
            XCTFail("expected unauthorized error")
        } catch GitHubSyncError.unauthorized {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }

    func testPollRunStatusWaitsThenReturnsConclusion() async throws {
        keychain.save(token: "ghp_test")
        var callCount = 0
        MockURLProtocol.requestHandler = { request in
            callCount += 1
            XCTAssertTrue(request.url!.path.hasSuffix("/actions/workflows/update-data.yml/runs"))
            let status = callCount == 1 ? "in_progress" : "completed"
            let conclusion = callCount == 1 ? "null" : "\"success\""
            let body = """
            {"workflow_runs":[{"id":1,"status":"\(status)","conclusion":\(conclusion),"created_at":"2026-07-01T00:00:00Z"}]}
            """.data(using: .utf8)!
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, body)
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        let conclusion = try await service.pollRunStatus(pollIntervalNanoseconds: 1_000_000, maxAttempts: 5)
        XCTAssertEqual(conclusion, .success)
        XCTAssertEqual(callCount, 2)
    }

    func testPollRunStatusTimesOutIfNeverCompleted() async {
        keychain.save(token: "ghp_test")
        MockURLProtocol.requestHandler = { request in
            let body = """
            {"workflow_runs":[{"id":1,"status":"in_progress","conclusion":null,"created_at":"2026-07-01T00:00:00Z"}]}
            """.data(using: .utf8)!
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, body)
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            _ = try await service.pollRunStatus(pollIntervalNanoseconds: 1_000_000, maxAttempts: 3)
            XCTFail("expected timedOut error")
        } catch GitHubSyncError.timedOut {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
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

        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        try await service.downloadLatestData(to: tempDir)

        let expectedPaths = [
            "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
            "monsters-info/skill_en.json", "monsters-info/skill_tr.json",
            "images/awoken.png", "images/icon-type.svg",
            "images/CARDFRAME2.png", "images/CARDFRAMEW.png",
            "images/cards_ja/1.webp"
        ]
        for path in expectedPaths {
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(path).path), "missing \(path)")
        }
    }
}
