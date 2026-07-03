import SwiftUI

/// Renders a skill description with:
///  - inline icons for `{Token}` (EN) / `[Token]` (translated) where one exists
///  - GungHo's `^ff3600^…^p` red highlight spans
/// Unresolved `{..}` drop their braces; unresolved `[..]` keep them (they're literal keywords
/// in EN, e.g. "[7x6 board]"). Builds a single `Text` so it flows and wraps naturally.
struct SkillTextView: View {
    let text: String
    var fontSize: CGFloat = 13

    // GungHo's highlight color (^ff3600^).
    private static let highlight = Color(red: 0xff / 255, green: 0x36 / 255, blue: 0x00 / 255)
    private static let markers = try! NSRegularExpression(pattern: #"\^ff3600\^|\^p"#)

    init(_ text: String, fontSize: CGFloat = 13) {
        self.text = text
        self.fontSize = fontSize
    }

    var body: some View {
        content
            .font(.system(size: fontSize))
            .foregroundStyle(Color.padDesc)
    }

    private var content: Text {
        let iconHeight = fontSize + 2
        return colorSegments(text).reduce(Text("")) { acc, seg in
            acc + render(seg.text, color: seg.color, iconHeight: iconHeight)
        }
    }

    /// Splits on `^ff3600^` (start red) / `^p` (reset) into (text, color) segments.
    private func colorSegments(_ s: String) -> [(text: String, color: Color?)] {
        let ns = s as NSString
        var segments: [(String, Color?)] = []
        var cursor = 0
        var color: Color? = nil
        for m in Self.markers.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            if m.range.location > cursor {
                segments.append((ns.substring(with: NSRange(location: cursor, length: m.range.location - cursor)), color))
            }
            color = ns.substring(with: m.range) == "^ff3600^" ? Self.highlight : nil
            cursor = m.range.location + m.range.length
        }
        if cursor < ns.length { segments.append((ns.substring(from: cursor), color)) }
        return segments
    }

    private func render(_ s: String, color: Color?, iconHeight: CGFloat) -> Text {
        SkillTextTokenizer.parse(s).reduce(Text("")) { acc, run in
            switch run {
            case .text(let t):
                return acc + colored(Text(t), color)
            case .token(let name, let square):
                if case .symbol(let sym) = SkillToken.resolve(name) {
                    return acc + colored(Text(Image(systemName: sym)), color)
                }
                if let icon = SkillTokenImage.image(for: name, height: iconHeight) {
                    // ponytail: -2 baseline nudge tuned by eye; adjust if icons ride high/low
                    return acc + Text(Image(uiImage: icon)).baselineOffset(-2)
                }
                // Unresolved: keep brackets for [..] (literal keyword), drop braces for {..}.
                return acc + colored(Text(square ? "[\(name)]" : name), color)
            }
        }
    }

    private func colored(_ text: Text, _ color: Color?) -> Text {
        color.map { text.foregroundColor($0) } ?? text
    }
}
