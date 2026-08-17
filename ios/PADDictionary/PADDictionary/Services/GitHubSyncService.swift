import Foundation

protocol GitHubSyncing {
    func downloadLatestData(to directory: URL) async throws
}

enum GitHubSyncError: Error, Equatable, LocalizedError {
    case invalidResponse
    case unexpectedStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Couldn't reach GitHub, or it returned an unexpected response. Try again in a few minutes."
        case .unexpectedStatus(let code):
            return "GitHub returned an unexpected status (\(code))."
        }
    }
}

private struct GitHubContentEntry: Codable {
    let name: String
}

final class GitHubSyncService: GitHubSyncing {
    let owner = "gcat332"
    let repo = "pad-dictionary"

    private let session: URLSession

    private static let dataFiles = [
        "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
        "monsters-info/skill_en.json", "monsters-info/skill_tr.json"
    ]
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]

    init(session: URLSession = .shared) {
        self.session = session
    }

    private func listSpriteFiles() async throws -> [String] {
        let request = URLRequest(url: URL(string: "https://api.github.com/repos/\(owner)/\(repo)/contents/images/cards_ja")!)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
        guard http.statusCode == 200 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
        let entries = try JSONDecoder().decode([GitHubContentEntry].self, from: data)
        return entries.map { "images/cards_ja/\($0.name)" }
    }

    private func downloadFile(remotePath: String, into directory: URL) async throws {
        let url = URL(string: "https://raw.githubusercontent.com/\(owner)/\(repo)/main/\(remotePath)")!
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
        guard http.statusCode == 200 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
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
