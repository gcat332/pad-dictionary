import SwiftUI
import Combine

@MainActor
final class BrowseViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var sortIndex: Int = 0
    @Published var isDescending: Bool = true
    @Published var filterState = FilterState()
    @Published var selectedSpecialSearchKeys: Set<String> = []
    @Published var specialSearchMode: MatchMode = .and

    let dataStore: DataStore

    init(dataStore: DataStore) {
        self.dataStore = dataStore
    }

    var cards: [Card] {
        let base = dataStore.cards.filter { !$0.isEmpty && $0.enabled }
        let searched = searchText.isEmpty
            ? base
            : base.filter { String($0.id).contains(searchText) }
        let filtered = searched.filter { filterState.matches($0) }
        let context = SpecialSearchContext(cardsById: dataStore.cardsById, skillsJA: dataStore.skillLookup)
        let specialFiltered = SpecialSearchEngine.filter(filtered, selectedKeys: selectedSpecialSearchKeys, mode: specialSearchMode, context: context)
        let sort = CardSort.all[sortIndex]
        let ascending = specialFiltered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
}

struct BrowseView: View {
    @ObservedObject var dataStore: DataStore
    @ObservedObject var compareStore: CompareStore
    @StateObject private var viewModel: BrowseViewModel
    @State private var showingFilters = false
    @State private var selectedCard: Card?

    init(dataStore: DataStore, compareStore: CompareStore) {
        self.dataStore = dataStore
        self.compareStore = compareStore
        _viewModel = StateObject(wrappedValue: BrowseViewModel(dataStore: dataStore))
    }

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 5)

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
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
                                CardArtworkView(card: card, cellSize: 64)
                                    .overlay(alignment: .topTrailing) {
                                        if compareStore.contains(card.id) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundStyle(.blue)
                                                .background(Circle().fill(.white))
                                                .padding(2)
                                        }
                                    }
                                    .contentShape(Rectangle())
                                    .onTapGesture { selectedCard = card }
                                    .simultaneousGesture(
                                        LongPressGesture(minimumDuration: 0.4).onEnded { _ in
                                            compareStore.toggle(card.id)
                                        }
                                    )
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(Color.padBackground)
            CompareBar(compareStore: compareStore, dataStore: dataStore)
            }
            .background(Color.padBackground)
            .searchable(text: $viewModel.searchText, prompt: "Search by ID")
            .navigationTitle("Browse")
            .sheet(isPresented: $showingFilters) {
                FilterView(viewModel: viewModel)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingFilters = true
                    } label: {
                        Image(systemName: (viewModel.filterState != FilterState() || !viewModel.selectedSpecialSearchKeys.isEmpty)
                            ? "line.3.horizontal.decrease.circle.fill"
                            : "line.3.horizontal.decrease.circle")
                    }
                }
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
