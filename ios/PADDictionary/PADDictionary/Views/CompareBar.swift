import SwiftUI

struct CompareBar: View {
    @ObservedObject var compareStore: CompareStore
    let dataStore: DataStore
    @State private var showingCompare = false

    var body: some View {
        if !compareStore.ids.isEmpty {
            HStack(spacing: 8) {
                Text("Compare").font(.caption).foregroundStyle(Color.padDim)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(compareStore.ids, id: \.self) { id in
                            if let card = dataStore.cardsById[id] {
                                Button {
                                    compareStore.remove(id)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 32)
                                }
                            }
                        }
                    }
                }
                Spacer()
                Button("Compare \(compareStore.ids.count)") {
                    showingCompare = true
                }
                .buttonStyle(.borderedProminent)
                Button("Clear") {
                    compareStore.clear()
                }
            }
            .padding(8)
            .background(Color.padPanel)
            .overlay(alignment: .top) { Rectangle().fill(Color.padBorder).frame(height: 1) }
            .sheet(isPresented: $showingCompare) {
                CompareView(cardIds: compareStore.ids, dataStore: dataStore, compareStore: compareStore)
            }
        }
    }
}
