import Foundation

enum Bin {
    static func unflags(_ number: Int) -> [Int] {
        guard number > 0 else { return [] }
        var result: [Int] = []
        var i = 0
        while (1 << i) <= number {
            if number & (1 << i) != 0 { result.append(i) }
            i += 1
        }
        return result
    }
}

extension Int {
    func notNeighbour() -> Int {
        ~self & (self << 1 | self >> 1)
    }
}
