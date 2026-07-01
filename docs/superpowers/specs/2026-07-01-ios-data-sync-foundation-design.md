# iOS App — Sub-project 1: Data & Sync Foundation

## Context

The PAD Card Dictionary is currently a static web app (`index.html`/`dict.js`/`engine.js`)
deployed to GitHub Pages. The user wants a native iOS (SwiftUI) app with the same
concept. Because the web UI's filter/search taxonomy (`engine.js`, 300KB+) is large,
the iOS project is split into independent sub-projects, each with its own spec/plan:

1. **Data & Sync foundation** (this doc)
2. Core browse UI (grid, search, sort, detail view)
3. Basic filters (attribute/type/rarity/awoken/can-assist)
4. Special-search engine + tree UI (port of `engine.js` skill taxonomy)
5. Saved presets + compare dialog

This doc covers only #1: getting card/skill data onto the phone and letting the user
refresh it from the upstream source on demand, with no browsing UI yet.

## Goal

- A SwiftUI iOS app that can decode and hold the same data the web app uses
  (`monsters-info/mon_ja.json`, `skill_ja.json`, `skill_en.json`, `skill_tr.json`)
  plus card sprites (`images/cards_ja/*.webp`), cached locally so the app works offline.
- A way to refresh that data from within the app, without requiring an App Store
  update or a manual `git pull` on a computer.

## Why GitHub Actions as the trigger

`update-data.sh` shells out to `git` (sparse clone of the 1.6GB upstream
`Mapaler/PADDashFormation` repo) and `cwebp` — neither is available in an iOS app
sandbox. The script needs to run somewhere with a real shell. Rather than standing up
a custom server, we reuse GitHub's existing free compute: a `workflow_dispatch`
GitHub Actions workflow in this repo runs the existing script and commits the result.
The phone only needs to (a) ask GitHub to start that workflow and (b) later download
the refreshed JSON/sprites — both are plain HTTPS.

## Architecture

```
iPhone app (SwiftUI)                 GitHub (pad-dictionary repo)
┌─────────────────────┐              ┌──────────────────────────┐
│ Settings: PAT entry  │──trigger───▶│ workflow_dispatch          │
│ (Keychain)           │              │  .github/workflows/       │
│                       │              │  update-data.yml          │
│ Sync screen:          │◀──poll──────│  runs update-data.sh,     │
│  "Update Data" btn   │   status     │  commits+pushes to main   │
│  last-synced label   │              └──────────────────────────┘
│                       │──download───▶ raw.githubusercontent.com/
│ DataStore (in-memory  │   JSON+webp   .../main/monsters-info/*.json
│  Card/Skill arrays)   │              .../main/images/cards_ja/*
│                       │
│ Local cache (Documents│
│  dir) — works offline │
└─────────────────────┘
```

Only the trigger call needs a token (Actions write scope). Downloading refreshed
JSON/sprites afterward is an unauthenticated public HTTPS GET against
`raw.githubusercontent.com`.

## Components

### `.github/workflows/update-data.yml` (new, in this repo)

- Trigger: `workflow_dispatch` only (no schedule — user-initiated).
- Steps: checkout, `apt-get install webp` (for `cwebp`), run `./update-data.sh`,
  commit + push to `main` if `git status` shows changes.
- No secrets needed beyond the default `GITHUB_TOKEN` (already has push permission
  to this repo via the workflow's own permissions block).

### `KeychainStore` (Swift)

- Thin wrapper over the `Security` framework (stdlib — no third-party dependency).
- `save(token: String)` / `read() -> String?` / `delete()`.

### `GitHubSyncService` (Swift)

- `triggerUpdate() async throws` — `POST /repos/{owner}/{repo}/actions/workflows/update-data.yml/dispatches`
  with the stored PAT in the `Authorization` header.
- `pollRunStatus() async throws -> WorkflowConclusion` — `GET /repos/{owner}/{repo}/actions/workflows/update-data.yml/runs?per_page=1`,
  poll every ~5s until the latest run's `status == "completed"`; return its `conclusion`.
- `downloadLatestData() async throws` — lists `images/cards_ja/` via the Contents API
  (`GET /repos/{owner}/{repo}/contents/images/cards_ja`) to get the current sprite
  filenames, then GETs each of the 4 JSON files, the fixed icon/frame files, and every
  sprite from `raw.githubusercontent.com/<owner>/<repo>/main/...`. Files are written to
  a temp directory first, then moved into the app's `Documents/` cache only once every
  file has downloaded successfully — a failed sync never corrupts the existing cache.
- Full re-download each sync (no incremental sha-diffing) — simplest thing that
  works for a ~104MB, user-initiated, infrequent action. Revisit only if this proves
  annoying in practice.

### `Card` / `Skill` models (Swift, `Codable`)

- Mirror the JSON shapes of `mon_ja.json` (cards, incl. `otLangName.en`), `skill_ja.json`
  (authoritative `type`/`params`), `skill_en.json` (EN text where available),
  `skill_tr.json` (pre-translated JP-only skill text).
- Decoding happens on load from the local cache, not on every access.

### `DataStore` (Swift, `ObservableObject`)

- On launch: reads whatever cached JSON files exist in `Documents/` and decodes them
  into in-memory arrays. On the very first launch (before any sync), the cache is
  empty and the arrays stay empty — no bundled seed dataset is shipped in the app
  binary (would add ~86MB to the app for a one-time convenience). The UI shows an
  empty state prompting the user to run "Update Data" once.
- Exposes `cards: [Card]`, `skillsJA: [Skill]`, `skillsEN: [Skill]`,
  `skillTranslations: [String: String]`, `lastSyncedAt: Date?` for future UI
  sub-projects to consume.
- After a successful `downloadLatestData()`, re-reads and re-decodes, updates
  `lastSyncedAt` (persisted in `UserDefaults`).

### Screens

- **Settings** — single text field to paste/save the GitHub PAT into Keychain;
  a "Clear" action to delete it.
- **Sync** — shows `lastSyncedAt`, an "Update Data" button driving the
  trigger → poll → download pipeline with visible state (`Idle` / `Triggering` /
  `Running` / `Downloading` / `Done` / `Error(message)`).

## Error handling

- Missing/invalid PAT (401 from GitHub) → alert directing the user to Settings.
- Workflow `conclusion == "failure"` → alert with a short message (no raw log dump
  in the UI — logs stay on GitHub if the user wants to dig in).
- Any network failure at any step → retry-able alert; local cache is untouched
  until a download fully succeeds (write to a temp location, then move into place).
- The app never blocks on network at launch — it always shows whatever is in the
  local cache.

## Out of scope for this sub-project

- No card grid / filter / search UI (sub-projects 2–4).
- No incremental sprite diffing.
- No CoreData/SwiftData — plain JSON decode into memory is fast enough for
  ~14k cards; revisit only if launch-time decoding becomes a measured problem.

## Testing

One `XCTest` (`DataDecodingTests`) that decodes a small bundled fixture slice of
`mon_ja.json` / `skill_ja.json` into `Card` / `Skill` and asserts a few known IDs
decode with expected fields — the tripwire that fails if the models drift from the
real JSON shape.

## Execution roles

Per the user's instruction: implementation (actual code) for every task is done by
the `codex:codex-rescue` agent running model `gpt-5.5`, not by Claude subagents.
Claude's role for this project is SA/BA — writing specs and plans, defining
acceptance criteria per task, and reviewing each diff Codex produces before moving
to the next task.

## UI usability

Even though this sub-project's UI is minimal (Settings + Sync screens only), it
must be genuinely usable, not a placeholder wireframe: standard iOS layout/spacing,
`NavigationStack`, SF Symbols for icons, and clear visible feedback for every sync
state (not just a static label). The bigger UI work (browse/filter/search) in
sub-projects 2–4 gets the same bar.
