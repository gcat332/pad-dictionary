import Foundation

typealias SkillLookup = [Int: Skill]

struct CardSort {
    let id: String
    let label: String
    let compare: (Card, Card, SkillLookup) -> Bool

    static let all: [CardSort] = [
        CardSort(id: "id", label: "Card ID") { a, b, _ in a.id < b.id },
        CardSort(id: "rarity", label: "Rarity") { a, b, _ in a.rarity < b.rarity },
        CardSort(id: "cost", label: "Cost") { a, b, _ in a.cost < b.cost },
        CardSort(id: "attr", label: "Attribute") { a, b, _ in
            let a0 = a.attrs.first ?? -1
            let b0 = b.attrs.first ?? -1
            if a0 != b0 { return a0 < b0 }
            let a1 = a.attrs.count > 1 ? a.attrs[1] : -1
            let b1 = b.attrs.count > 1 ? b.attrs[1] : -1
            return a1 < b1
        },
        CardSort(id: "hp", label: "HP") { a, b, _ in a.hp.max < b.hp.max },
        CardSort(id: "atk", label: "ATK") { a, b, _ in a.atk.max < b.atk.max },
        CardSort(id: "rcv", label: "RCV") { a, b, _ in a.rcv.max < b.rcv.max },
        CardSort(id: "cd", label: "Skill CD") { a, b, skills in
            let cdA = skills[a.activeSkillId]?.initialCooldown ?? 0
            let cdB = skills[b.activeSkillId]?.initialCooldown ?? 0
            return cdA < cdB
        },
    ]
}
