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

    static func name(for id: Int) -> String {
        names[id] ?? "Latent Awakening \(id)"
    }

    static var allIds: [Int] { names.keys.sorted() }
}
