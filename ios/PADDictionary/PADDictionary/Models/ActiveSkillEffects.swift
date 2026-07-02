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

    static func getSkillMinCD(_ skill: Skill) -> Int {
        skill.initialCooldown - (skill.maxLevel - 1)
    }

    private static func unwrapOnceForLoopCheck(_ skill: Skill, skills: SkillLookup) -> Skill {
        guard skill.type == 232, let lastParam = skill.params.last, let unwrapped = skills[lastParam] else { return skill }
        return unwrapped
    }

    static func hasOneCD(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, let baseSkill = skills[card.activeSkillId] else { return false }
        let skill = unwrapOnceForLoopCheck(baseSkill, skills: skills)
        return getSkillMinCD(skill) <= 1
    }

    static func hasSkillLoopLessThan4(_ card: Card, skills: SkillLookup) -> Bool {
        guard card.activeSkillId != 0, let baseSkill = skills[card.activeSkillId] else { return false }
        let skill = unwrapOnceForLoopCheck(baseSkill, skills: skills)
        let cantLoop = SkillChainMatcher.resolveAll(skillId: skill.id, types: [202, 214, 218, 250, 268], skills: skills, searchRandom: true)
        guard cantLoop.isEmpty else { return false }
        let minCD = getSkillMinCD(skill)
        var realCD = minCD
        let skillBoost = SkillChainMatcher.resolveAll(skillId: skill.id, types: [146], skills: skills, searchRandom: false)
        if !skillBoost.isEmpty {
            realCD = skillBoost.reduce(realCD) { cd, subSkill in cd - (subSkill.params.first ?? 0) * 3 }
        }
        return minCD > 1 && realCD <= 4
    }

    static func boardChangeColorTypes(_ skill: Skill?) -> [Int] {
        guard let skill else { return [] }
        let sk = skill.params
        if let sentinelIndex = sk.firstIndex(of: -1) {
            return Array(sk[0..<sentinelIndex])
        }
        return sk
    }

    static func orbsChangeParse(_ skill: Skill) -> [(from: [Int], to: [Int])] {
        let sk = skill.params
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        switch skill.type {
        case 9:
            return [(from: [at(0)], to: [at(1)])]
        case 20:
            if sk.count >= 3 && at(1) == at(3) {
                return [(from: [at(0), at(2)], to: [at(1)])]
            } else {
                return [(from: [at(0)], to: [at(1)]), (from: [at(2)], to: [at(3)])]
            }
        case 154:
            let from = at(0) != 0 ? at(0) : 1
            let to = at(1) != 0 ? at(1) : 1
            return [(from: Bin.unflags(from), to: Bin.unflags(to))]
        default:
            return []
        }
    }

    static func generateOrbsParse(_ card: Card, skills: SkillLookup) -> [(count: Int, to: Int, exclude: Int)] {
        var out: [(count: Int, to: Int, exclude: Int)] = []
        let matched = SkillChainMatcher.resolveAll(skillId: card.activeSkillId, types: [141, 208], skills: skills, searchRandom: false)
        for skill in matched {
            let sk = skill.params
            func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
            if skill.type == 141 {
                out.append((count: at(0), to: at(1) != 0 ? at(1) : 1, exclude: at(2)))
            } else {
                out.append((count: at(0), to: at(1) != 0 ? at(1) : 1, exclude: at(2)))
                out.append((count: at(3), to: at(4) != 0 ? at(4) : 1, exclude: at(5)))
            }
        }
        return out
    }

    static func shapeThisRowOk(_ line: Int, _ lineNumber: Int) -> Bool {
        if lineNumber <= 0 { return true }
        return line >= 0 && (line & lineNumber) == lineNumber && (line & lineNumber.notNeighbour()) == 0
    }

    static func shapeUpsideDownRowOk(_ line: Int, _ lineNumber: Int) -> Bool {
        if lineNumber <= 0 { return true }
        return line > 0 ? (line & lineNumber) == 0 : true
    }

    private static func shapeLineCandidates() -> [Int] {
        var arr: [Int] = []
        var lineNum = 0b111
        while lineNum < 0b1000000 { arr.append(lineNum); lineNum <<= 1 }
        return arr
    }

    static func shapeIsCross(_ sk: [Int]) -> Bool {
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        let lineNumArr = shapeLineCandidates()
        for ri in 1..<4 {
            let candidates = lineNumArr.filter { shapeThisRowOk(at(ri), $0) }
            if candidates.isEmpty { continue }
            let filtered = candidates.filter { ln in
                let ln2 = (ln << 1) & (ln >> 1)
                return shapeThisRowOk(at(ri - 1), ln2)
                    && shapeThisRowOk(at(ri + 1), ln2)
                    && shapeUpsideDownRowOk(at(ri - 2), ln2)
                    && shapeUpsideDownRowOk(at(ri + 2), ln2)
            }
            if !filtered.isEmpty { return true }
        }
        return false
    }

    static func shapeIsLShape(_ sk: [Int]) -> Bool {
        func at(_ i: Int) -> Int { sk.indices.contains(i) ? sk[i] : 0 }
        let lineNumArr = shapeLineCandidates()
        for ri in 0..<5 {
            let candidates = lineNumArr.filter { shapeThisRowOk(at(ri), $0) }
            if candidates.isEmpty { continue }
            let filtered = candidates.filter { ln in
                let ln2 = ln & ~(ln >> 1)
                let ln3 = ln & ~(ln << 1)
                let up = shapeUpsideDownRowOk(at(ri + 1), ln) && (
                    (shapeThisRowOk(at(ri - 1), ln2) && shapeThisRowOk(at(ri - 2), ln2) && shapeUpsideDownRowOk(at(ri - 3), ln2))
                    || (shapeThisRowOk(at(ri - 1), ln3) && shapeThisRowOk(at(ri - 2), ln3) && shapeUpsideDownRowOk(at(ri - 3), ln3))
                )
                let down = shapeUpsideDownRowOk(at(ri - 1), ln) && (
                    (shapeThisRowOk(at(ri + 1), ln2) && shapeThisRowOk(at(ri + 2), ln2) && shapeUpsideDownRowOk(at(ri + 3), ln2))
                    || (shapeThisRowOk(at(ri + 1), ln3) && shapeThisRowOk(at(ri + 2), ln3) && shapeUpsideDownRowOk(at(ri + 3), ln3))
                )
                return up || down
            }
            if !filtered.isEmpty { return true }
        }
        return false
    }
}
