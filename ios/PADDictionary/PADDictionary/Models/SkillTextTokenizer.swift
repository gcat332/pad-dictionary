import Foundation

/// One segment of a skill description: literal text, or a token name (delimiters stripped).
/// `square` marks `[..]` tokens (translated text) vs `{..}` (official EN) — they fall back
/// differently when unresolved (see SkillTextView).
enum SkillTextRun: Equatable {
    case text(String)
    case token(name: String, square: Bool)
}

enum SkillTextTokenizer {
    // Official EN uses `{Fire}`; Google-translated JP uses `[Fire]` (from 【】/[光]). Match both.
    private static let regex = try! NSRegularExpression(pattern: #"\{([^}]+)\}|\[([^\]]+)\]"#)

    static func parse(_ s: String) -> [SkillTextRun] {
        let ns = s as NSString
        var runs: [SkillTextRun] = []
        var cursor = 0
        for m in regex.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            if m.range.location > cursor {
                runs.append(.text(ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor))))
            }
            let curly = m.range(at: 1)
            if curly.location != NSNotFound {
                runs.append(.token(name: ns.substring(with: curly), square: false))
            } else {
                runs.append(.token(name: ns.substring(with: m.range(at: 2)), square: true))
            }
            cursor = m.range.location + m.range.length
        }
        if cursor < ns.length {
            runs.append(.text(ns.substring(from: cursor)))
        }
        return runs
    }
}

/// What kind of icon a token maps to. `orb` col/row index into `icon-orbs.png` (36px cells);
/// `symbol` is an SF Symbol name (used for glyphs the sprite sheet renders too small/off-center).
enum SkillTokenKind: Equatable {
    case orb(col: Int, row: Int)
    case type(Int)
    case awoken(Int)
    case symbol(String)
}

enum SkillToken {
    // col 0 rows 0-9 = attr 0-9. Aliases cover Google-translated variants (Recovery=Heal, Darkness=Dark).
    private static let orbs: [String: (col: Int, row: Int)] = [
        "Fire": (0, 0), "Water": (0, 1), "Wood": (0, 2), "Light": (0, 3), "Dark": (0, 4),
        "Darkness": (0, 4), "Heal": (0, 5), "Recovery": (0, 5), "Jammers": (0, 6),
        "Poison": (0, 7), "Lethal Poison": (0, 8), "Bombs": (0, 9),
    ]
    private static let types: [String: Int] = [
        "Balanced": 1, "Physical": 2, "Healer": 3, "Dragon": 4, "God": 5,
        "Attacker": 6, "Devil": 7, "Demon type": 7, "Machine": 8, "Enhance Material": 14,
    ]
    // The lock cell in icon-orbs.png is a tiny corner overlay — an SF Symbol reads better inline.
    private static let symbols: [String: String] = [
        "locks": "lock.fill", "Lock": "lock.fill",
    ]

    static func resolve(_ name: String) -> SkillTokenKind? {
        if let o = orbs[name] { return .orb(col: o.col, row: o.row) }
        if let s = symbols[name] { return .symbol(s) }
        if let t = types[name] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
