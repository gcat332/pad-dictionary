import SwiftUI
import UIKit

// Theme tokens. Dark values match the web dictionary exactly (dict.css :root + .tg.on);
// light values are a cool-gray counterpart that keeps the same blue accent identity.
// Each token adapts to the active appearance, so a manual Light/Dark/System toggle
// (see AppTheme + ContentView.preferredColorScheme) flips the whole app for free.
extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    // Adaptive: picks `light` or `dark` from the current trait collection.
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(hex: dark)) : UIColor(Color(hex: light)) })
    }

    // Blend toward black by `amount` (0…1). Used to make the bright attribute
    // accents (tuned for dark backgrounds) legible as text on light backgrounds.
    func darkened(_ amount: Double) -> Color {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a)
        let k = 1 - amount
        return Color(red: Double(r) * k, green: Double(g) * k, blue: Double(b) * k, opacity: Double(a))
    }

    static let padBackground       = Color(light: 0xeceef2, dark: 0x1a1d24)
    static let padPanel            = Color(light: 0xffffff, dark: 0x23272f)
    static let padHeaderBackground = Color(light: 0xf5f6f8, dark: 0x13151a)
    static let padInputBackground  = Color(light: 0xf0f1f4, dark: 0x0e1014)
    static let padText             = Color(light: 0x1a1d24, dark: 0xe6e8ec)
    static let padDim              = Color(light: 0x687080, dark: 0x9aa0aa)
    static let padBorder           = Color(light: 0xd4d8e0, dark: 0x3a4150)
    static let padAccent           = Color(hex: 0x2f6dd0)                    // identity anchor, same in both
    static let padAccentBorder     = Color(light: 0x2f6dd0, dark: 0x5b9bff)
    static let padDesc             = Color(light: 0x3a4150, dark: 0xd3d7de)
    static let padEvoBorder        = Color(light: 0xd4d8e0, dark: 0x313640)
}

// User's appearance preference. `.system` follows the device; light/dark force it.
enum AppTheme: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }
    var label: String {
        switch self {
        case .system: return "System"
        case .light:  return "Light"
        case .dark:   return "Dark"
        }
    }
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark:   return .dark
        }
    }
}
