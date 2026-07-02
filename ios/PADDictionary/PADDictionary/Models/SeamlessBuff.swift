import Foundation

enum SeamlessBuff {
    private enum Effect {
        case activeTurns(Int)
        case randomSkills([Int])
        case evolvedSkills(loop: Bool, ids: [Int])
        case other
    }

    private static func activeTurnsValue(for skill: Skill) -> Int? {
        let sk = skill.params
        func at(_ i: Int) -> Int? { sk.indices.contains(i) ? sk[i] : nil }
        switch skill.type {
        case 126:
            guard let t1 = at(1) else { return nil }
            let t2 = at(2) ?? t1
            return t1 == t2 ? t1 : nil
        case 205, 239:
            return at(1)
        case 3, 18, 19, 21, 50, 51, 60, 88, 90, 92, 132, 142, 156, 160, 168, 173, 179, 180,
             184, 191, 207, 214, 215, 224, 226, 228, 230, 231, 237, 238, 241, 243, 244, 249,
             251, 253, 258, 263, 266, 267, 269, 273, 274, 278:
            return at(0)
        default:
            return nil
        }
    }

    private static func parse(_ skillId: Int, skills: SkillLookup) -> [Effect] {
        guard let skill = skills[skillId] else { return [] }
        if skill.type == 116 {
            return skill.params.flatMap { parse($0, skills: skills) }
        }
        if let turns = activeTurnsValue(for: skill) {
            return [.activeTurns(turns)]
        }
        switch skill.type {
        case 118: return [.randomSkills(skill.params)]
        case 232: return [.evolvedSkills(loop: false, ids: skill.params)]
        case 233: return [.evolvedSkills(loop: true, ids: skill.params)]
        default: return [.other]
        }
    }

    private static func isLoopBuff(_ effects: [Effect], cd: Int) -> Bool {
        effects.contains {
            if case .activeTurns(let turns) = $0 { return turns >= cd }
            return false
        }
    }

    static func matches(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, (card.henshinTo?.isEmpty ?? true) else { return false }
        guard let skill = skills[card.activeSkillId] else { return false }
        let cd = skill.initialCooldown - (skill.maxLevel - 1)
        let parsedActive = parse(card.activeSkillId, skills: skills)
        if isLoopBuff(parsedActive, cd: cd) { return true }
        guard let group = parsedActive.first else { return false }
        switch group {
        case .randomSkills(let ids):
            return ids.allSatisfy { isLoopBuff(parse($0, skills: skills), cd: cd) }
        case .evolvedSkills(let loop, let ids):
            let subSkills = ids.compactMap { skills[$0] }
            guard !subSkills.isEmpty else { return false }
            if loop {
                let subCd = subSkills.reduce(0) { $0 + ($1.initialCooldown - ($1.maxLevel - 1)) }
                return ids.contains { isLoopBuff(parse($0, skills: skills), cd: subCd) }
            } else {
                guard let lastSkill = subSkills.last, let lastId = ids.last else { return false }
                let subCd = lastSkill.initialCooldown - (lastSkill.maxLevel - 1)
                return isLoopBuff(parse(lastId, skills: skills), cd: subCd)
            }
        default:
            return false
        }
    }
}
