# PAD Card Dictionary (JP data · English)

A static, single-page Puzzle & Dragons card dictionary. Shows the **Japanese
server** card list with **English** names and skill text. No build step, no
backend — deployable straight to GitHub Pages.

## Features

- 13,878 JP-server cards with English names (`otLangName.en`), JP fallback for new cards
- Per-position **attribute** search (main / sub / 3rd), **type**, **rarity**
- **Awoken** filter with counts (left-click +1, right-click −1)
- **Special Search** — skill-text categories (Active / Leader) with AND / OR
- Sort (id, rarity, cost, attribute, HP/ATK/RCV, skill CD) + direction
- Saved filter presets (localStorage), attribute frames, infinite scroll
- On-demand machine translation (Google `gtx`) for JP-only card names, cached, marked `~`

## Data

Static JSON extracted from the official GungHo PAD API (offline):

- `monsters-info/mon_ja.json` — JP card data (incl. EN names)
- `monsters-info/skill_en.json` — English skill text, indexed by skill id

## Run locally

```bash
python3 -m http.server
# open http://localhost:8000
```

## `old/`

Original source of [Mapaler/PADDashFormation](https://github.com/Mapaler/PADDashFormation)
kept for reference — the deep **Special Search** engine
(`script-skill-parser.js`, `script-json_data.js`, `script-universal_function.js`)
to be ported faithfully in a later pass. The current dictionary's special search
is a self-contained skill-text heuristic and does not depend on `old/`.

## Credit

Card/skill data and original tooling © [Mapaler/PADDashFormation](https://github.com/Mapaler/PADDashFormation)
(see `LICENSE`). Puzzle & Dragons © GungHo Online Entertainment.
