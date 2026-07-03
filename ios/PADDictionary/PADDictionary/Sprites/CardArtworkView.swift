import SwiftUI

struct CardArtworkView: View {
    let card: Card
    var cellSize: CGFloat = 64

    var body: some View {
        ZStack {
            artLayer
            frameLayer(attr: card.attrs.first, variant: .main)
            if card.attrs.count > 1 {
                frameLayer(attr: card.attrs[1], variant: .sub)
            }
            if card.attrs.count > 2 {
                frameLayer(attr: card.attrs[2], variant: .third)
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
                .frame(width: cellSize * 10.24, height: cellSize * 10.24, alignment: .topLeading)
                .offset(x: -1.02 * cellSize * CGFloat(position.column), y: -1.02 * cellSize * CGFloat(position.row))
                .frame(width: cellSize, height: cellSize, alignment: .topLeading)
                .clipped()
        } else {
            Color.gray.opacity(0.2)
        }
    }

    private enum FrameVariant {
        case main, sub, third

        func offset(forAttr attr: Int) -> (x: Double, y: Double)? {
            switch self {
            case .main: return AttributeFramePosition.mainOffset(forAttr: attr)
            case .sub: return AttributeFramePosition.subOffset(forAttr: attr)
            case .third: return AttributeFramePosition.thirdOffset(forAttr: attr)
            }
        }
    }

    @ViewBuilder
    private func frameLayer(attr: Int?, variant: FrameVariant) -> some View {
        if let attr, attr == 6, let whiteFrame = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAMEW.png") {
            Image(uiImage: whiteFrame)
                .resizable()
                .frame(width: cellSize, height: cellSize)
        } else if let attr,
                  let offset = variant.offset(forAttr: attr),
                  let frameSheet = SpriteSheetCache.shared.image(relativePath: "images/CARDFRAME2.png") {
            Image(uiImage: frameSheet)
                .resizable()
                .frame(width: cellSize * 7.12, height: cellSize * 4.12, alignment: .topLeading)
                .offset(x: cellSize * CGFloat(offset.x), y: cellSize * CGFloat(offset.y))
                .frame(width: cellSize, height: cellSize, alignment: .topLeading)
                .clipped()
        } else {
            Color.clear
        }
    }
}
