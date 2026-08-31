import SwiftUI

struct AwakeningIconView: View {
    let awakeningId: Int
    var size: CGFloat = 32

    var body: some View {
        Group {
            if let sheet = SpriteSheetCache.shared.image(relativePath: "images/awoken.png") {
                let rowCount = AwakeningSprite.rowCount(of: sheet)
                if let yOffset = AwakeningSprite.yOffset(forAwakeningId: awakeningId, rowCount: rowCount) {
                    Image(uiImage: sheet)
                        .resizable()
                        .frame(width: size * 3, height: size * CGFloat(rowCount))
                        .offset(y: CGFloat(yOffset) * (size / 32))
                        .frame(width: size, height: size, alignment: .topLeading)
                        .clipped()
                } else {
                    fallbackView
                }
            } else {
                fallbackView
            }
        }
        .accessibilityLabel(AwakeningNames.name(for: awakeningId))
    }

    private var fallbackView: some View {
        Text("\(awakeningId)")
            .font(.system(size: size * 0.35))
            .frame(width: size, height: size)
            .background(.secondary.opacity(0.2))
            .clipShape(Circle())
    }
}
