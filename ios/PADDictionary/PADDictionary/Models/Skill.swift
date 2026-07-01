import Foundation

struct Skill: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let description: String
    let type: Int
    let maxLevel: Int
    let initialCooldown: Int
    let params: [Int]
}
