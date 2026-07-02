import Foundation

enum SkillChainMatcher {
    private static let wrapperTypes: Set<Int> = [116, 118, 138, 232, 233, 248]

    static func matches(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Bool {
        resolve(skillId: skillId, types: types, skills: skills, searchRandom: searchRandom) != nil
    }

    static func resolve(skillId: Int, types: Set<Int>, skills: SkillLookup, searchRandom: Bool = true) -> Skill? {
        guard let skill = skills[skillId] else { return nil }
        if types.contains(skill.type) { return skill }
        guard wrapperTypes.contains(skill.type) else { return nil }
        if skill.type == 118 && !searchRandom { return nil }
        let params = skill.type == 248 ? Array(skill.params.dropFirst()) : skill.params
        for id in params.reversed() {
            if let found = resolve(skillId: id, types: types, skills: skills, searchRandom: searchRandom) { return found }
        }
        return nil
    }
}
