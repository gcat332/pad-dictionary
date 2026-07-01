import Foundation

struct FilterState: Equatable {
    var attr: [Set<Int>] = [[], [], []]
    var types: Set<Int> = []
    var rarities: Set<Int> = []
    var awakenings: [Int] = []
    var includeSuper: Bool = true
    var canAssistOnly: Bool = false

    func matches(_ card: Card) -> Bool {
        for slot in 0..<3 {
            guard !attr[slot].isEmpty else { continue }
            guard slot < card.attrs.count, attr[slot].contains(card.attrs[slot]) else { return false }
        }
        if !types.isEmpty, !card.types.contains(where: { types.contains($0) }) { return false }
        if !rarities.isEmpty, !rarities.contains(card.rarity) { return false }
        if !awakenings.isEmpty {
            let pool = includeSuper ? card.awakenings + card.superAwakenings : card.awakenings
            var have: [Int: Int] = [:]
            for a in pool { have[a, default: 0] += 1 }
            var need: [Int: Int] = [:]
            for a in awakenings { need[a, default: 0] += 1 }
            for (id, count) in need where (have[id] ?? 0) < count { return false }
        }
        if canAssistOnly && !card.canAssist { return false }
        return true
    }
}
