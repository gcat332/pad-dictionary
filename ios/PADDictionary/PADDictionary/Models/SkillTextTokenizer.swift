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

/// What kind of icon a token maps to. `orb` is a pixel rect into `icon-orbs.png`.
enum SkillTokenKind: Equatable {
    case orb(x: Int, y: Int, w: Int, h: Int)
    case type(Int)
    case awoken(Int)
}

enum SkillToken {
    // col 0 rows 0-9 = attr 0-9 (36px cells).
    private static let orbRow: [String: Int] = [
        "Fire": 0, "Water": 1, "Wood": 2, "Light": 3, "Dark": 4,
        "Heal": 5, "Jammers": 6, "Poison": 7, "Lethal Poison": 8, "Bombs": 9,
    ]
    private static let types: [String: Int] = [
        "Balanced": 1, "Physical": 2, "Healer": 3, "Dragon": 4, "God": 5,
        "Attacker": 6, "Devil": 7, "Machine": 8, "Enhance Material": 14,
    ]
    // "meta" table: Google-translated variant names → the canonical token name they mean.
    // Extend this as new translated phrasings show up.
    private static let aliases: [String: String] = [
        // orbs / attributes / states
        "Recovery": "Heal", "Darkness": "Dark", "Lock": "locks",
        // types
        "Attack type": "Attacker", "Attack Type": "Attacker",
        "Balance type": "Balanced", "Demon type": "Devil",
        // awoken skills
        "2-target attack": "Two-Pronged Attack", "Two-target attack": "Two-Pronged Attack",
        "Cross-erasing attack": "Cross Attack",
        "L-shaped erase attack": "[L] Increased Attack",
        "T-shaped erasing attack": "[T] Increased Attack",
        "Dark row reinforcement": "Enhanced Dark Rows",
        "Bind Resistance +": "Resistance-Bind+",
        "Simultaneous fire and water attack": "Fire & Water Attack",
    ]

    static func resolve(_ raw: String) -> SkillTokenKind? {
        let name = aliases[raw] ?? raw
        if name == "locks" {                       // lock overlay: tight 14x17 glyph at (36,36)
            return .orb(x: 36, y: 36, w: 14, h: 17)
        }
        if let row = orbRow[name] { return .orb(x: 0, y: row * 36, w: 36, h: 36) }
        if let t = types[name] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
