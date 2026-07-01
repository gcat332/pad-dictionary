import SwiftUI

struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore
    var body: some View { Text("#\(card.id)") }
}
