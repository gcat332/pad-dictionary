import Foundation

/// One segment of a skill description: literal text, or a `{Token}` name (braces stripped).
enum SkillTextRun: Equatable {
    case text(String)
    case token(String)
}

enum SkillTextTokenizer {
    // Matches `{...}` with no nested braces. Splits the string into ordered text/token runs.
    private static let regex = try! NSRegularExpression(pattern: #"\{([^}]+)\}"#)

    static func parse(_ s: String) -> [SkillTextRun] {
        let ns = s as NSString
        var runs: [SkillTextRun] = []
        var cursor = 0
        for m in regex.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            if m.range.location > cursor {
                runs.append(.text(ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor))))
            }
            runs.append(.token(ns.substring(with: m.range(at: 1))))
            cursor = m.range.location + m.range.length
        }
        if cursor < ns.length {
            runs.append(.text(ns.substring(from: cursor)))
        }
        return runs
    }
}

/// What kind of icon a `{Token}` maps to. `orb` col/row index into `icon-orbs.png` (36px cells).
enum SkillTokenKind: Equatable {
    case orb(col: Int, row: Int)
    case type(Int)
    case awoken(Int)
}

enum SkillToken {
    // col 0 rows 0-9 = attr 0-9; `locks` is the lock state overlay at col 1 row 1.
    private static let orbs: [String: (col: Int, row: Int)] = [
        "Fire": (0, 0), "Water": (0, 1), "Wood": (0, 2), "Light": (0, 3), "Dark": (0, 4),
        "Heal": (0, 5), "Jammers": (0, 6), "Poison": (0, 7), "Lethal Poison": (0, 8),
        "Bombs": (0, 9), "locks": (1, 1),
    ]
    private static let types: [String: Int] = [
        "Balanced": 1, "Physical": 2, "Healer": 3, "Dragon": 4, "God": 5,
        "Attacker": 6, "Devil": 7, "Machine": 8, "Enhance Material": 14,
    ]

    static func resolve(_ name: String) -> SkillTokenKind? {
        if let o = orbs[name] { return .orb(col: o.col, row: o.row) }
        if let t = types[name] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
