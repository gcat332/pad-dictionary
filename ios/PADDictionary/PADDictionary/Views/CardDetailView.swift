import SwiftUI

struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore
    @ObservedObject var compareStore: CompareStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                statsRow
                awakeningsSection
                skillSection(title: "Active skill", skillId: card.activeSkillId)
                skillSection(title: "Leader skill", skillId: card.leaderSkillId)
                evolutionSection
            }
            .padding()
        }
        .background(Color.padBackground)
        .navigationTitle("#\(card.id)")
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            CardArtworkView(card: card, cellSize: 80)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    ForEach(card.attrs, id: \.self) { AttributeDotView(attr: $0) }
                    Text(card.displayName).font(.title2.bold())
                }
                Text("#\(card.id) · \(card.name)").font(.caption).foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    ForEach(card.types.filter { $0 >= 0 }, id: \.self) { type in
                        typeChip(type)
                    }
                    chip("★\(card.rarity)")
                    chip("Cost \(card.cost)")
                }
                Button {
                    compareStore.toggle(card.id)
                } label: {
                    Label(
                        compareStore.contains(card.id) ? "Remove from Compare" : "Add to Compare",
                        systemImage: compareStore.contains(card.id) ? "xmark.circle" : "arrow.left.arrow.right.circle"
                    )
                    .font(.caption)
                }
            }
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.padPanel)
            .overlay(Capsule().stroke(Color.padBorder))
            .clipShape(Capsule())
    }

    private func typeChip(_ type: Int) -> some View {
        HStack(spacing: 4) {
            TypeIconView(type: type, size: 14)
            Text(CardTypeNames.name(for: type))
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.padPanel)
        .overlay(Capsule().stroke(Color.padBorder))
        .clipShape(Capsule())
    }

    private var statsRow: some View {
        HStack {
            statBox("HP", card.hp.max)
            statBox("ATK", card.atk.max)
            statBox("RCV", card.rcv.max)
        }
    }

    private func statBox(_ label: String, _ value: Int) -> some View {
        VStack {
            Text(label).font(.caption).foregroundStyle(.secondary)
            Text("\(value)").font(.headline)
        }
        .frame(maxWidth: .infinity)
    }

    private var awakeningsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Awakenings").font(.headline)
            if card.awakenings.isEmpty {
                Text("None").foregroundStyle(.secondary)
            } else {
                HStack {
                    ForEach(card.awakenings, id: \.self) { AwakeningIconView(awakeningId: $0) }
                }
            }
            if !card.superAwakenings.isEmpty {
                HStack(spacing: 6) {
                    Text("Super").font(.caption).foregroundStyle(.secondary)
                    ForEach(card.superAwakenings, id: \.self) { AwakeningIconView(awakeningId: $0) }
                }
            }
        }
    }

    private func skillSection(title: String, skillId: Int) -> some View {
        let resolved = SkillResolver.resolve(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
        let cd = SkillResolver.cooldownText(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN)
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title).font(.headline)
                if !cd.isEmpty {
                    Text(cd).font(.caption).foregroundStyle(.secondary)
                }
            }
            Text(resolved.map { $0.name.isEmpty ? "—" : $0.name } ?? "—").font(.subheadline.bold())
            if let resolved, !resolved.description.isEmpty {
                Text(resolved.description + (resolved.source == .translated ? " (translated)" : ""))
                    .font(.body)
            } else {
                Text("— no English text").foregroundStyle(.secondary)
            }
        }
    }

    private var evolutionSection: some View {
        let family = evoFamily(of: card, in: dataStore.cards).sorted { $0.id < $1.id }
        return Group {
            if family.count > 1 {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Evolution line (\(family.count))").font(.headline)
                    ScrollView(.horizontal) {
                        HStack(spacing: 12) {
                            ForEach(family) { member in
                                NavigationLink {
                                    CardDetailView(card: member, dataStore: dataStore, compareStore: compareStore)
                                } label: {
                                    VStack(spacing: 2) {
                                        CardArtworkView(card: member, cellSize: 56)
                                        Text("#\(member.id)").font(.caption2)
                                    }
                                }
                                .disabled(member.id == card.id)
                            }
                        }
                    }
                }
            }
        }
    }
}
