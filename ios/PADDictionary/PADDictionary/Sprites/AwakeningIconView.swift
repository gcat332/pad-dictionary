import SwiftUI

struct AwakeningIconView: View {
    let awakeningId: Int

    var body: some View {
        Group {
            if let yOffset = AwakeningSprite.yOffset(forAwakeningId: awakeningId),
               let sheet = SpriteSheetCache.shared.image(relativePath: "images/awoken.png") {
                Image(uiImage: sheet)
                    .resizable()
                    .frame(width: 32, height: 4608)
                    .offset(y: CGFloat(yOffset))
                    .frame(width: 32, height: 32)
                    .clipped()
            } else {
                Text("\(awakeningId)")
                    .font(.caption2)
                    .frame(width: 32, height: 32)
                    .background(.secondary.opacity(0.2))
                    .clipShape(Circle())
            }
        }
        .accessibilityLabel(AwakeningNames.name(for: awakeningId))
    }
}
