import SwiftUI

/// Renders a skill description, replacing `{Token}` markup with inline icons where one exists.
/// Unmatched tokens render as plain text (braces stripped). Builds a single `Text` so the
/// result flows and line-wraps naturally.
struct SkillTextView: View {
    let text: String
    var fontSize: CGFloat = 13

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
        // Icon height tracks the font's cap height so glyphs and icons sit at the same scale.
        let iconHeight = fontSize + 2
        return SkillTextTokenizer.parse(text).reduce(Text("")) { acc, run in
            switch run {
            case .text(let s):
                return acc + Text(s)
            case .token(let name):
                if let icon = SkillTokenImage.image(for: name, height: iconHeight) {
                    // ponytail: -2 baseline nudge tuned by eye; adjust if icons ride high/low
                    return acc + Text(Image(uiImage: icon)).baselineOffset(-2)
                }
                return acc + Text(name)   // no icon -> plain text, braces already stripped
            }
        }
    }
}
