// Pre-translate JP-only skill DESCRIPTIONS (not names) to English, offline.
// Output: monsters-info/skill_tr.json  = { "<skillId>": "<english text>" }
//
// Strategy per skill id used by an enabled card that has no skill_en description:
//   1. If another skill with the SAME (type, params) has an English description, reuse it
//      (structurally identical skill = identical effect = safe exact reuse).
//   2. Otherwise translate the JP description via Google gtx (no API key).
// gtx failures are retried, then the id is SKIPPED (never write garbage) so a re-run fills it.
// Idempotent/incremental: existing good entries are kept.

import fs from "node:fs/promises";
import path from "node:path";

const root = path.dirname(new URL(import.meta.url).pathname);
const dataDir = path.join(root, "monsters-info");
const outPath = path.join(dataDir, "skill_tr.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (file) => fs.readFile(path.join(dataDir, file), "utf8").then(JSON.parse);
const sortObject = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => Number(a) - Number(b)));

async function readExisting() {
  try { return JSON.parse(await fs.readFile(outPath, "utf8")); }
  catch (e) { if (e.code === "ENOENT") return {}; throw e; }
}

// "Skill evolution" (type 232 one-way / 233 looping) skills upgrade into a subsequent
// skill id listed in params — those chain-stage ids need translation too, even though no
// card references them directly as activeSkillId/leaderSkillId.
function withEvolvedSkillChains(ids, skillJa) {
  const seen = new Set(ids);
  const queue = [...ids];
  while (queue.length) {
    const cur = queue.shift();
    const s = skillJa[cur];
    if (!s || (s.type !== 232 && s.type !== 233)) continue;
    for (const pid of s.params || []) {
      if (!seen.has(pid)) { seen.add(pid); queue.push(pid); }
    }
  }
  return seen;
}

function collectMissingSkillIds(cards, skillJa, skillEn) {
  const used = new Set();
  for (const c of cards) {
    if (c.isEmpty || !c.enabled) continue;
    if (c.activeSkillId) used.add(c.activeSkillId);
    if (c.leaderSkillId) used.add(c.leaderSkillId);
  }
  return [...withEvolvedSkillChains(used, skillJa)]
    .filter((id) => skillJa[id]?.description && !skillEn[id]?.description?.trim())
    .sort((a, b) => a - b);
}

// map (type,params) -> an English description, from skills that have EN text
function buildExactEnglishMap(skillJa, skillEn) {
  const map = new Map();
  const n = Math.max(skillJa.length, skillEn.length);
  for (let id = 0; id < n; id += 1) {
    if (skillJa[id] && skillEn[id]?.description?.trim()) {
      map.set(JSON.stringify([skillJa[id].type, skillJa[id].params]), skillEn[id].description);
    }
  }
  return map;
}

// Raw Google gtx translation — send the JP description verbatim, join the segments.
// Two keyless endpoints, tried in order per attempt: translate_a/single (primary) and
// clients5 dict-chrome-ex (fallback). Google 429-blocks them independently, so trying
// both survives a block on either (observed 2026-08-31: translate_a/single returned
// 429 from both GitHub Actions and a residential IP while clients5 kept working).
async function gtxSingle(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "ja", tl: "en", dt: "t", q: text }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  const payload = await res.json();
  return payload[0].map((p) => p[0]).join("");
}

async function gtxClients5(text) {
  const url = new URL("https://clients5.google.com/translate_a/t");
  url.search = new URLSearchParams({ client: "dict-chrome-ex", sl: "ja", tl: "en", q: text }).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`clients5 ${res.status}`);
  const payload = await res.json();
  if (!Array.isArray(payload)) throw new Error("clients5 bad payload");
  const t = typeof payload[0] === "string" ? payload[0] : payload[0]?.[0];
  if (typeof t !== "string" || !t) throw new Error("clients5 bad payload");
  return t;
}

async function gtxTranslate(text, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const errors = [];
    for (const endpoint of [gtxSingle, gtxClients5]) {
      try {
        return (await endpoint(text)).replace(/\s+\n/g, "\n").trim();
      } catch (e) {
        errors.push(e.message);
      }
    }
    if (attempt === tries) { console.warn(`  gtx failed for text (${errors.join("; ")}) — skipping`); return null; }
    await sleep(500 * attempt);
  }
}

async function main() {
  const [cards, skillJa, skillEn, existing] = await Promise.all([
    readJson("mon_ja.json"), readJson("skill_ja.json"), readJson("skill_en.json"), readExisting(),
  ]);

  const ids = collectMissingSkillIds(cards, skillJa, skillEn);
  const exactMap = buildExactEnglishMap(skillJa, skillEn);
  const out = { ...existing };
  const pending = ids.filter((id) => !out[id]);

  console.log(`JP-only used skills: ${ids.length} | already have: ${ids.length - pending.length} | pending: ${pending.length}`);

  let reused = 0, translated = 0, skipped = 0;
  for (let i = 0; i < pending.length; i += 1) {
    const id = pending[i];
    const exact = exactMap.get(JSON.stringify([skillJa[id].type, skillJa[id].params]));
    if (exact) { out[id] = exact.trim(); reused += 1; }
    else {
      const t = await gtxTranslate(skillJa[id].description);
      if (t) { out[id] = t; translated += 1; } else { skipped += 1; continue; }
      await sleep(250); // be polite to gtx
    }
    await fs.writeFile(outPath, JSON.stringify(sortObject(out), null, 2) + "\n");
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${pending.length}`);
  }

  await fs.writeFile(outPath, JSON.stringify(sortObject(out), null, 2) + "\n");
  console.log(`Done. reused=${reused} translated=${translated} skipped=${skipped} total=${Object.keys(out).length}`);
  if (skipped) console.log("Re-run to fill skipped ids (gtx transient failures).");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
