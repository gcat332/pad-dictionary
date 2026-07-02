import SwiftUI

// Matches the web dictionary's dark theme exactly (dict.css :root and .tg.on).
extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    static let padBackground = Color(hex: 0x1a1d24)
    static let padPanel = Color(hex: 0x23272f)
    static let padHeaderBackground = Color(hex: 0x13151a)
    static let padInputBackground = Color(hex: 0x0e1014)
    static let padText = Color(hex: 0xe6e8ec)
    static let padDim = Color(hex: 0x9aa0aa)
    static let padBorder = Color(hex: 0x3a4150)
    static let padAccent = Color(hex: 0x2f6dd0)
    static let padAccentBorder = Color(hex: 0x5b9bff)
    static let padDesc = Color(hex: 0xd3d7de)
    static let padEvoBorder = Color(hex: 0x313640)
}
