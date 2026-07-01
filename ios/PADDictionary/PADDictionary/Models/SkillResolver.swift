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

    static func cooldownText(skillId: Int, skillsJA: SkillLookup, skillsEN: SkillLookup) -> String {
        guard let skill = skillsJA[skillId] ?? skillsEN[skillId], skill.initialCooldown != 0 else { return "" }
        let effectiveMaxLevel = skill.maxLevel == 0 ? 1 : skill.maxLevel
        let minCooldown = skill.initialCooldown - (effectiveMaxLevel - 1)
        return minCooldown == skill.initialCooldown ? "CD \(minCooldown)" : "CD \(skill.initialCooldown)→\(minCooldown)"
    }

    private static func trimmedNonEmpty(_ raw: String?) -> String? {
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
        return trimmed
    }

    private static func clean(_ raw: String?) -> String? {
        guard var s = trimmedNonEmpty(raw) else { return nil }
        s = s.replacingOccurrences(of: "\\^[0-9a-fA-F]{6}\\^", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "\\^p", with: "", options: .regularExpression)
        s = s.replacingOccurrences(of: "[ \\t]{2,}", with: " ", options: .regularExpression)
        return trimmedNonEmpty(s)
    }
}
