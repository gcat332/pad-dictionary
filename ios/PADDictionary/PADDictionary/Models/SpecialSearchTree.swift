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

private let othersSearchLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get Orbs skin", label: "Will get Orbs skin", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.orbSkinOrBgmId > 0 && card.orbSkinOrBgmId < 10000
    },
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get BGM", label: "Will get BGM", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.orbSkinOrBgmId >= 10000
    },
    SpecialSearchLeaf(id: "Others Search > Sold in stores > Will get Team Badge", label: "Will get Team Badge", groupPath: ["Others Search", "Sold in stores"]) { card, _ in
        card.badgeId != 0
    },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Original Name", label: "Show Original Name", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Feed EXP", label: "Show Feed EXP", groupPath: ["Others Search", "Only Additional display"]) { card, _ in card.feedExp > 0 },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Sell Price", label: "Show Sell Price", groupPath: ["Others Search", "Only Additional display"]) { card, _ in card.sellPrice > 0 },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Sell Monster Point(MP)", label: "Show Sell Monster Point(MP)", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Types", label: "Show Card Types", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Cost", label: "Show Card Cost", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Only Additional display > Show Card Group ID", label: "Show Card Group ID", groupPath: ["Others Search", "Only Additional display"]) { _, _ in true },
    SpecialSearchLeaf(id: "Others Search > Water Att. & Attacker Type(Tanjiro)", label: "Water Att. & Attacker Type(Tanjiro)", groupPath: ["Others Search"]) { card, _ in
        card.attrs.contains(1) || card.types.contains(6)
    },
    SpecialSearchLeaf(id: "Others Search > Level limit unable break", label: "Level limit unable break", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr == 0
    },
    SpecialSearchLeaf(id: "Others Search > Able to lv110, but no Super Awoken", label: "Able to lv110, but no Super Awoken", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr > 0 && card.superAwakenings.isEmpty
    },
    SpecialSearchLeaf(id: "Others Search > Raise ≥50% at lv110", label: "Raise ≥50% at lv110", groupPath: ["Others Search"]) { card, _ in
        card.limitBreakIncr >= 50
    },
    SpecialSearchLeaf(id: "Others Search > Max level is lv1", label: "Max level is lv1", groupPath: ["Others Search"]) { card, _ in
        card.maxLevel == 1
    },
    SpecialSearchLeaf(id: "Others Search > Tradable(Less than 100MP)", label: "Tradable(Less than 100MP)", groupPath: ["Others Search"]) { card, _ in
        card.sellMP < 100
    },
    SpecialSearchLeaf(id: "Others Search > Have 3 types", label: "Have 3 types", groupPath: ["Others Search"]) { card, _ in
        card.types.filter { $0 >= 0 }.count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > Have 3 Attrs", label: "Have 3 Attrs", groupPath: ["Others Search"]) { card, _ in
        card.attrs.filter { $0 >= 0 && $0 < 6 }.count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > 3 attrs are different", label: "3 attrs are different", groupPath: ["Others Search"]) { card, _ in
        Set(card.attrs.filter { $0 >= 0 && $0 < 6 }).count >= 3
    },
    SpecialSearchLeaf(id: "Others Search > All Latent TAMADRA", label: "All Latent TAMADRA", groupPath: ["Others Search"]) { card, _ in
        card.latentAwakeningId > 0
    },
    SpecialSearchLeaf(id: "Others Search > Stacked material", label: "Stacked material", groupPath: ["Others Search"]) { card, _ in
        card.stackable
    },
    SpecialSearchLeaf(id: "Others Search > Not stacked material", label: "Not stacked material", groupPath: ["Others Search"]) { card, _ in
        !card.stackable && card.types.contains { [0, 12, 14, 15].contains($0) }
    },
    SpecialSearchLeaf(id: "Others Search > Hava banner when use skill", label: "Hava banner when use skill", groupPath: ["Others Search"]) { card, _ in
        card.skillBanner
    },
]

private let leaderMatchingStyleLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > 5 Orbs including enhanced Matching", label: "5 Orbs including enhanced Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [150], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Cross(十) of Heal Orbs", label: "Cross(十) of Heal Orbs", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [151, 209], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacked Magnifications of Cross(十)", label: "Stacked Magnifications of Cross(十)", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [157], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Less remain on the board", label: "Less remain on the board", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [177], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(5) ? skill.params[5] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacking multiplier of Matching", label: "Stacking multiplier of Matching", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [235], skills: ctx.skillsJA) else { return false }
        let param3 = skill.params.indices.contains(3) ? skill.params[3] : 0
        return param3 != 0 && param3 != 100
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Awakening active", label: "Awakening active", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [271], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Matching Style > Stacking multiplier of Awakening active", label: "Stacking multiplier of Awakening active", groupPath: ["Leader Skills", "Matching Style"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [280], skills: ctx.skillsJA)
    },
]

private let leaderRestrictionLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > [7×6 board]", label: "[7×6 board]", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [162, 186], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > [No skyfall]", label: "[No skyfall]", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [163, 177], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Unable to less match", label: "Unable to less match", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [158], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate member ID", label: "Designate member ID", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [125], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate collab ID", label: "Designate collab ID", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [175], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Designate Evo type", label: "Designate Evo type", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [203], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Floating rate based on the number of attrs/types", label: "Floating rate based on the number of attrs/types", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [229], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Limit the total rarity of the team", label: "Limit the total rarity of the team", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [217], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Restriction/Bind > Team's rarity required different", label: "Team's rarity required different", groupPath: ["Leader Skills", "Restriction/Bind"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [245], skills: ctx.skillsJA)
    },
]

private let leaderExtraEffectsLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Item Drop rate", label: "Increase Item Drop rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [53], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Coin rate", label: "Increase Coin rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [54], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Exp rate", label: "Increase Exp rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [148], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Plus Point rate", label: "Increase Plus Point rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [264], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Increased drop rewards > Increase Part Break drop rate", label: "Increase Part Break drop rate", groupPath: ["Leader Skills", "Extra Effects", "Increased drop rewards"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [265], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Move time changes", label: "Move time changes", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [15, 185], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Fixed move time", label: "Fixed move time", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [178], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Impart Awakenings", label: "Impart Awakenings", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [213], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Bonus attack when matching Orbs", label: "Bonus attack when matching Orbs", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [12], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Recovers HP when matching Orbs", label: "Recovers HP when matching Orbs", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [13], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Reduce damage when rcv", label: "Reduce damage when rcv", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [198], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Recover Awkn Skill bind when rcv", label: "Recover Awkn Skill bind when rcv", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.leaderSkillId, types: [198], skills: ctx.skillsJA) else { return false }
        return (skill.params.indices.contains(3) ? skill.params[3] : 0) != 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Counterattack", label: "Counterattack", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [41], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Voids Poison dmg", label: "Voids Poison dmg", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [197], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Resolve", label: "Resolve", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [14], skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Leader Skills > Extra Effects > Prediction of falling (LS)", label: "Prediction of falling (LS)", groupPath: ["Leader Skills", "Extra Effects", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.leaderSkillId, types: [254], skills: ctx.skillsJA)
    },
]

private let leaderHPScaleLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [3, ∞)", label: "HP Scale [3, ∞)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) >= 3
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [2, 3)", label: "HP Scale [2, 3)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale >= 2 && scale < 3
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [1.5, 2)", label: "HP Scale [1.5, 2)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale >= 1.5 && scale < 2
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale (1, 1.5)", label: "HP Scale (1, 1.5)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA)
        return scale > 1 && scale < 1.5
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale == 1", label: "HP Scale == 1", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) == 1
    },
    SpecialSearchLeaf(id: "Leader Skills > HP Scale > HP Scale [0, 1)", label: "HP Scale [0, 1)", groupPath: ["Leader Skills", "HP Scale"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.hpScale(skill, skills: ctx.skillsJA) < 1
    },
]

private let leaderReduceShieldLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [75%, 100%]", label: "Reduce Damage [75%, 100%]", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) >= 0.75
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [50%, 75%)", label: "Reduce Damage [50%, 75%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale >= 0.5 && scale < 0.75
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage [25%, 50%)", label: "Reduce Damage [25%, 50%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale >= 0.25 && scale < 0.5
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage (0%, 25%)", label: "Reduce Damage (0%, 25%)", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        let scale = LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA)
        return scale > 0 && scale < 0.25
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage == 0", label: "Reduce Damage == 0", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) == 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Must all Att.", label: "Reduce Damage - Must all Att.", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, allAttr: true, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Exclude HP-line", label: "Reduce Damage - Exclude HP-line", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, noHPneed: true, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Exclude chance", label: "Reduce Damage - Exclude chance", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        // Web's 4th argument to getReduceScale here is a no-op (function only declares 2 params) — ported as identical to the base call.
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScale(skill, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Leader Skills > Reduce Shield > Reduce Damage - Unconditional", label: "Reduce Damage - Unconditional", groupPath: ["Leader Skills", "Reduce Shield"]) { card, ctx in
        guard let skill = ctx.skillsJA[card.leaderSkillId] else { return false }
        return LeaderSkillScale.reduceScaleUnconditional(skill, skills: ctx.skillsJA) > 0
    },
]

private let activeVoidsAbsorptionLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Combination > 2 Voids (attr. & damage)", label: "2 Voids (attr. & damage)", groupPath: ["Active Skill", "Voids Absorption", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA)
        return t.attrAbsorb > 0 && t.damageAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Combination > 3 Voids (attr. & damage & void)", label: "3 Voids (attr. & damage & void)", groupPath: ["Active Skill", "Voids Absorption", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA)
        return t.attrAbsorb > 0 && t.damageAbsorb > 0 && t.damageVoid > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids attribute absorption", label: "Voids attribute absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).attrAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids combo absorption", label: "Voids combo absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).comboAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Voids damage absorption", label: "Voids damage absorption", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).damageAbsorb > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Voids Absorption > Pierce through damage void", label: "Pierce through damage void", groupPath: ["Active Skill", "Voids Absorption"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).damageVoid > 0
    },
]

private let activeRecoversBindLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Combination > 3 Unbinds", label: "3 Unbinds", groupPath: ["Active Skill", "Recovers Bind Status", "Combination"]) { card, ctx in
        let t = ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA)
        return t.normal > 0 && t.awakenings > 0 && t.matches > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind menber bind", label: "Unbind menber bind", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).normal > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind awakenings bind", label: "Unbind awakenings bind", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).awakenings > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Recovers Bind Status > Other > Unbind unmatchable", label: "Unbind unmatchable", groupPath: ["Active Skill", "Recovers Bind Status", "Other"]) { card, ctx in
        ActiveSkillEffects.unbindTurns(card, skills: ctx.skillsJA).matches > 0
    },
]

private let activePlayerHPChangeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Heal after turn", label: "Heal after turn", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [179], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Heal immediately", label: "Heal immediately", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        let h = ActiveSkillEffects.healImmediatelyRate(card, skills: ctx.skillsJA)
        return h.vampire != 0 || h.selfRcv != 0 || h.constValue != 0 || h.scale != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Change team maximum HP", label: "Change team maximum HP", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [237], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Player's HP change > Damage self", label: "Damage self", groupPath: ["Active Skill", "Player's HP change"]) { card, ctx in
        ActiveSkillEffects.damageSelfRate(card, skills: ctx.skillsJA) > 0
    },
]

private let activeBuffLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Buff > RCV rate change", label: "RCV rate change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        ActiveSkillEffects.rcvBuffSkillType(card, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Team ATK rate change", label: "Team ATK rate change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        ActiveSkillEffects.atkBuffSkillType(card, skills: ctx.skillsJA) > 0
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Move time change", label: "Move time change", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [132], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Adds combo", label: "Adds combo", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [160], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce Damage for all Attr", label: "Reduce Damage for all Attr", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [3, 156], skills: ctx.skillsJA, searchRandom: true) else { return false }
        if skill.type == 156 { return (skill.params.indices.contains(4) ? skill.params[4] : 0) == 3 }
        return true
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce 100% Damage", label: "Reduce 100% Damage", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [3], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) >= 100
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Reduce all Damage for designated Attr", label: "Reduce all Damage for designated Attr", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [21], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Mass Attacks", label: "Mass Attacks", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [51], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Buff > Rate by state count(Jewel Princess)", label: "Rate by state count(Jewel Princess)", groupPath: ["Active Skill", "Buff"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [156, 168, 228, 231], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeForEnemyLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Menace", label: "Menace", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [18], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Reduces enemies' DEF", label: "Reduces enemies' DEF", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [19, 282], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Poisons enemies", label: "Poisons enemies", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [4], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Change enemies's Attr", label: "Change enemies's Attr", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        ActiveSkillEffects.changeEnemiesAttrAttr(card, skills: ctx.skillsJA).attr != nil
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Counterattack buff", label: "Counterattack buff", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [60], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For Enemy > Voids Super Gravity", label: "Voids Super Gravity", groupPath: ["Active Skill", "For Enemy"]) { card, ctx in
        ActiveSkillEffects.voidsAbsorptionTurns(card, skills: ctx.skillsJA).superGravity > 0
    },
]

private let activePlayerTeamLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Any", label: "Increase Damage Cap - Any", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [241, 246, 247, 258, 263, 266], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Self", label: "Increase Damage Cap - Self", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [241, 246, 247, 258, 266], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 258: return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b1 != 0
        case 266: return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b100 != 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Leader", label: "Increase Damage Cap - Leader", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [258], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b110 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Sub", label: "Increase Damage Cap - Sub", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [258], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Neighbor", label: "Increase Damage Cap - Neighbor", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [266], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(2) ? skill.params[2] : 0) & 0b11 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Increase Damage Cap > Increase Damage Cap - Attr./Types", label: "Increase Damage Cap - Attr./Types", groupPath: ["Active Skill", "For player team", "Increase Damage Cap"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [263], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Any", label: "Card slot ATK rate change - Any", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [230, 269], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Self", label: "Card slot ATK rate change - Self", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230, 269], skills: ctx.skillsJA, searchRandom: true) else { return false }
        switch skill.type {
        case 230: return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b1 != 0
        case 269: return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b100 != 0
        default: return true
        }
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Leader", label: "Card slot ATK rate change - Leader", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b110 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Sub", label: "Card slot ATK rate change - Sub", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [230], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Card slot ATK rate change > Card slot ATK rate change - Neighbor", label: "Card slot ATK rate change - Neighbor", groupPath: ["Active Skill", "For player team", "Card slot ATK rate change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [269], skills: ctx.skillsJA, searchRandom: true) else { return false }
        return (skill.params.indices.contains(1) ? skill.params[1] : 0) & 0b11 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > ↑Increase skills charge", label: "↑Increase skills charge", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [146], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Change Leader", label: "Change Leader", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [93, 227], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Change member's Attr", label: "Change member's Attr", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [142, 274], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > ↓Reduce skills charge", label: "↓Reduce skills charge", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [218], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Bind team active skill", label: "Bind team active skill", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [214], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Bind card self", label: "Bind card self", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [267], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > For player team > Remove card self's assist", label: "Remove card self's assist", groupPath: ["Active Skill", "For player team"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [250], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeOrbsStatesLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Unlock", label: "Unlock", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [172], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Lock(Any color)", label: "Lock(Any color)", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [152], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Lock(≥6 color)", label: "Lock(≥6 color)", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [152], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let param0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return (param0 & 0b111111) == 0b111111
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Enhanced Orbs", label: "Enhanced Orbs", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [52, 91, 140], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Add Combo Drop", label: "Add Combo Drop", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [190], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Add Nail", label: "Add Nail", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [262], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs States Change > Bind self matchable", label: "Bind self matchable", groupPath: ["Active Skill", "Orbs States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [215], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeBoardStatesLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Replaces all Orbs", label: "Replaces all Orbs", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [10], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Destory Orbs", label: "Destory Orbs", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [277], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > No Skyfall", label: "No Skyfall", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [184], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Roulette Orb", label: "Creates Roulette Orb", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [207, 249], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Cloud", label: "Creates Cloud", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [238], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Seal", label: "Creates Seal", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [239], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Creates Deep Dark Orb", label: "Creates Deep Dark Orb", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [251], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Change Board Size", label: "Change Board Size", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [244], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Board States Change > Fixed starting position", label: "Fixed starting position", groupPath: ["Active Skill", "Board States Change"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [273], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeSkillConditionalLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require HP range", label: "Enable require HP range", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [225], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require Dungeon Stage", label: "Enable require Dungeon Stage", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [234], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Delay active after skill use", label: "Delay active after skill use", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [248], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require number of Orbs", label: "Enable require number of Orbs", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [255], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Has limit of times a skill can be used", label: "Has limit of times a skill can be used", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [268], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Skill use is conditional > Enable require BUFF state", label: "Enable require BUFF state", groupPath: ["Active Skill", "Skill use is conditional"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [275], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeOtherLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Other > 1 CD", label: "1 CD", groupPath: ["Active Skill", "Other"]) { card, ctx in
        ActiveSkillEffects.hasOneCD(card, skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Skill Loop less than 4 card", label: "Skill Loop less than 4 card", groupPath: ["Active Skill", "Other"]) { card, ctx in
        ActiveSkillEffects.hasSkillLoopLessThan4(card, skills: ctx.skillsJA)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Time pause", label: "Time pause", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [5, 246, 247], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Random effect active", label: "Random effect active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [118], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Evolved active", label: "Evolved active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [232, 233], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Other > Not Evolved active", label: "Not Evolved active", groupPath: ["Active Skill", "Other"]) { card, ctx in
        !SkillChainMatcher.matches(skillId: card.activeSkillId, types: [232, 233], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeOrbsDropLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Enhanced Orbs", label: "Drop Enhanced Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [180], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop locked orbs(any color)", label: "Drop locked orbs(any color)", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [205], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop locked orbs(≥6 color)", label: "Drop locked orbs(≥6 color)", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [205], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return (p0 & 0b11_1111) == 0b11_1111
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate increases", label: "Drop rate increases", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Fire", label: "Drop rate - Attr. - Fire", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Water", label: "Drop rate - Attr. - Water", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b10 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Wood", label: "Drop rate - Attr. - Wood", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b100 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Light", label: "Drop rate - Attr. - Light", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Dark", label: "Drop rate - Attr. - Dark", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b1_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Heart", label: "Drop rate - Attr. - Heart", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b10_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - Attr. - Jammers/Poison", label: "Drop rate - Attr. - Jammers/Poison", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p0 = skill.params.indices.contains(0) ? skill.params[0] : 0
        return p0 & 0b11_1100_0000 != 0
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - 99 turns", label: "Drop rate - 99 turns", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p1 = skill.params.indices.contains(1) ? skill.params[1] : 0
        return p1 >= 99
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop rate increases > Drop rate - 100% rate", label: "Drop rate - 100% rate", groupPath: ["Active Skill", "Orbs Drop", "Drop rate increases"]) { card, ctx in
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [126], skills: ctx.skillsJA, searchRandom: true) else { return false }
        let p3 = skill.params.indices.contains(3) ? skill.params[3] : 0
        return p3 == 100
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Nail Orbs", label: "Drop Nail Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [226], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Drop Thorn Orbs", label: "Drop Thorn Orbs", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [243], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Drop > Prediction of falling", label: "Prediction of falling", groupPath: ["Active Skill", "Orbs Drop"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [253], skills: ctx.skillsJA, searchRandom: true)
    },
]

private let activeChangeBoardLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Changes all Orbs to any", label: "Changes all Orbs to any", groupPath: ["Active Skill", "Change all Orbs on Board"]) { card, ctx in
        SkillChainMatcher.matches(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 1 color(Farm)", label: "To 1 color(Farm)", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 1
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 2 color", label: "To 2 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 2
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 3 color", label: "To 3 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 3
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 4 color", label: "To 4 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 4
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To 5 color", label: "To 5 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count == 5
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Colors Count > To ≥6 color", label: "To ≥6 color", groupPath: ["Active Skill", "Change all Orbs on Board", "Colors Count"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).count >= 6
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Fire", label: "Include Fire", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(0)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Water", label: "Include Water", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(1)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Wood", label: "Include Wood", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(2)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Light", label: "Include Light", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(3)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Dark", label: "Include Dark", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(4)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Heart", label: "Include Heart", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        return ActiveSkillEffects.boardChangeColorTypes(skill).contains(5)
    },
    SpecialSearchLeaf(id: "Active Skill > Change all Orbs on Board > Include Color > Include Jammers/Poison", label: "Include Jammers/Poison", groupPath: ["Active Skill", "Change all Orbs on Board", "Include Color"]) { card, ctx in
        let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [71], skills: ctx.skillsJA, searchRandom: true)
        let colors = ActiveSkillEffects.boardChangeColorTypes(skill)
        return colors.contains(6) || colors.contains(7) || colors.contains(8) || colors.contains(9)
    },
]

private let activeOrbsColorChangeLeaves: [SpecialSearchLeaf] = [
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Fire", label: "To Fire", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(0) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Water", label: "To Water", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(1) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Wood", label: "To Wood", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(2) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Light", label: "To Light", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(3) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Dark", label: "To Dark", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(4) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Heal", label: "To Heal", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(5) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > To Color > To Jammers/Poison", label: "To Jammers/Poison", groupPath: ["Active Skill", "Orbs Color Change", "To Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.to.contains(6) || $0.to.contains(7) || $0.to.contains(8) || $0.to.contains(9) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Fire", label: "From Fire", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(0) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Water", label: "From Water", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(1) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Wood", label: "From Wood", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(2) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Light", label: "From Light", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(3) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Dark", label: "From Dark", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(4) }
    },
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Heart", label: "From Heart", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(5) }
    },
    // Web bug ported verbatim: this leaf checks `.from.includes(6)` but `.to.includes(7/8/9)` — NOT a typo we fix.
    SpecialSearchLeaf(id: "Active Skill > Orbs Color Change > From Color > From Jammers/Poison", label: "From Jammers/Poison", groupPath: ["Active Skill", "Orbs Color Change", "From Color"]) { card, ctx in
        let parsed = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [9, 20, 154], skills: ctx.skillsJA, searchRandom: false).flatMap(ActiveSkillEffects.orbsChangeParse)
        return parsed.contains { $0.from.contains(6) || $0.to.contains(7) || $0.to.contains(8) || $0.to.contains(9) }
    },
]

enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves + activeVoidsAbsorptionLeaves + activeRecoversBindLeaves + activePlayerHPChangeLeaves + activeBuffLeaves + activeForEnemyLeaves + activePlayerTeamLeaves + activeOrbsStatesLeaves + activeBoardStatesLeaves + activeSkillConditionalLeaves + activeOtherLeaves + activeOrbsDropLeaves + activeChangeBoardLeaves + activeOrbsColorChangeLeaves
}
