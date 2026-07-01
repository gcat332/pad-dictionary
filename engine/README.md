# engine/ — source layout for `engine.js`

`engine.js` at the repo root is a **single UMD closure** (`(function(root, factory){…})(…, function(){ "use strict"; … })`).
Everything inside shares one closure scope (mutable `Skills`/`Cards`, prototype
patches from `installHelpers()`, private helpers), and the whole module exposes
just `root.PADEngine = { createSpecialSearchEngine, specialSearchFunctions, SkillKinds, SkillPowerUpKind, Attributes, Bin, globalsStubbed }`.
`dict.js` only ever calls `PADEngine.createSpecialSearchEngine(...)`.

A single closure can't be split across `<script>` tags without a build step, so
the file is authored as ordered partials under `engine/src/` and concatenated:

```bash
./build-engine.sh          # cat engine/src/*.js > engine.js
git diff --stat engine.js  # must be empty — output is byte-identical to the parts
```

The 2-digit filename prefix is the load order. **Edit the partials, never
`engine.js` directly**, then run `build-engine.sh`.

## Grouping rationale

Split by **layer of responsibility** (data/enums → parse → build → render →
search), not by line count:

| # | File | Responsibility |
|---|------|----------------|
| 01 | `module-open` | UMD wrapper open, closure state, `installHelpers` (prototype patches), `Bin`, card-skill getters |
| 02 | `attributes` | `Attributes` class, `isEqual` |
| 03–04 | `board-orbs`, `board` | board-simulation classes: `Orb`/`Block`/`BoardSet` (03), `Board` (04) |
| 05 | `skill-enums` | `SkillTarget`, `SkillValue`, `SkillValueKind`, `SkillPowerUpKind`, `SkillKinds` |
| 06 | `skill-parser` | `skillParser` (one 315-line function — kept whole, see below) |
| 07–08 | `skill-dsl-values`, `skill-dsl-builders` | `v`/`c`/`p` value objects (07); ~80 skill-effect factory functions (08) |
| 09–12 | `skill-parsers-1…4` | `skillObjectParsers` dispatch table (keyed by skill `type` number), cut between entries |
| 13 | `render-skill-entry` | `renderSkillEntry`, `posSplit`, `createSkillIcon` |
| 14 | `render-skill` | `renderSkill` (one 1062-line `switch` — kept whole, see below) |
| 15 | `render-stat` | `playOwnVoiceId`, `renderStat`/`renderAttrs`/`renderOrbs`/`renderTypes`/`renderAwakenings` |
| 16–18 | `render-condition`, `render-powerup`, `render-value` | `renderCondition` / `renderPowerUp` / `renderValue` |
| 19–22 | `search-helpers-1…4` | `specialSearchFunctions` IIFE open + its filter/scale/addition helper functions |
| 23–28 | `tree-active-1…6` | `functions` tree data — "Active Skill" category, cut between sibling groups |
| 29 | `tree-leader` | "Leader Skills" category |
| 30 | `tree-misc` | "Evo type", "Awakenings", "Others Search" categories |
| 31 | `search-engine` | tree return, `normalizeNode`/`flattenLeaves`/`createSpecialSearchEngine`, module return + UMD close |

## Files that exceed 250 lines (deliberately not split)

Splitting these further would either cut a token/statement mid-construct (making
a fragment that only parses after concatenation — worse to edit, no clearer) or
require a behavior-risky rewrite. Correctness was prioritized over the line cap:

- **`14-render-skill.js` (1062)** — `renderSkill` is one `switch (skill.kind)`. Cutting it means extracting each `case` into a named helper: a real refactor with real risk on the most complex render path. Left as a follow-up.
- **`06-skill-parser.js` (315)** — `skillParser` is one function; same reasoning, smaller.
- **`23–29` tree files (353–752)** — single nested data-array groups; cut at the cleanest sibling boundaries. Finer cuts would land inside one filter group with no readability gain.
