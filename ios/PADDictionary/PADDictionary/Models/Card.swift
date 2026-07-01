import Foundation

struct StatRange: Codable, Equatable {
    let min: Int
    let max: Int
    let scale: Double
}

struct LocalizedNames: Codable, Equatable {
    let en: String?
    let cht: String?
    let chs: String?
    let ko: String?
}

struct Card: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let otLangName: LocalizedNames?
    let attrs: [Int]
    let types: [Int]
    let rarity: Int
    let cost: Int
    let maxLevel: Int
    let isEmpty: Bool
    let enabled: Bool
    let hp: StatRange
    let atk: StatRange
    let rcv: StatRange
    let activeSkillId: Int
    let leaderSkillId: Int
    let evoRootId: Int
    let awakenings: [Int]
    let superAwakenings: [Int]
    let canAssist: Bool
    let henshinTo: [Int]?
    let henshinFrom: [Int]?

    var displayName: String { otLangName?.en ?? name }
}
