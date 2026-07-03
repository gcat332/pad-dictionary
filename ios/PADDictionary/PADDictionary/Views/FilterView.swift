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

// Special-search top-level groups appear in this order first (Active Skill/Leader Skills
// are the largest and most frequently used), then everything else keeps its original order.
private let topGroupPriority = ["Active Skill", "Leader Skills"]

struct AwakeningFilterChip: View {
    let awakeningId: Int
    let count: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                AwakeningIconView(awakeningId: awakeningId)
                    .overlay(alignment: .topTrailing) {
                        if count > 1 {
                            Text("\(count)")
                                .font(.system(size: 9, weight: .bold))
                                .padding(2)
                                .background(Color.padAccent, in: Circle())
                                .foregroundStyle(.white)
                                .offset(x: 4, y: -4)
                        }
                    }
                    .padding(4)
                    .background(count > 0 ? Color.padAccent.opacity(0.25) : Color.clear, in: RoundedRectangle(cornerRadius: 6))
            }
        }
        .buttonStyle(.plain)
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
                .background(isOn ? Color.padAccent : Color.padPanel)
                .foregroundStyle(isOn ? Color.white : Color.padText)
                .overlay(Capsule().stroke(isOn ? Color.padAccentBorder : Color.padBorder))
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct LeafSubgroup: Identifiable {
    let id: String
    let subtitle: String?
    let leaves: [SpecialSearchLeaf]
}

private struct TopGroup: Identifiable {
    let id: String
    let subgroups: [LeafSubgroup]
    let matchCount: Int
}

struct SpecialSearchRow: View {
    let label: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .foregroundStyle(Color.padText)
                Spacer()
                if isOn {
                    Image(systemName: "checkmark")
                        .foregroundStyle(Color.padAccentBorder)
                        .font(.body.bold())
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct FilterView: View {
    @ObservedObject var viewModel: BrowseViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var expandedGroups: Set<String> = []

    private let chipColumns = [GridItem(.adaptive(minimum: 72), spacing: 8)]

    var body: some View {
        NavigationStack {
            List {
                attrSection(slot: 0, title: "Attr 1 (main)")
                attrSection(slot: 1, title: "Attr 2 (sub)")
                attrSection(slot: 2, title: "Attr 3 (3rd)")
                typeSection
                raritySection
                awakeningSection
                Section {
                    Toggle("Can be assist only", isOn: $viewModel.filterState.canAssistOnly)
                }
                .listRowBackground(Color.padPanel)
                Section {
                    Picker("Match", selection: $viewModel.specialSearchMode) {
                        Text("AND").tag(MatchMode.and)
                        Text("OR").tag(MatchMode.or)
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Special Search")
                }
                .listRowBackground(Color.padPanel)
                ForEach(topGroups) { group in
                    DisclosureGroup(isExpanded: expandedBinding(for: group.id)) {
                        ForEach(group.subgroups) { subgroup in
                            if let subtitle = subgroup.subtitle {
                                Text(subtitle)
                                    .font(.caption)
                                    .foregroundStyle(Color.padDim)
                                    .padding(.top, 4)
                            }
                            ForEach(subgroup.leaves) { leaf in
                                SpecialSearchRow(
                                    label: leaf.label,
                                    isOn: viewModel.selectedSpecialSearchKeys.contains(leaf.id)
                                ) {
                                    if viewModel.selectedSpecialSearchKeys.contains(leaf.id) {
                                        viewModel.selectedSpecialSearchKeys.remove(leaf.id)
                                    } else {
                                        viewModel.selectedSpecialSearchKeys.insert(leaf.id)
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text(group.id)
                                .foregroundStyle(Color.padText)
                            if group.matchCount > 0 {
                                Text("\(group.matchCount)")
                                    .font(.caption.bold())
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.padAccent, in: Capsule())
                                    .foregroundStyle(.white)
                            }
                        }
                    }
                    .listRowBackground(Color.padPanel)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color.padBackground)
            .searchable(text: $searchText, prompt: "Search filters")
            .onChange(of: searchText) { _, newValue in
                if !newValue.isEmpty {
                    expandedGroups = Set(topGroups.map(\.id))
                }
            }
            .navigationTitle("Filters")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Clear") {
                        viewModel.filterState = FilterState()
                        viewModel.selectedSpecialSearchKeys = []
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func attrSection(slot: Int, title: String) -> some View {
        Section(title) {
            HStack(spacing: 0) {
                ForEach(0..<5, id: \.self) { value in
                    Button {
                        if viewModel.filterState.attr[slot].contains(value) {
                            viewModel.filterState.attr[slot].remove(value)
                        } else {
                            viewModel.filterState.attr[slot].insert(value)
                        }
                    } label: {
                        OrbIconSprite(attr: value, size: 34)
                            .overlay {
                                if viewModel.filterState.attr[slot].contains(value) {
                                    Circle().stroke(Color.padAccentBorder, lineWidth: 3)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity)   // 5 slots split the row width evenly
                    .accessibilityLabel(attrLabels[value])
                }
            }
        }
        .listRowBackground(Color.padPanel)
    }

    private var typeSection: some View {
        Section("Type") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 6), spacing: 8) {
                ForEach(typeOrder, id: \.self) { value in
                    Button {
                        if viewModel.filterState.types.contains(value) {
                            viewModel.filterState.types.remove(value)
                        } else {
                            viewModel.filterState.types.insert(value)
                        }
                    } label: {
                        TypeIconView(type: value, size: 28)
                            .padding(6)
                            .background(viewModel.filterState.types.contains(value) ? Color.padAccent : Color.padPanel, in: RoundedRectangle(cornerRadius: 8))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(viewModel.filterState.types.contains(value) ? Color.padAccentBorder : Color.padBorder)
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(typeLabels[value] ?? "Type \(value)")
                }
            }
        }
        .listRowBackground(Color.padPanel)
    }

    private var selectedAwakenings: [(id: Int, count: Int)] {
        var counts: [Int: Int] = [:]
        var order: [Int] = []
        for id in viewModel.filterState.awakenings {
            if counts[id] == nil { order.append(id) }
            counts[id, default: 0] += 1
        }
        return order.map { (id: $0, count: counts[$0] ?? 0) }
    }

    // Fixed-height horizontal strip — always the same height whether 0 or N are
    // selected, and always visible above the (very tall) grid without scrolling past
    // it. A height that CHANGES based on selection would shift the grid underneath
    // the user's finger mid-tap, causing the wrong icon to register.
    private var selectedAwakeningsStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                if selectedAwakenings.isEmpty {
                    Text("No Awoken selected")
                        .font(.caption)
                        .foregroundStyle(Color.padDim)
                } else {
                    ForEach(selectedAwakenings, id: \.id) { entry in
                        Button {
                            viewModel.filterState.awakenings.removeAll { $0 == entry.id }
                        } label: {
                            HStack(spacing: 4) {
                                AwakeningIconView(awakeningId: entry.id, size: 20)
                                if entry.count > 1 {
                                    Text("×\(entry.count)").font(.caption2.bold())
                                }
                                Image(systemName: "xmark.circle.fill").font(.caption2)
                            }
                            .foregroundStyle(Color.padText)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.padAccent.opacity(0.25), in: Capsule())
                            .overlay(Capsule().stroke(Color.padAccentBorder))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(AwakeningNames.name(for: entry.id))
                    }
                }
            }
            .frame(height: 28)
        }
        .frame(height: 28)
    }

    // Filtering a dense, unlabeled 143-icon grid by hand invites mis-taps (the wrong
    // icon several rows away from the intended one) — reuse the sheet's search bar so
    // typing a name narrows the grid down to just the matching icons.
    private var filteredAwakeningOrder: [Int] {
        guard !searchText.isEmpty else { return awakeningOrder }
        return awakeningOrder.filter { AwakeningNames.name(for: $0).localizedCaseInsensitiveContains(searchText) }
    }

    // Chunked into fixed rows instead of a LazyVGrid: a LazyVGrid this tall (18 rows)
    // embedded directly in a List Section breaks UITableView's row self-sizing — most
    // of the grid renders but falls outside the row's real hit-testable bounds, so taps
    // on all but one row silently do nothing. Plain per-row HStacks give List a real,
    // correctly-sized cell per row.
    private var awakeningRows: [[Int]] {
        stride(from: 0, to: filteredAwakeningOrder.count, by: 8).map {
            Array(filteredAwakeningOrder[$0..<Swift.min($0 + 8, filteredAwakeningOrder.count)])
        }
    }

    private var awakeningSection: some View {
        Section {
            selectedAwakeningsStrip
            if filteredAwakeningOrder.isEmpty {
                Text("No Awoken matches \u{201C}\(searchText)\u{201D}")
                    .font(.caption)
                    .foregroundStyle(Color.padDim)
            } else {
                ForEach(awakeningRows, id: \.self) { row in
                    HStack(spacing: 4) {
                        ForEach(row, id: \.self) { id in
                            let count = viewModel.filterState.awakenings.filter { $0 == id }.count
                            AwakeningFilterChip(
                                awakeningId: id,
                                count: count,
                                onTap: { viewModel.filterState.awakenings.append(id) }
                            )
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .listRowSeparator(.hidden)
                }
            }
        } header: {
            HStack {
                Text("Awoken")
                Spacer()
                Toggle("incl. Super", isOn: $viewModel.filterState.includeSuper)
                    .font(.caption)
                    .fixedSize()
            }
        }
        .listRowBackground(Color.padPanel)
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
        .listRowBackground(Color.padPanel)
    }

    private var topGroups: [TopGroup] {
        var order: [String] = []
        var subgroupsByTop: [String: [String: [SpecialSearchLeaf]]] = [:]
        var subgroupOrder: [String: [String]] = [:]

        for leaf in SpecialSearchTree.leaves {
            guard matchesSearch(leaf) else { continue }
            let top = leaf.groupPath.first ?? "Other"
            let subtitle = leaf.groupPath.count > 1 ? leaf.groupPath.dropFirst().joined(separator: " › ") : ""
            if subgroupsByTop[top] == nil {
                order.append(top)
                subgroupsByTop[top] = [:]
                subgroupOrder[top] = []
            }
            if subgroupsByTop[top]?[subtitle] == nil {
                subgroupOrder[top]?.append(subtitle)
            }
            subgroupsByTop[top]?[subtitle, default: []].append(leaf)
        }

        let groups = order.map { top -> TopGroup in
            let subgroups = (subgroupOrder[top] ?? []).map { subtitle in
                LeafSubgroup(
                    id: "\(top)|\(subtitle)",
                    subtitle: subtitle.isEmpty ? nil : subtitle,
                    leaves: subgroupsByTop[top]?[subtitle] ?? []
                )
            }
            let matchCount = subgroups.reduce(0) { $0 + $1.leaves.filter { viewModel.selectedSpecialSearchKeys.contains($0.id) }.count }
            return TopGroup(id: top, subgroups: subgroups, matchCount: matchCount)
        }

        return groups.sorted { a, b in
            let aPriority = topGroupPriority.firstIndex(of: a.id) ?? Int.max
            let bPriority = topGroupPriority.firstIndex(of: b.id) ?? Int.max
            return aPriority < bPriority
        }
    }

    private func matchesSearch(_ leaf: SpecialSearchLeaf) -> Bool {
        guard !searchText.isEmpty else { return true }
        let haystack = (leaf.groupPath + [leaf.label]).joined(separator: " ")
        return haystack.localizedCaseInsensitiveContains(searchText)
    }

    private func expandedBinding(for id: String) -> Binding<Bool> {
        Binding(
            get: { expandedGroups.contains(id) },
            set: { isExpanded in
                if isExpanded {
                    expandedGroups.insert(id)
                } else {
                    expandedGroups.remove(id)
                }
            }
        )
    }
}
