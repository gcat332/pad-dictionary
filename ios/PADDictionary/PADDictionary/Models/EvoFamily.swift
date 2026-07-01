import Foundation

func evoFamily(of card: Card, in cards: [Card]) -> [Card] {
    let byId = Dictionary(uniqueKeysWithValues: cards.map { ($0.id, $0) })
    var seen: Set<Int> = [card.id]
    var queue: [Card] = [card]

    while !queue.isEmpty && seen.count < 40 {
        let current = queue.removeFirst()
        var related: [Int] = []
        if current.evoRootId > 0 {
            for candidate in cards where candidate.evoRootId == current.evoRootId {
                related.append(candidate.id)
            }
        }
        related.append(contentsOf: current.henshinTo ?? [])
        related.append(contentsOf: current.henshinFrom ?? [])

        for id in related where !seen.contains(id) {
            if let match = byId[id] {
                seen.insert(id)
                queue.append(match)
            }
        }
    }

    return seen.compactMap { byId[$0] }
}
