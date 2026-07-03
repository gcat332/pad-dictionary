import SwiftUI

struct TypeIconView: View {
    let type: Int
    var size: CGFloat = 16

    var body: some View {
        if let uiImage = TypeIconCache.shared.icon(forType: type) {
            Image(uiImage: uiImage)
                .resizable()
                .frame(width: size, height: size)
        } else {
            Text("\(type)")
                .font(.system(size: size * 0.5))
                .frame(width: size, height: size)
                .background(.secondary.opacity(0.2))
                .clipShape(Circle())
        }
    }
}
