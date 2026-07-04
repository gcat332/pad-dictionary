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

/// What kind of icon a token maps to. `orb` is a pixel rect into `icon-orbs.png`;
/// `surge` is an orb (by attr row) drawn inside a rounded frame, matching the game's
/// "orbs more likely to appear" indicator.
enum SkillTokenKind: Equatable {
    case orb(x: Int, y: Int, w: Int, h: Int)
    case surge(orbRow: Int)
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
    // "Surge" (orbs more likely to appear) → the matching orb (crests read poorly at this size).
    private static let surgeOrbRow: [String: Int] = [
        "fire": 0, "water": 1, "wood": 2, "light": 3, "dark": 4, "heal": 5, "recovery": 5,
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
        // Google mistranslates 水木 (Water-Wood) as the name "Mizuki", and 木 (Wood) alone
        // as "Thursday" (from 木曜日) — these are attribute-pair "同時攻撃" awakenings.
        "Fire and water simultaneous attack": "Fire & Water Attack",
        "Mizuki simultaneous attack": "Water & Wood Attack",
        "Mizuki-Thursday attack": "Water & Wood Attack",
        "Thursday and fire simultaneous attack": "Wood & Fire Attack",
        "4-color attack enhancement": "4 Att. Enhanced Attack",
        "3 color attack reinforcement": "3 Att. Enhanced Attack",
        "Operation Time Extension +": "Extend Time+",
        "Extended Move Time+": "Extend Time+",   // official EN token variant
        "Light Attribute Enhancement": "Enhanced Light Orbs",
        "Light Drop Enhancement +": "Enhanced Light Orbs+",
        "Wood Drop Enhancement +": "Enhanced Wood Orbs+",
        "Dark Drop Enhancement +": "Enhanced Dark Orbs+",
        "Fire Drop Enhancement +": "Enhanced Fire Orbs+",
        "recovery drop enhancement": "Enhanced Heal Orbs",
        "Recovery drop enhancement +": "Enhanced Heal Orbs+",
        // row enhance — translations vary ("X row reinforcement" / "X Row Enhancement" /
        // "line reinforcement"); the existing table only had Dark, so fill the rest.
        "Fire row reinforcement": "Enhanced Fire Rows",
        "Fire Row Enhancement": "Enhanced Fire Rows",
        "Water row reinforcement": "Enhanced Water Rows",
        "Water Row Enhancement": "Enhanced Water Rows",
        "Wood row reinforcement": "Enhanced Wood Rows",
        "Wood Row Enhancement": "Enhanced Wood Rows",
        "Strengthen tree row": "Enhanced Wood Rows",   // 木 mistranslated as "tree"
        "Light row reinforcement": "Enhanced Light Rows",
        "Light line reinforcement": "Enhanced Light Rows",
        "Light Row Enhancement": "Enhanced Light Rows",
        "Dark Row Enhancement": "Enhanced Dark Rows",
        "Dark Row Enhancement x3": "Triple Enhanced Dark Rows",
        // combos
        "Combo Enhancement": "Enhanced Combos",
        "Combo Enhancement +": "Enhanced Combos+",
        "Super combo enhancement": "Super Enhanced Combos",
        "Water Combo Enhancement +": "Enhanced Water Combos",
        "Combo Drops": "Combo Orbs",
        // attacks
        "Cross erase attack": "Cross Attack",
        "Cross erasing attack": "Cross Attack",
        "Cross-erasing Attack +": "Cross Attack+",
        "L-shaped eraser attack": "[L] Increased Attack",
        "Simultaneous fire and water attack": "Fire & Water Attack",
        "Simultaneous wood/fire attack": "Wood & Fire Attack",
        "Simultaneous fire and wood attack": "Wood & Fire Attack",
        // multi-attribute attack (5-color exists only as an attack awakening)
        "3-color attack enhancement": "3 Att. Enhanced Attack",
        "5-color attack enhancement": "5 Att. Enhanced Attack",
        "Enhanced 5-color attack": "5 Att. Enhanced Attack",
        "5-color drop enhancement": "5 Att. Enhanced Attack",
        "5 color drop enhancement": "5 Att. Enhanced Attack",
        // damage-void pierce
        "Damage nullification piercing attack": "Damage Void Piercer",
        "Damage Nullification Penetrating Attack": "Damage Void Piercer",
        "Damage Nullified Penetrating Attack": "Damage Void Piercer",
        // resistances
        "Cloud Resistance": "Resistance-Clouds",
        "Uncontrollable Resistance": "Resistance-Immobility",
        "Seal Resistance": "Resistance-Skill Bind",
        // types (translated "X type" → the type-icon token)
        "God type": "God",
        "Devil type": "Devil",
        // Google renders attribute kanji as weekdays: 水曜日→Wednesday (Water), 木曜日→Thursday (Wood)
        "Wednesday": "Water",
        "Thursday": "Wood",
        // assist-awakening keywords that show up bracketed in skill text
        "Part destruction bonus": "Part Break Bonus",
        "Bind Recovery": "Recover Bind",
        "Bind Recovery +": "Recover Bind+",
        // sub-attribute change awakening (副属性変更・X) — Google varies the separator (: or /)
        // and renders 闇 as "Darkness". 94 is mislabelled in the data, so Light is omitted.
        "Sub-attribute change: Fire": "Change Sub Attribute: Fire",
        "Sub-attribute change/Fire": "Change Sub Attribute: Fire",
        "Sub-attribute change: Water": "Change Sub Attribute: Water",
        "Sub-attribute change/Water": "Change Sub Attribute: Water",
        "Sub-attribute change: Wood": "Change Sub Attribute: Wood",
        "Sub-attribute change/Wood": "Change Sub Attribute: Wood",
        "Sub-attribute change: Dark": "Change Sub Attribute: Dark",
        "Sub-attribute change: Darkness": "Change Sub Attribute: Dark",
        "Sub-attribute change/Darkness": "Change Sub Attribute: Dark",
        // gimmick orbs
        "Nail Drops": "Nail",
        "Block": "Jammers",   // ブロック/お邪魔 generated by skills = the jammer (spiky) orb
        "tree": "Wood",       // 木 = a Wood orb (Google renders the kanji as "tree")
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
        if lower == "nail" {                         // thumbtack overlay: tight 17x17 glyph
            return .orb(x: 36, y: 235, w: 17, h: 17)
        }
        if lower == "combo" {                        // combo-drop "roller" glyph (icon-orbs c1 r5, top-right)
            return .orb(x: 53, y: 180, w: 19, h: 16)
        }
        // "{Fire Surge}" etc = "orbs more likely to appear" — the matching orb with the
        // drop-rate overlay on top (matches the game indicator).
        if lower.hasSuffix(" surge"), let row = surgeOrbRow[String(lower.dropLast(6))] {
            return .surge(orbRow: row)
        }
        if let row = orbRowLower[lower] { return .orb(x: 0, y: row * 36, w: 36, h: 36) }
        if let t = typesLower[lower] { return .type(t) }
        if let a = AwakeningNames.id(forName: name) { return .awoken(a) }
        return nil
    }
}
