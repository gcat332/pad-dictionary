import SwiftUI

struct CardArtworkView: View {
    let card: Card
    var cellSize: CGFloat = 64

    var body: some View {
        ZStack {
            artLayer
            frameLayer(attr: card.attrs.first, sub: false)
            if card.attrs.count > 1 {
                frameLayer(attr: card.attrs[1], sub: true)
            }
        }
        .frame(width: cellSize, height: cellSize)
    }

    @ViewBuilder
    private var artLayer: some View {
        let position = CardSprite.position(forCardId: card.id)
        if let sheet = SpriteSheetCache.shared.image(relativePath: "images/cards_ja/\(position.sheetFile)") {
            Image(uiImage: sheet)
                .resizable()
                .frame(width: cellSize * 10.24, height: cellSize * 10.24)
                .offset(x: -1.02 * cellSize * CGFloat(position.column), y: -1.02 * cellSize * CGFloat(position.row))
                .frame(width: cellSize, height: cellSize)
                .clipped()
        } else {
            Color.gray.opacity(0.2)
        }
    }

    @ViewBuilder
    private func frameLayer(attr: Int?, sub: Bool) -> some View {
        if let attr, attr == 6, let whiteFrame = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAMEW.png") {
            Image(uiImage: whiteFrame)
                .resizable()
                .frame(width: cellSize, height: cellSize)
        } else if let attr,
                  let offset = sub ? AttributeFramePosition.subOffset(forAttr: attr) : AttributeFramePosition.mainOffset(forAttr: attr),
                  let frameSheet = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAME2.png") {
            Image(uiImage: frameSheet)
                .resizable()
                .frame(width: cellSize * 7.12, height: cellSize * 4.12)
                .offset(x: cellSize * CGFloat(offset.x), y: cellSize * CGFloat(offset.y))
                .frame(width: cellSize, height: cellSize)
                .clipped()
        } else {
            Color.clear
        }
    }
}
