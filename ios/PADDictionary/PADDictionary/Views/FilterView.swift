import SwiftUI

private let attrLabels = ["Fire", "Water", "Wood", "Light", "Dark"]
private let typeOrder = [5, 4, 6, 7, 8, 3, 2, 1, 12, 14, 15, 0]
private let typeLabels: [Int: String] = [
    0: "Evo Material", 1: "Balanced", 2: "Physical", 3: "Healer", 4: "Dragon", 5: "God",
    6: "Attacker", 7: "Devil", 8: "Machine", 12: "Awoken", 14: "Enhance", 15: "Redeemable",
]

private let awakeningOrder = [
    63, 49, 21, 46, 47, 43, 61, 48, 27, 60, 78, 79, 80, 81, 44, 51, 82, 62, 58, 57, 52, 68, 69, 70,
    54, 55, 45, 50, 59, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 29, 22, 23, 24, 25, 26, 20, 28, 30, 31, 32, 33, 34,
    35, 36, 37, 38, 39, 40, 41, 42, 53, 56, 64, 65, 66, 67, 11, 12, 13, 71, 72, 73, 74, 75, 76, 77, 83, 84, 85, 86, 87, 88, 89,
    90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104,
    105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128,
    129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143,
]

struct AwakeningFilterChip: View {
    let awakeningId: Int
    let count: Int
    let onTap: () -> Void
    let onRemove: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            AwakeningIconView(awakeningId: awakeningId)
                .overlay(alignment: .topTrailing) {
                    if count > 1 {
                        Text("\(count)")
                            .font(.system(size: 9, weight: .bold))
                            .padding(2)
                            .background(Color.accentColor, in: Circle())
                            .foregroundStyle(.white)
                            .offset(x: 4, y: -4)
                    }
                }
                .padding(4)
                .background(count > 0 ? Color.accentColor.opacity(0.25) : Color.clear, in: RoundedRectangle(cornerRadius: 6))
        }
        .onTapGesture(perform: onTap)
        .onLongPressGesture(perform: onRemove)
    }
}

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
                awakeningSection
                Section {
                    Toggle("Can be assist only", isOn: $viewModel.filterState.canAssistOnly)
                }
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

    private var awakeningSection: some View {
        Section {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 8), spacing: 8) {
                ForEach(awakeningOrder, id: \.self) { id in
                    let count = viewModel.filterState.awakenings.filter { $0 == id }.count
                    AwakeningFilterChip(
                        awakeningId: id,
                        count: count,
                        onTap: { viewModel.filterState.awakenings.append(id) },
                        onRemove: {
                            if let index = viewModel.filterState.awakenings.firstIndex(of: id) {
                                viewModel.filterState.awakenings.remove(at: index)
                            }
                        }
                    )
                }
            }
        } header: {
            HStack {
                Text("Awakenings")
                Spacer()
                Toggle("incl. Super", isOn: $viewModel.filterState.includeSuper)
                    .font(.caption)
                    .fixedSize()
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
