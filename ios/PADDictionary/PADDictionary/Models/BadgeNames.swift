import UIKit

// Real badge names, effects, and icons scraped from GameWith's Awakening Badge guide
// (https://xn--0ck4aw2h.gamewith.jp/article/show/31941) and AppMedia's badge list
// (https://appmedia.jp/pazudora/76466542, which also covers the upgraded "+" tier badges
// unlocked by a second/stronger character), matched to our `badgeId` groups by
// cross-referencing each badge's "obtained by getting <character>" text (normalized —
// spaces/&/・ stripped) against the card names sharing that badgeId in
// monsters-info/mon_ja.json. Names are kept in Japanese, matching the source sites, since
// there's no official English text for these. Icon PNGs live in the BadgeIcons/ source
// folder (flattened into the app bundle root at build time). Combined, these two guides
// cover 70 of our 77 badgeId groups — the rest (newer collabs not yet documented there)
// have no entry. AppMedia explicitly calls out that some "+" tier badges (self-made event
// exclusives) get a stronger 2.5x ATK multiplier instead of the standard +50%; that's used
// where confirmed. Other "+" tier badges have no confirmed stronger number, so they show
// the same effect as their base tier (this may understate the real "+" effect).
enum BadgeNames {
    private static let entries: [Int: (name: String, effect: String, icon: String)] = [
        15: (name: "マーベル強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_15"),
        16: (name: "夏休み強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_16"),
        24: (name: "ヒロアカ強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_24"),
        25: (name: "幻画師強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_25"),
        26: (name: "ガンダム強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_26"),
        27: (name: "転スラ強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_27"),
        28: (name: "電撃文庫強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_28"),
        29: (name: "ウルトラマン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_29"),
        30: (name: "ブライダル強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_30"),
        31: (name: "コードギアス強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_31"),
        32: (name: "モンハン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_32"),
        33: (name: "サンリオ強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_33"),
        34: (name: "呪術廻戦強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_34"),
        35: (name: "ハロウィン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_35"),
        36: (name: "デジモン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_36"),
        37: (name: "ディズニー強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_37"),
        38: (name: "ガンホー強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_38"),
        39: (name: "マガジン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_39"),
        40: (name: "クリスマス強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_40"),
        41: (name: "神タイプ強化", effect: "5x ATK for God type; +5% Team HP/RCV", icon: "badge_41"),
        42: (name: "ドラゴンタイプ強化", effect: "5x ATK for Dragon type; +5% Team HP/RCV", icon: "badge_42"),
        43: (name: "悪魔タイプ強化", effect: "5x ATK for Devil type; +5% Team HP/RCV", icon: "badge_43"),
        44: (name: "マシンタイプ強化", effect: "5x ATK for Machine type; +5% Team HP/RCV", icon: "badge_44"),
        45: (name: "バランスタイプ強化", effect: "5x ATK for Balanced type; +5% Team HP/RCV", icon: "badge_45"),
        46: (name: "攻撃タイプ強化", effect: "5x ATK for Attacker type; +5% Team HP/RCV", icon: "badge_46"),
        47: (name: "体力タイプ強化", effect: "5x ATK for Physical type; +5% Team HP/RCV", icon: "badge_47"),
        48: (name: "回復タイプ強化", effect: "5x ATK for Healer type; +5% Team HP/RCV", icon: "badge_48"),
        49: (name: "GA文庫強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_49"),
        50: (name: "正月強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_50"),
        51: (name: "フェス限ヒロイン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_51"),
        52: (name: "バレンタイン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_52"),
        54: (name: "ハイキュー強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_54"),
        56: (name: "新学期強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_56"),
        58: (name: "コナン&YAIBA強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_58"),
        60: (name: "星を紡ぐ精霊強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_60"),
        63: (name: "執事とメイド強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_63"),
        66: (name: "歴世の盃と神創の雫強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_66"),
        68: (name: "龍契士&龍喚士強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_68"),
        71: (name: "鬼滅の刃強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_71"),
        73: (name: "怪獣8号強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_73"),
        81: (name: "リゼロ強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_81"),
        84: (name: "フリーレン強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_84"),
        86: (name: "L字消し攻撃強化", effect: "+5% Team HP/RCV; L-shape match: 2x ATK, 25M fixed damage", icon: "badge_86"),
        89: (name: "5色攻撃強化", effect: "+5% Team HP/RCV; 5-color match: 5x ATK, +2 combo, 20M fixed damage", icon: "badge_89"),
        90: (name: "ダメージ無効貫通強化", effect: "+5% Team HP/RCV; Damage Void pierce: 3x ATK, +3 combo", icon: "badge_90"),
        91: (name: "大罪龍と鍵の勇者強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_91"),
        93: (name: "ミニキャラシリーズ強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_93"),
        95: (name: "3色攻撃強化", effect: "+5% Team HP/RCV; 3-color match: 2x ATK, +2 combo", icon: "badge_95"),
        96: (name: "式神使いと妖強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_96"),
        98: (name: "銀魂強化", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_98"),
        100: (name: "2体攻撃強化", effect: "+5% Team HP/RCV; 2-target attack: 2x ATK, +2 combo", icon: "badge_100"),
        53: (name: "ガンダム+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_53"),
        55: (name: "ハイキュー+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_55"),
        59: (name: "コナンYAIBA+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_59"),
        61: (name: "星を紡ぐ精霊+", effect: "2.5x ATK, +30% HP/RCV for this collab's characters", icon: "badge_61"),
        62: (name: "ガンホー+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_62"),
        64: (name: "執事とメイド+", effect: "2.5x ATK, +15% HP/RCV for this collab's characters", icon: "badge_64"),
        65: (name: "ブライダル+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_65"),
        67: (name: "歴世の杯と神創の雫+", effect: "2.5x ATK, +15% HP/RCV for this collab's characters", icon: "badge_67"),
        69: (name: "龍契士&龍喚士+", effect: "2.5x ATK, +15% HP/RCV for this collab's characters", icon: "badge_69"),
        72: (name: "鬼滅の刃+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_72"),
        74: (name: "怪獣8号+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_74"),
        76: (name: "サンリオ+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_76"),
        77: (name: "デジモン+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_77"),
        82: (name: "リゼロ+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_82"),
        85: (name: "フリーレン+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_85"),
        92: (name: "大罪龍と鍵の勇者+", effect: "2.5x ATK, +30% HP/RCV for this collab's characters", icon: "badge_92"),
        94: (name: "ミニキャラ+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_94"),
        97: (name: "式神使いと妖+", effect: "2.5x ATK, +30% HP/RCV for this collab's characters", icon: "badge_97"),
        99: (name: "銀魂+", effect: "+50% ATK, +15% HP/RCV for this collab's characters", icon: "badge_99"),
    ]

    enum Category: String, CaseIterable {
        case oldSchool = "Old School"
        case typeKiller = "Type Killer"
        case collab = "Collab"
    }

    // Old School = the original "monster strengthen" special-attack badges (AppMedia's
    // "モンスター強化" group, tied to non-collab PAD-original characters). Type Killer =
    // the 8 per-type ATK badges. Everything else is a licensed/event collab badge.
    private static let oldSchoolIds: Set<Int> = [86, 89, 90, 95, 100]
    private static let typeKillerIds: Set<Int> = [41, 42, 43, 44, 45, 46, 47, 48]

    static func category(for id: Int) -> Category {
        if oldSchoolIds.contains(id) { return .oldSchool }
        if typeKillerIds.contains(id) { return .typeKiller }
        return .collab
    }

    static func name(for id: Int) -> String? {
        entries[id]?.name
    }

    static func effect(for id: Int) -> String? {
        entries[id]?.effect
    }

    static func icon(for id: Int) -> UIImage? {
        guard let iconName = entries[id]?.icon,
              let url = Bundle.main.url(forResource: iconName, withExtension: "png"),
              let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}
