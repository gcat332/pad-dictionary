import Foundation

protocol GitHubSyncing {
    func triggerUpdate() async throws
    func pollRunStatus() async throws -> WorkflowConclusion
    func downloadLatestData(to directory: URL) async throws
}

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

private struct GitHubContentEntry: Codable {
    let name: String
}

final class GitHubSyncService: GitHubSyncing {
    let owner = "gcat332"
    let repo = "pad-dictionary"
    let workflowFile = "update-data.yml"

    private let session: URLSession
    private let keychain: KeychainStore

    private static let dataFiles = [
        "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
        "monsters-info/skill_en.json", "monsters-info/skill_tr.json"
    ]
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]

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

    func pollRunStatus() async throws -> WorkflowConclusion {
        try await pollRunStatus(pollIntervalNanoseconds: 5_000_000_000, maxAttempts: 60)
    }

    private func listSpriteFiles() async throws -> [String] {
        var request = URLRequest(url: URL(string: "https://api.github.com/repos/\(owner)/\(repo)/contents/images/cards_ja")!)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        if let token = try? requireToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw GitHubSyncError.invalidResponse }
        let entries = try JSONDecoder().decode([GitHubContentEntry].self, from: data)
        return entries.map { "images/cards_ja/\($0.name)" }
    }

    private func downloadFile(remotePath: String, into directory: URL) async throws {
        let url = URL(string: "https://raw.githubusercontent.com/\(owner)/\(repo)/main/\(remotePath)")!
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw GitHubSyncError.invalidResponse }
        let dest = directory.appendingPathComponent(remotePath)
        try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: dest)
    }

    func downloadLatestData(to directory: URL) async throws {
        let spriteFiles = try await listSpriteFiles()
        let allPaths = Self.dataFiles + Self.fixedImageFiles + spriteFiles

        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        for path in allPaths {
            try await downloadFile(remotePath: path, into: tempDir)
        }

        for path in allPaths {
            let dest = directory.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: dest.path) {
                try FileManager.default.removeItem(at: dest)
            }
            try FileManager.default.moveItem(at: tempDir.appendingPathComponent(path), to: dest)
        }
    }
}
