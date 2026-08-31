// Track per-card "last updated" date, used for the default sort.
// Output: monsters-info/card-updates.json = { "<cardId>": "<YYYY-MM-DD>" }
//
// Two modes:
//   node build-card-updates.mjs <path-to-new-mon_ja.json>
//     Sync mode. Diffs the given (incoming) mon_ja.json against the current
//     monsters-info/mon_ja.json card-by-card (matched by id, not array index).
//     Any card that's new or whose JSON differs gets stamped with today's UTC
//     date. Unchanged cards keep whatever date they already have. Existing
//     entries are merged in, never deleted.
//
//   node build-card-updates.mjs --seed
//     Seed mode. Rebuilds the whole file from mon_ja.json's git history: the
//     first commit stamps every card with that commit's date, then each later
//     commit is diffed against the previous one and changed/added ids get
//     that commit's date.

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.join(root, "monsters-info");
const monPath = path.join(dataDir, "mon_ja.json");
const outPath = path.join(dataDir, "card-updates.json");

// mon_ja.json is ~16MB and grows over time; `git show` of a historical
// revision can be similarly sized, so give child_process plenty of headroom.
const MAX_BUFFER = 256 * 1024 * 1024;

const readJson = (file) => fs.readFile(file, "utf8").then(JSON.parse);
const sortObject = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));

async function readExisting() {
  try { return JSON.parse(await fs.readFile(outPath, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return {}; throw e; }
}

const byId = (cards) => new Map(cards.map((c) => [c.id, c]));

// Stamp `date` onto every card in `newCards` that's absent from `oldCards` or
// whose JSON differs from the same-id card in `oldCards`. Mutates `updates`.
function stampChanges(updates, oldCards, newCards, date) {
  const oldById = byId(oldCards);
  for (const card of newCards) {
    const prev = oldById.get(card.id);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(card)) {
      updates[card.id] = date;
    }
  }
}

async function writeUpdates(updates) {
  // Compact single-line JSON, matching the rest of monsters-info/*.json.
  await fs.writeFile(outPath, JSON.stringify(sortObject(updates)) + "\n");
}

async function syncMode(newPath) {
  const [oldCards, newCards, existing] = await Promise.all([
    readJson(monPath), readJson(newPath), readExisting(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const updates = { ...existing };
  const before = { ...updates };
  stampChanges(updates, oldCards, newCards, today);
  const stamped = Object.keys(updates).filter((id) => updates[id] !== before[id]).length;
  await writeUpdates(updates);
  console.log(`card-updates.json: ${Object.keys(updates).length} entries (${stamped} stamped as of ${today})`);
}

async function seedMode() {
  const log = execFileSync(
    "git",
    ["log", "--reverse", "--format=%H;%cs", "--", "monsters-info/mon_ja.json"],
    { cwd: root, encoding: "utf8", maxBuffer: MAX_BUFFER },
  ).trim();
  const commits = log.split("\n").filter(Boolean).map((line) => {
    const [hash, date] = line.split(";");
    return { hash, date };
  });

  const updates = {};
  let prevCards = [];
  for (const { hash, date } of commits) {
    const text = execFileSync("git", ["show", `${hash}:monsters-info/mon_ja.json`], {
      cwd: root, encoding: "utf8", maxBuffer: MAX_BUFFER,
    });
    const cards = JSON.parse(text);
    stampChanges(updates, prevCards, cards, date);
    prevCards = cards;
  }

  await writeUpdates(updates);
  console.log(`card-updates.json seeded: ${Object.keys(updates).length} entries from ${commits.length} commits`);
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--seed") await seedMode();
  else if (arg) await syncMode(arg);
  else {
    console.error("Usage: node build-card-updates.mjs <path-to-new-mon_ja.json> | --seed");
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
