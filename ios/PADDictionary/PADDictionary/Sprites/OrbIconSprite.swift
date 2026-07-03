import SwiftUI

/// A single 36px cell from `icon-orbs.png`, rendered at `size`. Falls back to an empty
/// rounded rect if the sheet hasn't synced yet.
struct OrbIconSprite: View {
    let col: Int
    let row: Int
    var size: CGFloat = 20

    /// Convenience for attribute orbs (attr 0-4 -> col 0, rows 0-4).
    init(attr: Int, size: CGFloat = 20) { self.init(col: 0, row: attr, size: size) }
    init(col: Int, row: Int, size: CGFloat = 20) { self.col = col; self.row = row; self.size = size }

    var body: some View {
        if let sheet = SpriteSheetCache.shared.image(relativePath: "images/icon-orbs.png"),
           let cell = SpriteCrop.cell(from: sheet, x: col * 36, y: row * 36, size: 36) {
            Image(uiImage: cell).resizable().frame(width: size, height: size)
        } else {
            RoundedRectangle(cornerRadius: size * 0.2)
                .fill(Color.secondary.opacity(0.2))
                .frame(width: size, height: size)
        }
    }
}
