// PAD Card Dictionary — JP server data, with EN skill text where available.
// Data: mon_ja.json (cards), skill_ja.json (authoritative skill params), skill_en.json, and skill_tr.json.

const TYPES = {0:"Evo Material",1:"Balanced",2:"Physical",3:"Healer",4:"Dragon",5:"God",
  6:"Attacker",7:"Devil",8:"Machine",12:"Awoken",14:"Enhance",15:"Redeemable"};
const TYPE_ORDER = [5,4,6,7,8,3,2,1,12,14,15,0];
const ATTR = [["Fire","a0"],["Water","a1"],["Wood","a2"],["Light","a3"],["Dark","a4"]];
const AWOKEN_ORDER = [63,49,21,46,47,43,61,48,27,60,78,79,80,81,44,51,82,62,58,57,52,68,69,70,
  54,55,45,50,59,19,1,2,3,4,5,6,7,8,9,10,14,15,16,17,18,29,22,23,24,25,26,20,28,30,31,32,33,34,
  35,36,37,38,39,40,41,42,53,56,64,65,66,67,11,12,13,71,72,73,74,75,76,77,83,84,85,86,87,88,89,
  90,91,92,93,94,95,96,97,98,99,100,101,102,103,104];
const SPRITE_PER = 100;

const SORTS = [ // ported from sort_function_list (script-json_data.js:628)
  {key:"id",label:"Card ID",fn:(a,b)=>a.id-b.id},
  {key:"rarity",label:"Rarity",fn:(a,b)=>a.rarity-b.rarity},
  {key:"cost",label:"Cost",fn:(a,b)=>a.cost-b.cost},
  {key:"attr",label:"Attribute",fn:(a,b)=>(a.attrs[0]-b.attrs[0])||((a.attrs[1]??-1)-(b.attrs[1]??-1))},
  {key:"hp",label:"HP",fn:(a,b)=>(a.hp?.max||0)-(b.hp?.max||0)},
  {key:"atk",label:"ATK",fn:(a,b)=>(a.atk?.max||0)-(b.atk?.max||0)},
  {key:"rcv",label:"RCV",fn:(a,b)=>(a.rcv?.max||0)-(b.rcv?.max||0)},
  {key:"cd",label:"Skill CD",fn:(a,b)=>(SKILLS[a.activeSkillId]?.initialCooldown||0)-(SKILLS[b.activeSkillId]?.initialCooldown||0)},
];

let CARDS = [], SKILLS = [], SKILL_EN = [], SKILL_TR = {};
let SPECIAL_ENGINE = null;
// filter state — attr is 3 positional slots; awoken is an array allowing duplicates (counts)
const F = {attr:[[],[],[]], type:[], rare:[], awoken:[], inclSuper:true, assist:false, special:[], specialMode:"and", term:"", sortKey:"id", desc:true};

const $ = id => document.getElementById(id);
const grid=$("grid"), q=$("q"), sortSel=$("sort"), dirBtn=$("dir"), countEl=$("count"), dlg=$("detail");

const spriteFile = id => `images/cards_ja/CARDS_${String(Math.ceil(id/SPRITE_PER)).padStart(3,"0")}.PNG`;
const spritePos = id => { const i=(id-1)%SPRITE_PER; return `calc(var(--cell)*-${i%10}) calc(var(--cell)*-${Math.floor(i/10)})`; };
const hasEN = c => !!(c.otLangName && c.otLangName.en);
const enName = c => hasEN(c) ? c.otLangName.en : c.name;
const skillObj = sid => SKILLS[sid] || null;
function resolvedSkill(sid){
  const ja = SKILLS[sid] || null;
  const en = SKILL_EN[sid] || null;
  if (!ja && !en) return null;
  // strip PAD inline formatting codes (^ff3600^ colour, ^p reset) that leak through translation
  const clean = s => s ? s.replace(/\^[0-9a-fA-F]{6}\^/g,"").replace(/\^p/g,"").replace(/[ \t]{2,}/g," ").trim() : s;
  const enDesc = clean(en?.description?.trim());
  const trDesc = clean(SKILL_TR[String(sid)]?.trim());
  return {
    id: sid,
    name: en?.name?.trim() || ja?.name || "",
    description: enDesc || trDesc || "",
    source: enDesc ? "en" : trDesc ? "tr" : "none",
  };
}
const awkId = n => [40,46,47,48].includes(n) ? `${n}-en` : n;
const awkSvg = n => `<svg class="awk" viewBox="0 0 32 32"><use href="images/icon-awoken.svg#awoken-${awkId(n)}"/></svg>`;
// icon-awoken.svg only covers ids 0–104; newer awakenings have no glyph → labelled fallback chip (no blank gap)
const hasAwkIcon = n => n >= 0 && n <= 104;
const awkToken = n => hasAwkIcon(n) ? awkSvg(n) : `<span class="awk-x" title="Awakening ${n}">${n}</span>`;
// per-card accent = its main attribute's orb colour; theming the detail panel by element
const ATTR_ACCENT = ["#e8513b","#3b9be8","#4caf50","#f0c400","#a05bd6"];
const accentOf = c => ATTR_ACCENT[c.attrs?.[0]] ?? "#6b7280";
const typeSvg = t => `<svg class="ty" viewBox="0 0 32 32"><use href="images/icon-type.svg#type-${t}"/></svg>`;
const attrDot = a => a>=0 && a<5 ? `<span class="attr ${ATTR[a][1]}" title="${ATTR[a][0]}"></span>` : "";
function frameLayer(attr, sub){ // ported from card-avatar.css
  if (attr === 6) return `<div class="frame" style="background-image:url(images/CARDFRAMEW.png);background-position:0 0"></div>`;
  if (attr == null || attr < 0 || attr > 4) return "";
  return `<div class="frame" style="background-position:calc(-102px*${attr}) ${sub?"-104px":"0"}"></div>`;
}
const avatarHTML = (c, extra="") => `<div class="ava" style="${extra}">
  <div class="icon" style="background-image:url(${spriteFile(c.id)});background-position:${spritePos(c.id)}"></div>
  ${frameLayer(c.attrs[0])}${frameLayer(c.attrs[1], true)}</div>`;

/* ---------- matching ---------- */
function matches(c){
  for (let i=0;i<3;i++){ if (F.attr[i].length && !F.attr[i].includes(c.attrs[i])) return false; } // positional
  if (F.type.length && !c.types.some(t => F.type.includes(t))) return false;
  if (F.rare.length && !F.rare.includes(c.rarity)) return false;
  if (F.awoken.length){ // duplicates = required count of that awakening
    const aw = F.inclSuper ? [...c.awakenings, ...c.superAwakenings] : c.awakenings;
    const need={}, have={};
    F.awoken.forEach(x => need[x]=(need[x]||0)+1);
    aw.forEach(x => have[x]=(have[x]||0)+1);
    for (const k in need){ if ((have[k]||0) < need[k]) return false; }
  }
  if (F.assist && !c.canAssist) return false;
  if (F.term){
    const t=F.term, id=t.replace("#","");
    const active = resolvedSkill(c.activeSkillId);
    const leader = resolvedSkill(c.leaderSkillId);
    const skillText = [
      active?.name, active?.description,
      leader?.name, leader?.description,
    ].filter(Boolean).join(" ").toLowerCase();
    if (!(String(c.id)===id || enName(c).toLowerCase().includes(t) || c.name.includes(t) || skillText.includes(t))) return false;
  }
  return true;
}

/* ---------- rendering (incremental) ---------- */
const CHUNK = 120;
let view=[], shown=0, sentinel=null, io=null;
function cardEl(c){
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `${avatarHTML(c)}<div class="nm">#${c.id} ${enName(c)}</div>`;
  el.onclick = () => openDetail(c);
  return el;
}
function renderMore(){
  const frag = document.createDocumentFragment();
  const end = Math.min(shown+CHUNK, view.length);
  for (let i=shown;i<end;i++) frag.appendChild(cardEl(view[i]));
  grid.insertBefore(frag, sentinel);
  shown = end;
  if (shown >= view.length && io) io.unobserve(sentinel);
}
function render(list){
  view=list; shown=0;
  grid.textContent="";
  sentinel = document.createElement("div"); sentinel.id="sentinel"; grid.appendChild(sentinel);
  if (!io) io = new IntersectionObserver(es => { if (es[0].isIntersecting) renderMore(); }, {rootMargin:"600px"});
  renderMore(); io.observe(sentinel);
  countEl.textContent = `${list.length} cards`;
}
function applyView(){
  const fn = SORTS.find(s => s.key === F.sortKey).fn;
  let list = CARDS.filter(matches);
  if (F.special.length && SPECIAL_ENGINE) {
    list = SPECIAL_ENGINE.filterCardsByLeaves(list, F.special, F.specialMode);
  }
  render(list.sort((a,b) => (F.desc?-1:1)*fn(a,b)));
  saveState();
}

/* ---------- detail ---------- */
const cdText = sid => { const s=SKILLS[sid]||SKILL_EN[sid]; if(!s||!s.initialCooldown) return "";
  const min=s.initialCooldown-((s.maxLevel||1)-1); return min===s.initialCooldown?`CD ${min}`:`CD ${s.initialCooldown}→${min}`; };

function skillBlock(kind, accent, sid){
  const s = resolvedSkill(sid);
  const name = s?.name ? `<span class="sk-name">${s.name}</span>` : `<span class="sk-name dim">—</span>`;
  const cd = cdText(sid);
  const body = s?.description
    ? `${s.description}${s.source==="tr" ? ` <span class="tr-tag">translated</span>` : ""}`
    : `<span class="dim">— no English text</span>`;
  return `<section class="sk">
    <div class="eyebrow" style="color:${accent}">${kind}${cd?`<span class="cd">${cd}</span>`:""}</div>
    <div class="sk-title">${name}</div>
    <p class="sk-desc">${body}</p>
  </section>`;
}

function openDetail(c){
  const accent = accentOf(c);
  const attrs=(c.attrs||[]).map(attrDot).join("");
  const types=(c.types||[]).filter(t=>t>=0).map(t=>`<span class="chip">${TYPES[t]||`Type ${t}`}</span>`).join("");
  const awks=(c.awakenings||[]).map(awkToken).join("") || `<span class="dim">None</span>`;
  const sa=(c.superAwakenings||[]).map(awkToken).join("");
  // evolution line = cards sharing evoRootId (>0), sorted by id, current one flagged
  const line = (c.evoRootId>0 ? CARDS.filter(x=>x.evoRootId===c.evoRootId) : [c]).sort((a,b)=>a.id-b.id);
  const evoStrip = line.length>1 ? `<section class="evo">
      <div class="eyebrow" style="color:${accent}">Evolution line <span class="cd">${line.length}</span></div>
      <div class="evo-row">${line.map(m=>`<button class="evo-item${m.id===c.id?" cur":""}" data-id="${m.id}" title="#${m.id} ${enName(m)}">
        ${avatarHTML(m)}<span class="evo-id">#${m.id}</span></button>`).join("")}</div>
    </section>` : "";

  dlg.style.setProperty("--accent", accent);
  dlg.innerHTML = `
    <button class="close" onclick="detail.close()" aria-label="Close">×</button>
    <div class="d-head">
      ${avatarHTML(c, "flex:none")}
      <div class="d-head-info">
        <div id="d-name" class="d-name">${attrs}${enName(c)}</div>
        <div class="d-sub">#${c.id} · ${c.name}</div>
        <div class="d-meta">${types}<span class="chip star">★${c.rarity}</span><span class="chip">Cost ${c.cost}</span></div>
      </div>
    </div>
    <div class="d-body">
      <div class="stats">
        <div><b>HP</b>${c.hp?.max??"-"}</div><div><b>ATK</b>${c.atk?.max??"-"}</div><div><b>RCV</b>${c.rcv?.max??"-"}</div>
      </div>
      <section>
        <div class="eyebrow" style="color:${accent}">Awakenings</div>
        <div class="awk-row">${awks}</div>
        ${sa?`<div class="awk-row sup"><span class="sup-lbl">Super</span>${sa}</div>`:""}
      </section>
      ${skillBlock("Active skill", accent, c.activeSkillId)}
      ${skillBlock("Leader skill", accent, c.leaderSkillId)}
      ${evoStrip}
    </div>`;
  dlg.querySelectorAll(".evo-item").forEach(b => b.onclick = () => {
    const m = CARDS.find(x=>x.id===+b.dataset.id); if (m){ dlg.close(); openDetail(m); }
  });
  dlg.showModal();
}

/* ---------- filter UI ---------- */
function toggle(arr, v){ const i=arr.indexOf(v); i<0?arr.push(v):arr.splice(i,1); }
function buildToggleBtns(host, items, arr, html){
  host.innerHTML="";
  items.forEach(v => {
    const b=document.createElement("button");
    b.className="tg"; b.dataset.v=v; b.innerHTML=html(v);
    b.classList.toggle("on", arr.includes(v));
    b.onclick=()=>{ toggle(arr,v); b.classList.toggle("on"); applyView(); };
    host.appendChild(b);
  });
}
function buildAwokenBtns(){
  const host=$("f-awoken"); host.innerHTML="";
  AWOKEN_ORDER.forEach(id => {
    const b=document.createElement("button");
    b.className="tg awk-btn"; b.dataset.v=id;
    b.innerHTML = awkSvg(id) + `<span class="cnt"></span>`;
    const paint=()=>{ const n=F.awoken.filter(x=>x===id).length;
      b.classList.toggle("on", n>0); b.querySelector(".cnt").textContent = n>1?n:""; };
    b.onclick=()=>{ F.awoken.push(id); paint(); applyView(); };            // left-click: +1
    b.oncontextmenu=e=>{ e.preventDefault(); const i=F.awoken.indexOf(id); if(i>=0)F.awoken.splice(i,1); paint(); applyView(); }; // right-click: -1
    paint(); host.appendChild(b);
  });
}
function buildFilterUI(){
  buildToggleBtns($("f-attr1"), [0,1,2,3,4], F.attr[0], a=>`<span class="attr ${ATTR[a][1]}"></span>${ATTR[a][0]}`);
  buildToggleBtns($("f-attr2"), [0,1,2,3,4], F.attr[1], a=>`<span class="attr ${ATTR[a][1]}"></span>${ATTR[a][0]}`);
  buildToggleBtns($("f-attr3"), [0,1,2,3,4], F.attr[2], a=>`<span class="attr ${ATTR[a][1]}"></span>${ATTR[a][0]}`);
  buildToggleBtns($("f-type"), TYPE_ORDER, F.type, t=>`${typeSvg(t)}${TYPES[t]}`);
  buildToggleBtns($("f-rare"), [1,2,3,4,5,6,7,8,9,10], F.rare, r=>`★${r}`);
  buildAwokenBtns();
  buildSpecialChips();
}
function buildSpecialChips(){
  const host=$("f-special"); host.innerHTML="";
  if (!SPECIAL_ENGINE) return;
  // skip the root-level "No Filter" leaf — clearing is done by deselecting / the Clear button
  SPECIAL_ENGINE.tree.children
    .filter(node => !(node.type === "leaf" && /no filter/i.test(node.label)))
    .forEach(node => host.appendChild(specialNodeEl(node, 0)));
}
function specialNodeEl(node, depth){
  if (node.type === "leaf") {
    const b=document.createElement("button");
    b.className="tg special-leaf"; b.dataset.v=node.key; b.textContent=node.label;
    b.style.marginLeft = `${Math.min(depth, 5) * 10}px`;
    b.classList.toggle("on", F.special.includes(node.key));
    b.onclick=()=>{ toggle(F.special,node.key); b.classList.toggle("on"); applyView(); };
    return b;
  }
  const details=document.createElement("details");
  details.className="special-node";
  details.open = depth < 1;
  const summary=document.createElement("summary");
  summary.textContent=node.label;
  details.appendChild(summary);
  const body=document.createElement("div");
  body.className="special-children";
  node.children.forEach(child => body.appendChild(specialNodeEl(child, depth+1)));
  details.appendChild(body);
  return details;
}
function refreshBtnStates(){
  [0,1,2].forEach(i => document.querySelectorAll(`#f-attr${i+1} .tg`).forEach(b=>b.classList.toggle("on", F.attr[i].includes(+b.dataset.v))));
  document.querySelectorAll("#f-type .tg").forEach(b=>b.classList.toggle("on", F.type.includes(+b.dataset.v)));
  document.querySelectorAll("#f-rare .tg").forEach(b=>b.classList.toggle("on", F.rare.includes(+b.dataset.v)));
  document.querySelectorAll("#f-awoken .awk-btn").forEach(b=>{ const n=F.awoken.filter(x=>x===+b.dataset.v).length;
    b.classList.toggle("on", n>0); b.querySelector(".cnt").textContent=n>1?n:""; });
  document.querySelectorAll("#f-special .tg").forEach(b=>b.classList.toggle("on", F.special.includes(b.dataset.v)));
  $("incl-super").checked=F.inclSuper; $("can-assist").checked=F.assist;
  $("special-mode").textContent=F.specialMode.toUpperCase();
  q.value=F.term; sortSel.value=F.sortKey; dirBtn.textContent=F.desc?"↓ desc":"↑ asc";
}

/* ---------- special search: user-saved presets (full filter snapshots) ---------- */
const PK="paddict.presets";
const loadPresets=()=>{ try{ return JSON.parse(localStorage.getItem(PK))||{}; }catch{ return {}; } };
const savePresets=p=>localStorage.setItem(PK, JSON.stringify(p));
const snapshot=()=>JSON.parse(JSON.stringify(F));
function applySnapshot(s){ Object.assign(F, s); buildFilterUI(); refreshBtnStates(); applyView(); }
function refreshPresetSelect(){
  const p=loadPresets();
  $("preset").innerHTML=`<option value="">— saved —</option>`+Object.keys(p).map(n=>`<option value="${n}">${n}</option>`).join("");
}
function initPresets(){
  refreshPresetSelect();
  $("preset").onchange=e=>{ const p=loadPresets()[e.target.value]; if(p) applySnapshot(p); };
  $("preset-save").onclick=()=>{ const name=prompt("Save current filters as:"); if(!name)return;
    const p=loadPresets(); p[name]=snapshot(); savePresets(p); refreshPresetSelect(); $("preset").value=name; };
  $("preset-del").onclick=()=>{ const sel=$("preset"); if(!sel.value)return;
    const p=loadPresets(); delete p[sel.value]; savePresets(p); refreshPresetSelect(); };
}

/* ---------- state persistence (v2 shape) ---------- */
const SK="paddict.state2";
const saveState=()=>localStorage.setItem(SK, JSON.stringify(F));
function restoreState(){ try{ const s=JSON.parse(localStorage.getItem(SK)); if(s&&Array.isArray(s.attr)&&Array.isArray(s.attr[0])) Object.assign(F,s); }catch{} }

/* ---------- wiring ---------- */
let t;
q.oninput=()=>{ clearTimeout(t); t=setTimeout(()=>{ F.term=q.value.trim().toLowerCase(); applyView(); }, 150); };
sortSel.innerHTML=SORTS.map(s=>`<option value="${s.key}">${s.label}</option>`).join("");
sortSel.onchange=()=>{ F.sortKey=sortSel.value; applyView(); };
dirBtn.onclick=()=>{ F.desc=!F.desc; dirBtn.textContent=F.desc?"↓ desc":"↑ asc"; applyView(); };
$("incl-super").onchange=e=>{ F.inclSuper=e.target.checked; applyView(); };
$("can-assist").onchange=e=>{ F.assist=e.target.checked; applyView(); };
$("special-mode").onclick=()=>{ F.specialMode=F.specialMode==="and"?"or":"and"; $("special-mode").textContent=F.specialMode.toUpperCase(); applyView(); };
$("clear").onclick=()=>{ Object.assign(F,{attr:[[],[],[]],type:[],rare:[],awoken:[],assist:false,special:[],term:""});
  buildFilterUI(); refreshBtnStates(); applyView(); };

restoreState();
Promise.all([
  fetch("monsters-info/mon_ja.json").then(r=>r.json()),
  fetch("monsters-info/skill_en.json").then(r=>r.json()),
  fetch("monsters-info/skill_ja.json").then(r=>r.json()),
  fetch("monsters-info/skill_tr.json").then(r=>r.ok?r.json():{}).catch(()=>({})),
]).then(([cards, skillEn, skillJa, skillTr]) => {
  SKILLS=skillJa;
  SKILL_EN=skillEn;
  SKILL_TR=skillTr || {};
  CARDS=cards.filter(c=>!c.isEmpty&&c.enabled);
  if (!window.PADEngine?.createSpecialSearchEngine) throw new Error("engine.js did not load");
  SPECIAL_ENGINE=window.PADEngine.createSpecialSearchEngine({cards, skills: skillJa});
  buildFilterUI(); refreshBtnStates(); initPresets(); applyView();
}).catch(e => { grid.textContent="Failed to load data: "+e.message; });
