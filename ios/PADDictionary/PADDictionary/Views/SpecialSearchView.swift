import SwiftUI

struct SpecialSearchView: View {
    @ObservedObject var viewModel: BrowseViewModel
    @Environment(\.dismiss) private var dismiss

    private var groupedLeaves: [(String, [SpecialSearchLeaf])] {
        var order: [String] = []
        var groups: [String: [SpecialSearchLeaf]] = [:]
        for leaf in SpecialSearchTree.leaves {
            let key = leaf.groupPath.joined(separator: " › ")
            if groups[key] == nil { order.append(key) }
            groups[key, default: []].append(leaf)
        }
        return order.map { ($0, groups[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Match", selection: $viewModel.specialSearchMode) {
                        Text("AND").tag(MatchMode.and)
                        Text("OR").tag(MatchMode.or)
                    }
                    .pickerStyle(.segmented)
                }
                ForEach(groupedLeaves, id: \.0) { title, leaves in
                    Section(title) {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                            ForEach(leaves) { leaf in
                                ToggleChip(label: leaf.label, isOn: viewModel.selectedSpecialSearchKeys.contains(leaf.id)) {
                                    if viewModel.selectedSpecialSearchKeys.contains(leaf.id) {
                                        viewModel.selectedSpecialSearchKeys.remove(leaf.id)
                                    } else {
                                        viewModel.selectedSpecialSearchKeys.insert(leaf.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search Filter")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") { viewModel.selectedSpecialSearchKeys = [] }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
