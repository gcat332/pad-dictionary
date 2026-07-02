import Foundation

struct SpecialSearchContext {
    let cardsById: [Int: Card]
    let skillsJA: SkillLookup
}

struct SpecialSearchLeaf: Identifiable {
    let id: String
    let label: String
    let groupPath: [String]
    let matches: (Card, SpecialSearchContext) -> Bool
}

private let evoTypeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Evo type > Transform > No Transform", label: "No Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinFrom == nil && card.henshinTo == nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > After Transform", label: "After Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinFrom != nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Before Transform", label: "Before Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinTo != nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Not Before Transform", label: "Not Before Transform", groupPath: ["Evo type", "Transform"]) { card, _ in
        card.henshinTo == nil
    },
    SpecialSearchLeaf(id: "Evo type > Transform > Random Transform", label: "Random Transform", groupPath: ["Evo type", "Transform"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [236], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Evo type > Pixel Evo", label: "Pixel Evo", groupPath: ["Evo type"]) { card, _ in
        card.evoMaterials.contains(3826)
    },
    SpecialSearchLeaf(id: "Evo type > Super Ult Evo", label: "Super Ult Evo", groupPath: ["Evo type"]) { card, ctx in
        card.isUltEvo && (ctx.cardsById[card.evoBaseId]?.isUltEvo ?? false)
    },
    SpecialSearchLeaf(id: "Evo type > Evo from Weapon", label: "Evo from Weapon", groupPath: ["Evo type"]) { card, ctx in
        card.isUltEvo && (ctx.cardsById[card.evoBaseId]?.awakenings.contains(49) ?? false)
    },
    SpecialSearchLeaf(id: "Evo type > Ordeal Evo", label: "Ordeal Evo", groupPath: ["Evo type"]) { card, _ in
        card.evoMaterials.first == 0xFFFF
    },
]

private let awakeningLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Reduce Attr. Damage Awakening", label: "Any Reduce Attr. Damage Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 4 && $0 <= 8 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Killer Awakening", label: "Any Killer Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 31 && $0 <= 42 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Orbs Awakening", label: "Any Enhanced Orbs Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 14 && $0 <= 18) || $0 == 29 || ($0 >= 99 && $0 <= 104) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Rows Awakening", label: "Any Enhanced Rows Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 22 && $0 <= 26) || ($0 >= 116 && $0 <= 120) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Enhanced Combos Awakening", label: "Any Enhanced Combos Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { ($0 >= 73 && $0 <= 77) || ($0 >= 121 && $0 <= 125) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Multi Attr. Enhanced Awakening", label: "Any Multi Attr. Enhanced Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 == 44 || $0 == 51 || ($0 >= 79 && $0 <= 81) || $0 == 97 || ($0 >= 112 && $0 <= 114) }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Add Type Awakening", label: "Any Add Type Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 83 && $0 <= 90 }
    },
    SpecialSearchLeaf(id: "Awakenings > Kind of Awakening (No Super Awoken) > Any Change Sub Attr. Awakening", label: "Any Change Sub Attr. Awakening", groupPath: ["Awakenings", "Kind of Awakening (No Super Awoken)"]) { card, _ in
        card.awakenings.contains { $0 >= 91 && $0 <= 95 }
    },
    SpecialSearchLeaf(id: "Awakenings > Have Sync Awoken", label: "Have Sync Awoken", groupPath: ["Awakenings"]) { card, _ in
        (card.syncAwakening ?? 0) != 0
    },
    SpecialSearchLeaf(id: "Awakenings > Full Awakening (9 / 8 for weapon)", label: "Full Awakening (9 / 8 for weapon)", groupPath: ["Awakenings"]) { card, _ in
        card.awakenings.count >= (card.awakenings.contains(49) ? 8 : 9)
    },
    SpecialSearchLeaf(id: "Awakenings > Has, but not full Awakening", label: "Has, but not full Awakening", groupPath: ["Awakenings"]) { card, _ in
        card.awakenings.count > 0 && card.awakenings.count < (card.awakenings.contains(49) ? 8 : 9)
    },
]

enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves
}
