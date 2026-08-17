# iOS App — Scheduled Sync + Local-Only Update

## Context

The data-sync foundation (see `2026-07-01-ios-data-sync-foundation-design.md`) had the
phone itself drive the refresh: the user pastes a GitHub PAT into Settings, taps
"Update Data," and the app calls the GitHub API to (1) trigger the `update-data.yml`
workflow, (2) poll it until it finishes, then (3) download the refreshed files.

That's more moving parts than this personal app needs. The user wants the refresh to
just happen on a schedule instead of being phone-initiated, and the phone's button to
only pull down whatever the last scheduled run already produced.

## Goal

- `update-data.yml` runs itself every ~2 days via a GitHub Actions `schedule`, with no
  action needed from the phone.
- The "Update Data" button on the phone becomes a plain refresh: download the current
  files from the repo and reload — no trigger, no poll, no wait for a workflow run.
- Since nothing the app does afterward needs write access to Actions, and the repo is
  public (`gh repo view gcat332/pad-dictionary` → `visibility: PUBLIC`; confirmed
  `downloadLatestData()` already sends no `Authorization` header for the
  `raw.githubusercontent.com` GETs, and only optionally attaches one for the sprite
  listing call), the GitHub PAT / Keychain / Settings token UI has no remaining purpose
  and is removed rather than hardcoded.

## Architecture

```
GitHub Actions (pad-dictionary repo)              iPhone app (SwiftUI)
┌────────────────────────────┐
│ schedule: cron              │
│  '0 0 */2 * *' (~every      │
│  2 days, UTC)                │
│  + workflow_dispatch          │             ┌──────────────────────┐
│  (manual re-run kept)        │              │ Sync screen:           │
│                               │              │  "Refresh" button      │
│ runs update-data.sh,          │              │  last-synced label     │
│ commits+pushes to main       │──download───▶│                        │
└────────────────────────────┘   (no auth)     │ DataStore.reload()     │
                                                │ Local cache (Documents)│
                                                └──────────────────────┘
```

No trigger/poll arrow anymore — the only phone→GitHub call left is the unauthenticated
file download.

## Components

### `.github/workflows/update-data.yml`

Add a `schedule` trigger alongside the existing `workflow_dispatch` (kept — useful for
an ad-hoc re-run from the GitHub UI/CLI if upstream ever needs a manual nudge):

```yaml
on:
  workflow_dispatch: {}
  schedule:
    - cron: '0 0 */2 * *'
```

Note: GitHub Actions cron has no native "every N days" — `*/2` on the day-of-month
field resets at each month boundary, so the gap is occasionally 1 or 3 days around
month-end instead of a clean 2. Acceptable for a personal-use cadence; not worth a
more complex scheme (e.g. a state file tracking the last run) to smooth over.

### `GitHubSyncService` (Swift)

Remove entirely: `triggerUpdate()`, `pollRunStatus()`, `requireToken()`,
`WorkflowConclusion`, `WorkflowRun`, `WorkflowRunsResponse`,
`GitHubSyncError.missingToken` / `.unauthorized`. `listSpriteFiles()` keeps working
unchanged, just drops the `if let token = try? requireToken()` branch (the contents
API call already works unauthenticated for a public repo, just at GitHub's lower
anonymous rate limit — fine for one call every sync). `downloadLatestData(to:)` is
unchanged. `GitHubSyncing` protocol shrinks to just `downloadLatestData`.

### `KeychainStore` — deleted

Along with its three tests in `KeychainStoreTests.swift` (deleted) and the token
round-trip assertions in `GitHubSyncServiceTests.swift` (deleted, since there's no
token path left to exercise).

### `SettingsView` / `SettingsViewModel`

`SettingsView` also has an "Appearance" section (theme picker, `@AppStorage`-backed,
nothing to do with sync) that stays untouched. Only the "GitHub Access" section
(`SecureField` + Save/Remove token buttons) and `SettingsViewModel`'s Keychain-backed
`tokenInput`/`isSaved`/`save()`/`clear()` are removed — the screen and tab remain,
now just theme settings. `SettingsViewModelTests.swift` is deleted.

### `SyncViewModel` / `SyncView`

`startSync()` shrinks to:

```swift
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
```

`SyncState` drops `.triggering` / `.running`, keeping `.idle / .downloading / .done /
.error`. The missing-token / unauthorized error branches and their user-facing copy
("No GitHub token set...", "GitHub rejected the token...") are removed along with
them. Button label/copy changes from "Update Data" framing to "Refresh" / "Pull
Latest" — it's now honestly just a pull of what the schedule already produced, not a
"trigger an update" action.

## Error handling

- Network failure during download → same as today: write to a temp location, only
  move into place once every file succeeds, so a failed refresh never corrupts the
  existing local cache. Surface `error.localizedDescription` in `.error` state.
- No more 401/missing-token states to handle — removed, not replaced.

## Out of scope

- No change to `update-data.sh` itself or what data/sprites it fetches.
- No local notification / background refresh on the phone side — the schedule lives
  entirely in GitHub Actions; the phone still only refreshes when the user taps the
  button (confirmed via investigation: there's no existing `BackgroundTasks` /
  `BGTaskScheduler` usage in the app to build on or remove).
- Not changing the web viewer (`dict.js`) — it already reads directly from the repo's
  files, no PAT involved there.

## Testing

- `GitHubSyncServiceTests.swift`: keep the `downloadLatestData` success/failure cases;
  delete the trigger/poll/token cases.
- `SyncViewModelTests.swift`: keep/adjust the download-success and download-failure
  cases; delete `testMissingTokenSurfacesReadableError` and any trigger/poll-state
  assertions.
- Manual: after the workflow's `schedule` trigger is added, verify with
  `gh workflow view update-data.yml` that the schedule shows up, and confirm the
  Settings tab no longer shows a token field. Tapping "Refresh" downloads and reloads
  without prompting for anything.
