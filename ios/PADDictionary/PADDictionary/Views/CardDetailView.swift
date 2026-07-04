import SwiftUI
import SafariServices

struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore
    @Environment(\.colorScheme) private var colorScheme
    @State private var showingSearch = false

    private var accent: Color { AttributeColor.accent(for: card.attrs) }
    // Bright attribute accents pop on dark but wash out on light — darken for text there.
    private var accentText: Color { colorScheme == .light ? accent.darkened(0.42) : accent }
    // Lighter darkening than body accents — the #id gradient reads more vividly.
    private func attrColor(_ attr: Int, darken: Double = 0.22) -> Color {
        let c = AttributeColor.accent(for: [attr])
        return colorScheme == .light ? c.darkened(darken) : c
    }
    // #id fill: a gradient across the card's attribute colours (dual-attr = two tones,
    // single-attr = one tone with a subtle fade).
    private var idGradient: LinearGradient {
        let attrs = card.attrs.filter { $0 >= 0 }
        let colors: [Color]
        switch attrs.count {
        case 0:  colors = [accentText, accentText]
        case 1:  colors = [attrColor(attrs[0]), attrColor(attrs[0]).opacity(0.6)]
        default: colors = attrs.map { attrColor($0) }
        }
        return LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing)
    }

    // Google-search this character. Uses the JP name + "パズドラ" (the game's JP short
    // name): new cards land in JP first and often have no English name/coverage yet,
    // so JP consistently finds the character where an English query would miss.
    // Non-optional: the base URL is a known-good literal, so force-unwrap is safe.
    private var searchURL: URL {
        var c = URLComponents(string: "https://www.google.com/search")!
        c.queryItems = [URLQueryItem(name: "q", value: "\(card.name) パズドラ")]
        return c.url!
    }

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
        .background(detailBackground)
        // No large "#id" title — the id is already shown under the card name (see header).
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showingSearch = true } label: {
                    Image(systemName: "magnifyingglass")
                }
                .accessibilityLabel("Search this card on Google")
            }
        }
        .sheet(isPresented: $showingSearch) {
            SafariView(url: searchURL).ignoresSafeArea()
        }
    }

    // Attribute-tinted glow at the top, fading into the base — mirrors the web detail's
    // radial-gradient(... at 18% 0% ...) so each card's attribute colors the page.
    private var detailBackground: some View {
        ZStack(alignment: .top) {
            Color.padBackground
            RadialGradient(
                colors: [accent.opacity(colorScheme == .light ? 0.12 : 0.28), .clear],
                center: UnitPoint(x: 0.15, y: -0.05),
                startRadius: 0, endRadius: 460
            )
        }
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            CardArtworkView(card: card, cellSize: 80)
            VStack(alignment: .leading, spacing: 4) {
                // Attribute is already conveyed by the card artwork + colored frame.
                Text("#\(card.id)").font(.system(size: 15, weight: .bold)).foregroundStyle(idGradient)
                // Google-search lives in the toolbar (top-right); taps in the header
                // itself don't register reliably, so the name is just a label here.
                Text(card.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.padText)
                    .lineLimit(1)
                    .truncationMode(.tail)
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
        TypeIconView(type: type, size: 20)
            .padding(6)
            .background(Color.padPanel)
            .overlay(Capsule().stroke(Color.padBorder))
            .clipShape(Capsule())
            .accessibilityLabel(CardTypeNames.name(for: type))
    }

    private var statsRow: some View {
        HStack(spacing: 10) {
            statBox("HP", card.hp.max)
            statBox("ATK", card.atk.max)
            statBox("RCV", card.rcv.max)
        }
    }

    private func statBox(_ label: String, _ value: Int) -> some View {
        VStack(spacing: 6) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(Color.padDim)
            Text("\(value)")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color.padText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            LinearGradient(
                colors: [accent.opacity(colorScheme == .light ? 0.14 : 0.22), Color.padPanel],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 14)
        )
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.padBorder))
    }

    private func eyebrow(_ text: String, trailing: String? = nil, color: Color? = nil, size: CGFloat = 11) -> some View {
        HStack(spacing: 8) {
            Text(text)
                .font(.system(size: size, weight: .bold))
                .tracking(size * 0.12)
                .textCase(.uppercase)
                .foregroundStyle(color ?? accentText)
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
        let cd = SkillResolver.cooldownValue(skillId: skillId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN)
        let stages = evolvedStages(for: skillId, base: resolved)
        return VStack(alignment: .leading, spacing: 2) {
            eyebrow(title)
            skillStageBody(resolved, cd: cd)
            ForEach(Array(stages.enumerated()), id: \.offset) { index, stage in
                VStack(alignment: .leading, spacing: 2) {
                    let stageCd = SkillResolver.cooldownValue(skillId: stage.id, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN)
                    eyebrow("Evolves into (\(index + 1)/\(stages.count))", color: Color.padDim, size: 10)
                    skillStageBody(stage.resolved, cd: stageCd)
                }
                .padding(.leading, 10)
                .padding(.top, 10)
                .overlay(alignment: .leading) {
                    Rectangle().fill(Color.padEvoBorder).frame(width: 2)
                }
            }
        }
    }

    private func skillStageBody(_ resolved: ResolvedSkill?, cd: String) -> some View {
        let hasName = !(resolved?.name.isEmpty ?? true)
        return VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 5) {
                Text(resolved.map { $0.name.isEmpty ? "—" : $0.name } ?? "—")
                    .font(.system(size: 14, weight: hasName ? .semibold : .regular))
                    .foregroundStyle(hasName ? Color.padText : Color.padDim)
                if !cd.isEmpty {
                    Text("(CD \(cd))")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(accentText)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(accentText.opacity(colorScheme == .light ? 0.12 : 0.15), in: Capsule())
                }
            }
            if let resolved, !resolved.description.isEmpty {
                HStack(alignment: .top, spacing: 6) {
                    SkillTextView(resolved.description)
                        .lineSpacing(3)
                    if resolved.source == .translated {
                        Text("translated")
                            .font(.system(size: 10))
                            .foregroundStyle(accentText)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .overlay(Capsule().stroke(accentText.opacity(0.45)))
                    }
                }
            } else {
                Text("— no English text").font(.system(size: 13)).foregroundStyle(Color.padDim)
            }
        }
    }

    private func evolvedStages(for skillId: Int, base: ResolvedSkill?) -> [(id: Int, resolved: ResolvedSkill?)] {
        let chain = SkillResolver.evolvedChain(skillId: skillId, skillsJA: dataStore.skillLookup)
        var seenKeys: Set<String> = [stageKey(base)]
        var stages: [(id: Int, resolved: ResolvedSkill?)] = []
        for stageId in chain {
            let resolved = SkillResolver.resolve(skillId: stageId, skillsJA: dataStore.skillLookup, skillsEN: dataStore.skillLookupEN, translations: dataStore.skillTranslations)
            let key = stageKey(resolved)
            guard !seenKeys.contains(key) else { continue }
            seenKeys.insert(key)
            stages.append((id: stageId, resolved: resolved))
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

// In-app browser for the card's Google search — doesn't rely on the external
// openURL path (which wasn't launching Safari from the detail view).
private struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }
    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
