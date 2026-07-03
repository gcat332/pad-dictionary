import SwiftUI

struct InfoView: View {
    let dataStore: DataStore

    var body: some View {
        List {
            NavigationLink("Awoken") { AwokenInfoListView() }
            NavigationLink("Latent Awoken") { LatentAwokenInfoListView(dataStore: dataStore) }
            NavigationLink("Badge") { BadgeInfoListView(dataStore: dataStore) }
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .listRowBackground(Color.padPanel)
        .navigationTitle("Info")
    }
}

private struct InfoRow<Icon: View>: View {
    let title: String
    var subtitle: String?
    @ViewBuilder let icon: () -> Icon

    var body: some View {
        HStack(spacing: 12) {
            icon()
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .foregroundStyle(Color.padText)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Color.padDim)
                }
            }
        }
    }
}

struct AwokenInfoListView: View {
    var body: some View {
        List(AwakeningNames.allIds, id: \.self) { id in
            InfoRow(title: AwakeningNames.name(for: id), subtitle: AwakeningNames.description(for: id)) {
                AwakeningIconView(awakeningId: id)
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Awoken")
        .safeAreaInset(edge: .bottom) {
            Text("Effects verified against GameWith's Awakening Skill guide — some ids have no page-confirmed number, so no effect is shown for those.")
                .font(.caption)
                .foregroundStyle(Color.padDim)
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Color.padPanel)
        }
    }
}

struct LatentAwokenInfoListView: View {
    let dataStore: DataStore

    var body: some View {
        List(LatentAwakeningNames.allIds, id: \.self) { id in
            InfoRow(title: LatentAwakeningNames.name(for: id), subtitle: LatentAwakeningNames.description(for: id)) {
                if let card = LatentAwakeningNames.representativeCard(for: id, in: dataStore.cards) {
                    CardArtworkView(card: card, cellSize: 32)
                } else {
                    Image(systemName: "star.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.padAccentBorder)
                        .frame(width: 32, height: 32)
                }
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Latent Awoken")
        .safeAreaInset(edge: .bottom) {
            Text("Icons are the Latent TAMADRA material card for each id. Names/effects derived from those cards + GameWith's guide — no official English text exists for these ids.")
                .font(.caption)
                .foregroundStyle(Color.padDim)
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Color.padPanel)
        }
    }
}

struct BadgeInfoListView: View {
    let dataStore: DataStore

    // Only badges GameWith's/AppMedia's guides actually cover — no generic fallback.
    private var groupedBadgeIds: [(category: BadgeNames.Category, ids: [Int])] {
        let ids = Set(dataStore.cards.map(\.badgeId)).filter { $0 > 0 && BadgeNames.name(for: $0) != nil }
        return BadgeNames.Category.allCases.map { category in
            (category, ids.filter { BadgeNames.category(for: $0) == category }.sorted())
        }
    }

    var body: some View {
        List {
            ForEach(groupedBadgeIds, id: \.category) { group in
                Section(group.category.rawValue) {
                    ForEach(group.ids, id: \.self) { id in
                        InfoRow(
                            title: BadgeNames.name(for: id) ?? "Badge #\(id)",
                            subtitle: BadgeNames.effect(for: id) ?? ""
                        ) {
                            if let icon = BadgeNames.icon(for: id) {
                                Image(uiImage: icon)
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(width: 40, height: 32)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            } else {
                                Image(systemName: "rosette")
                                    .font(.title2)
                                    .foregroundStyle(Color.padAccentBorder)
                                    .frame(width: 32, height: 32)
                            }
                        }
                    }
                }
                .listRowBackground(Color.padPanel)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Badge")
        .safeAreaInset(edge: .bottom) {
            Text("Showing the 70 badges covered by GameWith + AppMedia's Awakening Badge guides — badgeIds outside those lists aren't shown.")
                .font(.caption)
                .foregroundStyle(Color.padDim)
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Color.padPanel)
        }
    }
}
