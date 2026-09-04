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
    let sha: String
    let type: String
}

final class GitHubSyncService: GitHubSyncing {
    let owner = "gcat332"
    let repo = "pad-dictionary"

    private let session: URLSession

    private static let dataFiles = [
        "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
        "monsters-info/skill_en.json", "monsters-info/skill_tr.json",
        "monsters-info/card-updates.json"
    ]
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]
    private static let manifestFileName = "sync-manifest.json"

    init(session: URLSession = .shared) {
        self.session = session
    }

    /// Lists the files (and subdirectories) GitHub reports for a repo-relative directory
    /// path. Assumes fewer than 1000 entries (GitHub's un-paginated contents API limit) —
    /// true today for all three directories this service lists.
    private func listDirectory(path: String) async throws -> [GitHubContentEntry] {
        let request = URLRequest(url: URL(string: "https://api.github.com/repos/\(owner)/\(repo)/contents/\(path)")!)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
        guard http.statusCode == 200 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
        return try JSONDecoder().decode([GitHubContentEntry].self, from: data)
    }

    /// Builds the remote SHA map (repo-relative path -> blob sha) by listing the three
    /// directories that hold every wanted file, and returns the current sprite file list
    /// discovered under `images/cards_ja`.
    private func fetchRemoteState() async throws -> (shaByPath: [String: String], spriteFiles: [String]) {
        var shaByPath: [String: String] = [:]

        let cardsJaEntries = try await listDirectory(path: "images/cards_ja")
        var spriteFiles: [String] = []
        for entry in cardsJaEntries where entry.type == "file" {
            let path = "images/cards_ja/\(entry.name)"
            shaByPath[path] = entry.sha
            spriteFiles.append(path)
        }

        let monstersInfoEntries = try await listDirectory(path: "monsters-info")
        for entry in monstersInfoEntries where entry.type == "file" {
            shaByPath["monsters-info/\(entry.name)"] = entry.sha
        }

        let imagesEntries = try await listDirectory(path: "images")
        for entry in imagesEntries where entry.type == "file" {
            shaByPath["images/\(entry.name)"] = entry.sha
        }

        return (shaByPath, spriteFiles)
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

    private static func loadManifest(at url: URL) -> [String: String] {
        guard let data = try? Data(contentsOf: url),
              let manifest = try? JSONDecoder().decode([String: String].self, from: data) else {
            return [:]
        }
        return manifest
    }

    func downloadLatestData(to directory: URL) async throws {
        let (remoteShaByPath, spriteFiles) = try await fetchRemoteState()
        let allPaths = Self.dataFiles + Self.fixedImageFiles + spriteFiles

        let manifestURL = directory.appendingPathComponent(Self.manifestFileName)
        let existingManifest = Self.loadManifest(at: manifestURL)

        // Download unless the manifest sha matches the remote sha AND the file is
        // still present on disk. A path missing from the remote listings has no known
        // sha to compare against, so it keeps today's behavior: attempt the download.
        let pathsToDownload = allPaths.filter { path in
            guard let remoteSha = remoteShaByPath[path],
                  existingManifest[path] == remoteSha,
                  FileManager.default.fileExists(atPath: directory.appendingPathComponent(path).path)
            else {
                return true
            }
            return false
        }

        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        for path in pathsToDownload {
            try await downloadFile(remotePath: path, into: tempDir)
        }

        for path in pathsToDownload {
            let dest = directory.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: dest.path) {
                try FileManager.default.removeItem(at: dest)
            }
            try FileManager.default.moveItem(at: tempDir.appendingPathComponent(path), to: dest)
        }

        var updatedManifest = existingManifest
        for path in allPaths {
            if let sha = remoteShaByPath[path] {
                updatedManifest[path] = sha
            }
        }
        let manifestData = try JSONEncoder().encode(updatedManifest)
        try manifestData.write(to: manifestURL)
    }
}
