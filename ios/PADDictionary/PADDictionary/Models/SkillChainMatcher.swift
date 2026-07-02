import Foundation

enum SkillChainMatcher {
    private static let wrapperTypes: Set<Int> = [116, 118, 138, 232, 233, 248]

    static func matches(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Bool {
        guard let skill = skills[skillId] else { return false }
        if types.contains(skill.type) { return true }
        guard wrapperTypes.contains(skill.type) else { return false }
        if skill.type == 118 && !searchRandom { return false }
        let params = skill.type == 248 ? Array(skill.params.dropFirst()) : skill.params
        for id in params.reversed() {
            if matches(skillId: id, types: types, skills: skills, searchRandom: searchRandom) { return true }
        }
        return false
    }
}
