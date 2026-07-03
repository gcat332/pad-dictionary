import Foundation

// Latent Awakenings have no name/description file of their own in the synced data.
// Names are derived from the "潜在たまドラ☆<name>" Latent TAMADRA material cards that
// grant each id (see monsters-info/mon_ja.json), translated from the community-standard
// PAD terminology — there is no official English text for these ids anywhere in the data.
enum LatentAwakeningNames {
    private static let names: [Int: String] = [
        1: "HP+", 2: "ATK+", 3: "RCV+", 4: "Extend Orb Move Time", 5: "Auto-Recover",
        6: "Reduce Fire Damage", 7: "Reduce Water Damage", 8: "Reduce Wood Damage",
        9: "Reduce Light Damage", 10: "Reduce Dark Damage",
        11: "Resistance-Skill Delay", 12: "Enhanced All Stats", 13: "Resistance-Leader Swap",
        14: "Resistance-Jammers", 15: "Resistance-Poison",
        16: "Evo Material Killer", 17: "Awoken Material Killer", 18: "Enhance Material Killer",
        19: "Redeemable Killer", 20: "God Killer", 21: "Dragon Killer", 22: "Devil Killer",
        23: "Machine Killer", 24: "Balanced Killer", 25: "Attacker Killer", 26: "Physical Killer",
        27: "Healer Killer",
        28: "HP+ (Enhanced)", 29: "ATK+ (Enhanced)", 30: "RCV+ (Enhanced)",
        31: "Extend Orb Move Time (Enhanced)",
        32: "Reduce Fire Damage (Enhanced)", 33: "Reduce Water Damage (Enhanced)",
        34: "Reduce Wood Damage (Enhanced)", 35: "Reduce Light Damage (Enhanced)",
        36: "Reduce Dark Damage (Enhanced)",
        37: "Damage Void Penetration", 38: "Attribute Absorb Penetration", 39: "Damage Absorb Penetration",
        40: "Roulette Recovery", 41: "Indelible Orb Recovery", 42: "Damage Cap Release",
        43: "HP+ (Super Enhanced)", 44: "ATK+ (Super Enhanced)", 45: "RCV+ (Super Enhanced)",
        46: "Cloud & No-Move Recovery", 47: "Skill Boost++", 48: "Assist Void Recovery",
        49: "Damage Cap Release x8", 50: "Extra Attack", 51: "Ignore Defense",
    ]

    // Effect text verified against GameWith's Latent Awakening guide
    // (https://xn--0ck4aw2h.gamewith.jp/article/show/38230). Only numbers explicitly
    // stated there are included; higher tiers without a page-confirmed number are
    // described qualitatively instead of guessing.
    private static let descriptions: [Int: String] = [
        1: "+1.5% HP", 2: "+1% ATK", 3: "+10% RCV", 4: "+0.05s orb move time",
        5: "Recover 15% RCV each turn a drop is cleared",
        6: "-1% Fire damage taken", 7: "-1% Water damage taken", 8: "-1% Wood damage taken",
        9: "-1% Light damage taken", 10: "-1% Dark damage taken",
        11: "Blocks 1 turn of skill delay", 12: "+3% HP, +2% ATK, +20% RCV",
        13: "Blocks leader-swap attacks; 2x damage cap",
        14: "Blocks Jammer-spawn attacks; 2x damage cap",
        15: "Blocks Poison-spawn attacks; 2x damage cap",
        16: "2x ATK vs Evo Material type", 17: "2x ATK vs Awoken Skill Material type",
        18: "2x ATK vs Enhance Material type", 19: "2x ATK vs Redeemable type",
        20: "2x ATK vs God type", 21: "2x ATK vs Dragon type", 22: "2x ATK vs Devil type",
        23: "2x ATK vs Machine type", 24: "2x ATK vs Balanced type", 25: "2x ATK vs Attacker type",
        26: "2x ATK vs Physical type", 27: "2x ATK vs Healer type",
        28: "+4.5% HP", 29: "+3% ATK", 30: "+30% RCV",
        37: "6-color match pierces damage void", 38: "2+ color match pierces attribute absorb",
        39: "Combo-generation triggers damage-absorb bypass",
        40: "Clear a recovery row to heal 10 turns of Roulette",
        41: "2-target attack clears 1 turn of indelible orbs",
        42: "Raises damage cap (x4, or x8 for sub-attribute-only monsters)",
        43: "+10% HP (needs super-limit-break)", 44: "+8% ATK (needs super-limit-break)",
        45: "+35% RCV (needs super-limit-break)",
        46: "Clear a recovery column to heal 5 turns of Cloud/No-Move",
        47: "Team's skills start 3 turns charged", 48: "L-shape attack clears 1 turn of assist void",
        49: "Raises damage cap to x8",
        50: "Fixed bonus damage to the targeted part on a cross-shape clear",
        51: "Ignores enemy defense",
    ]

    static func name(for id: Int) -> String {
        names[id] ?? "Latent Awakening \(id)"
    }

    static func description(for id: Int) -> String? {
        descriptions[id]
    }

    /// Latent Awakenings have no icon of their own — the Latent TAMADRA material card
    /// that grants each id (name starts with "潜在たまドラ") doubles as its icon.
    /// Computed from synced card data instead of hardcoded, since new tiers can be added.
    static func representativeCard(for id: Int, in cards: [Card]) -> Card? {
        cards.first { $0.latentAwakeningId == id && $0.name.hasPrefix("潜在たまドラ") }
    }

    static var allIds: [Int] { names.keys.sorted() }
}
