import Foundation

enum MatchMode {
    case and, or
}

enum SpecialSearchEngine {
    static func filter(_ cards: [Card], selectedKeys: Set<String>, mode: MatchMode, context: SpecialSearchContext) -> [Card] {
        guard !selectedKeys.isEmpty else { return cards }
        let selectedLeaves = SpecialSearchTree.leaves.filter { selectedKeys.contains($0.id) }
        switch mode {
        case .and:
            return cards.filter { card in selectedLeaves.allSatisfy { $0.matches(card, context) } }
        case .or:
            return cards.filter { card in selectedLeaves.contains { $0.matches(card, context) } }
        }
    }
}
