import Foundation

enum CompareBestValue {
    static func bestIndices(_ values: [Int]) -> Set<Int> {
        guard values.count > 1, let maxValue = values.max() else { return [] }
        return Set(values.indices.filter { values[$0] == maxValue })
    }
}
