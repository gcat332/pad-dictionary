import SwiftUI

struct CompareView: View {
    let cardIds: [Int]
    let dataStore: DataStore
    @ObservedObject var compareStore: CompareStore
    @Environment(\.dismiss) private var dismiss

    private var cards: [Card] {
        cardIds.compactMap { dataStore.cardsById[$0] }
    }

    private let rowLabels = ["", "Type", "Rarity", "Cost", "HP", "ATK", "RCV", "Awakenings", "Active skill", "Leader skill"]
    private let rowHeights: [CGFloat] = [100, 28, 28, 28, 28, 28, 28, 44, 100, 100]
    private let columnWidth: CGFloat = 150

    var body: some View {
        NavigationStack {
            HStack(alignment: .top, spacing: 0) {
                labelColumn
                ScrollView(.horizontal) {
                    HStack(alignment: .top, spacing: 12) {
                        ForEach(cards) { card in
                            cardColumn(card)
                        }
                    }
                }
            }
            .padding()
            .background(Color.padBackground)
            .navigationTitle("Compare \(cards.count) cards")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .onChange(of: compareStore.ids) { _, newValue in
            if newValue.isEmpty { dismiss() }
        }
    }

    private var labelColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(rowLabels.enumerated()), id: \.offset) { index, label in
                Text(label)
                    .font(.caption.bold())
                    .foregroundStyle(Color.padDim)
                    .frame(height: rowHeights[index], alignment: .leading)
            }
        }
        .frame(width: 90, alignment: .leading)
    }

    private func cardColumn(_ card: Card) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            columnHeader(card).frame(height: rowHeights[0])
            typeCell(card).frame(height: rowHeights[1])
            cell("★\(card.rarity)").frame(height: rowHeights[2])
            cell("\(card.cost)").frame(height: rowHeights[3])
            statCell(card.hp.max, isBest: bestIds(for: \.hp.max).contains(card.id)).frame(height: rowHeights[4])
            statCell(card.atk.max, isBest: bestIds(for: \.atk.max).contains(card.id)).frame(height: rowHeights[5])
            statCell(card.rcv.max, isBest: bestIds(for: \.rcv.max).contains(card.id)).frame(height: rowHeights[6])
            awakeningsCell(card).frame(height: rowHeights[7])
            skillCell(skillId: card.activeSkillId).frame(height: rowHeights[8])
            skillCell(skillId: card.leaderSkillId).frame(height: rowHeights[9])
        }
        .frame(width: columnWidth, alignment: .leading)
    }

    private func columnHeader(_ card: Card) -> some View {
        VStack(spacing: 4) {
            CardArtworkView(card: card, cellSize: 56)
            Text(card.displayName).font(.caption.bold()).lineLimit(1)
            Text("#\(card.id)").font(.caption2).foregroundStyle(Color.padDim)
            Button(role: .destructive) {
                compareStore.remove(card.id)
            } label: {
                Text("Remove").font(.caption2)
            }
        }
    }

    private func cell(_ text: String) -> some View {
        Text(text).font(.caption).frame(maxWidth: .infinity, alignment: .leading)
    }

    private func typeCell(_ card: Card) -> some View {
        HStack(spacing: 4) {
            ForEach(card.types.filter { $0 >= 0 }, id: \.self) { TypeIconView(type: $0, size: 14) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func statCell(_ value: Int, isBest: Bool) -> some View {
        Text("\(value)")
            .font(isBest ? .caption.bold() : .caption)
            .foregroundStyle(isBest ? Color.padAccentBorder : Color.padText)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func awakeningsCell(_ card: Card) -> some View {
        Group {
            if card.awakenings.isEmpty {
                Text("None").font(.caption2).foregroundStyle(Color.padDim)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 2) {
                        ForEach(Array(card.awakenings.enumerated()), id: \.offset) { _, awakeningId in
                            AwakeningIconView(awakeningId: awakeningId)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func skillCell(skillId: Int) -> some View {
        let resolved = SkillResolver.resolve(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
        return VStack(alignment: .leading, spacing: 2) {
            Text(resolved.map { $0.name.isEmpty ? "—" : $0.name } ?? "—").font(.caption.bold())
            if let resolved, !resolved.description.isEmpty {
                Text(resolved.description).font(.caption2).lineLimit(4)
            } else {
                Text("—").font(.caption2).foregroundStyle(Color.padDim)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func bestIds(for keyPath: KeyPath<Card, Int>) -> Set<Int> {
        let values = cards.map { $0[keyPath: keyPath] }
        let indices = CompareBestValue.bestIndices(values)
        return Set(indices.map { cards[$0].id })
    }
}
