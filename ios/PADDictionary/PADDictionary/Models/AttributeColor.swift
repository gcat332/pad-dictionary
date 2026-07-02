import SwiftUI

enum AttributeColor {
    // Matches the web's ATTR_ACCENT / .a0-.a4 colors exactly (dict.js / dict.css).
    private static let colors: [Color] = [
        Color(red: 0xe8 / 255, green: 0x51 / 255, blue: 0x3b / 255), // Fire
        Color(red: 0x3b / 255, green: 0x9b / 255, blue: 0xe8 / 255), // Water
        Color(red: 0x4c / 255, green: 0xaf / 255, blue: 0x50 / 255), // Wood
        Color(red: 0xe8 / 255, green: 0xd2 / 255, blue: 0x3b / 255), // Light
        Color(red: 0xa0 / 255, green: 0x5b / 255, blue: 0xd6 / 255), // Dark
    ]

    static func color(for attr: Int) -> Color {
        colors.indices.contains(attr) ? colors[attr] : .gray
    }

    // Matches the web's card-detail accent (dict.js ATTR_ACCENT) — a separate,
    // slightly different palette from the attribute-dot swatches above.
    private static let accentColors: [Color] = [
        Color(hex: 0xe8_513b), // Fire
        Color(hex: 0x3b_9be8), // Water
        Color(hex: 0x4c_af50), // Wood
        Color(hex: 0xf0_c400), // Light
        Color(hex: 0xa0_5bd6), // Dark
    ]

    static func accent(for attrs: [Int]) -> Color {
        guard let first = attrs.first, accentColors.indices.contains(first) else { return Color(hex: 0x6b7280) }
        return accentColors[first]
    }
}

struct AttributeDotView: View {
    let attr: Int
    var size: CGFloat = 14

    var body: some View {
        Circle()
            .fill(AttributeColor.color(for: attr))
            .frame(width: size, height: size)
    }
}
