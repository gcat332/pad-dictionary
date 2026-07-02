import Foundation

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

enum LeaderSkillScale {
    static func hpScale(_ skill: Skill, skills: SkillLookup) -> Double {
        let sk = skill.params
        var scale = 1.0
        switch skill.type {
        case 23, 30, 62, 77, 63, 65, 29, 114, 45, 111, 46, 48, 67:
            scale = Double(sk.last ?? 100) / 100
        case 73, 76, 121, 129, 163, 177, 186, 155:
            scale = Double(sk[safe: 2] ?? 100) / 100
        case 106, 107, 108:
            scale = Double(sk[safe: 0] ?? 100) / 100
        case 125:
            scale = Double(sk[safe: 5] ?? 100) / 100
        case 136, 137:
            func factor(_ idx: Int) -> Double {
                let raw = sk[safe: idx] ?? 0
                return raw == 0 ? 1 : Double(raw) / 100
            }
            scale = factor(1) * factor(5)
        case 158:
            scale = Double(sk[safe: 4] ?? 100) / 100
        case 175, 178, 185:
            scale = Double(sk[safe: 3] ?? 100) / 100
        case 203, 217:
            scale = Double(sk[safe: 1] ?? 100) / 100
        case 245:
            scale = Double(sk[safe: 3] ?? 100) / 100
        case 138:
            scale = sk.reduce(1.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return partial * hpScale(inner, skills: skills)
            }
        default:
            break
        }
        return scale == 0 ? 1 : scale
    }

    static func reduceScale(_ skill: Skill, allAttr: Bool = false, noHPneed: Bool = false, skills: SkillLookup) -> Double {
        let sk = skill.params
        func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        var scale = 0.0
        switch skill.type {
        case 16:
            scale = Double(p(0)) / 100
        case 17:
            scale = allAttr ? 0 : Double(p(1)) / 100
        case 36:
            scale = allAttr ? 0 : Double(p(2)) / 100
        case 38, 43:
            scale = (noHPneed || allAttr) ? 0 : Double(p(2)) / 100
        case 129, 163:
            scale = (allAttr && (p(5) & 31) != 31) ? 0 : Double(p(6)) / 100
        case 178:
            scale = (allAttr && (p(6) & 31) != 31) ? 0 : Double(p(7)) / 100
        case 130, 131:
            scale = (noHPneed || (allAttr && (p(5) & 31) != 31)) ? 0 : Double(p(6)) / 100
        case 151, 169, 198, 271:
            scale = Double(p(2)) / 100
        case 170, 182, 193:
            scale = Double(p(3)) / 100
        case 171:
            scale = Double(p(6)) / 100
        case 183:
            scale = noHPneed ? 0 : Double(p(4)) / 100
        case 210:
            scale = Double(p(1)) / 100
        case 235:
            scale = Double(p(4)) / 100
        case 138:
            scale = sk.reduce(0.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return 1 - (1 - partial) * (1 - reduceScale(inner, allAttr: allAttr, noHPneed: noHPneed, skills: skills))
            }
        default:
            break
        }
        return scale
    }

    static func reduceScaleUnconditional(_ skill: Skill, skills: SkillLookup) -> Double {
        let sk = skill.params
        func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
        var scale = 0.0
        switch skill.type {
        case 16:
            scale = Double(p(0)) / 100
        case 129, 163:
            scale = (p(5) & 31) != 31 ? 0 : Double(p(6)) / 100
        case 178:
            scale = (p(6) & 31) != 31 ? 0 : Double(p(7)) / 100
        case 138:
            scale = sk.reduce(0.0) { partial, skillId in
                guard let inner = skills[skillId] else { return partial }
                return 1 - (1 - partial) * (1 - reduceScaleUnconditional(inner, skills: skills))
            }
        default:
            break
        }
        return scale
    }

    static func skillAddCombo(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.leaderSkillId, types: [192, 194, 206, 209, 210, 219, 220, 235, 271, 280], skills: skills, searchRandom: false)
        return matched.reduce(0) { total, skill in
            let sk = skill.params
            func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
            switch skill.type {
            case 192, 194, 271, 280: return total + p(3)
            case 206: return total + p(6)
            case 209: return total + p(0)
            case 210, 219: return total + p(2)
            case 220: return total + p(1)
            case 235: return total + p(5)
            default: return total
            }
        }
    }

    static func skillFixedDamage(_ card: Card, skills: SkillLookup) -> Int {
        let matched = SkillChainMatcher.resolveAll(skillId: card.leaderSkillId, types: [199, 200, 201, 223, 235, 271, 280], skills: skills, searchRandom: false)
        return matched.reduce(0) { total, skill in
            let sk = skill.params
            func p(_ i: Int) -> Int { sk[safe: i] ?? 0 }
            switch skill.type {
            case 199, 200: return total + p(2)
            case 201: return total + p(5)
            case 223: return total + p(1)
            case 235: return total + p(6)
            case 271, 280: return total + p(4)
            default: return total
            }
        }
    }
}
