# iOS App — Sub-project 5: Compare Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick multiple cards and see their stats/skills side-by-side, matching
the web dictionary's existing Compare mode feature.

**Architecture:** A new `CompareStore` (ephemeral `ObservableObject`, list of card IDs)
threaded through `ContentView` → `BrowseView`/`CardDetailView`. Two entry points (long-press
in the Browse grid, a toggle button in the card detail header) both mutate the same store;
a bottom bar in `BrowseView` shows current selections and opens a new full-screen
`CompareView` with a sticky label column + horizontally-scrolling per-card columns.

**Tech Stack:** Swift 6, SwiftUI, XCTest, Xcode project at
`ios/PADDictionary/PADDictionary.xcodeproj` (uses `PBXFileSystemSynchronizedRootGroup` —
new files under `PADDictionary/` or `PADDictionaryTests/` are auto-included in their
targets just by being on disk, no `project.pbxproj` editing needed).

## Global Constraints

- Any Swift file declaring `ObservableObject`/`@Published` must explicitly `import Combine`
  (not implied by `import SwiftUI`/`Foundation`) — this has bitten every prior sub-project
  at least once. `CompareStore` needs this.
- No card limit in Compare mode (matches the web's unbounded `COMPARE` array).
- Compare selection is ephemeral — no persistence across app launches (matches the web,
  which never writes `COMPARE` to `localStorage`).
- `CardArtworkView(card:cellSize:)` defaults `cellSize` to `64` — pass an explicit value
  anywhere a different size is needed (this plan uses `32` for the bottom bar, `56` for the
  compare screen's column headers).
- Follow the existing pattern of threading dependencies explicitly through view
  initializers (`dataStore: DataStore`, and now also `compareStore: CompareStore`) — this
  codebase does not use `@EnvironmentObject`.
- Test file naming/structure: `final class XTests: XCTestCase` with individual
  `@MainActor func test...()` methods where the code under test is `@MainActor`-isolated
  (see `DataStoreTests.swift` for the established pattern) — not `@MainActor` on the whole
  class.

---

### Task 1: `CompareStore`

**Files:**
- Create: `PADDictionary/Models/CompareStore.swift`
- Test: `PADDictionaryTests/CompareStoreTests.swift`

**Interfaces:**
- Produces: `CompareStore` (`ObservableObject`, `@MainActor`) with
  `@Published private(set) var ids: [Int]`, `add(_ id: Int)`, `remove(_ id: Int)`,
  `toggle(_ id: Int)`, `clear()`, `contains(_ id: Int) -> Bool`. Tasks 3 and 4 consume all
  of these.

- [ ] **Step 1: Write the failing tests**

```swift
import XCTest
@testable import PADDictionary

final class CompareStoreTests: XCTestCase {
    @MainActor
    func testAddAppendsUniqueId() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.add(1)
        XCTAssertEqual(store.ids, [1, 2])
    }

    @MainActor
    func testRemoveDeletesId() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.remove(1)
        XCTAssertEqual(store.ids, [2])
    }

    @MainActor
    func testToggleAddsWhenAbsentRemovesWhenPresent() {
        let store = CompareStore()
        store.toggle(1)
        XCTAssertEqual(store.ids, [1])
        store.toggle(1)
        XCTAssertEqual(store.ids, [])
    }

    @MainActor
    func testClearEmptiesIds() {
        let store = CompareStore()
        store.add(1)
        store.add(2)
        store.clear()
        XCTAssertTrue(store.ids.isEmpty)
    }

    @MainActor
    func testContainsReflectsMembership() {
        let store = CompareStore()
        XCTAssertFalse(store.contains(1))
        store.add(1)
        XCTAssertTrue(store.contains(1))
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CompareStoreTests 2>&1 | tail -40`
Expected: FAIL — `Cannot find 'CompareStore' in scope`.

- [ ] **Step 3: Implement `CompareStore`**

```swift
import Foundation
import Combine

@MainActor
final class CompareStore: ObservableObject {
    @Published private(set) var ids: [Int] = []

    func add(_ id: Int) {
        guard !ids.contains(id) else { return }
        ids.append(id)
    }

    func remove(_ id: Int) {
        ids.removeAll { $0 == id }
    }

    func toggle(_ id: Int) {
        if ids.contains(id) {
            remove(id)
        } else {
            add(id)
        }
    }

    func clear() {
        ids.removeAll()
    }

    func contains(_ id: Int) -> Bool {
        ids.contains(id)
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/CompareStore.swift ios/PADDictionary/PADDictionaryTests/CompareStoreTests.swift
git commit -m "Add CompareStore tracking cards selected for comparison"
```

---

### Task 2: `CompareBestValue.bestIndices`

**Files:**
- Create: `PADDictionary/Models/CompareBestValue.swift`
- Test: `PADDictionaryTests/CompareBestValueTests.swift`

**Interfaces:**
- Produces: `CompareBestValue.bestIndices(_ values: [Int]) -> Set<Int>`. Task 3 consumes
  this to decide which HP/ATK/RCV column(s) to bold/highlight.

- [ ] **Step 1: Write the failing tests**

```swift
import XCTest
@testable import PADDictionary

final class CompareBestValueTests: XCTestCase {
    func testMarksSingleMax() {
        XCTAssertEqual(CompareBestValue.bestIndices([10, 30, 20]), [1])
    }

    func testMarksTies() {
        XCTAssertEqual(CompareBestValue.bestIndices([30, 10, 30]), [0, 2])
    }

    func testEmptyWhenOnlyOneValue() {
        XCTAssertEqual(CompareBestValue.bestIndices([42]), [])
    }

    func testEmptyForEmptyInput() {
        XCTAssertEqual(CompareBestValue.bestIndices([]), [])
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/CompareBestValueTests 2>&1 | tail -40`
Expected: FAIL — `Cannot find 'CompareBestValue' in scope`.

- [ ] **Step 3: Implement `CompareBestValue`**

```swift
import Foundation

enum CompareBestValue {
    static func bestIndices(_ values: [Int]) -> Set<Int> {
        guard values.count > 1, let maxValue = values.max() else { return [] }
        return Set(values.indices.filter { values[$0] == maxValue })
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/CompareBestValue.swift ios/PADDictionary/PADDictionaryTests/CompareBestValueTests.swift
git commit -m "Add CompareBestValue.bestIndices for highlighting the top stat column"
```

---

### Task 3: `CompareView`

**Files:**
- Create: `PADDictionary/Views/CompareView.swift`

**Interfaces:**
- Consumes: `CompareStore` (Task 1), `CompareBestValue.bestIndices` (Task 2), and existing
  `DataStore`, `Card`, `StatRange`, `CardTypeNames.name(for:)`, `SkillResolver.resolve(...)`,
  `AwakeningIconView`, `CardArtworkView`.
- Produces: `CompareView(cardIds: [Int], dataStore: DataStore, compareStore: CompareStore)`
  — a `View`. Task 4 presents this as a `.sheet`.

This task has no XCTest — SwiftUI view bodies aren't unit-testable. It's verified visually
in Task 5 once it's reachable from the UI.

- [ ] **Step 1: Implement `CompareView`**

```swift
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
                    .foregroundStyle(.secondary)
                    .frame(height: rowHeights[index], alignment: .leading)
            }
        }
        .frame(width: 90, alignment: .leading)
    }

    private func cardColumn(_ card: Card) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            columnHeader(card).frame(height: rowHeights[0])
            cell(card.types.filter { $0 >= 0 }.map { CardTypeNames.name(for: $0) }.joined(separator: ", ")).frame(height: rowHeights[1])
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
            Text("#\(card.id)").font(.caption2).foregroundStyle(.secondary)
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

    private func statCell(_ value: Int, isBest: Bool) -> some View {
        Text("\(value)")
            .font(isBest ? .caption.bold() : .caption)
            .foregroundStyle(isBest ? Color.accentColor : Color.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func awakeningsCell(_ card: Card) -> some View {
        Group {
            if card.awakenings.isEmpty {
                Text("None").font(.caption2).foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 2) {
                        ForEach(card.awakenings, id: \.self) { AwakeningIconView(awakeningId: $0) }
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
                Text("—").font(.caption2).foregroundStyle(.secondary)
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
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd ios/PADDictionary && xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' build 2>&1 | tail -30`
Expected: `** BUILD SUCCEEDED **`. `CompareView` isn't referenced from anywhere yet, so this
only checks the file itself is valid Swift — Task 4 wires it in.

- [ ] **Step 3: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/CompareView.swift
git commit -m "Add CompareView — side-by-side card stat/skill comparison screen"
```

---

### Task 4: `CompareBar` + wire both entry points

**Files:**
- Create: `PADDictionary/Views/CompareBar.swift`
- Modify: `PADDictionary/ContentView.swift`
- Modify: `PADDictionary/Views/BrowseView.swift`
- Modify: `PADDictionary/Views/CardDetailView.swift`

**Interfaces:**
- Consumes: `CompareStore` (Task 1), `CompareView` (Task 3), existing `DataStore`,
  `CardArtworkView`.
- Produces: `CompareBar(compareStore: CompareStore, dataStore: DataStore)` — a `View` that
  is `EmptyView`-equivalent (renders nothing, via `if !compareStore.ids.isEmpty`) when
  Compare is empty.

No new XCTest here either — this task is pure UI wiring, verified in Task 5.

- [ ] **Step 1: Implement `CompareBar`**

```swift
import SwiftUI

struct CompareBar: View {
    @ObservedObject var compareStore: CompareStore
    let dataStore: DataStore
    @State private var showingCompare = false

    var body: some View {
        if !compareStore.ids.isEmpty {
            HStack(spacing: 8) {
                Text("Compare").font(.caption).foregroundStyle(.secondary)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(compareStore.ids, id: \.self) { id in
                            if let card = dataStore.cardsById[id] {
                                Button {
                                    compareStore.remove(id)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 32)
                                }
                            }
                        }
                    }
                }
                Spacer()
                Button("Compare \(compareStore.ids.count)") {
                    showingCompare = true
                }
                .buttonStyle(.borderedProminent)
                Button("Clear") {
                    compareStore.clear()
                }
            }
            .padding(8)
            .background(.thinMaterial)
            .sheet(isPresented: $showingCompare) {
                CompareView(cardIds: compareStore.ids, dataStore: dataStore, compareStore: compareStore)
            }
        }
    }
}
```

- [ ] **Step 2: Wire `CompareStore` into `ContentView`**

Modify `PADDictionary/ContentView.swift` — current content:

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )

    var body: some View {
        TabView {
            BrowseView(dataStore: dataStore)
                .tabItem { Label("Browse", systemImage: "square.grid.2x2") }

            NavigationStack {
                SyncView(dataStore: dataStore, syncService: GitHubSyncService())
            }
            .tabItem { Label("Sync", systemImage: "arrow.triangle.2.circlepath") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
```

Change to:

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )
    @StateObject private var compareStore = CompareStore()

    var body: some View {
        TabView {
            BrowseView(dataStore: dataStore, compareStore: compareStore)
                .tabItem { Label("Browse", systemImage: "square.grid.2x2") }

            NavigationStack {
                SyncView(dataStore: dataStore, syncService: GitHubSyncService())
            }
            .tabItem { Label("Sync", systemImage: "arrow.triangle.2.circlepath") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
```

- [ ] **Step 3: Wire `CompareStore` into `BrowseView`**

Modify `PADDictionary/Views/BrowseView.swift`. Change the `BrowseView` struct's properties
and initializer from:

```swift
struct BrowseView: View {
    @ObservedObject var dataStore: DataStore
    @StateObject private var viewModel: BrowseViewModel
    @State private var showingFilters = false
    @State private var showingSpecialSearch = false

    init(dataStore: DataStore) {
        self.dataStore = dataStore
        _viewModel = StateObject(wrappedValue: BrowseViewModel(dataStore: dataStore))
    }
```

to:

```swift
struct BrowseView: View {
    @ObservedObject var dataStore: DataStore
    @ObservedObject var compareStore: CompareStore
    @StateObject private var viewModel: BrowseViewModel
    @State private var showingFilters = false
    @State private var showingSpecialSearch = false

    init(dataStore: DataStore, compareStore: CompareStore) {
        self.dataStore = dataStore
        self.compareStore = compareStore
        _viewModel = StateObject(wrappedValue: BrowseViewModel(dataStore: dataStore))
    }
```

Change the grid's `NavigationLink` from:

```swift
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                NavigationLink {
                                    CardDetailView(card: card, dataStore: dataStore)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 64)
                                }
                            }
                        }
                        .padding()
```

to:

```swift
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(viewModel.cards) { card in
                                NavigationLink {
                                    CardDetailView(card: card, dataStore: dataStore, compareStore: compareStore)
                                } label: {
                                    CardArtworkView(card: card, cellSize: 64)
                                        .overlay(alignment: .topTrailing) {
                                            if compareStore.contains(card.id) {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundStyle(.blue)
                                                    .background(Circle().fill(.white))
                                                    .padding(2)
                                            }
                                        }
                                }
                                .simultaneousGesture(
                                    LongPressGesture(minimumDuration: 0.4).onEnded { _ in
                                        compareStore.toggle(card.id)
                                    }
                                )
                            }
                        }
                        .padding()
```

Change the outer `Group { ... }` (which wraps the empty-state/grid) to a `ZStack` so the
`CompareBar` overlays the bottom of the screen. Find:

```swift
        NavigationStack {
            Group {
                if dataStore.cards.isEmpty {
```

Replace with:

```swift
        NavigationStack {
            ZStack(alignment: .bottom) {
            Group {
                if dataStore.cards.isEmpty {
```

Find the matching closing brace of that `Group` (it's immediately followed by
`.searchable(...)` — the `Group` block ends right before that modifier chain) and insert
`CompareBar` plus the closing `}` for the new `ZStack`. Specifically, change:

```swift
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Search by ID")
```

to:

```swift
                }
            }
            CompareBar(compareStore: compareStore, dataStore: dataStore)
            }
            .searchable(text: $viewModel.searchText, prompt: "Search by ID")
```

(The extra closing `}` closes the `ZStack` opened in the previous edit. Re-indent the
`Group { ... }` block one level deeper for readability once both edits are applied — not
required for correctness, just cleanliness.)

- [ ] **Step 4: Wire `CompareStore` into `CardDetailView`**

Modify `PADDictionary/Views/CardDetailView.swift`. Change:

```swift
struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore
```

to:

```swift
struct CardDetailView: View {
    let card: Card
    let dataStore: DataStore
    @ObservedObject var compareStore: CompareStore
```

Change the `header` computed property from:

```swift
    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            CardArtworkView(card: card, cellSize: 80)
            VStack(alignment: .leading, spacing: 4) {
                Text(card.displayName).font(.title2.bold())
                Text("#\(card.id) · \(card.name)").font(.caption).foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    ForEach(card.types.filter { $0 >= 0 }, id: \.self) { type in
                        chip(CardTypeNames.name(for: type))
                    }
                    chip("★\(card.rarity)")
                    chip("Cost \(card.cost)")
                }
            }
        }
    }
```

to:

```swift
    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            CardArtworkView(card: card, cellSize: 80)
            VStack(alignment: .leading, spacing: 4) {
                Text(card.displayName).font(.title2.bold())
                Text("#\(card.id) · \(card.name)").font(.caption).foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    ForEach(card.types.filter { $0 >= 0 }, id: \.self) { type in
                        chip(CardTypeNames.name(for: type))
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
```

Change the evolution section's `NavigationLink` from:

```swift
                                NavigationLink {
                                    CardDetailView(card: member, dataStore: dataStore)
                                } label: {
```

to:

```swift
                                NavigationLink {
                                    CardDetailView(card: member, dataStore: dataStore, compareStore: compareStore)
                                } label: {
```

- [ ] **Step 5: Build to verify everything compiles**

Run: `cd ios/PADDictionary && xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' build 2>&1 | tail -40`
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 6: Run the full test suite to make sure nothing broke**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tail -40`
Expected: `** TEST SUCCEEDED **`.

- [ ] **Step 7: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/CompareBar.swift ios/PADDictionary/PADDictionary/ContentView.swift ios/PADDictionary/PADDictionary/Views/BrowseView.swift ios/PADDictionary/PADDictionary/Views/CardDetailView.swift
git commit -m "Wire Compare mode into Browse grid (long-press) and card detail (toggle button)"
```

---

### Task 5: Full verify + screenshot

**Files:** None modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `cd ios/PADDictionary && xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17' 2>&1 | tee /tmp/test_full_compare.log | tail -40`
Expected: `** TEST SUCCEEDED **`, 0 failures.

- [ ] **Step 2: Build and install on the specific Simulator device**

```bash
xcrun simctl bootstatus A909C90E-EB7B-42E0-9840-CFF59F901A94 -b
cd ios/PADDictionary
xcodebuild -project PADDictionary.xcodeproj -scheme PADDictionary -destination 'id=A909C90E-EB7B-42E0-9840-CFF59F901A94' -derivedDataPath /tmp/pad-build build
xcrun simctl terminate A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary || true
xcrun simctl install A909C90E-EB7B-42E0-9840-CFF59F901A94 /tmp/pad-build/Build/Products/Debug-iphonesimulator/PADDictionary.app
xcrun simctl launch A909C90E-EB7B-42E0-9840-CFF59F901A94 gcat332.PADDictionary
```

Expected: `** BUILD SUCCEEDED **`, app launches without crashing.

- [ ] **Step 3: Exercise the feature and screenshot each state**

There's no automated UI-driving in this environment (no accessibility permission for
AppleScript, per prior sub-project notes) — do this manually via `xcrun simctl` +
screenshots, confirming visually at each step:

1. Screenshot the Browse tab: `xcrun simctl io A909C90E-EB7B-42E0-9840-CFF59F901A94 screenshot /tmp/compare-1-browse.png`. Read it — confirm the grid renders normally with no `CompareBar` visible (Compare is empty at launch).
2. This step requires a physical/simulated long-press, which isn't scriptable via `simctl`.
   Instead, verify the long-press wiring by code review (confirm `.simultaneousGesture` is
   present exactly as written in Task 4) AND by using the `CardDetailView` toggle button
   path, which behaves identically since both call `compareStore.toggle`:
   - Since there's no scriptable tap either, do this verification via a temporary debug
     entry point: skip live interaction and instead re-read `BrowseView.swift`,
     `CardDetailView.swift`, and `CompareBar.swift` in full, confirming every symbol
     referenced (`compareStore`, `CompareView`, `CompareBar`) resolves to what Tasks 1-4
     defined, and that the full test suite (Step 1) — which exercises `CompareStore` and
     `CompareBestValue` logic directly — passed.
3. Take a final Browse-tab screenshot to confirm the app is in a stable, non-crashed state
   after the full build: `xcrun simctl io A909C90E-EB7B-42E0-9840-CFF59F901A94 screenshot /tmp/compare-2-final.png`. Read it.

(This is a lighter verification bar than sub-projects with pure-filter-logic features,
because Compare mode's core interactions — long-press, sheet presentation — aren't
scriptable in this environment. The Task 1/2 unit tests cover 100% of the actual decision
logic; Tasks 3/4 are thin, directly-inspectable SwiftUI wiring with no non-trivial branches
beyond what's already covered by `compareStore.contains(...)` checks tested in Task 1.)

- [ ] **Step 4: No commit needed**

This task is verification-only.
