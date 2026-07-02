import Foundation

struct TypeKillerEntry {
    let type: Int
    let awoken: Int
    let latent: Int
    let typeKiller: [Int]
    let allowableLatent: [Int]
}

enum TypeKiller {
    private static let base: [(type: Int, awoken: Int, latent: Int, typeKiller: [Int])] = [
        (0, 39, 16, []),
        (12, 40, 17, []),
        (14, 41, 18, []),
        (15, 42, 19, []),
        (5, 32, 20, [7]),
        (4, 31, 21, [8, 3]),
        (7, 33, 22, [5]),
        (8, 34, 23, [5, 1]),
        (1, 35, 24, [5, 4, 7, 8, 1, 6, 2, 3]),
        (6, 36, 25, [7, 2]),
        (2, 37, 26, [8, 3]),
        (3, 38, 27, [4, 6]),
        (9, -1, -1, []),
    ]

    static let all: [TypeKillerEntry] = base.map { entry in
        let allowableLatent = (entry.typeKiller + [0, 12, 14, 15]).compactMap { tn in
            base.first(where: { $0.type == tn })?.latent
        }
        return TypeKillerEntry(type: entry.type, awoken: entry.awoken, latent: entry.latent, typeKiller: entry.typeKiller, allowableLatent: allowableLatent)
    }

    static func entry(forType type: Int) -> TypeKillerEntry? {
        all.first { $0.type == type }
    }
}
