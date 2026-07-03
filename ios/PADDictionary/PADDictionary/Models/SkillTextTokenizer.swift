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
        "Attack type": "Attacker", "Balance type": "Balanced",
        "Demon type": "Devil", "Dragon type": "Dragon",
        // awoken skills
        "2-target attack": "Two-Pronged Attack", "Two-target attack": "Two-Pronged Attack",
        "Cross-erasing attack": "Cross Attack",
        "L-shaped erase attack": "[L] Increased Attack",
        "L-shaped erase attack +": "[L] Increased Attack+",
        "T-shaped erasing attack": "[T] Increased Attack",
        "Dark row reinforcement": "Enhanced Dark Rows",
        "Bind Resistance +": "Resistance-Bind+",
        "Simultaneous fire and water attack": "Fire & Water Attack",
        "4-color attack enhancement": "4 Att. Enhanced Attack",
        "3 color attack reinforcement": "3 Att. Enhanced Attack",
        "Operation Time Extension +": "Extend Time+",
        "Extended Move Time+": "Extend Time+",   // official EN token variant
        "Light Attribute Enhancement": "Enhanced Light Orbs",
        "Light Drop Enhancement +": "Enhanced Light Orbs+",
        "Wood Drop Enhancement +": "Enhanced Wood Orbs+",
        "Dark Drop Enhancement +": "Enhanced Dark Orbs+",
    ]

    // Google translations vary in case ("attack type" vs "Attack Type"), so alias/orb/type
    // lookups are case-insensitive. Awoken names stay exact (aliases map to canonical casing).
    // uniquingKeysWith avoids a crash when two source keys collide on lowercasing
    // (e.g. "Attack type" and "Attack Type") — they map to the same value anyway.
    private static let aliasesLower = Dictionary(aliases.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { a, _ in a })
    private static let orbRowLower = Dictionary(orbRow.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { a, _ in a })
    private static let typesLower = Dictionary(types.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { a, _ in a })

    static func resolve(_ raw: String) -> SkillTokenKind? {
        let name = aliasesLower[raw.lowercased()] ?? raw
        let lower = name.lowercased()
        if lower == "locks" {                       // lock overlay: tight 14x17 glyph at (36,36)
            return .orb(x: 36, y: 36, w: 14, h: 17)
        }
        if let row = orbRowLower[lower] { return .orb(x: 0, y: row * 36, w: 36, h: 36) }
        if let t = typesLower[lower] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
