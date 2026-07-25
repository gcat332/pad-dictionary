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
    // Regular per-attribute awakening families. Google renders the same JP awakening a dozen
    // ways (ドロップ強化 → "drop enhancement" / "drop reinforcement" / "attribute enhancement",
    // 列強化 → "row" / "line" / "column", ×3 → "x3" / "×3"), so generate the permutations
    // instead of hand-listing ~150 aliases. Keys are already lowercased.
    private static let attrAliases: [String: String] = {
        // Google also renders the attribute kanji itself inconsistently: 木 → "wood"/"tree"/
        // "Thursday" (木曜日), 水 → "Wednesday" (水曜日), 闇 → "darkness", 回復 → "recovery".
        // `rowCombo` is false for Heal — there is no heal row/combo awakening.
        let attrs: [(words: [String], canon: String, rowCombo: Bool)] = [
            (["fire"], "Fire", true),
            (["water", "wednesday"], "Water", true),
            (["wood", "tree", "thursday"], "Wood", true),
            (["light"], "Light", true),
            (["dark", "darkness"], "Dark", true),
            (["recovery", "heal", "healing"], "Heal", false),
        ]
        var out: [String: String] = [:]
        for (words, canon, rowCombo) in attrs {
            for w in words {
                for noun in ["drop", "attribute"] {
                    for verb in ["enhancement", "reinforcement"] {
                        out["\(w) \(noun) \(verb)"] = "Enhanced \(canon) Orbs"
                        out["\(w) \(noun) \(verb) +"] = "Enhanced \(canon) Orbs+"
                        out["\(w) \(noun) \(verb)+"] = "Enhanced \(canon) Orbs+"
                    }
                }
                guard rowCombo else { continue }
                for noun in ["row", "line", "column"] {
                    for verb in ["enhancement", "reinforcement"] {
                        out["\(w) \(noun) \(verb)"] = "Enhanced \(canon) Rows"
                        for x3 in ["x3", "×3"] {
                            out["\(w) \(noun) \(verb) \(x3)"] = "Triple Enhanced \(canon) Rows"
                            out["\(w) \(noun) \(verb)\(x3)"] = "Triple Enhanced \(canon) Rows"
                        }
                    }
                }
                for verb in ["enhancement", "reinforcement"] {
                    out["\(w) combo \(verb)"] = "Enhanced \(canon) Combos"
                    out["\(w) combo \(verb) +"] = "Enhanced \(canon) Combos+"
                    out["\(w) combo \(verb)+"] = "Enhanced \(canon) Combos+"
                }
            }
        }
        return out
    }()

    // Multi-attribute attack awakenings (N色攻撃強化) — Google hyphenates the count or not
    // ("4-color attack enhancement" / "4 color attack enhancement") and swaps the verb.
    private static let multiColorAliases: [String: String] = {
        var out: [String: String] = [:]
        for n in 3...5 {
            for sep in ["-color", " color"] {
                for verb in ["attack enhancement", "attack reinforcement"] {
                    out["\(n)\(sep) \(verb)"] = "\(n) Att. Enhanced Attack"
                    out["\(n)\(sep) \(verb) +"] = "\(n) Att. Enhanced Attack+"
                    out["\(n)\(sep) \(verb)+"] = "\(n) Att. Enhanced Attack+"
                }
            }
        }
        return out
    }()

    // Type tokens ("[Machine type]") and the type-add awakenings ("[Dragon type added]").
    // 体力タイプ comes back as "Physicality type" / "Physical type"; 回復タイプ as "Recovery type".
    private static let typeAliases: [String: String] = {
        let entries: [(words: [String], canon: String, added: String)] = [
            (["dragon"], "Dragon", "Add Dragon Type"),
            (["god"], "God", "Add God Type"),
            (["devil", "demon"], "Devil", "Add Devil Type"),
            (["machine"], "Machine", "Add Machine Type"),
            (["balance", "balanced"], "Balanced", "Add Balanced Type"),
            (["attack", "attacker"], "Attacker", "Add Attacker Type"),
            (["physical", "physicality", "body"], "Physical", "Add Physical Type"),
            (["recovery", "healer", "healing"], "Healer", "Add Healer Type"),
        ]
        var out: [String: String] = [:]
        for (words, canon, added) in entries {
            for w in words {
                out["\(w) type"] = canon
                for suffix in ["added", "addition", "add"] { out["\(w) type \(suffix)"] = added }
            }
        }
        return out
    }()

    // "meta" table: Google-translated variant names → the canonical token name they mean.
    // Only irregular phrasings live here — the regular attribute/type families above are
    // generated. Extend this as new translated phrasings show up.
    private static let aliases: [String: String] = [
        // orbs / attributes / states
        "Recovery": "Heal", "Darkness": "Dark", "Lock": "locks",
        // awoken skills
        "2-target attack": "Two-Pronged Attack", "Two-target attack": "Two-Pronged Attack",
        "2-target attack +": "Two-Pronged Attack+", "2-target attack+": "Two-Pronged Attack+",
        "Two-target attack +": "Two-Pronged Attack+",
        "Cross-erasing attack": "Cross Attack",
        "L-shaped erase attack": "[L] Increased Attack",
        "L-shaped erase attack +": "[L] Increased Attack+",
        "T-shaped erasing attack": "[T] Increased Attack",
        "T-shaped erase attack": "[T] Increased Attack",
        "Bind Resistance +": "Resistance-Bind+",
        "Floating": "Levitation",                      // 浮遊
        // 全パラメータ強化 — Google flips between a noun phrase and a sentence
        "All parameter enhancement": "Enhanced Stats",
        "Enhances all parameters": "Enhanced Stats",
        "All parameter enhancement +": "Enhanced Stats+",
        // Google mistranslates 水木 (Water-Wood) as the name "Mizuki", and 木 (Wood) alone
        // as "Thursday" (from 木曜日) — these are attribute-pair "同時攻撃" awakenings.
        "Fire and water simultaneous attack": "Fire & Water Attack",
        "Mizuki simultaneous attack": "Water & Wood Attack",
        "Mizuki-Thursday attack": "Water & Wood Attack",
        "Thursday and fire simultaneous attack": "Wood & Fire Attack",
        "Operation Time Extension +": "Extend Time+",
        "Extended Move Time+": "Extend Time+",   // official EN token variant
        "Strengthen tree row": "Enhanced Wood Rows",   // 木 mistranslated as "tree"
        // combos (attribute combos are generated; these are the attribute-less ones)
        "Combo Enhancement": "Enhanced Combos",
        "Combo Enhancement +": "Enhanced Combos+",
        "Super combo enhancement": "Super Enhanced Combos",
        "Combo Drops": "Combo Orbs",
        // attacks
        "Cross erase attack": "Cross Attack",
        "Cross erasing attack": "Cross Attack",
        "Cross-erasing Attack +": "Cross Attack+",
        "L-shaped eraser attack": "[L] Increased Attack",
        "Simultaneous fire and water attack": "Fire & Water Attack",
        "Simultaneous wood/fire attack": "Wood & Fire Attack",
        "Simultaneous fire and wood attack": "Wood & Fire Attack",
        // multi-attribute attack — irregular phrasings only ("N-color attack enhancement"
        // and friends are generated above)
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
        // 暗闇耐性 = blind resist; "Darkness" here is 暗闇 (blindness), not the 闇 attribute
        "Darkness Resistance": "Resistance-Blind",
        "Darkness Resistance +": "Resistance-Blind+",
        // Google renders attribute kanji as weekdays: 水曜日→Wednesday (Water), 木曜日→Thursday (Wood)
        "Wednesday": "Water",
        "Thursday": "Wood",
        // assist-awakening keywords that show up bracketed in skill text
        "Part destruction bonus": "Part Break Bonus",
        "Bind Recovery": "Recover Bind",
        "Bind Recovery +": "Recover Bind+",
        // sub-attribute change awakening (副属性変更・X) — Google varies the separator (: or /)
        // and renders 闇 as "Darkness". (Id 94 is Light; awoken_names.json used to label it
        // Water — fixed there, so Light resolves like the rest now.)
        "Sub-attribute change: Fire": "Change Sub Attribute: Fire",
        "Sub-attribute change/Fire": "Change Sub Attribute: Fire",
        "Sub-attribute change: Water": "Change Sub Attribute: Water",
        "Sub-attribute change/Water": "Change Sub Attribute: Water",
        "Sub-attribute change: Wood": "Change Sub Attribute: Wood",
        "Sub-attribute change/Wood": "Change Sub Attribute: Wood",
        "Sub-attribute change: Light": "Change Sub Attribute: Light",
        "Sub-attribute change/Light": "Change Sub Attribute: Light",
        "Sub-attribute change: Dark": "Change Sub Attribute: Dark",
        "Sub-attribute change: Darkness": "Change Sub Attribute: Dark",
        "Sub-attribute change/Darkness": "Change Sub Attribute: Dark",
        // gimmick orbs
        "Nail Drops": "Nail",
        "Block": "Jammers",   // ブロック/お邪魔 generated by skills = the jammer (spiky) orb
        "tree": "Wood",       // 木 = a Wood orb (Google renders the kanji as "tree")
        "Recovery Enhancement": "Heal",   // 回復力エンハンス shown as the heal (heart) orb
    ]

    // Google translations vary in case ("attack type" vs "Attack Type"), so every lookup
    // (alias / orb / type, and AwakeningNames itself) is case-insensitive.
    // uniquingKeysWith avoids a crash when two source keys collide on lowercasing
    // (e.g. "Attack type" and "Attack Type") — they map to the same value anyway.
    // Hand-written aliases win over the generated families (they're the exceptions).
    private static let aliasesLower = attrAliases
        .merging(multiColorAliases, uniquingKeysWith: { a, _ in a })
        .merging(typeAliases, uniquingKeysWith: { a, _ in a })
        .merging(aliases.map { ($0.key.lowercased(), $0.value) }, uniquingKeysWith: { _, manual in manual })
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
