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
}
