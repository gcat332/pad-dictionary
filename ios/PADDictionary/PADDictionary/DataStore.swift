import Foundation
import Combine

@MainActor
final class DataStore: ObservableObject {
    @Published private(set) var cards: [Card] = []
    @Published private(set) var skillsJA: [Skill] = []
    @Published private(set) var skillsEN: [Skill] = []
    @Published private(set) var skillTranslations: [String: String] = [:]
    @Published private(set) var lastSyncedAt: Date?

    private let documentsDirectory: URL
    private let userDefaults: UserDefaults
    private let lastSyncedKey = "lastSyncedAt"

    init(documentsDirectory: URL, userDefaults: UserDefaults = .standard) {
        self.documentsDirectory = documentsDirectory
        self.userDefaults = userDefaults
        if let stored = userDefaults.object(forKey: lastSyncedKey) as? Date {
            lastSyncedAt = stored
        }
        reload()
    }

    func reload() {
        let decoder = JSONDecoder()
        func load<T: Decodable>(_ relativePath: String, as type: T.Type) -> T? {
            guard let data = try? Data(contentsOf: documentsDirectory.appendingPathComponent(relativePath)) else { return nil }
            return try? decoder.decode(type, from: data)
        }
        cards = load("monsters-info/mon_ja.json", as: [Card].self) ?? []
        skillsJA = load("monsters-info/skill_ja.json", as: [Skill].self) ?? []
        skillsEN = load("monsters-info/skill_en.json", as: [Skill].self) ?? []
        skillTranslations = load("monsters-info/skill_tr.json", as: [String: String].self) ?? [:]
    }

    func markSynced(at date: Date) {
        lastSyncedAt = date
        userDefaults.set(date, forKey: lastSyncedKey)
    }
}
