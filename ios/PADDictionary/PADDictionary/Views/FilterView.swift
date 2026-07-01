import SwiftUI

private let attrLabels = ["Fire", "Water", "Wood", "Light", "Dark"]
private let typeOrder = [5, 4, 6, 7, 8, 3, 2, 1, 12, 14, 15, 0]
private let typeLabels: [Int: String] = [
    0: "Evo Material", 1: "Balanced", 2: "Physical", 3: "Healer", 4: "Dragon", 5: "God",
    6: "Attacker", 7: "Devil", 8: "Machine", 12: "Awoken", 14: "Enhance", 15: "Redeemable",
]

struct ToggleChip: View {
    let label: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(isOn ? Color.accentColor : Color.secondary.opacity(0.15))
                .foregroundStyle(isOn ? Color.white : Color.primary)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

struct FilterView: View {
    @ObservedObject var viewModel: BrowseViewModel
    @Environment(\.dismiss) private var dismiss

    private let chipColumns = [GridItem(.adaptive(minimum: 72), spacing: 8)]

    var body: some View {
        NavigationStack {
            Form {
                attrSection(slot: 0, title: "Attr 1 (main)")
                attrSection(slot: 1, title: "Attr 2 (sub)")
                attrSection(slot: 2, title: "Attr 3 (3rd)")
                typeSection
                raritySection
            }
            .navigationTitle("Filters")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") { viewModel.filterState = FilterState() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func attrSection(slot: Int, title: String) -> some View {
        Section(title) {
            LazyVGrid(columns: chipColumns, spacing: 8) {
                ForEach(0..<5, id: \.self) { value in
                    ToggleChip(label: attrLabels[value], isOn: viewModel.filterState.attr[slot].contains(value)) {
                        if viewModel.filterState.attr[slot].contains(value) {
                            viewModel.filterState.attr[slot].remove(value)
                        } else {
                            viewModel.filterState.attr[slot].insert(value)
                        }
                    }
                }
            }
        }
    }

    private var typeSection: some View {
        Section("Type") {
            LazyVGrid(columns: chipColumns, spacing: 8) {
                ForEach(typeOrder, id: \.self) { value in
                    ToggleChip(label: typeLabels[value] ?? "Type \(value)", isOn: viewModel.filterState.types.contains(value)) {
                        if viewModel.filterState.types.contains(value) {
                            viewModel.filterState.types.remove(value)
                        } else {
                            viewModel.filterState.types.insert(value)
                        }
                    }
                }
            }
        }
    }

    private var raritySection: some View {
        Section("Rarity") {
            LazyVGrid(columns: chipColumns, spacing: 8) {
                ForEach(1...10, id: \.self) { value in
                    ToggleChip(label: "★\(value)", isOn: viewModel.filterState.rarities.contains(value)) {
                        if viewModel.filterState.rarities.contains(value) {
                            viewModel.filterState.rarities.remove(value)
                        } else {
                            viewModel.filterState.rarities.insert(value)
                        }
                    }
                }
            }
        }
    }
}
