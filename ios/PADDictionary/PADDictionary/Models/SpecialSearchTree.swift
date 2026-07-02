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

enum SpecialSearchTree {
    static let leaves: [SpecialSearchLeaf] = evoTypeLeaves + awakeningLeaves + othersSearchLeaves + leaderMatchingStyleLeaves + leaderRestrictionLeaves + leaderExtraEffectsLeaves + leaderHPScaleLeaves + leaderReduceShieldLeaves
}
