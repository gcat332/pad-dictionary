import Foundation

enum AwakeningNames {
    private static let names: [String: String] = {
        guard let url = Bundle.main.url(forResource: "awoken_names", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else {
            return [:]
        }
        return decoded
    }()

    static func name(for id: Int) -> String {
        names[String(id)] ?? "Awakening \(id)"
    }
}
