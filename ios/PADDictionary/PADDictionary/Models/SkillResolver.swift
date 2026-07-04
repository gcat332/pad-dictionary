import Foundation

struct ResolvedSkill: Equatable {
    let name: String
    let description: String
    let source: Source

    enum Source: Equatable {
        case en, translated, none
    }
}

enum SkillResolver {
    static func resolve(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup, translations: [String: String]) -> ResolvedSkill? {
        let ja = skillsJA[skillId]
        let en = skillsEN[skillId]
        guard ja != nil || en != nil else { return nil }

        let enDesc = clean(en?.description)
        let trDesc = clean(translations[String(skillId)])
        let description = enDesc ?? trDesc ?? ""
        let source: ResolvedSkill.Source = enDesc != nil ? .en : (trDesc != nil ? .translated : .none)

        let name = trimmedNonEmpty(en?.name) ?? ja?.name ?? ""

        return ResolvedSkill(name: name, description: description, source: source)
    }

    /// Bare cooldown value shown in parens after the skill name, e.g. "3" or "35→15"
    /// (max initial → min after skill-ups). Empty when the skill has no cooldown.
    static func cooldownValue(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup) -> String {
        guard let skill = skillsJA[skillId] ?? skillsEN[skillId], skill.initialCooldown != 0 else { return "" }
        let effectiveMaxLevel = skill.maxLevel == 0 ? 1 : skill.maxLevel
        let minCooldown = skill.initialCooldown - (effectiveMaxLevel - 1)
        return minCooldown == skill.initialCooldown ? "\(minCooldown)" : "\(skill.initialCooldown)→\(minCooldown)"
    }

    /// Skill types 232 (one-way) and 233 (looping) upgrade into another skill after use.
    /// BFS over `params`, cycle-safe (233 can loop back), capped like the web's `evolvedSkillChain`.
    static func evolvedChain(skillId: Int, skillsJA: SkillLookup) -> [Int] {
        var seen: Set<Int> = [skillId]
        var queue: [Int] = [skillId]
        var chain: [Int] = []
        while !queue.isEmpty && chain.count < 20 {
            let current = queue.removeFirst()
            guard let skill = skillsJA[current], skill.type == 232 || skill.type == 233 else { continue }
            for paramId in skill.params where !seen.contains(paramId) {
                seen.insert(paramId)
                chain.append(paramId)
                queue.append(paramId)
            }
        }
        return chain
    }

    private static func trimmedNonEmpty(_ raw: String?) -> String? {
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
        return trimmed
    }

    private static func clean(_ raw: String?) -> String? {
        guard var s = trimmedNonEmpty(raw) else { return nil }
        // Keep GungHo caret codes (^ff3600^, ^qs^, ^p) — SkillTextView renders them as
        // red emphasis / cyan condition / reset. Only whitespace is normalized here.
        s = s.replacingOccurrences(of: "[ \\t]{2,}", with: " ", options: .regularExpression)
        return trimmedNonEmpty(s)
    }
}
