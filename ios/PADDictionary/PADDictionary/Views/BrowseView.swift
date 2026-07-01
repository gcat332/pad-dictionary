import SwiftUI
import Combine

@MainActor
final class BrowseViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var sortIndex: Int = 0
    @Published var isDescending: Bool = true

    let dataStore: DataStore

    init(dataStore: DataStore) {
        self.dataStore = dataStore
    }

    var cards: [Card] {
        let filtered = searchText.isEmpty
            ? dataStore.cards
            : dataStore.cards.filter { String($0.id).contains(searchText) }
        let sort = CardSort.all[sortIndex]
        let ascending = filtered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
}

struct BrowseView: View {
    @ObservedObject var dataStore: DataStore
    @StateObject private var viewModel: BrowseViewModel

    init(dataStore: DataStore) {
        self.dataStore = dataStore
        _viewModel = StateObject(wrappedValue: BrowseViewModel(dataStore: dataStore))
    }

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 5)

    var body: some View {
        NavigationStack {
            Group {
                if dataStore.cards.isEmpty {
                    ContentUnavailableView(
                        "No cards yet",
                        systemImage: "square.stack.3d.up.slash",
                        description: Text("Run an update on the Sync tab to get started.")
                    )
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                NavigationLink {
                                    CardDetailView(card: card, dataStore: dataStore)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 64)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Search by ID")
            .navigationTitle("Browse")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach(Array(CardSort.all.enumerated()), id: \.offset) { index, sort in
                            Button(sort.label) { viewModel.sortIndex = index }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.isDescending.toggle()
                    } label: {
                        Image(systemName: viewModel.isDescending ? "arrow.down" : "arrow.up")
                    }
                }
            }
        }
    }
}
