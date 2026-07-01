# iOS Basic Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role:** implementation is done by dispatching to a Claude subagent running Opus 4.8, which has real Simulator access on this machine (unlike Codex's sandboxed environment used earlier in this project) — it should run real `xcodebuild test`/`build` commands itself and report real output, not compile-only substitutes. Claude (Sonnet, the orchestrator) reviews the diff/output and independently re-verifies anything visual (screenshots) before moving on.

**Goal:** Add attribute (3-slot)/type/rarity/awakening(count-aware)/can-assist filters to the Browse grid, matching the web dictionary's `F`/`matches()` behavior exactly.

**Architecture:** A pure `FilterState.matches(_:)` function (unit-tested) composes with the existing search+sort in `BrowseViewModel`. A `FilterView` sheet, opened from a new `BrowseView` toolbar button, provides the UI.

**Tech Stack:** Swift 6, SwiftUI, `XCTest` — no third-party dependencies.

## Global Constraints

- Every file declaring an `ObservableObject`/`@Published` type must explicitly `import Combine`, even alongside `import SwiftUI` — confirmed by repeated real build failures earlier in this project.
- No third-party dependencies.
- Filter semantics must match `dict.js`'s `F`/`matches()` (see the design spec, `docs/superpowers/specs/2026-07-02-ios-basic-filters-design.md`) exactly — this is a port, not a redesign.
- UI must be genuinely usable: standard iOS layout, clear active-filter affordance, a working "Clear filters" action.

---

## Task 1: `FilterState`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/FilterState.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/FilterStateTests.swift`

**Interfaces:**
- Consumes: `Card` (existing).
- Produces: `struct FilterState: Equatable { var attr: [Set<Int>]; var types: Set<Int>; var rarities: Set<Int>; var awakenings: [Int]; var includeSuper: Bool; var canAssistOnly: Bool; func matches(_ card: Card) -> Bool }` with a memberwise-compatible default init (`attr` defaults to `[[], [], []]`, `includeSuper` defaults to `true`, everything else empty/false) — consumed by `BrowseViewModel` (Task 2) and `FilterView` (Tasks 3-4).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/FilterStateTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class FilterStateTests: XCTestCase {
    private func makeCard(id: Int = 1, attrs: [Int] = [0], types: [Int] = [1], rarity: Int = 5, awakenings: [Int] = [], superAwakenings: [Int] = [], canAssist: Bool = false) -> Card {
        Card(id: id, name: "Card \(id)", otLangName: nil, attrs: attrs, types: types, rarity: rarity, cost: 1, maxLevel: 1, isEmpty: false, enabled: true, hp: StatRange(min: 1, max: 1, scale: 1), atk: StatRange(min: 1, max: 1, scale: 1), rcv: StatRange(min: 1, max: 1, scale: 1), activeSkillId: 0, leaderSkillId: 0, evoRootId: id, awakenings: awakenings, superAwakenings: superAwakenings, canAssist: canAssist, henshinTo: nil, henshinFrom: nil)
    }

    func testDefaultFilterMatchesEverything() {
        XCTAssertTrue(FilterState().matches(makeCard()))
    }

    func testAttrSlotMatchesOnlySelectedValues() {
        var f = FilterState()
        f.attr[0] = [1, 2]
        XCTAssertFalse(f.matches(makeCard(attrs: [0])))
        XCTAssertTrue(f.matches(makeCard(attrs: [1])))
    }

    func testAttrSlotFailsWhenCardHasNoValueAtThatPosition() {
        var f = FilterState()
        f.attr[1] = [3]
        XCTAssertFalse(f.matches(makeCard(attrs: [0]))) // card has no attrs[1]
    }

    func testTypeIsOrMatchAcrossCardsTypes() {
        var f = FilterState()
        f.types = [4, 7]
        XCTAssertTrue(f.matches(makeCard(types: [1, 4])))
        XCTAssertFalse(f.matches(makeCard(types: [1, 2])))
    }

    func testRarityMatch() {
        var f = FilterState()
        f.rarities = [6, 7]
        XCTAssertTrue(f.matches(makeCard(rarity: 6)))
        XCTAssertFalse(f.matches(makeCard(rarity: 5)))
    }

    func testAwakeningRequiresCount() {
        var f = FilterState()
        f.awakenings = [21, 21] // needs 2 copies
        XCTAssertFalse(f.matches(makeCard(awakenings: [21])))
        XCTAssertTrue(f.matches(makeCard(awakenings: [21, 21, 5])))
    }

    func testAwakeningIncludesSuperWhenToggleOn() {
        var f = FilterState()
        f.awakenings = [21]
        f.includeSuper = true
        XCTAssertTrue(f.matches(makeCard(awakenings: [], superAwakenings: [21])))
        f.includeSuper = false
        XCTAssertFalse(f.matches(makeCard(awakenings: [], superAwakenings: [21])))
    }

    func testCanAssistOnly() {
        var f = FilterState()
        f.canAssistOnly = true
        XCTAssertFalse(f.matches(makeCard(canAssist: false)))
        XCTAssertTrue(f.matches(makeCard(canAssist: true)))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/FilterStateTests
```

Expected: real build failure — `FilterState` not defined. Actually run this for real.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Models/FilterState.swift`:

```swift
import Foundation

struct FilterState: Equatable {
    var attr: [Set<Int>] = [[], [], []]
    var types: Set<Int> = []
    var rarities: Set<Int> = []
    var awakenings: [Int] = []
    var includeSuper: Bool = true
    var canAssistOnly: Bool = false

    func matches(_ card: Card) -> Bool {
        for slot in 0..<3 {
            guard !attr[slot].isEmpty else { continue }
            guard slot < card.attrs.count, attr[slot].contains(card.attrs[slot]) else { return false }
        }
        if !types.isEmpty, !card.types.contains(where: { types.contains($0) }) { return false }
        if !rarities.isEmpty, !rarities.contains(card.rarity) { return false }
        if !awakenings.isEmpty {
            let pool = includeSuper ? card.awakenings + card.superAwakenings : card.awakenings
            var have: [Int: Int] = [:]
            for a in pool { have[a, default: 0] += 1 }
            var need: [Int: Int] = [:]
            for a in awakenings { need[a, default: 0] += 1 }
            for (id, count) in need where (have[id] ?? 0) < count { return false }
        }
        if canAssistOnly && !card.canAssist { return false }
        return true
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all 8 tests, run for real.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models/FilterState.swift ios/PADDictionary/PADDictionaryTests/FilterStateTests.swift
git commit -m "Add FilterState porting the web's attr/type/rarity/awakening/assist matcher"
```

---

## Task 2: Wire `FilterState` into `BrowseViewModel`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift`

**Interfaces:**
- Consumes: `FilterState` (Task 1).
- Produces: `BrowseViewModel.filterState: FilterState` (`@Published`, default `FilterState()`) — consumed by `FilterView` (Tasks 3-4) via `@ObservedObject`/binding.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift` (inside `final class BrowseViewModelTests`):

```swift
    @MainActor
    func testFilterStateNarrowsResults() throws {
        try writeCards(#"[{"id":1,"name":"A","attrs":[0],"types":[1],"rarity":5,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false},{"id":2,"name":"B","attrs":[1],"types":[1],"rarity":5,"cost":1,"maxLevel":1,"isEmpty":false,"enabled":true,"hp":{"min":1,"max":1,"scale":1},"atk":{"min":1,"max":1,"scale":1},"rcv":{"min":1,"max":1,"scale":1},"activeSkillId":0,"leaderSkillId":0,"evoRootId":0,"awakenings":[],"superAwakenings":[],"canAssist":false}]"#)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = BrowseViewModel(dataStore: dataStore)
        viewModel.filterState.attr[0] = [1]
        XCTAssertEqual(viewModel.cards.map(\.id), [2])
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/BrowseViewModelTests
```

Expected: real build failure — `filterState` not defined on `BrowseViewModel`.

- [ ] **Step 3: Implement**

In `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`, add a published property to `BrowseViewModel`:

```swift
    @Published var filterState = FilterState()
```

And change the `cards` computed property from:

```swift
    var cards: [Card] {
        let filtered = searchText.isEmpty
            ? dataStore.cards
            : dataStore.cards.filter { String($0.id).contains(searchText) }
        let sort = CardSort.all[sortIndex]
        let ascending = filtered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
```

to:

```swift
    var cards: [Card] {
        let searched = searchText.isEmpty
            ? dataStore.cards
            : dataStore.cards.filter { String($0.id).contains(searchText) }
        let filtered = searched.filter { filterState.matches($0) }
        let sort = CardSort.all[sortIndex]
        let ascending = filtered.sorted { sort.compare($0, $1, dataStore.skillLookup) }
        return isDescending ? ascending.reversed() : ascending
    }
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all `BrowseViewModelTests` (including the pre-existing ones — the default `FilterState()` matches everything, so they must still pass unchanged). Run for real.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/BrowseView.swift ios/PADDictionary/PADDictionaryTests/BrowseViewModelTests.swift
git commit -m "Compose FilterState into BrowseViewModel.cards"
```

---

## Task 3: `FilterView` — attribute/type/rarity sections

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Views/FilterView.swift`

**Interfaces:**
- Consumes: `FilterState` (Task 1), `BrowseViewModel` (existing, now with `filterState`).
- Produces: `struct FilterView: View { @ObservedObject var viewModel: BrowseViewModel }` (a `.sheet`-presented filter screen) — consumed by `BrowseView` (Task 5). This task builds the attr/type/rarity sections; Task 4 adds awakening + toggles + clear to the SAME file/struct.

This task's correctness is behavioral (does tapping a chip actually narrow the grid), not something a unit test captures — `FilterState.matches` is already tested. Verify by building, running in Simulator, and taking a real screenshot of the sheet open with a couple of chips selected.

- [ ] **Step 1: Implement**

Create `ios/PADDictionary/PADDictionary/Views/FilterView.swift`:

```swift
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
```

This won't be independently launchable yet (no toolbar button wires to it until Task 5) — build the whole project to confirm it compiles:

```bash
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** BUILD SUCCEEDED **`, run for real. Fix any real compile errors — you have latitude to adjust exact SwiftUI syntax/layout as long as the behavior (multi-select chips toggling `viewModel.filterState`) matches; this is UI wiring, not a pure function, so exact-code-match isn't the bar, working-and-correct is.

- [ ] **Step 2: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/FilterView.swift
git commit -m "Add FilterView attribute/type/rarity sections"
```

---

## Task 4: `FilterView` — awakening section, incl-super, can-assist, clear

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/FilterView.swift`

**Interfaces:**
- Consumes: `AwakeningIconView` (existing, from sub-project 2), `AwakeningNames` (existing).
- Produces: extends `FilterView`'s body with an awakening section, an "incl. Super" toggle, and a "Can be assist only" toggle — no new externally-consumed symbols.

The web's awakening filter is count-aware: left-click = +1 required copy, right-click = −1. On iOS: tap = +1, long-press = −1 (reset to 0 if already at 0). This is genuinely a UI-behavior task, not unit-testable — verify visually.

- [ ] **Step 1: Implement**

Add this full awakening order array (ported verbatim from `dict.js`'s `AWOKEN_ORDER`) near the top of `ios/PADDictionary/PADDictionary/Views/FilterView.swift`, alongside the existing `attrLabels`/`typeOrder`/`typeLabels`:

```swift
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
```

Add this section builder as a new method inside `FilterView`:

```swift
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
```

And add both this section and the can-assist toggle to `body`'s `Form`, so the full `body` reads:

```swift
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
```

- [ ] **Step 2: Build for real**

```bash
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** BUILD SUCCEEDED **`, for real. You have latitude on exact SwiftUI syntax for this UI-behavior task as long as it compiles and the described tap/long-press behavior works.

- [ ] **Step 3: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/FilterView.swift
git commit -m "Add FilterView awakening section (count-aware), incl-super and can-assist toggles"
```

---

## Task 5: Wire `FilterView` into `BrowseView`, full verify, screenshot

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`

**Interfaces:**
- Consumes: `FilterView` (Tasks 3-4).
- Produces: a working filter button on `BrowseView` — terminal for this sub-project.

- [ ] **Step 1: Add filter state and toolbar button to `BrowseView`**

In `ios/PADDictionary/PADDictionary/Views/BrowseView.swift`, add a `@State private var showingFilters = false` property to `BrowseView`, and add a new `ToolbarItem` (alongside the existing sort/direction ones) with a button that sets `showingFilters = true`. Use `"line.3.horizontal.decrease.circle"` for the inactive state and `"line.3.horizontal.decrease.circle.fill"` when `viewModel.filterState != FilterState()` (active-filter affordance). Attach `.sheet(isPresented: $showingFilters) { FilterView(viewModel: viewModel) }` to the view. Exact placement/order of toolbar items is your judgment — this is UI wiring, verify visually.

- [ ] **Step 2: Run the full test suite for real**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target. Run for real, paste the real output.

- [ ] **Step 3: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/BrowseView.swift
git commit -m "Wire FilterView into BrowseView with an active-filter toolbar button"
```

- [ ] **Step 4: Real visual verification**

Build, install, and run the app on a booted Simulator with real seeded data (same recipe used earlier in this project: copy `monsters-info/*.json` and `images/*` into the app's Documents container via `xcrun simctl get_app_container ... data`). Open the Filters sheet, select a couple of chips (e.g. one attribute, one rarity), tap Done, and screenshot the Browse grid to confirm it visibly narrowed. Also screenshot the Filters sheet itself with selections showing (to confirm the active/selected chip styling and the awakening count badge render correctly). Report both screenshots' contents in your summary — describe exactly what you see, don't just say "it works."

## Self-Review Notes

- **Spec coverage:** attribute (Task 3), type (Task 3), rarity (Task 3), awakening with count + incl-super (Task 4), can-assist (Task 4), AND composition with search/sort (Task 2), active-filter UI affordance (Task 5) — every spec requirement has a task.
- **Type consistency:** `FilterState`'s field names (`attr`, `types`, `rarities`, `awakenings`, `includeSuper`, `canAssistOnly`) are fixed in Task 1 and reused identically in Tasks 2-5.
- **No placeholders:** every step has literal Swift — the UI tasks (3-5) explicitly grant the implementer latitude on exact SwiftUI syntax (acknowledged as a deliberate scope choice, not a placeholder), but every code block is complete, runnable code, not a description of what to write.
