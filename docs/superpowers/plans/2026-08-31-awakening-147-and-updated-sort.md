# Plan: Awakening 144–147 support + "Updated" default sort (web + iOS)

Approved design (chat, 2026-08-31). Work happens directly on `main` per user approval. No spec file — bounded work; this plan is the authority.

## Global Constraints

- Do NOT push. Commits stay local until the user decides.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Web (`dict.js`) and iOS mirror each other's behavior; keep comments on both sides accurate when touching shared concepts.
- `monsters-info/awoken_names.json` and `ios/PADDictionary/PADDictionary/Resources/awoken_names.json` are byte-identical copies today — any edit to one must be copied to the other.
- New awakening names (exact values, from upstream PADDashFormation `script-json_data.js`):
  - 144: `Ultra Enhanced Combos`
  - 145: `Hopeful Soul`
  - 146: `Courageous Soul`
  - 147: `Fateful Soul`
- `images/awoken.png` is a vertical sprite: 96px wide (icon at column 0, 32px cells), height = 32 × rowCount. Current file is 96×4736 = 148 rows (ids 0–147). The fix must derive the max id from the sprite's real height so future upstream additions need no code change.
- `card-updates.json` format: `monsters-info/card-updates.json` = `{"<cardId>": "YYYY-MM-DD"}` (UTC date the card's mon_ja.json entry last changed or first appeared), keys sorted numerically.
- iOS tests: `xcodebuild test -project ios/PADDictionary/PADDictionary.xcodeproj -scheme PADDictionary -destination 'platform=iOS Simulator,name=<an available iPhone sim>'` (check `xcrun simctl list devices available` first).
- Web has no JS test harness; verify with `node --check dict.js` and by parsing edited JSON files with node.

## Task 1 — `build-card-updates.mjs` + seed + wire into `update-data.sh`

Create `build-card-updates.mjs` (root, sibling of `build-translations.mjs`; follow its style: node:fs/promises, root-relative paths).

Two modes:
1. `node build-card-updates.mjs <path-to-new-mon_ja.json>` (sync mode): read old = `monsters-info/mon_ja.json`, new = arg. For every card in new whose JSON.stringify differs from the same-id card in old (or which is absent in old), set its id → today's UTC date (`new Date().toISOString().slice(0,10)`) in `monsters-info/card-updates.json` (read existing, merge, write back, numeric-key-sorted, one line per entry or compact — match repo JSON style which is compact single-line). Cards unchanged keep their existing date. Never delete entries.
2. `node build-card-updates.mjs --seed`: rebuild the file from git history. `git log --reverse --format=%H;%cs -- monsters-info/mon_ja.json` (run via child_process, cwd = repo root); for the first commit, every card gets that commit's date; for each subsequent commit, diff `git show <hash>:monsters-info/mon_ja.json` against the previous commit's version and stamp changed/added ids with that commit's date. Compare cards by JSON.stringify of the card entry, matching by card id (not array index).

Wire into `update-data.sh`: immediately BEFORE the `cp "$TMP/monsters-info/mon_ja.json" monsters-info/mon_ja.json` line, add:
```bash
echo "Stamping card update dates (card-updates.json) …"
command -v node >/dev/null || { echo "Error: node not found (needed for build-card-updates.mjs)."; exit 1; }
node build-card-updates.mjs "$TMP/monsters-info/mon_ja.json"
```
(The existing node check later in the script stays as is.)

Run `--seed` once and commit the generated `monsters-info/card-updates.json`.

README.md: in the section describing the scheduled sync / data files, add one sentence that the sync also maintains `monsters-info/card-updates.json` (per-card last-updated dates used for the default sort).

Verification (must all run):
- `node --check build-card-updates.mjs`
- `--seed` run produces a file where: entry count == 14130; `JSON.parse` succeeds; spot-check that card id 131 has date `2026-08-29` (it changed in commit a46c6ad, committed 2026-08-29) and a card untouched since the initial data commit has that first commit's date.
- Sync-mode dry run: copy current mon_ja.json to a temp file, tweak one card's entry, run sync mode against it, confirm only that id's date changed to today; then `git checkout -- monsters-info/card-updates.json` to restore the seeded file (do NOT commit the dry-run result).
- `bash -n update-data.sh`

## Task 2 — Web: dynamic awakening bound + names + "Updated" default sort (`dict.js`, `monsters-info/awoken_names.json`)

All in one task (single file pair).

A. Awakening 144–147:
- `monsters-info/awoken_names.json`: append `"144":"Ultra Enhanced Combos","145":"Hopeful Soul","146":"Courageous Soul","147":"Fateful Soul"` (keep numeric order). Copy the resulting file byte-identical over `ios/PADDictionary/PADDictionary/Resources/awoken_names.json`.
- `dict.js:61` — replace `const hasAwkIcon = n => n >= 0 && n <= 143;` with a dynamic bound: a `let MAX_AWK = 143;` default, updated by probing the sprite: `const awkProbe = new Image(); awkProbe.onload = () => { const m = awkProbe.naturalHeight / 32 - 1; if (m > MAX_AWK) { MAX_AWK = m; if (CARDS.length) applyView(); } }; awkProbe.src = "images/awoken.png";` and `const hasAwkIcon = n => n >= 0 && n <= MAX_AWK;`. Place near the existing awakening-icon comment block; the `applyView()` re-render guard must not crash if data hasn't loaded yet (guard shown). Note: `applyView` is defined later in the file — verify the reference resolves at call time, not load time.
- `AWOKEN_ORDER` (dict.js:8–14): append `144,145,146,147` to the tail list and update the stale `ids 0–143` comments (lines 12 and 58) to say the bound is derived from the sprite height.

B. "Updated" sort:
- Data load (dict.js:631–637 Promise.all): add `fetch("monsters-info/card-updates.json").then(r=>r.ok?r.json():{}).catch(()=>({}))` and store into a new module-level `let UPDATED = {};`.
- `SORTS`: add as FIRST entry `{key:"updated", label:"Updated", fn:(a,b)=>{const ua=UPDATED[a.id]||"", ub=UPDATED[b.id]||""; return ua===ub ? a.id-b.id : (ua<ub?-1:1);}}` (ISO dates compare lexicographically; ties fall back to id so `desc` shows newest date first, highest id first within a date).
- Default state: change `F` init (dict.js:31) `sortKey:"id"` → `sortKey:"updated"` and add a state-version field `sv:3`.
- Migration in `restoreState()` (dict.js:614): after the existing `Object.assign(F,s)`, add: `if((s.sv||0)<3){ F.sortKey="updated"; F.desc=true; F.sv=3; }` so users with pre-feature saved state get the new default exactly once; their other filters are preserved.

Verification: `node --check dict.js`; `node -e 'JSON.parse(require("fs").readFileSync("monsters-info/awoken_names.json","utf8"))'`; confirm the two awoken_names.json copies are byte-identical (`cmp`); serve the site locally (`python3 -m http.server`) and confirm via curl that index.html + JSONs load — full visual check happens in final review.

## Task 3 — iOS: dynamic awakening bound + names + "Updated" default sort

A. Awakening bound (`ios/PADDictionary/PADDictionary/Sprites/CardSpritePosition.swift`, `AwakeningIconView.swift`, `SkillTokenImage.swift`):
- `AwakeningSprite`: replace the hard-coded `id <= 143` with a row-count-aware API, e.g. `static let fallbackRowCount = 148`, `static func rowCount(of sheet: UIImage) -> Int { max(1, Int(sheet.size.height / 32)) }`, and `static func yOffset(forAwakeningId id: Int, rowCount: Int) -> Double?` guarding `id >= 0 && id < rowCount`. Keep it a pure, testable function.
- `AwakeningIconView.swift`: currently hard-codes `.frame(width: size * 3, height: size * 144)` — derive `rowCount` from the loaded sheet (`AwakeningSprite.rowCount(of: sheet)`) and use it for both the frame height (`size * CGFloat(rowCount)`) and the id validity check. The numbered-circle fallback stays for ids beyond the sheet.
- `SkillTokenImage.swift:27–30`: same change — compute rowCount from the sheet it already loads and pass it to `yOffset`.
- `AwakeningNames.swift`: no code change needed (names come from the bundled JSON, updated in Task 2B); confirm the bundled Resources/awoken_names.json now contains 144–147 (Task 2 copies it; if Task 2's copy hasn't landed in your checkout, stop and report NEEDS_CONTEXT).

B. "Updated" sort:
- `GitHubSyncService.swift`: add `"monsters-info/card-updates.json"` to `dataFiles`.
- `DataStore.swift`: load `monsters-info/card-updates.json` as `[String: String]`, publish as `cardUpdatedDates: [Int: String]` (Int keys; missing file → `[:]`).
- `CardSort.swift`: the compare closure currently takes `(Card, Card, SkillLookup)`. Extend to a context that also carries the dates — introduce `struct SortContext { let skills: SkillLookup; let updatedDates: [Int: String] }` and change `compare: (Card, Card, SortContext) -> Bool`, updating all existing comparators mechanically. Insert as FIRST element: `CardSort(id: "updated", label: "Updated") { a, b, ctx in let ua = ctx.updatedDates[a.id] ?? "", ub = ctx.updatedDates[b.id] ?? ""; return ua == ub ? a.id < b.id : ua < ub }`.
- `BrowseView.swift` (BrowseViewModel): build the `SortContext` from the data store and keep `sortIndex = 0` default (index 0 is now "Updated"; `isDescending = true` default already shows newest first). Update the sort Menu code only if the signature change requires it.
- Tests: update `CardSpritePositionTests.testAwakeningSpriteOffset` for the new rowCount API (0 → 0; 143 valid; 147 valid with rowCount 148; 148 nil with rowCount 148; -1 nil). Update `AwakeningNamesTests` — add `XCTAssertEqual(AwakeningNames.name(for: 147), "Fateful Soul")`. Update `CardSortTests` for the SortContext signature and add an "updated" comparator test (different dates, equal dates → id tiebreak, missing dates). Update `BrowseViewModelTests`/`DataStoreTests`/`GitHubSyncServiceTests` as compilation requires, preserving their intent.

Verification: full iOS test suite passes via xcodebuild (command in Global Constraints).

## Final review

Whole-branch review of everything since the pre-Task-1 BASE, on the most capable model. Include the dict.js↔iOS parity lens (same default sort, same tiebreak, same awakening bound behavior) and a browser smoke test of the web app if feasible.
