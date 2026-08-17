# Scheduled Sync + Local-Only Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the data refresh from a phone-triggered GitHub Actions run to a `schedule`-driven one, and simplify the phone's "Update Data" button to a plain download — removing the now-unused GitHub PAT / Keychain / Settings-token path entirely.

**Architecture:** `.github/workflows/update-data.yml` gains a `schedule: cron` trigger (keeping `workflow_dispatch` for manual re-runs). `GitHubSyncService`/`GitHubSyncing` shrink to just `downloadLatestData(to:)` (already fully unauthenticated for this public repo). `SyncViewModel.startSync()` becomes download → reload → mark-synced, with `.triggering`/`.running` states removed. `SettingsView` drops its "GitHub Access" section, keeping only the theme picker. `KeychainStore` and its call sites are deleted last, once nothing references it.

**Tech Stack:** Swift / SwiftUI, XCTest. Xcode project uses `PBXFileSystemSynchronizedRootGroup` — file adds/deletes under the target folder need no `.pbxproj` edits, but **deleting a `.swift` file must also be deleted from disk**, not just have its contents emptied.

## Global Constraints

- Platform: iOS SwiftUI app only. Do not touch the web viewer (`dict.js`/`dict.css`) — it never used the PAT.
- Repo `gcat332/pad-dictionary` is public; `raw.githubusercontent.com` file downloads and the `contents` API listing call both already work with zero `Authorization` header.
- `workflow_dispatch` stays on the workflow (manual re-run capability); only `triggerUpdate()`/`pollRunStatus()` — the phone-side callers of the *other* Actions API endpoints — go away.
- `SettingsView`'s "Appearance" section (theme picker, `@AppStorage("appTheme")`) is unrelated and must be left untouched.
- Commit after each task. Do not `git push` — pushing is a separate decision outside this plan.
- Test command (adjust simulator name if needed):
  ```
  xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:PADDictionaryTests/<TestClass> 2>&1 | tail -30
  ```
- Build command:
  ```
  xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -15
  ```

---

## File Structure

- **Modify** `.github/workflows/update-data.yml` — add `schedule: cron`.
- **Modify** `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` — remove `triggerUpdate`/`pollRunStatus`/`requireToken`/`GitHubSyncError.missingToken`/`.unauthorized`/`WorkflowConclusion`/`WorkflowRun`/`WorkflowRunsResponse`; drop the `keychain` param from `init`; `listSpriteFiles()` drops its optional auth header.
- **Modify** `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift` — remove trigger/poll/token test cases; update remaining `GitHubSyncService(...)` calls to the new init.
- **Modify** `ios/PADDictionary/PADDictionary/Views/SyncView.swift` — simplify `SyncState`, `SyncViewModel.startSync()`, and the button/status copy.
- **Modify** `ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift` — simplify `FakeGitHubSyncing` to the shrunk protocol; remove the missing-token test.
- **Modify** `ios/PADDictionary/PADDictionary/Views/SettingsView.swift` — remove the "GitHub Access" section and `SettingsViewModel`'s Keychain logic; keep the "Appearance" section.
- **Delete** `ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift`.
- **Delete** `ios/PADDictionary/PADDictionary/Services/KeychainStore.swift`.
- **Delete** `ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift`.

---

## Task 1: Add the `schedule` trigger to the GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/update-data.yml`

**Interfaces:** None — this task has no Swift-side dependents.

- [ ] **Step 1: Edit the `on:` block**

Current (`.github/workflows/update-data.yml:3-4`):
```yaml
on:
  workflow_dispatch: {}
```
Replace with:
```yaml
on:
  workflow_dispatch: {}
  schedule:
    - cron: '0 0 */2 * *'
```

- [ ] **Step 2: Validate the YAML parses correctly**

Run:
```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
python3 -c "
import yaml
doc = yaml.safe_load(open('.github/workflows/update-data.yml'))
assert 'schedule' in doc[True] or 'schedule' in doc.get('on', {}), doc
sched = doc.get(True, doc.get('on'))['schedule']
assert sched == [{'cron': '0 0 */2 * *'}], sched
print('schedule trigger present:', sched)
"
```
Expected: `schedule trigger present: [{'cron': '0 0 */2 * *'}]`
(Note: YAML 1.1 parses the bare key `on:` as the boolean `True`, not the string `"on"` — this is why the assertion checks both; it's a quirk of the `yaml` module, not a mistake in the workflow file itself.)

- [ ] **Step 3: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add .github/workflows/update-data.yml
git commit -m "Run update-data workflow on a ~2-day schedule, keep manual dispatch"
```

---

## Task 2: Shrink `GitHubSyncService`/`GitHubSyncing` to download-only

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`

**Interfaces:**
- Produces: `protocol GitHubSyncing { func downloadLatestData(to directory: URL) async throws }`; `final class GitHubSyncService: GitHubSyncing { init(session: URLSession = .shared) }`; `enum GitHubSyncError: Error, Equatable { case invalidResponse, unexpectedStatus(Int) }`.
- Consumed by: Task 3 (`SyncViewModel`/`SyncView`/`SyncViewModelTests`).

- [ ] **Step 1: Rewrite `GitHubSyncService.swift`**

Replace the full contents of `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` with:

```swift
import Foundation

protocol GitHubSyncing {
    func downloadLatestData(to directory: URL) async throws
}

enum GitHubSyncError: Error, Equatable {
    case invalidResponse
    case unexpectedStatus(Int)
}

private struct GitHubContentEntry: Codable {
    let name: String
}

final class GitHubSyncService: GitHubSyncing {
    let owner = "gcat332"
    let repo = "pad-dictionary"

    private let session: URLSession

    private static let dataFiles = [
        "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
        "monsters-info/skill_en.json", "monsters-info/skill_tr.json"
    ]
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]

    init(session: URLSession = .shared) {
        self.session = session
    }

    private func listSpriteFiles() async throws -> [String] {
        let request = URLRequest(url: URL(string: "https://api.github.com/repos/\(owner)/\(repo)/contents/images/cards_ja")!)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw GitHubSyncError.invalidResponse }
        let entries = try JSONDecoder().decode([GitHubContentEntry].self, from: data)
        return entries.map { "images/cards_ja/\($0.name)" }
    }

    private func downloadFile(remotePath: String, into directory: URL) async throws {
        let url = URL(string: "https://raw.githubusercontent.com/\(owner)/\(repo)/main/\(remotePath)")!
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { throw GitHubSyncError.invalidResponse }
        let dest = directory.appendingPathComponent(remotePath)
        try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: dest)
    }

    func downloadLatestData(to directory: URL) async throws {
        let spriteFiles = try await listSpriteFiles()
        let allPaths = Self.dataFiles + Self.fixedImageFiles + spriteFiles

        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        for path in allPaths {
            try await downloadFile(remotePath: path, into: tempDir)
        }

        for path in allPaths {
            let dest = directory.appendingPathComponent(path)
            try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: dest.path) {
                try FileManager.default.removeItem(at: dest)
            }
            try FileManager.default.moveItem(at: tempDir.appendingPathComponent(path), to: dest)
        }
    }
}
```

(This is the existing file with `triggerUpdate`, `pollRunStatus`, `requireToken`, `WorkflowConclusion`, `WorkflowRun`, `WorkflowRunsResponse`, `GitHubSyncError.missingToken`/`.unauthorized`, and the `keychain` property/param removed. `listSpriteFiles()` no longer attaches any `Authorization` header. `Accept: application/vnd.github+json` header was optional for this endpoint and is dropped for simplicity — the contents API returns JSON regardless.)

- [ ] **Step 2: Rewrite `GitHubSyncServiceTests.swift`**

Replace the full contents of `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift` with:

```swift
import XCTest
@testable import PADDictionary

final class GitHubSyncServiceTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testDownloadLatestDataWritesAllFilesIntoDirectory() async throws {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        MockURLProtocol.requestHandler = { request in
            let path = request.url!.path
            if path.hasSuffix("/contents/images/cards_ja") {
                let body = #"[{"name":"1.webp","download_url":"https://example.com/1.webp"}]"#.data(using: .utf8)!
                let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
                return (response, body)
            }
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, Data("stub-\(path)".utf8))
        }

        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        try await service.downloadLatestData(to: tempDir)

        let expectedPaths = [
            "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
            "monsters-info/skill_en.json", "monsters-info/skill_tr.json",
            "images/awoken.png", "images/icon-orbs.png", "images/icon-type.svg",
            "images/CARDFRAME2.png", "images/CARDFRAMEW.png",
            "images/cards_ja/1.webp"
        ]
        for path in expectedPaths {
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(path).path), "missing \(path)")
        }
    }

    func testDownloadLatestDataThrowsOnNon200() async {
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 404, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession())
        do {
            try await service.downloadLatestData(to: FileManager.default.temporaryDirectory)
            XCTFail("expected invalidResponse error")
        } catch GitHubSyncError.invalidResponse {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }
}
```

(Note: `expectedPaths` now includes `images/icon-orbs.png`, matching the existing `fixedImageFiles` list already in the current codebase — that file was added by an earlier, unrelated change and this rewrite must not regress it.)

- [ ] **Step 3: Run the tests**

```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/GitHubSyncServiceTests 2>&1 | tail -30
```
Expected: PASS (2 tests). This file no longer references `KeychainStore` at all, but `KeychainStore.swift` itself still exists at this point (deleted in Task 5) — the build must still succeed since nothing here breaks it.

- [ ] **Step 4: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift \
        ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift
git commit -m "GitHubSyncService: drop workflow trigger/poll and the PAT it required"
```

---

## Task 3: Simplify `SyncViewModel`/`SyncView` to download-only

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/SyncView.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift`

**Interfaces:**
- Consumes: `GitHubSyncing.downloadLatestData(to:)` (Task 2).
- Produces: `enum SyncState: Equatable { case idle, downloading, done, error(String) }`; `SyncViewModel.startSync() async`.

- [ ] **Step 1: Rewrite `SyncView.swift`**

Replace the full contents of `ios/PADDictionary/PADDictionary/Views/SyncView.swift` with:

```swift
import SwiftUI
import Combine

enum SyncState: Equatable {
    case idle
    case downloading
    case done
    case error(String)
}

@MainActor
final class SyncViewModel: ObservableObject {
    @Published private(set) var state: SyncState = .idle

    private let syncService: GitHubSyncing
    private let dataStore: DataStore
    private let documentsDirectory: URL

    init(syncService: GitHubSyncing, dataStore: DataStore, documentsDirectory: URL) {
        self.syncService = syncService
        self.dataStore = dataStore
        self.documentsDirectory = documentsDirectory
    }

    func startSync() async {
        state = .downloading
        do {
            try await syncService.downloadLatestData(to: documentsDirectory)
            dataStore.reload()
            dataStore.markSynced(at: Date())
            state = .done
        } catch {
            state = .error(error.localizedDescription)
        }
    }
}

struct SyncView: View {
    @ObservedObject var dataStore: DataStore
    @StateObject private var viewModel: SyncViewModel

    init(dataStore: DataStore, syncService: GitHubSyncing) {
        self.dataStore = dataStore
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        _viewModel = StateObject(wrappedValue: SyncViewModel(syncService: syncService, dataStore: dataStore, documentsDirectory: documentsDirectory))
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "arrow.triangle.2.circlepath.circle")
                .font(.system(size: 48))
                .foregroundStyle(.tint)

            if let lastSynced = dataStore.lastSyncedAt {
                Text("Last updated \(lastSynced.formatted(date: .abbreviated, time: .shortened))")
                    .foregroundStyle(Color.padDim)
            } else {
                Text("No data yet — tap Refresh to get started.")
                    .foregroundStyle(Color.padDim)
            }

            Text("\(dataStore.cards.count) cards cached")
                .font(.caption)
                .foregroundStyle(Color.padDim)

            statusView

            Button {
                Task { await viewModel.startSync() }
            } label: {
                Label("Refresh", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isBusy)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.padBackground)
        .navigationTitle("Sync")
    }

    private var isBusy: Bool {
        viewModel.state == .downloading
    }

    @ViewBuilder
    private var statusView: some View {
        switch viewModel.state {
        case .idle, .done:
            EmptyView()
        case .downloading:
            ProgressView("Downloading latest data…")
        case .error(let message):
            Text(message)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)
        }
    }
}
```

(Data source is now whatever the scheduled workflow last produced, so the copy no longer implies the button itself updates anything upstream — "Refresh" / "Downloading latest data…" instead of "Update Data" / "Starting update on GitHub…" / "Update running on GitHub…".)

- [ ] **Step 2: Rewrite `SyncViewModelTests.swift`**

Replace the full contents of `ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift` with:

```swift
import XCTest
@testable import PADDictionary

private final class FakeGitHubSyncing: GitHubSyncing {
    var downloadError: Error?
    private(set) var downloadedTo: URL?

    func downloadLatestData(to directory: URL) async throws {
        if let downloadError { throw downloadError }
        downloadedTo = directory
    }
}

final class SyncViewModelTests: XCTestCase {
    private var tempDir: URL!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    @MainActor
    func testSuccessfulSyncEndsInDoneAndMarksDataStoreSynced() async {
        let fake = FakeGitHubSyncing()
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .done)
        XCTAssertNotNil(dataStore.lastSyncedAt)
        XCTAssertEqual(fake.downloadedTo, tempDir)
    }

    @MainActor
    func testDownloadFailureSurfacesReadableError() async {
        let fake = FakeGitHubSyncing()
        struct StubError: LocalizedError { var errorDescription: String? { "network unreachable" } }
        fake.downloadError = StubError()
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .error("network unreachable"))
    }
}
```

- [ ] **Step 3: Run the tests**

```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:PADDictionaryTests/SyncViewModelTests 2>&1 | tail -30
```
Expected: PASS (2 tests).

- [ ] **Step 4: Build the whole app target to catch any other caller of the removed `SyncState` cases**

```
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -15
```
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add ios/PADDictionary/PADDictionary/Views/SyncView.swift \
        ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift
git commit -m "Sync button now just downloads + reloads; drop trigger/poll UI states"
```

---

## Task 4: Remove the GitHub Access section from Settings

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Views/SettingsView.swift`
- Delete: `ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift`

**Interfaces:** None — `SettingsView`/`SettingsViewModel` have no other consumers besides `ContentView.swift`'s `SettingsView()` call, which is unaffected (same zero-arg usage).

- [ ] **Step 1: Rewrite `SettingsView.swift`**

Replace the full contents of `ios/PADDictionary/PADDictionary/Views/SettingsView.swift` with:

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("appTheme") private var appTheme: AppTheme = .system

    var body: some View {
        Form {
            Section {
                Picker("Theme", selection: $appTheme) {
                    ForEach(AppTheme.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
            } header: {
                Text("Appearance")
            }
            .listRowBackground(Color.padPanel)
        }
        .scrollContentBackground(.hidden)
        .background(Color.padBackground)
        .navigationTitle("Settings")
    }
}
```

(`SettingsViewModel` is deleted entirely along with the `Combine` import it needed — `SettingsView` no longer needs a view model at all, just the `@AppStorage` theme binding it already had.)

- [ ] **Step 2: Delete the now-obsolete test file**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
rm ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift
```

- [ ] **Step 3: Build to verify nothing else referenced `SettingsViewModel`**

```
xcodebuild build -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -15
```
Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git add ios/PADDictionary/PADDictionary/Views/SettingsView.swift
git rm ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift
git commit -m "Settings: drop the GitHub PAT entry UI, keep only the theme picker"
```

---

## Task 5: Delete `KeychainStore`

**Files:**
- Delete: `ios/PADDictionary/PADDictionary/Services/KeychainStore.swift`
- Delete: `ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift`

**Interfaces:** None — by this point (after Tasks 2 and 4), nothing in the app or test target references `KeychainStore`.

- [ ] **Step 1: Confirm nothing still references `KeychainStore`**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
grep -rn "KeychainStore" ios/PADDictionary --include="*.swift"
```
Expected: only the two files' own declarations show up (i.e. the output is exactly `Services/KeychainStore.swift:4:struct KeychainStore {` and the matches inside `KeychainStoreTests.swift`) — no references from `GitHubSyncService.swift`, `SettingsView.swift`, `GitHubSyncServiceTests.swift`, or `SettingsViewModelTests.swift` (the last one was already deleted in Task 4). If anything else shows up, stop and re-check Tasks 2/4 before proceeding.

- [ ] **Step 2: Delete both files**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git rm ios/PADDictionary/PADDictionary/Services/KeychainStore.swift \
       ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift
```

- [ ] **Step 3: Build and run the full test suite to confirm nothing broke**

```
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' 2>&1 | tail -40
```
Expected: `** TEST SUCCEEDED **`, no failures.

- [ ] **Step 4: Commit**

```bash
cd /Users/gcat332/Library/CloudStorage/OneDrive-Personal/Documents/Personal/Code/pad
git commit -m "Delete KeychainStore — no longer used now that sync needs no token"
```

---

## Self-Review

**Spec coverage:**
- `schedule` cron trigger on `update-data.yml`, `workflow_dispatch` kept → Task 1. ✓
- `GitHubSyncing`/`GitHubSyncService` shrunk to `downloadLatestData` only, no auth header → Task 2. ✓
- `SyncViewModel.startSync()` = download → reload → markSynced; `.triggering`/`.running` removed; button copy → "Refresh" → Task 3. ✓
- Settings keeps "Appearance", drops "GitHub Access" → Task 4. ✓
- `KeychainStore` + its test deleted once unreferenced → Task 5. ✓
- Error handling: temp-dir-then-move-on-success behavior in `downloadLatestData` is unchanged (not touched by this plan) → still holds. ✓
- No web viewer changes anywhere in this plan → confirmed, no task touches `dict.js`/`dict.css`. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full file contents or exact diffs.

**Type consistency:** `GitHubSyncing.downloadLatestData(to:)`, `GitHubSyncService.init(session:)`, `SyncState.{idle,downloading,done,error}`, `SyncViewModel.startSync()` — names match identically across Tasks 2 and 3. `FakeGitHubSyncing` in Task 3's test file conforms to the shrunk protocol from Task 2. Task 5's grep check catches any signature drift the earlier tasks might have missed before the file is actually deleted.
