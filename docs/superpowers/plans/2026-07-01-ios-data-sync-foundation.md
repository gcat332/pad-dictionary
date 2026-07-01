# iOS Data & Sync Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution role override:** every implementation step (writing/editing code, running builds/tests) is done by dispatching to the `codex:codex-rescue` agent with `--model gpt-5.5 --write`, not by a Claude subagent. Claude's role is SA/BA: hand Codex one task at a time (its Files/Interfaces/Steps block verbatim), then review the resulting diff and test output against this plan's acceptance criteria before moving on. If a Codex attempt doesn't meet the task's steps, send it back with specific corrections rather than fixing it directly.

**Goal:** Get PAD card/skill data (and sprites) onto a native iOS app, cached locally so it works offline, with an in-app "Update Data" action that refreshes from the source repo without an App Store release.

**Architecture:** A SwiftUI app with `Codable` models mirroring the same JSON the web app uses, a `GitHubSyncService` that (1) triggers a `workflow_dispatch` GitHub Actions run of the existing `update-data.sh`, (2) polls until it completes, (3) downloads the refreshed JSON + sprites over plain HTTPS into the app's `Documents/` cache. A `DataStore` loads that cache into memory; `SettingsView`/`SyncView` provide the PAT entry and the sync trigger UI.

**Tech Stack:** Swift 6, SwiftUI, `XCTest`, `Security` framework (Keychain) — no third-party dependencies.

## Global Constraints

- iOS deployment target: iOS 17.0 (enables `NavigationStack`, structured concurrency `async`/`await`, modern `URLSession` async APIs).
- No third-party dependencies (no CocoaPods/SPM packages) — everything uses Apple frameworks already on the device.
- Repo: `gcat332/pad-dictionary`, default branch `main`. GitHub Actions workflow file name: `update-data.yml`.
- Every non-trivial type/function name introduced in one task must be reused with the exact same spelling in later tasks (see each task's **Interfaces** block).
- UI must be genuinely usable, not a wireframe: standard iOS spacing/layout, `NavigationStack`, SF Symbols, visible feedback for every state — not just static text.
- Implementation is done by Codex (`gpt-5.5`) per the execution role override above; Claude reviews, does not hand-edit Codex's output except to request a redo.
- Every file that declares an `ObservableObject`/`@Published` type must explicitly `import Combine`, even if it also imports `SwiftUI` or `Foundation` — on this toolchain neither transitively re-exports it, confirmed by two real (non-sandbox) build failures during Tasks 7 and 8.

---

## Task 1: Scaffold the Xcode project (manual — human step, not Codex)

Xcode's "New Project" wizard has no CLI equivalent; this one task must be done by the user directly in Xcode, not by Codex or Claude.

**Files:**
- Create: `ios/PADDictionary/PADDictionary.xcodeproj` (and its default template files, via Xcode)

- [ ] **Step 1: Point Xcode's command-line tools at the full Xcode install**

The active developer directory is currently the standalone Command Line Tools, which can't build iOS targets. Run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

- [ ] **Step 2: Create the project via Xcode's GUI**

Open Xcode → File → New → Project → iOS → **App**. Fill in:
- Product Name: `PADDictionary`
- Team: your personal Apple ID team (no paid Developer Program needed for Simulator/local device runs)
- Organization Identifier: `com.gcat332` (or your preference — note it, later tasks assume `com.gcat332.PADDictionary`)
- Interface: **SwiftUI**
- Language: **Swift**
- Storage: **None** (uncheck Core Data / SwiftData / Tests-included checkbox — we add the test target manually next if not offered)
- Include Tests: checked

Save it at `<repo-root>/ios/` — Xcode will create `ios/PADDictionary/` containing `PADDictionary.xcodeproj`, a `PADDictionary/` sources folder, and a `PADDictionaryTests/` folder.

In the project's target settings (General tab), set **Minimum Deployments → iOS 17.0**.

- [ ] **Step 3: Verify the scaffold**

Run:

```bash
cd ios/PADDictionary && xcodebuild -list -project PADDictionary.xcodeproj
```

Expected output includes a `PADDictionary` scheme and a `PADDictionaryTests` target. Then run the default template's test to confirm the toolchain works end-to-end:

```bash
xcodebuild test -project PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` (adjust the simulator name to whatever `xcrun simctl list devices available` shows on this machine if `iPhone 17` isn't present).

- [ ] **Step 4: Commit**

```bash
git add ios/
git commit -m "Scaffold PADDictionary iOS app via Xcode"
```

---

## Task 2: `Card`/`Skill` models decoded from fixtures (TDD)

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Models/Card.swift`
- Create: `ios/PADDictionary/PADDictionary/Models/Skill.swift`
- Create: `ios/PADDictionary/PADDictionaryTests/Fixtures/mon_ja_sample.json`
- Create: `ios/PADDictionary/PADDictionaryTests/Fixtures/skill_ja_sample.json`
- Create: `ios/PADDictionary/PADDictionaryTests/Fixtures/skill_en_sample.json`
- Create: `ios/PADDictionary/PADDictionaryTests/Fixtures/skill_tr_sample.json`
- Test: `ios/PADDictionary/PADDictionaryTests/DataDecodingTests.swift`

**Interfaces:**
- Produces: `struct StatRange: Codable, Equatable { let min: Int; let max: Int; let scale: Double }`
- Produces: `struct LocalizedNames: Codable, Equatable { let en: String?; let cht: String?; let chs: String?; let ko: String? }`
- Produces: `struct Card: Codable, Identifiable, Equatable` with fields `id: Int, name: String, otLangName: LocalizedNames?, attrs: [Int], types: [Int], rarity: Int, cost: Int, maxLevel: Int, isEmpty: Bool, enabled: Bool, hp: StatRange, atk: StatRange, rcv: StatRange, activeSkillId: Int, leaderSkillId: Int, evoRootId: Int, awakenings: [Int], superAwakenings: [Int], canAssist: Bool` and computed `var displayName: String`
- Produces: `struct Skill: Codable, Identifiable, Equatable` with fields `id: Int, name: String, description: String, type: Int, maxLevel: Int, initialCooldown: Int, params: [Int]`
- These fixture files and their exact field values are consumed by this task's test only — no other task reads them.

- [ ] **Step 1: Add the fixture files**

Add all four files under `ios/PADDictionary/PADDictionaryTests/Fixtures/` in Xcode (drag into the `PADDictionaryTests` group, target membership: `PADDictionaryTests` only). Contents:

`mon_ja_sample.json`:
```json
[
  {
    "id": 0,
    "name": "????",
    "attrs": [0],
    "types": [1],
    "rarity": 1,
    "cost": 1,
    "maxLevel": 1,
    "isEmpty": true,
    "enabled": false,
    "hp": { "min": 1, "max": 1, "scale": 1 },
    "atk": { "min": 1, "max": 1, "scale": 1 },
    "rcv": { "min": 1, "max": 1, "scale": 1 },
    "activeSkillId": 0,
    "leaderSkillId": 0,
    "evoRootId": 0,
    "awakenings": [],
    "superAwakenings": [],
    "canAssist": false
  },
  {
    "id": 1,
    "name": "ティラ",
    "attrs": [0],
    "types": [4],
    "rarity": 2,
    "cost": 2,
    "maxLevel": 5,
    "isEmpty": false,
    "enabled": true,
    "hp": { "min": 52, "max": 144, "scale": 1 },
    "atk": { "min": 57, "max": 71, "scale": 1 },
    "rcv": { "min": 8, "max": 13, "scale": 1 },
    "activeSkillId": 1,
    "leaderSkillId": 51,
    "evoRootId": 1929,
    "awakenings": [21, 21],
    "superAwakenings": [],
    "canAssist": false,
    "otLangName": { "cht": "提拉", "chs": "提拉", "en": "Tyrra", "ko": "티라" }
  }
]
```

`skill_ja_sample.json`:
```json
[
  { "id": 0, "name": "無し", "description": "", "type": 0, "maxLevel": 0, "initialCooldown": 0, "params": [] },
  { "id": 1, "name": "ヒートブレス", "description": "敵全体に攻撃力×10倍の火属性攻撃。", "type": 0, "maxLevel": 6, "initialCooldown": 8, "params": [0, 1000] }
]
```

`skill_en_sample.json`:
```json
[
  { "id": 0, "name": "None", "description": "", "type": 0, "maxLevel": 0, "initialCooldown": 0, "params": [] },
  { "id": 1, "name": "Heat Breath", "description": "Inflicts 10x ATK Fire Mass Attack", "type": 0, "maxLevel": 6, "initialCooldown": 8, "params": [0, 1000] }
]
```

`skill_tr_sample.json`:
```json
{
  "61847": "[Lock] is released and the board changes to [Darkness] and [Recovery]."
}
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/DataDecodingTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class DataDecodingTests: XCTestCase {
    private func loadFixture(_ name: String) -> Data {
        let url = Bundle(for: Self.self).url(forResource: name, withExtension: "json")!
        return try! Data(contentsOf: url)
    }

    func testDecodesCardsFromFixture() throws {
        let cards = try JSONDecoder().decode([Card].self, from: loadFixture("mon_ja_sample"))
        XCTAssertEqual(cards.count, 2)
        XCTAssertEqual(cards[0].id, 0)
        XCTAssertTrue(cards[0].isEmpty)
        XCTAssertNil(cards[0].otLangName)

        let tyrra = cards[1]
        XCTAssertEqual(tyrra.id, 1)
        XCTAssertEqual(tyrra.displayName, "Tyrra")
        XCTAssertEqual(tyrra.hp, StatRange(min: 52, max: 144, scale: 1))
        XCTAssertEqual(tyrra.awakenings, [21, 21])
    }

    func testDecodesSkillsFromFixture() throws {
        let skillsJA = try JSONDecoder().decode([Skill].self, from: loadFixture("skill_ja_sample"))
        let skillsEN = try JSONDecoder().decode([Skill].self, from: loadFixture("skill_en_sample"))
        XCTAssertEqual(skillsJA[1].id, 1)
        XCTAssertEqual(skillsJA[1].params, [0, 1000])
        XCTAssertEqual(skillsEN[1].name, "Heat Breath")
    }

    func testDecodesTranslationsFromFixture() throws {
        let translations = try JSONDecoder().decode([String: String].self, from: loadFixture("skill_tr_sample"))
        XCTAssertEqual(translations["61847"], "[Lock] is released and the board changes to [Darkness] and [Recovery].")
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/DataDecodingTests
```

Expected: build failure — `Card`/`Skill`/`StatRange` are not defined yet.

- [ ] **Step 4: Implement the models**

Create `ios/PADDictionary/PADDictionary/Models/Card.swift`:

```swift
import Foundation

struct StatRange: Codable, Equatable {
    let min: Int
    let max: Int
    let scale: Double
}

struct LocalizedNames: Codable, Equatable {
    let en: String?
    let cht: String?
    let chs: String?
    let ko: String?
}

struct Card: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let otLangName: LocalizedNames?
    let attrs: [Int]
    let types: [Int]
    let rarity: Int
    let cost: Int
    let maxLevel: Int
    let isEmpty: Bool
    let enabled: Bool
    let hp: StatRange
    let atk: StatRange
    let rcv: StatRange
    let activeSkillId: Int
    let leaderSkillId: Int
    let evoRootId: Int
    let awakenings: [Int]
    let superAwakenings: [Int]
    let canAssist: Bool

    var displayName: String { otLangName?.en ?? name }
}
```

Create `ios/PADDictionary/PADDictionary/Models/Skill.swift`:

```swift
import Foundation

struct Skill: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let description: String
    let type: Int
    let maxLevel: Int
    let initialCooldown: Int
    let params: [Int]
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/DataDecodingTests
```

Expected: `** TEST SUCCEEDED **`

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Models ios/PADDictionary/PADDictionaryTests
git commit -m "Add Card/Skill Codable models with fixture-backed decoding tests"
```

---

## Task 3: `KeychainStore`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Services/KeychainStore.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `struct KeychainStore { func save(token: String); func read() -> String?; func delete() }` — consumed by `GitHubSyncService` (Task 4+) and `SettingsView` (Task 8).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class KeychainStoreTests: XCTestCase {
    func testSaveReadDeleteRoundTrip() {
        let store = KeychainStore()
        store.delete()
        XCTAssertNil(store.read())

        store.save(token: "ghp_test123")
        XCTAssertEqual(store.read(), "ghp_test123")

        store.save(token: "ghp_replaced")
        XCTAssertEqual(store.read(), "ghp_replaced")

        store.delete()
        XCTAssertNil(store.read())
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/KeychainStoreTests
```

Expected: build failure — `KeychainStore` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Services/KeychainStore.swift`:

```swift
import Foundation
import Security

struct KeychainStore {
    private let service = "com.gcat332.PADDictionary.githubToken"
    private let account = "githubPAT"

    func save(token: String) {
        delete()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: Data(token.utf8)
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **`

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Services/KeychainStore.swift ios/PADDictionary/PADDictionaryTests/KeychainStoreTests.swift
git commit -m "Add KeychainStore for the GitHub PAT"
```

---

## Task 4: `GitHubSyncService.triggerUpdate()`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`
- Create: `ios/PADDictionary/PADDictionaryTests/MockURLProtocol.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`

**Interfaces:**
- Consumes: `KeychainStore` (Task 3) — `read() -> String?`.
- Produces: `enum GitHubSyncError: Error, Equatable { case missingToken, unauthorized, invalidResponse, unexpectedStatus(Int), timedOut }`
- Produces: `final class GitHubSyncService { init(session: URLSession = .shared, keychain: KeychainStore = KeychainStore()); func triggerUpdate() async throws }` — `session`/`keychain` consumed by Tasks 5–6 which add methods to this same class; `MockURLProtocol` (test-only) consumed by Tasks 5–6's tests too.

- [ ] **Step 1: Add the shared test helper**

Create `ios/PADDictionary/PADDictionaryTests/MockURLProtocol.swift`:

```swift
import Foundation

final class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    static func makeSession() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        return URLSession(configuration: config)
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class GitHubSyncServiceTests: XCTestCase {
    private let keychain = KeychainStore()

    override func tearDown() {
        keychain.delete()
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testTriggerUpdateSucceedsOn204() async throws {
        keychain.save(token: "ghp_test")
        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertTrue(request.url!.path.hasSuffix("/actions/workflows/update-data.yml/dispatches"))
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer ghp_test")
            let response = HTTPURLResponse(url: request.url!, statusCode: 204, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        try await service.triggerUpdate()
    }

    func testTriggerUpdateThrowsMissingTokenWhenNoneSaved() async {
        keychain.delete()
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            try await service.triggerUpdate()
            XCTFail("expected missingToken error")
        } catch GitHubSyncError.missingToken {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }

    func testTriggerUpdateThrowsUnauthorizedOn401() async {
        keychain.save(token: "ghp_bad")
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(url: request.url!, statusCode: 401, httpVersion: nil, headerFields: nil)!
            return (response, Data())
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            try await service.triggerUpdate()
            XCTFail("expected unauthorized error")
        } catch GitHubSyncError.unauthorized {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/GitHubSyncServiceTests
```

Expected: build failure — `GitHubSyncService`/`GitHubSyncError` not defined.

- [ ] **Step 4: Implement**

Create `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`:

```swift
import Foundation

enum GitHubSyncError: Error, Equatable {
    case missingToken
    case unauthorized
    case invalidResponse
    case unexpectedStatus(Int)
    case timedOut
}

final class GitHubSyncService {
    let owner = "gcat332"
    let repo = "pad-dictionary"
    let workflowFile = "update-data.yml"

    private let session: URLSession
    private let keychain: KeychainStore

    init(session: URLSession = .shared, keychain: KeychainStore = KeychainStore()) {
        self.session = session
        self.keychain = keychain
    }

    private func requireToken() throws -> String {
        guard let token = keychain.read(), !token.isEmpty else {
            throw GitHubSyncError.missingToken
        }
        return token
    }

    func triggerUpdate() async throws {
        let token = try requireToken()
        let url = URL(string: "https://api.github.com/repos/\(owner)/\(repo)/actions/workflows/\(workflowFile)/dispatches")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["ref": "main"])

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
        if http.statusCode == 401 { throw GitHubSyncError.unauthorized }
        guard http.statusCode == 204 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Same command as Step 3. Expected: `** TEST SUCCEEDED **` for all three tests.

- [ ] **Step 6: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift ios/PADDictionary/PADDictionaryTests/MockURLProtocol.swift ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift
git commit -m "Add GitHubSyncService.triggerUpdate() with mocked-network tests"
```

---

## Task 5: `GitHubSyncService.pollRunStatus()`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`

**Interfaces:**
- Consumes: `MockURLProtocol` (Task 4), `GitHubSyncError` (Task 4).
- Produces: `enum WorkflowConclusion: String, Codable, Equatable { case success, failure, cancelled, skipped, neutral, stale, timedOut = "timed_out", actionRequired = "action_required" }` and `func pollRunStatus(pollIntervalNanoseconds: UInt64 = 5_000_000_000, maxAttempts: Int = 60) async throws -> WorkflowConclusion` on `GitHubSyncService` — consumed by `SyncViewModel` (Task 9).

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift` (inside the existing `final class GitHubSyncServiceTests`):

```swift
    func testPollRunStatusWaitsThenReturnsConclusion() async throws {
        keychain.save(token: "ghp_test")
        var callCount = 0
        MockURLProtocol.requestHandler = { request in
            callCount += 1
            XCTAssertTrue(request.url!.path.hasSuffix("/actions/workflows/update-data.yml/runs"))
            let status = callCount == 1 ? "in_progress" : "completed"
            let conclusion = callCount == 1 ? "null" : "\"success\""
            let body = """
            {"workflow_runs":[{"id":1,"status":"\(status)","conclusion":\(conclusion),"created_at":"2026-07-01T00:00:00Z"}]}
            """.data(using: .utf8)!
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, body)
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        let conclusion = try await service.pollRunStatus(pollIntervalNanoseconds: 1_000_000, maxAttempts: 5)
        XCTAssertEqual(conclusion, .success)
        XCTAssertEqual(callCount, 2)
    }

    func testPollRunStatusTimesOutIfNeverCompleted() async {
        keychain.save(token: "ghp_test")
        MockURLProtocol.requestHandler = { request in
            let body = """
            {"workflow_runs":[{"id":1,"status":"in_progress","conclusion":null,"created_at":"2026-07-01T00:00:00Z"}]}
            """.data(using: .utf8)!
            let response = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
            return (response, body)
        }
        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        do {
            _ = try await service.pollRunStatus(pollIntervalNanoseconds: 1_000_000, maxAttempts: 3)
            XCTFail("expected timedOut error")
        } catch GitHubSyncError.timedOut {
            // expected
        } catch {
            XCTFail("unexpected error: \(error)")
        }
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/GitHubSyncServiceTests
```

Expected: build failure — `pollRunStatus`/`WorkflowConclusion` not defined.

- [ ] **Step 3: Implement**

Add to `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` (above the `final class GitHubSyncService` declaration):

```swift
enum WorkflowConclusion: String, Codable, Equatable {
    case success, failure, cancelled, skipped, neutral, stale
    case timedOut = "timed_out"
    case actionRequired = "action_required"
}

private struct WorkflowRun: Codable {
    let id: Int
    let status: String
    let conclusion: WorkflowConclusion?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, status, conclusion
        case createdAt = "created_at"
    }
}

private struct WorkflowRunsResponse: Codable {
    let workflowRuns: [WorkflowRun]

    enum CodingKeys: String, CodingKey {
        case workflowRuns = "workflow_runs"
    }
}
```

Add inside `final class GitHubSyncService`:

```swift
    func pollRunStatus(pollIntervalNanoseconds: UInt64 = 5_000_000_000, maxAttempts: Int = 60) async throws -> WorkflowConclusion {
        let token = try requireToken()
        let url = URL(string: "https://api.github.com/repos/\(owner)/\(repo)/actions/workflows/\(workflowFile)/runs?per_page=1")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")

        for _ in 0..<maxAttempts {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw GitHubSyncError.invalidResponse }
            if http.statusCode == 401 { throw GitHubSyncError.unauthorized }
            guard http.statusCode == 200 else { throw GitHubSyncError.unexpectedStatus(http.statusCode) }
            let decoded = try JSONDecoder().decode(WorkflowRunsResponse.self, from: data)
            if let run = decoded.workflowRuns.first, run.status == "completed" {
                return run.conclusion ?? .neutral
            }
            try await Task.sleep(nanoseconds: pollIntervalNanoseconds)
        }
        throw GitHubSyncError.timedOut
    }
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift
git commit -m "Add GitHubSyncService.pollRunStatus()"
```

---

## Task 6: `GitHubSyncService.downloadLatestData()`

**Files:**
- Modify: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift`
- Modify: `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`

**Interfaces:**
- Consumes: `MockURLProtocol` (Task 4).
- Produces: `func downloadLatestData(to directory: URL) async throws` on `GitHubSyncService` — consumed by `SyncViewModel` (Task 9). Writes these repo-relative paths under `directory`: `monsters-info/mon_ja.json`, `monsters-info/skill_ja.json`, `monsters-info/skill_en.json`, `monsters-info/skill_tr.json`, `images/awoken.png`, `images/icon-type.svg`, `images/CARDFRAME2.png`, `images/CARDFRAMEW.png`, and one file per entry under `images/cards_ja/`.

- [ ] **Step 1: Write the failing test**

Append to `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`:

```swift
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

        let service = GitHubSyncService(session: MockURLProtocol.makeSession(), keychain: keychain)
        try await service.downloadLatestData(to: tempDir)

        let expectedPaths = [
            "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
            "monsters-info/skill_en.json", "monsters-info/skill_tr.json",
            "images/awoken.png", "images/icon-type.svg",
            "images/CARDFRAME2.png", "images/CARDFRAMEW.png",
            "images/cards_ja/1.webp"
        ]
        for path in expectedPaths {
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.appendingPathComponent(path).path), "missing \(path)")
        }
    }
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/GitHubSyncServiceTests
```

Expected: build failure — `downloadLatestData` not defined.

- [ ] **Step 3: Implement**

Add to `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` (file-level, alongside the other private structs):

```swift
private struct GitHubContentEntry: Codable {
    let name: String
}
```

Add inside `final class GitHubSyncService`:

```swift
    private static let dataFiles = [
        "monsters-info/mon_ja.json", "monsters-info/skill_ja.json",
        "monsters-info/skill_en.json", "monsters-info/skill_tr.json"
    ]
    private static let fixedImageFiles = [
        "images/awoken.png", "images/icon-type.svg",
        "images/CARDFRAME2.png", "images/CARDFRAMEW.png"
    ]

    private func listSpriteFiles() async throws -> [String] {
        var request = URLRequest(url: URL(string: "https://api.github.com/repos/\(owner)/\(repo)/contents/images/cards_ja")!)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        if let token = try? requireToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
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
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift
git commit -m "Add GitHubSyncService.downloadLatestData()"
```

---

## Task 7: `DataStore`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/DataStore.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/DataStoreTests.swift`

**Interfaces:**
- Consumes: `Card`, `Skill` (Task 2).
- Produces: `@MainActor final class DataStore: ObservableObject { @Published private(set) var cards: [Card]; @Published private(set) var skillsJA: [Skill]; @Published private(set) var skillsEN: [Skill]; @Published private(set) var skillTranslations: [String: String]; @Published private(set) var lastSyncedAt: Date?; init(documentsDirectory: URL, userDefaults: UserDefaults = .standard); func reload(); func markSynced(at date: Date) }` — consumed by `SyncViewModel` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/DataStoreTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class DataStoreTests: XCTestCase {
    private var tempDir: URL!
    private var defaults: UserDefaults!

    override func setUp() {
        super.setUp()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try! FileManager.default.createDirectory(at: tempDir.appendingPathComponent("monsters-info"), withIntermediateDirectories: true)
        defaults = UserDefaults(suiteName: "DataStoreTests-\(UUID().uuidString)")
    }

    override func tearDown() {
        try? FileManager.default.removeItem(at: tempDir)
        super.tearDown()
    }

    @MainActor
    func testReloadIsEmptyWhenNoCacheExists() {
        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertTrue(store.cards.isEmpty)
        XCTAssertNil(store.lastSyncedAt)
    }

    @MainActor
    func testReloadDecodesCachedFiles() throws {
        let cardJSON = #"[{"id":1,"name":"Tyrra","attrs":[0],"types":[4],"rarity":2,"cost":2,"maxLevel":5,"isEmpty":false,"enabled":true,"hp":{"min":52,"max":144,"scale":1},"atk":{"min":57,"max":71,"scale":1},"rcv":{"min":8,"max":13,"scale":1},"activeSkillId":1,"leaderSkillId":51,"evoRootId":1929,"awakenings":[21,21],"superAwakenings":[],"canAssist":false}]"#
        try Data(cardJSON.utf8).write(to: tempDir.appendingPathComponent("monsters-info/mon_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_ja.json"))
        try Data("[]".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_en.json"))
        try Data("{}".utf8).write(to: tempDir.appendingPathComponent("monsters-info/skill_tr.json"))

        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertEqual(store.cards.count, 1)
        XCTAssertEqual(store.cards[0].name, "Tyrra")
    }

    @MainActor
    func testMarkSyncedPersistsAcrossInstances() {
        let store = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        store.markSynced(at: date)
        XCTAssertEqual(store.lastSyncedAt, date)

        let reloaded = DataStore(documentsDirectory: tempDir, userDefaults: defaults)
        XCTAssertEqual(reloaded.lastSyncedAt, date)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/DataStoreTests
```

Expected: build failure — `DataStore` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/DataStore.swift`:

```swift
import Foundation

@MainActor
final class DataStore: ObservableObject {
    @Published private(set) var cards: [Card] = []
    @Published private(set) var skillsJA: [Skill] = []
    @Published private(set) var skillsEN: [Skill] = []
    @Published private(set) var skillTranslations: [String: String] = [:]
    @Published private(set) var lastSyncedAt: Date?

    private let documentsDirectory: URL
    private let userDefaults: UserDefaults
    private let lastSyncedKey = "lastSyncedAt"

    init(documentsDirectory: URL, userDefaults: UserDefaults = .standard) {
        self.documentsDirectory = documentsDirectory
        self.userDefaults = userDefaults
        if let stored = userDefaults.object(forKey: lastSyncedKey) as? Date {
            lastSyncedAt = stored
        }
        reload()
    }

    func reload() {
        let decoder = JSONDecoder()
        func load<T: Decodable>(_ relativePath: String, as type: T.Type) -> T? {
            guard let data = try? Data(contentsOf: documentsDirectory.appendingPathComponent(relativePath)) else { return nil }
            return try? decoder.decode(type, from: data)
        }
        cards = load("monsters-info/mon_ja.json", as: [Card].self) ?? []
        skillsJA = load("monsters-info/skill_ja.json", as: [Skill].self) ?? []
        skillsEN = load("monsters-info/skill_en.json", as: [Skill].self) ?? []
        skillTranslations = load("monsters-info/skill_tr.json", as: [String: String].self) ?? [:]
    }

    func markSynced(at date: Date) {
        lastSyncedAt = date
        userDefaults.set(date, forKey: lastSyncedKey)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/DataStore.swift ios/PADDictionary/PADDictionaryTests/DataStoreTests.swift
git commit -m "Add DataStore loading cached card/skill JSON from Documents"
```

---

## Task 8: `SettingsView`

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Views/SettingsView.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift`

**Interfaces:**
- Consumes: `KeychainStore` (Task 3).
- Produces: `@MainActor final class SettingsViewModel: ObservableObject { @Published var tokenInput: String; @Published private(set) var isSaved: Bool; init(keychain: KeychainStore = KeychainStore()); func save(); func clear() }` and `struct SettingsView: View` (wraps `SettingsViewModel`) — `SettingsView` consumed by the app's root navigation (Task 9's `ContentView` wiring).

- [ ] **Step 1: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift`:

```swift
import XCTest
@testable import PADDictionary

final class SettingsViewModelTests: XCTestCase {
    private let keychain = KeychainStore()

    override func tearDown() {
        keychain.delete()
        super.tearDown()
    }

    @MainActor
    func testSaveStoresTokenInKeychain() {
        let viewModel = SettingsViewModel(keychain: keychain)
        viewModel.tokenInput = "ghp_abc"
        viewModel.save()
        XCTAssertTrue(viewModel.isSaved)
        XCTAssertEqual(keychain.read(), "ghp_abc")
    }

    @MainActor
    func testClearRemovesTokenFromKeychain() {
        keychain.save(token: "ghp_abc")
        let viewModel = SettingsViewModel(keychain: keychain)
        XCTAssertTrue(viewModel.isSaved)
        viewModel.clear()
        XCTAssertFalse(viewModel.isSaved)
        XCTAssertNil(keychain.read())
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SettingsViewModelTests
```

Expected: build failure — `SettingsViewModel` not defined.

- [ ] **Step 3: Implement**

Create `ios/PADDictionary/PADDictionary/Views/SettingsView.swift`:

```swift
import SwiftUI

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var tokenInput: String = ""
    @Published private(set) var isSaved: Bool

    private let keychain: KeychainStore

    init(keychain: KeychainStore = KeychainStore()) {
        self.keychain = keychain
        self.isSaved = keychain.read() != nil
    }

    func save() {
        guard !tokenInput.isEmpty else { return }
        keychain.save(token: tokenInput)
        tokenInput = ""
        isSaved = true
    }

    func clear() {
        keychain.delete()
        isSaved = false
    }
}

struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()

    var body: some View {
        Form {
            Section {
                SecureField("GitHub personal access token", text: $viewModel.tokenInput)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Save Token") { viewModel.save() }
                    .disabled(viewModel.tokenInput.isEmpty)
            } header: {
                Text("GitHub Access")
            } footer: {
                Text(viewModel.isSaved ? "A token is saved in Keychain." : "No token saved yet.")
            }

            if viewModel.isSaved {
                Section {
                    Button("Remove Saved Token", role: .destructive) { viewModel.clear() }
                }
            }
        }
        .navigationTitle("Settings")
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: `** TEST SUCCEEDED **` for both tests.

- [ ] **Step 5: Commit**

```bash
git add ios/PADDictionary/PADDictionary/Views/SettingsView.swift ios/PADDictionary/PADDictionaryTests/SettingsViewModelTests.swift
git commit -m "Add Settings screen for storing the GitHub token"
```

---

## Task 9: `SyncView` and app wiring

**Files:**
- Create: `ios/PADDictionary/PADDictionary/Views/SyncView.swift`
- Modify: `ios/PADDictionary/PADDictionary/PADDictionaryApp.swift`
- Modify: `ios/PADDictionary/PADDictionary/ContentView.swift`
- Test: `ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift`

**Interfaces:**
- Consumes: `GitHubSyncService` (Tasks 4–6, used via new `GitHubSyncing` protocol), `DataStore` (Task 7), `SettingsView` (Task 8).
- Produces: `protocol GitHubSyncing { func triggerUpdate() async throws; func pollRunStatus() async throws -> WorkflowConclusion; func downloadLatestData(to directory: URL) async throws }` (adopted by `GitHubSyncService`), `enum SyncState: Equatable { case idle, triggering, running, downloading, done, error(String) }`, `@MainActor final class SyncViewModel: ObservableObject { @Published private(set) var state: SyncState; init(syncService: GitHubSyncing, dataStore: DataStore, documentsDirectory: URL); func startSync() async }`, `struct SyncView: View`.

- [ ] **Step 1: Make `GitHubSyncService` conform to `GitHubSyncing`**

Add to `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` (near the top, after imports):

```swift
protocol GitHubSyncing {
    func triggerUpdate() async throws
    func pollRunStatus() async throws -> WorkflowConclusion
    func downloadLatestData(to directory: URL) async throws
}
```

Change the class declaration line from `final class GitHubSyncService {` to:

```swift
final class GitHubSyncService: GitHubSyncing {
```

- [ ] **Step 2: Write the failing test**

Create `ios/PADDictionary/PADDictionaryTests/SyncViewModelTests.swift`:

```swift
import XCTest
@testable import PADDictionary

private final class FakeGitHubSyncing: GitHubSyncing {
    var triggerError: Error?
    var pollResult: Result<WorkflowConclusion, Error> = .success(.success)
    var downloadError: Error?
    private(set) var downloadedTo: URL?

    func triggerUpdate() async throws {
        if let triggerError { throw triggerError }
    }

    func pollRunStatus() async throws -> WorkflowConclusion {
        try pollResult.get()
    }

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
    func testMissingTokenSurfacesReadableError() async {
        let fake = FakeGitHubSyncing()
        fake.triggerError = GitHubSyncError.missingToken
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        XCTAssertEqual(viewModel.state, .error("No GitHub token set. Add one in Settings."))
    }

    @MainActor
    func testWorkflowFailureSurfacesError() async {
        let fake = FakeGitHubSyncing()
        fake.pollResult = .success(.failure)
        let dataStore = DataStore(documentsDirectory: tempDir, userDefaults: UserDefaults(suiteName: UUID().uuidString)!)
        let viewModel = SyncViewModel(syncService: fake, dataStore: dataStore, documentsDirectory: tempDir)

        await viewModel.startSync()

        if case .error = viewModel.state {
            // expected
        } else {
            XCTFail("expected .error state, got \(viewModel.state)")
        }
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:PADDictionaryTests/SyncViewModelTests
```

Expected: build failure — `SyncViewModel`/`SyncState` not defined.

- [ ] **Step 4: Implement `SyncView.swift`**

Create `ios/PADDictionary/PADDictionary/Views/SyncView.swift`:

```swift
import SwiftUI

enum SyncState: Equatable {
    case idle
    case triggering
    case running
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
        state = .triggering
        do {
            try await syncService.triggerUpdate()
            state = .running
            let conclusion = try await syncService.pollRunStatus()
            guard conclusion == .success else {
                state = .error("The update workflow finished with: \(conclusion.rawValue).")
                return
            }
            state = .downloading
            try await syncService.downloadLatestData(to: documentsDirectory)
            dataStore.reload()
            dataStore.markSynced(at: Date())
            state = .done
        } catch GitHubSyncError.missingToken {
            state = .error("No GitHub token set. Add one in Settings.")
        } catch GitHubSyncError.unauthorized {
            state = .error("GitHub rejected the token. Check it in Settings.")
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
                    .foregroundStyle(.secondary)
            } else {
                Text("No data yet — run an update to get started.")
                    .foregroundStyle(.secondary)
            }

            Text("\(dataStore.cards.count) cards cached")
                .font(.caption)
                .foregroundStyle(.tertiary)

            statusView

            Button {
                Task { await viewModel.startSync() }
            } label: {
                Label("Update Data", systemImage: "square.and.arrow.down")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isBusy)
        }
        .padding()
        .navigationTitle("Sync")
    }

    private var isBusy: Bool {
        switch viewModel.state {
        case .triggering, .running, .downloading: return true
        default: return false
        }
    }

    @ViewBuilder
    private var statusView: some View {
        switch viewModel.state {
        case .idle, .done:
            EmptyView()
        case .triggering:
            ProgressView("Starting update on GitHub…")
        case .running:
            ProgressView("Update running on GitHub…")
        case .downloading:
            ProgressView("Downloading refreshed data…")
        case .error(let message):
            Text(message)
                .foregroundStyle(.red)
                .multilineTextAlignment(.center)
        }
    }
}
```

- [ ] **Step 5: Wire it into the app**

Replace the contents of `ios/PADDictionary/PADDictionary/ContentView.swift` with:

```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = DataStore(
        documentsDirectory: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    )

    var body: some View {
        NavigationStack {
            SyncView(dataStore: dataStore, syncService: GitHubSyncService())
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink {
                            SettingsView()
                        } label: {
                            Image(systemName: "gearshape")
                        }
                    }
                }
        }
    }
}
```

Leave `ios/PADDictionary/PADDictionary/PADDictionaryApp.swift` as Xcode generated it (it already instantiates `ContentView()` as the root view) — no changes needed there unless the template differs, in which case make it instantiate `ContentView()`.

- [ ] **Step 6: Run test to verify it passes**

Same command as Step 3. Expected: `** TEST SUCCEEDED **` for all three `SyncViewModelTests`.

- [ ] **Step 7: Run the full test suite**

```bash
xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

Expected: `** TEST SUCCEEDED **` for every test target.

- [ ] **Step 8: Commit**

```bash
git add ios/PADDictionary
git commit -m "Add Sync screen wiring trigger/poll/download to DataStore, hook up navigation"
```

---

## Task 10: GitHub Actions `update-data.yml` workflow

**Files:**
- Create: `.github/workflows/update-data.yml`

**Interfaces:**
- Consumes: `update-data.sh` (existing, repo root) — no signature change.
- Produces: a `workflow_dispatch`-triggered GitHub Actions workflow named `update-data.yml`, matching the exact name `GitHubSyncService` (Task 4) calls.

- [ ] **Step 1: Add the workflow file**

Create `.github/workflows/update-data.yml`:

```yaml
name: Update Data

on:
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install webp
        run: sudo apt-get update && sudo apt-get install -y webp

      - name: Run update-data.sh
        run: ./update-data.sh

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          if [ -n "$(git status --porcelain)" ]; then
            git add -A
            git commit -m "Update card/skill data from upstream"
            git push
          else
            echo "No changes to commit."
          fi
```

- [ ] **Step 2: Commit and push the workflow**

```bash
git add .github/workflows/update-data.yml
git commit -m "Add workflow_dispatch GitHub Action to refresh card/skill data"
git push
```

The workflow must exist on the default branch before GitHub will let it be triggered via `workflow_dispatch`.

- [ ] **Step 3: Verify by triggering it end-to-end**

```bash
gh workflow run update-data.yml
gh run watch
```

Expected: the run reaches `completed` with conclusion `success`, and `git log -1` (after `git pull`) shows either the bot's data-refresh commit (if upstream had changes) or no new commit (if data was already current) — either is a pass. Confirm no error output in `gh run view --log` if the run fails.

- [ ] **Step 4: End-to-end manual check on device/simulator**

In the running app: Settings → paste a GitHub PAT with `repo` scope (classic) or fine-grained `Actions: write` + `Contents: write` on `gcat332/pad-dictionary` → Save. Back on the Sync tab, tap "Update Data" and confirm the state progresses Triggering → Running → Downloading → Done, `lastSyncedAt` updates, and `dataStore.cards.count` shows the real card count (~13,878) after it finishes.

---

## Self-Review Notes

- **Spec coverage:** Keychain storage (Task 3), trigger/poll/download (Tasks 4–6), `Card`/`Skill` decoding (Task 2), `DataStore` + offline empty-state (Task 7), Settings/Sync screens (Tasks 8–9), GitHub Actions workflow (Task 10) — every component in the spec has a task.
- **Type consistency:** `GitHubSyncService` gains methods incrementally (Tasks 4→5→6) but the class/init signature is introduced once in Task 4 and never changes; `GitHubSyncing` (Task 9) is retrofitted onto the same concrete methods, so no name drift. `DataStore`'s constructor signature (`documentsDirectory:`, `userDefaults:`) is fixed in Task 7 and reused as-is in Tasks 9's tests and `ContentView`.
- **No placeholders:** every step has literal Swift/YAML/bash — no "add error handling" stubs.
