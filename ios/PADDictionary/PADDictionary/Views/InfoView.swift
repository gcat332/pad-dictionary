import SwiftUI

struct InfoView: View {
    let dataStore: DataStore

    var body: some View {
        List {
            NavigationLink("Awoken") { AwokenInfoListView() }
            NavigationLink("Latent Awoken") { LatentAwokenInfoListView() }
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
    @ViewBuilder let icon: () -> Icon

    var body: some View {
        HStack(spacing: 12) {
            icon()
            Text(title)
                .foregroundStyle(Color.padText)
        }
    }
}

struct AwokenInfoListView: View {
    var body: some View {
        List(AwakeningNames.allIds, id: \.self) { id in
            InfoRow(title: AwakeningNames.name(for: id)) {
                AwakeningIconView(awakeningId: id)
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Awoken")
    }
}

struct LatentAwokenInfoListView: View {
    var body: some View {
        List(LatentAwakeningNames.allIds, id: \.self) { id in
            InfoRow(title: LatentAwakeningNames.name(for: id)) {
                Image(systemName: "star.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.padAccentBorder)
                    .frame(width: 32, height: 32)
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Latent Awoken")
        .safeAreaInset(edge: .bottom) {
            Text("Names are derived from Latent TAMADRA material cards — no official English text exists for these ids.")
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

    private var badgeIds: [Int] {
        Array(Set(dataStore.cards.compactMap { $0.badgeId > 0 ? $0.badgeId : nil })).sorted()
    }

    var body: some View {
        List(badgeIds, id: \.self) { id in
            InfoRow(title: "Badge #\(id)") {
                Image(systemName: "rosette")
                    .font(.title2)
                    .foregroundStyle(Color.padAccentBorder)
                    .frame(width: 32, height: 32)
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Badge")
        .safeAreaInset(edge: .bottom) {
            Text("Team Badges are cosmetic — no name or ability data exists for them.")
                .font(.caption)
                .foregroundStyle(Color.padDim)
                .padding(8)
                .frame(maxWidth: .infinity)
                .background(Color.padPanel)
        }
    }
}
