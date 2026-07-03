import SwiftUI

struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore

    private var accent: Color { AttributeColor.accent(for: card.attrs) }

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
                    ForEach(Array(card.attrs.enumerated()), id: \.offset) { _, attr in
                        if (0...4).contains(attr) {
                            OrbIconSprite(attr: attr, size: 18)
                        }
                    }
                    Text(card.displayName).font(.title2.bold())
                }
                Text("#\(card.id) · \(card.name)").font(.caption).foregroundStyle(.secondary)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(card.types.filter { $0 >= 0 }, id: \.self) { type in
                            typeChip(type)
                        }
                        chip("★\(card.rarity)")
                        chip("Cost \(card.cost)")
                    }
                }
            }
        }
    }

    private func chip(_ text: String) -> some View {
        Text(text)
            .lineLimit(1)
            .fixedSize()
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
            Text(CardTypeNames.name(for: type)).lineLimit(1)
        }
        .fixedSize()
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

    private func eyebrow(_ text: String, trailing: String? = nil, color: Color? = nil, size: CGFloat = 11) -> some View {
        HStack(spacing: 8) {
            Text(text)
                .font(.system(size: size, weight: .bold))
                .tracking(size * 0.12)
                .textCase(.uppercase)
                .foregroundStyle(color ?? accent)
            if let trailing {
                Text(trailing)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.padDim)
            }
        }
    }

    private var awakeningsSection: some View {
        VStack(alignment: .leading, spacing: 7) {
            eyebrow("Awoken")
            if card.awakenings.isEmpty {
                Text("None").font(.caption).foregroundStyle(Color.padDim)
            } else {
                FlowLayout(spacing: 5) {
                    ForEach(Array(card.awakenings.enumerated()), id: \.offset) { _, awakeningId in
                        AwakeningIconView(awakeningId: awakeningId)
                    }
                }
            }
            if !card.superAwakenings.isEmpty {
                HStack(spacing: 5) {
                    Text("Super")
                        .font(.system(size: 10))
                        .tracking(0.8)
                        .textCase(.uppercase)
                        .foregroundStyle(Color.padDim)
                    ForEach(Array(card.superAwakenings.enumerated()), id: \.offset) { _, awakeningId in
                        AwakeningIconView(awakeningId: awakeningId)
                    }
                }
                .padding(.top, 3)
            }
        }
    }

    private func skillSection(title: String, skillId: Int) -> some View {
        let resolved = SkillResolver.resolve(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
        let cd = SkillResolver.cooldownText(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN)
        let stages = evolvedStages(for: skillId, base: resolved)
        return VStack(alignment: .leading, spacing: 2) {
            eyebrow(title, trailing: cd.isEmpty ? nil : cd)
            skillStageBody(resolved)
            ForEach(Array(stages.enumerated()), id: \.offset) { index, stage in
                VStack(alignment: .leading, spacing: 2) {
                    eyebrow("Evolves into (\(index + 1)/\(stages.count))", color: Color.padDim, size: 10)
                    skillStageBody(stage)
                }
                .padding(.leading, 10)
                .padding(.top, 10)
                .overlay(alignment: .leading) {
                    Rectangle().fill(Color.padEvoBorder).frame(width: 2)
                }
            }
        }
    }

    private func skillStageBody(_ resolved: ResolvedSkill?) -> some View {
        let hasName = !(resolved?.name.isEmpty ?? true)
        return VStack(alignment: .leading, spacing: 2) {
            Text(resolved.map { $0.name.isEmpty ? "—" : $0.name } ?? "—")
                .font(.system(size: 14, weight: hasName ? .semibold : .regular))
                .foregroundStyle(hasName ? Color.padText : Color.padDim)
            if let resolved, !resolved.description.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    SkillTextView(resolved.description)
                        .lineSpacing(3)
                    if resolved.source == .translated {
                        Text("translated")
                            .font(.system(size: 10))
                            .foregroundStyle(accent)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .overlay(Capsule().stroke(accent.opacity(0.45)))
                    }
                }
            } else {
                Text("— no English text").font(.system(size: 13)).foregroundStyle(Color.padDim)
            }
        }
    }

    private func evolvedStages(for skillId: Int, base: ResolvedSkill?) -> [ResolvedSkill?] {
        let chain = SkillResolver.evolvedChain(skillId: skillId, skillsJA: dataStore.skillLookup)
        var seenKeys: Set<String> = [stageKey(base)]
        var stages: [ResolvedSkill?] = []
        for stageId in chain {
            let resolved = SkillResolver.resolve(skillId: stageId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
            let key = stageKey(resolved)
            guard !seenKeys.contains(key) else { continue }
            seenKeys.insert(key)
            stages.append(resolved)
        }
        return stages
    }

    private func stageKey(_ resolved: ResolvedSkill?) -> String {
        "\(resolved?.name ?? "")|\(resolved?.description ?? "")"
    }

    private var evolutionSection: some View {
        let family = evoFamily(of: card, in: dataStore.cards).sorted { $0.id < $1.id }
        return Group {
            if family.count > 1 {
                VStack(alignment: .leading, spacing: 7) {
                    eyebrow("Evolution line", trailing: "\(family.count)")
                    ScrollView(.horizontal) {
                        HStack(spacing: 12) {
                            ForEach(family) { member in
                                NavigationLink {
                                    CardDetailView(card: member, dataStore: dataStore)
                                } label: {
                                    VStack(spacing: 2) {
                                        CardArtworkView(card: member, cellSize: 56)
                                        Text("#\(member.id)")
                                            .font(.system(size: 10))
                                            .foregroundStyle(member.id == card.id ? accent : Color.padDim)
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
