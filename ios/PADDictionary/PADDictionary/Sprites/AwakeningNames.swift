import Foundation

enum AwakeningNames {
    private static let names: [String: String] = {
        guard let url = Bundle.main.url(forResource: "awoken_names", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([String: String].self, from: data) else {
            return [:]
        }
        return decoded
    }()

    private static let idByName: [String: Int] = {
        var map: [String: Int] = [:]
        for (idStr, name) in names { if let id = Int(idStr) { map[name] = id } }
        return map
    }()

    /// Reverse of `name(for:)`: awakening name → id (exact match), or nil.
    static func id(forName name: String) -> Int? { idByName[name] }

    // Effect text verified against GameWith's Awakening Skill guide
    // (https://xn--0ck4aw2h.gamewith.jp/article/show/15917, scraped live with full-page
    // scroll to capture all lazy-loaded rows) — the primary source, taking precedence over
    // any conflicting number found elsewhere. A few ids (1-3) only have a number from
    // altema's list (https://altema.jp/pazudora/kakuseiskilllist) where GameWith's own page
    // showed a smaller, likely-stale figure; GameWith's number is used since it's the
    // source of truth here. Only ids with a page-confirmed multiplier/number are included.
    private static let descriptions: [Int: String] = [
        1: "+500 HP", 2: "+100 ATK", 3: "+200 RCV",
        4: "-7% Fire damage taken", 5: "-7% Water damage taken", 6: "-7% Wood damage taken",
        7: "-7% Light damage taken", 8: "-7% Dark damage taken",
        9: "Recover 1000 HP each turn a drop is cleared", 10: "50% Bind resistance",
        11: "20% Blind resistance", 12: "20% Jammer resistance", 13: "20% Poison resistance",
        14: "20% appearance rate, +7% ATK per enhanced Fire orb matched",
        15: "20% appearance rate, +7% ATK per enhanced Water orb matched",
        16: "20% appearance rate, +7% ATK per enhanced Wood orb matched",
        17: "20% appearance rate, +7% ATK per enhanced Light orb matched",
        18: "20% appearance rate, +7% ATK per enhanced Dark orb matched",
        19: "+0.5s orb move time", 20: "Clear a recovery row: 2x ATK, heals Bind 6 turns",
        21: "Team's skills start 1 turn charged",
        22: "+30% ATK matching a full row of Fire", 23: "+30% ATK matching a full row of Water",
        24: "+30% ATK matching a full row of Wood", 25: "+30% ATK matching a full row of Light",
        26: "+30% ATK matching a full row of Dark",
        27: "4-orb square match: 2.2x ATK, hits 2 enemies", 28: "20% Skill Bind resistance",
        29: "20% appearance rate, +5% RCV per enhanced Heal orb matched; 4-match: 1.5x RCV",
        30: "+50% all stats in multiplayer",
        31: "5x ATK vs Dragon type; 2x damage cap", 32: "5x ATK vs God type; 2x damage cap",
        33: "5x ATK vs Devil type; 2x damage cap", 34: "5x ATK vs Machine type; 2x damage cap",
        35: "5x ATK vs Balanced type; 2x damage cap", 36: "5x ATK vs Attacker type; 2x damage cap",
        37: "5x ATK vs Physical type; 2x damage cap", 38: "5x ATK vs Healer type; 2x damage cap",
        39: "5x ATK vs Evo Material type; 1.2x damage cap", 40: "5x ATK vs Awoken Skill Material type; 1.2x damage cap",
        41: "5x ATK vs Enhance Material type; 1.2x damage cap", 42: "5x ATK vs Redeemable type; 1.2x damage cap",
        43: "7+ combos: 2x ATK; 14+ combos: 2.5x ATK",
        44: "5-color simultaneous match: 3x ATK, ignores enemy defense",
        45: "Vertical Heal-orb line: 500,000 fixed damage, +20% damage to Shields",
        46: "+5% Team HP", 47: "+20% Team RCV",
        48: "3x3 block match: 3.5x ATK, pierces Damage Void",
        49: "Assisting another monster grants it this awakening",
        50: "3x3 Heal-orb block: 8x ATK, 10,000,000 fixed damage, +50% damage to Shields",
        51: "5-color match: +1 turn skill charge",
        52: "100% Bind resistance", 53: "+1s orb move time", 54: "100% Cloud resistance",
        55: "100% no-skyfall resistance", 56: "Team's skills start 2 turns charged",
        57: "Above 50% HP: 2.5x ATK", 58: "Below 50% HP: 2.5x ATK",
        59: "L-shape Heal match (5 orbs): -5% damage taken, 3x ATK, heals Bind 1 turn",
        60: "L-shape match (5 orbs): 2.2x ATK, clears Lock",
        61: "10+ combos: 5x ATK",
        62: "10+ same-color match: spawns Combo Orbs (max 8), +1 combo (max 4)",
        63: "+10% all stats; plays a voice line on skill use (not affected by awakening void)",
        64: "Solo play: small boost to rank EXP, monster EXP, coins, and egg drop rate",
        65: "-2500 HP (min 1)", 66: "-1000 ATK (min 1)", 67: "-2000 RCV (min 1)",
        68: "100% Blind resistance", 69: "100% Jammer resistance", 70: "100% Poison resistance",
        71: "Jammer orbs appear; matching them: 2x ATK", 72: "Poison orbs appear; matching them: 2x ATK",
        73: "+30% ATK per Fire combo beyond the first (2+ combos)",
        74: "+30% ATK per Water combo beyond the first (2+ combos)",
        75: "+30% ATK per Wood combo beyond the first (2+ combos)",
        76: "+30% ATK per Light combo beyond the first (2+ combos)",
        77: "+30% ATK per Dark combo beyond the first (2+ combos)",
        78: "5-orb cross match: 3x ATK, cures Blind for 3 turns",
        79: "3+ colors matched: 2.5x ATK", 80: "4+ colors matched: 4x ATK", 81: "5 colors matched: 5x ATK",
        82: "12+ same-color match: 12x ATK",
        83: "Adds Dragon type while in a dungeon", 84: "Adds God type while in a dungeon",
        85: "Adds Devil type while in a dungeon", 86: "Adds Machine type while in a dungeon",
        87: "Adds Balanced type while in a dungeon", 88: "Adds Attacker type while in a dungeon",
        89: "Adds Physical type while in a dungeon", 90: "Adds Healer type while in a dungeon",
        91: "Sub-attribute becomes Fire in a dungeon (damage = 15% of ATK)",
        92: "Sub-attribute becomes Water in a dungeon (damage = 15% of ATK)",
        93: "Sub-attribute becomes Wood in a dungeon (damage = 15% of ATK)",
        94: "Sub-attribute becomes Light in a dungeon (damage = 15% of ATK)",
        95: "Sub-attribute becomes Dark in a dungeon (damage = 15% of ATK)",
        96: "4-orb square match: 4.84x ATK, hits 2 enemies",
        97: "5-color match: +2 turns skill charge",
        98: "Recover 2000 HP each turn a drop is cleared",
        99: "40% appearance rate, +14% ATK per enhanced Fire orb matched",
        100: "40% appearance rate, +14% ATK per enhanced Water orb matched",
        101: "40% appearance rate, +14% ATK per enhanced Wood orb matched",
        102: "40% appearance rate, +14% ATK per enhanced Light orb matched",
        103: "40% appearance rate, +14% ATK per enhanced Dark orb matched",
        104: "40% appearance rate, +10% RCV per enhanced Heal orb matched; 4-match: 1.5x RCV",
        105: "Team's skills start reduced by 1 turn",
        106: "Reduces Super Gravity's effect on self ~20x (e.g. 1/80 becomes 1/4)",
        107: "7+ combos: 4x ATK; 14+ combos: 6.25x ATK",
        108: "L-shape match: 4.84x ATK, clears Lock",
        109: "3x3 block match: 12.25x ATK, pierces Damage Void",
        110: "5-orb cross match: 9x ATK, cures Blind for 6 turns",
        111: "10+ combos: 25x ATK",
        112: "3+ colors matched: 6.25x ATK", 113: "4+ colors matched: 16x ATK", 114: "5 colors matched: 25x ATK",
        115: "Clear a recovery row: 4x ATK, heals Bind 12 turns",
        116: "+90% ATK matching a full row of Fire", 117: "+90% ATK matching a full row of Water",
        118: "+90% ATK matching a full row of Wood", 119: "+90% ATK matching a full row of Light",
        120: "+90% ATK matching a full row of Dark",
        121: "+60% ATK per Fire combo beyond the first (2+ combos)",
        122: "+60% ATK per Water combo beyond the first (2+ combos)",
        123: "+60% ATK per Wood combo beyond the first (2+ combos)",
        124: "+60% ATK per Light combo beyond the first (2+ combos)",
        125: "+60% ATK per Dark combo beyond the first (2+ combos)",
        126: "T-shape match: 8x ATK (with enhanced orbs)",
        127: "All stats x1.5",
        128: "On Yang Blessing floors: 2x HP/RCV, 5x ATK",
        129: "On Yin Blessing floors: 2x HP/RCV, 5x ATK",
        130: "From battle 5+: all stats x1.5; from battle 10+: all stats x2",
        131: "+10% part-break material drop rate; x1.2 all stats per part destroyed",
        132: "-20% damage from Poison/Mortal Poison/Spike orbs; +25% all stats",
        133: "Simultaneous Fire+Water match: 50x ATK, ignores type disadvantage",
        134: "Simultaneous Water+Wood match: 50x ATK, ignores type disadvantage",
        135: "Simultaneous Wood+Fire match: 50x ATK, ignores type disadvantage",
        136: "Blocks 1 turn of skill delay",
        138: "Self and assist monster share type + main attribute: 3x all stats (excludes Add-Type)",
        139: "+3x all stats when no assist is set",
        140: "Blocks orb-move-time-altering attacks",
        141: "Time-limited: 4+ colors 50x ATK; 5 colors also deals 5% of enemy max HP",
        143: "Battle 3+: 30x ATK; 6+: 60x; 9+: 90x; 12+: 120x; 15+: 150x (does not stack)",
    ]

    static func name(for id: Int) -> String {
        names[String(id)] ?? "Awoken \(id)"
    }

    static func description(for id: Int) -> String? {
        descriptions[id]
    }

    static var allIds: [Int] {
        names.keys.compactMap(Int.init).sorted()
    }
}
