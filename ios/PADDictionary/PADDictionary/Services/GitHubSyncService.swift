import Foundation

enum GitHubSyncError: Error, Equatable {
    case missingToken
    case unauthorized
    case invalidResponse
    case unexpectedStatus(Int)
    case timedOut
}

final class GitHubSyncService {
    let owner = "gcat332"
    let repo = "pad-dictionary"
    let workflowFile = "update-data.yml"

    private let session: URLSession
    private let keychain: KeychainStore

    init(session: URLSession = .shared, keychain: KeychainStore = KeychainStore()) {
        self.session = session
        self.keychain = keychain
    }

    private func requireToken() throws -> String {
        guard let token = keychain.read(), !token.isEmpty else {
            throw GitHubSyncError.missingToken
        }
        return token
    }

    func triggerUpdate() async throws {
        let token = try requireToken()
        let url = URL(string: "https://api.github.com/repos/\(owner)/\(repo)/actions/workflows/\(workflowFile)/dispatches")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["ref": "main"])

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
        if http.statusCode == 401 { throw GitHubSyncError.unauthorized }
        guard http.statusCode == 204 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
    }
}
