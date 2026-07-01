import Foundation

enum GitHubSyncError: Error, Equatable {
    case missingToken
    case unauthorized
    case invalidResponse
    case unexpectedStatus(Int)
    case timedOut
}

enum WorkflowConclusion: String, Codable, Equatable {
    case success, failure, cancelled, skipped, neutral, stale
    case timedOut = "timed_out"
    case actionRequired = "action_required"
}

private struct WorkflowRun: Codable {
    let id: Int
    let status: String
    let conclusion: WorkflowConclusion?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, status, conclusion
        case createdAt = "created_at"
    }
}

private struct WorkflowRunsResponse: Codable {
    let workflowRuns: [WorkflowRun]

    enum CodingKeys: String, CodingKey {
        case workflowRuns = "workflow_runs"
    }
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

    func pollRunStatus(pollIntervalNanoseconds: UInt64 = 5_000_000_000, maxAttempts: Int = 60) async throws -> WorkflowConclusion {
        let token = try requireToken()
        let url = URL(string: "https://api.github.com/repos/\(owner)/\(repo)/actions/workflows/\(workflowFile)/runs?per_page=1")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")

        for _ in 0..<maxAttempts {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
            if http.statusCode == 401 { throw GitHubSyncError.unauthorized }
            guard http.statusCode == 200 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
            let decoded = try JSONDecoder().decode(WorkflowRunsResponse.self, from: data)
            if let run = decoded.workflowRuns.first, run.status == "completed" {
                return run.conclusion ?? .neutral
            }
            try await Task.sleep(nanoseconds: pollIntervalNanoseconds)
        }
        throw GitHubSyncError.timedOut
    }
}
