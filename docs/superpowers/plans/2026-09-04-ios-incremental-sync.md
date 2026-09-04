# Plan: iOS incremental sync via SHA manifest

Approved design (chat, 2026-09-04). Single bounded task; work directly on `main` (user-approved).

## Global Constraints

- Do NOT push until the task review is clean (controller pushes).
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- TDD: write the failing tests first (MockURLProtocol harness already exists in `GitHubSyncServiceTests.swift`), then implement.
- UI, `DataStore`, `SyncViewModel` are untouched — the change lives in `GitHubSyncService.swift` + its tests.
- Behavior contract:
  - First sync with no manifest = full download (today's behavior), then writes `sync-manifest.json`.
  - Later syncs download only files whose remote blob SHA differs from the manifest, are absent from the manifest, or are missing on disk.
  - Manifest is written only after every downloaded file has been moved into place (a mid-sync failure must leave the old manifest intact).
- iOS tests: `xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`

## Task 1 — SHA-manifest incremental sync in `GitHubSyncService`

File: `ios/PADDictionary/PADDictionary/Services/GitHubSyncService.swift` (+ `ios/PADDictionary/PADDictionaryTests/GitHubSyncServiceTests.swift`).

Implementation:
- Extend `GitHubContentEntry` to decode `name`, `sha`, and `type` ("file"/"dir").
- Generalize `listSpriteFiles()` into a directory-listing helper called for three paths: `images/cards_ja`, `monsters-info`, `images`. Filter to `type == "file"`. Build a `[String: String]` remote-SHA map keyed by repo-relative path. (GitHub contents API returns up to 1000 entries per directory without pagination — all three dirs are far below that, same assumption the current code already makes.)
- Wanted paths stay exactly as today: `dataFiles` + `fixedImageFiles` + every listed `images/cards_ja/*` file.
- Manifest: `<documents>/sync-manifest.json`, JSON `{ "<path>": "<sha>" }`. Read at the start of `downloadLatestData` (missing/corrupt → treat as empty).
- Download decision per wanted path: download unless (manifest sha == remote sha AND the file exists at `directory.appendingPathComponent(path)`). A wanted path absent from the remote listings keeps today's behavior (attempt the download; a 404 throws `unexpectedStatus`).
- Keep the existing temp-dir download + move-into-place flow for the downloaded subset. After all moves succeed, write the manifest containing the remote sha for EVERY wanted path (downloaded and skipped alike). Do not delete local sprites that vanished remotely (out of scope).

Tests (TDD — these first):
1. Fresh sync (no manifest on disk) downloads all wanted files and writes a manifest whose entries match the mocked shas.
2. Second sync with identical shas and files present downloads zero files from raw.githubusercontent (assert via MockURLProtocol request recording; the three api.github.com listing calls still happen).
3. One sprite's sha changed → exactly that file is re-downloaded and the manifest entry updates.
4. Sha unchanged but the local file was deleted → that file is re-downloaded.
5. A download failure mid-sync (mock one raw URL returning 500) leaves the pre-existing manifest unchanged on disk.
Preserve the intent of the existing GitHubSyncServiceTests; update their mocks to serve `sha`/`type` fields as the new listing decode requires.

Verification: full iOS suite green via the xcodebuild command in Global Constraints.
