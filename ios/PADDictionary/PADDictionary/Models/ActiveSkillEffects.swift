import Foundation

private extension Array where Element == Int {
    subscript(safe index: Int) -> Int? {
        indices.contains(index) ? self[index] : nil
    }
}

enum ActiveSkillEffects {
    struct VoidsAbsorptionTurns {
        var attrAbsorb = 0
        var comboAbsorb = 0
        var damageAbsorb = 0
        var damageVoid = 0
        var superGravity = 0
    }

    static func voidsAbsorptionTurns(_ card: Card, skills: SkillLookup) -> VoidsAbsorptionTurns {
        var out = VoidsAbsorptionTurns()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [173, 191, 278], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 173:
                if (sk[safe: 1] ?? 0) != 0, out.attrAbsorb == 0 { out.attrAbsorb = sk[safe: 0] ?? 0 }
                if (sk[safe: 2] ?? 0) != 0, out.comboAbsorb == 0 { out.comboAbsorb = sk[safe: 0] ?? 0 }
                if (sk[safe: 3] ?? 0) != 0, out.damageAbsorb == 0 { out.damageAbsorb = sk[safe: 0] ?? 0 }
            case 191:
                if out.damageVoid == 0 { out.damageVoid = sk[safe: 0] ?? 0 }
            case 278:
                if out.superGravity == 0 { out.superGravity = sk[safe: 0] ?? 0 }
            default:
                break
            }
        }
        return out
    }

    struct UnbindTurns {
        var normal = 0
        var awakenings = 0
        var matches = 0
    }

    static func unbindTurns(_ card: Card, skills: SkillLookup) -> UnbindTurns {
        var out = UnbindTurns()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [117, 179, 196], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 117:
                if out.normal == 0 { out.normal = sk[safe: 0] ?? 0 }
                if out.awakenings == 0 { out.awakenings = sk[safe: 4] ?? 0 }
            case 179:
                if out.normal == 0 { out.normal = sk[safe: 3] ?? 0 }
                if out.awakenings == 0 { out.awakenings = sk[safe: 4] ?? 0 }
            case 196:
                if out.matches == 0 { out.matches = sk[safe: 0] ?? 0 }
            default:
                break
            }
        }
        return out
    }

    struct HealImmediatelyRate {
        var vampire = 0
        var selfRcv = 0
        var constValue = 0
        var scale = 0
    }

    static func healImmediatelyRate(_ card: Card, skills: SkillLookup) -> HealImmediatelyRate {
        var out = HealImmediatelyRate()
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [7, 8, 35, 115, 117], skills: skills)
        for skill in matched {
            let sk = skill.params
            switch skill.type {
            case 7: out.selfRcv += sk[safe: 0] ?? 0
            case 8: out.constValue += sk[safe: 0] ?? 0
            case 35: out.vampire += sk[safe: 1] ?? 0
            case 115: out.vampire += sk[safe: 2] ?? 0
            case 117:
                out.selfRcv += sk[safe: 1] ?? 0
                out.constValue += sk[safe: 2] ?? 0
                out.scale += sk[safe: 3] ?? 0
            default:
                break
            }
        }
        return out
    }

    static func damageSelfRate(_ card: Card, skills: SkillLookup) -> Int {
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [84, 85, 86, 87, 195], skills: skills, searchRandom: true) else { return 0 }
        let idx = skill.type == 195 ? 0 : 3
        return 100 - (skill.params[safe: idx] ?? 0)
    }

    struct ChangeEnemiesAttr {
        var attr: Int?
        var turns = 0
    }

    static func changeEnemiesAttrAttr(_ card: Card, skills: SkillLookup) -> ChangeEnemiesAttr {
        var out = ChangeEnemiesAttr()
        guard let skill = SkillChainMatcher.resolve(skillId: card.activeSkillId, types: [153, 224], skills: skills, searchRandom: true) else { return out }
        let sk = skill.params
        if skill.type == 153 {
            out.attr = sk[safe: 0] ?? 0
        } else if skill.type == 224 {
            out.attr = sk[safe: 1] ?? 0
            out.turns = sk[safe: 0] ?? 0
        }
        return out
    }

    private static func atkBuffParse(_ skill: Skill?) -> (skilltype: Int, rate: Int) {
        guard let skill else { return (0, 0) }
        let sk = skill.params
        func at(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        switch skill.type {
        case 88, 92:
            return (2, at(skill.type == 88 ? 2 : 3))
        case 50, 90:
            let sliceEnd = skill.type == 50 ? 2 : 3
            let attrs = sk.count > 1 ? Array(sk[1..<min(sliceEnd, sk.count)]).filter { $0 != 5 } : []
            guard !attrs.isEmpty else { return (0, 0) }
            return (2, at(skill.type == 50 ? 2 : 3))
        case 156:
            guard at(4) == 2 else { return (0, 0) }
            return (1, at(5) - 100)
        case 168:
            return (1, at(7))
        case 228:
            guard at(3) > 0 else { return (0, 0) }
            return (1, at(3))
        case 231:
            guard at(6) > 0 else { return (0, 0) }
            return (1, at(6))
        default:
            return (0, 0)
        }
    }

    static func atkBuffSkillType(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [88, 92, 50, 90, 156, 168, 231, 228], skills: skills)
        let parsed = matched.map(atkBuffParse)
        return parsed.first(where: { $0.rate != 0 })?.skilltype ?? atkBuffParse(nil).skilltype
    }

    private static func rcvBuffParse(_ skill: Skill?) -> (skilltype: Int, rate: Int) {
        guard let skill else { return (0, 0) }
        let sk = skill.params
        func at(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        switch skill.type {
        case 228:
            guard at(4) > 0 else { return (0, 0) }
            return (1, at(4))
        case 231:
            guard at(7) > 0 else { return (0, 0) }
            return (1, at(7))
        case 50, 90:
            let sliceEnd = sk.count > 2 ? sk.count - 1 : sk.count
            let relevant = sk.count > 1 ? Array(sk[1..<max(1, sliceEnd)]) : []
            let skilltype = relevant.contains(5) ? 2 : 0
            let rate = sk.count > 2 ? (sk.last ?? 0) : 0
            return (skilltype, rate)
        default:
            return (0, 0)
        }
    }

    static func rcvBuffSkillType(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [50, 90, 228, 231], skills: skills)
        let parsed = matched.map(rcvBuffParse)
        return parsed.first(where: { $0.rate != 0 })?.skilltype ?? rcvBuffParse(nil).skilltype
    }
}
