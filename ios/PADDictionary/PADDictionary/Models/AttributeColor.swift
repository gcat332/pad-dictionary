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
