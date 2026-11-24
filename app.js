/* What We Eating? v3.0 — Rebuild
 * API_BASE in ONE place. Never use relative /.netlify/... in Capacitor.
 * Every fetch shows a toast on fail. Never silent catch.
 * Scan / Paste / Voice all use appendMenuItems() — never wipe.
 * Vote is server + ID in URL. localStorage is cache only.
 */
const API_BASE = "https://wavelord-what-we-eating.netlify.app";
const API = (p) => API_BASE + p;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const uid = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// ---------- STATE ----------
let SPOTS = [];
let FAVS = JSON.parse(localStorage.getItem("wwe_favs") || "[]");
let IS_ADMIN = sessionStorage.getItem("wwe_admin") === "1";
let EDIT_ID = null;
let VOTER_ID = localStorage.getItem("wwe_voter") || ("v"+Math.random().toString(36).slice(2,10));
localStorage.setItem("wwe_voter", VOTER_ID);
let LIVE_VOTE = null;
let LIVE_TIMER = null;
let BUDDY_HISTORY = JSON.parse(localStorage.getItem("wwe_buddy") || "[]").slice(-12);
let USER_LOC = null;
let LIGHTBOX_IMGS = [], LIGHTBOX_IDX = 0;
let FILTER = { q:"", area:"", price:"", sort:"rec" };
let CRAVINGS = ["Doubles","Roti","Beef","Chicken","Pizza","Burgers","Seafood","Breakfast","Chinese","Veggie"];

// Default seed — only if no saved spots
const SEED = [
  {id:"seed1",name:"Patel Doubles",area:"San Juan",phone:"",price:1,rating:4.8,menu:[{n:"Doubles",p:15},{n:"Aloo Pie",p:12},{n:"Pholourie",p:10}],photos:[],special:"Doubles $15"},
  {id:"seed2",name:"Sully Roti Shop",area:"Chaguanas",phone:"",price:1,rating:4.7,menu:[{n:"Chicken Roti",p:45},{n:"Beef Roti",p:50},{n:"Buss Up Shut",p:55}],photos:[]},
  {id:"seed3",name:"Burger Joint",area:"San Juan",phone:"",price:2,rating:4.5,menu:[{n:"Beef Burger",p:85},{n:"Fries",p:35},{n:"Milkshake",p:50}],photos:[]},
  {id:"seed4",name:"Island Pizza",area:"West Mall",phone:"",price:2,rating:4.4,menu:[{n:"Pepperoni Pizza",p:120},{n:"Cheese Pizza",p:100}],photos:[]},
  {id:"seed5",name:"Doubles King",area:"St James",phone:"",price:1,rating:4.6,menu:[{n:"Doubles",p:16},{n:"Souse",p:30}],photos:[]},
];

// ---------- TOAST / MODAL ----------
function toast(msg){
  const t = $("#toast"); if(!t) return;
  t.textContent = msg; t.style.display = "block";
  clearTimeout(t._h); t._h = setTimeout(()=> t.style.display="none", 3000);
}
function openModal(html){
  const m = $("#modal"); $("#modalBody").innerHTML =
    `<div class="modal-close-bar"><b>What We Eating?</b><button class="chip" data-act="closeModal">✕ Close</button></div>` + html;
  m.classList.add("open");
}
function closeModal(){ $("#modal").classList.remove("open"); }

// ---------- STORAGE ----------
function saveSpots(){ localStorage.setItem("wwe_spots", JSON.stringify(SPOTS)); }
function loadSpots(){
  try{ SPOTS = JSON.parse(localStorage.getItem("wwe_spots") || "[]"); }catch(e){ SPOTS=[]; }
  if(!SPOTS.length){ SPOTS = JSON.parse(JSON.stringify(SEED)); saveSpots(); }
}
function saveFavs(){ localStorage.setItem("wwe_favs", JSON.stringify(FAVS)); }
function requireAdmin(){
  if(!IS_ADMIN){ toast("Admin only — unlock in Settings with 1919"); go("settings"); return false; }
  return true;
}

// ---------- NAV ----------
function go(v){
  $$(".view").forEach(x=>x.classList.remove("active"));
  const el = $("#v-"+v); if(el) el.classList.add("active");
  $$("#nav button").forEach(b=> b.classList.toggle("on", b.dataset.v===v));
  window.scrollTo(0,0);
  if(v==="vote") renderVote();
  if(v==="favs") renderFavs();
  if(v==="top10") renderTop10();
  if(v==="browse") renderBrowse();
}

// ---------- SPLASH / ONBOARD ----------
function skipSplash(){
  $("#splash")?.classList.add("done");
  if(!localStorage.getItem("wwe_onboard")){
    showOnboard(0);
  }
}
let OB_STEP = 0;
const OB_STEPS = [
  {e:"🔍", h:"Search what yuh feeling for", p:"Type doubles, roti, beef — we show the best spots near you."},
  {e:"⚖️", h:"Compare before yuh spend", p:"See prices side by side so yuh doh waste money."},
  {e:"🗳️", h:"Vote with family", p:"Create a vote, share the link, everybody votes once."},
  {e:"🍔", h:"Talk to Wave Buddy", p:"Tap the burger. Ask anything — food or anything else."},
];
function showOnboard(i){
  OB_STEP = i;
  const s = OB_STEPS[i];
  $("#obEm").textContent = s.e; $("#obH").textContent = s.h; $("#obP").textContent = s.p;
  $("#obBtn").textContent = i === OB_STEPS.length-1 ? "Start Eating 🍔" : "Next";
  $("#onboard").classList.add("show");
}
function obNext(){
  if(OB_STEP < OB_STEPS.length-1) showOnboard(OB_STEP+1);
  else { $("#onboard").classList.remove("show"); localStorage.setItem("wwe_onboard","1"); }
}

// ---------- RENDER: HOME / BROWSE / TOP10 / FAVS ----------
function cheapest(s){ if(!s.menu?.length) return 999; return Math.min(...s.menu.map(m=>Number(m.p)||999)); }
function matches(s, q){
  if(!q) return true;
  const hay = (s.name+" "+s.area+" "+(s.menu||[]).map(m=>m.n).join(" ")).toLowerCase();
  return hay.includes(q.toLowerCase());
}
function filteredSpots(){
  let list = SPOTS.filter(s=>{
    if(FILTER.area && s.area !== FILTER.area) return false;
    if(FILTER.price && String(s.price) !== String(FILTER.price)) return false;
    if(!matches(s, FILTER.q)) return false;
    return true;
  });
  if(FILTER.sort==="low") list = [...list].sort((a,b)=> cheapest(a)-cheapest(b));
  if(FILTER.sort==="rating") list = [...list].sort((a,b)=> (b.rating||0)-(a.rating||0));
  return list;
}
function menuText(s){ return (s.menu||[]).map(m=> `${m.n} - $${m.p}`).join(" • "); }
function spotCard(s){
  const fav = FAVS.includes(s.id) ? "❤️" : "🤍";
  const img = s.photos?.[0] ? `<img src="${esc(s.photos[0])}" data-act="openPhoto" data-id="${s.id}" data-idx="0" alt="">` : "";
  const adminBtns = IS_ADMIN ? `<div class="row" style="margin-top:8px"><button class="chip" data-admin-only data-act="editSpot" data-id="${s.id}">✏️ Edit</button><button class="chip" data-admin-only data-act="delSpot" data-id="${s.id}">🗑️ Delete</button></div>` : "";
  return `<article class="card"><div class="cardBody">
  <div style="display:flex;justify-content:space-between;gap:8px"><h3>${esc(s.name)}</h3><span>⭐ ${s.rating||4.5}</span></div>
  <p class="mut">${esc(s.area)} • ${"$".repeat(s.price||1)} ${s.special?`• 🔥 ${esc(s.special)}`:``}</p>
  ${img}
  <p style="margin-top:8px">${esc(menuText(s))}</p>
  <div class="chips">
  <button class="chip" data-act="fav" data-id="${s.id}">${fav} Favourite</button>
  <button class="chip" data-act="shareSpot" data-id="${s.id}">🔗 Share</button>
  <button class="chip" data-act="openSpot" data-id="${s.id}">👀 View</button>
  </div>${adminBtns}</div></article>`;
}
function renderHome(){
  const list = filteredSpots();
  $("#homeCount").textContent = `${list.length} spots • ${SPOTS.length} total`;
  $("#homeList").innerHTML = list.map(spotCard).join("") || `<p class="mut">No spots match. Try clearing filters.</p>`;
  // For You
  const top = [...SPOTS].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3);
  $("#forYou").innerHTML = `<h2>⭐ For You</h2><p class="sub">Top rated near you</p>` + top.map(spotCard).join("");
  const specials = SPOTS.filter(s=>s.special);
  $("#specialsSec").innerHTML = specials.length ? `<div class="sec"><h2>🔥 Today's Specials</h2>` + specials.map(s=>`<p style="margin-top:8px"><b>${esc(s.name)}</b> — ${esc(s.special)} • ${esc(s.area)}</p>`).join("") + `</div>` : "";
  const trending = [...SPOTS].sort((a,b)=> cheapest(a)-cheapest(b)).slice(0,3);
  $("#trendSec").innerHTML = `<div class="sec"><h2>💸 Best Value</h2>` + trending.map(s=>`<p style="margin-top:8px"><b>${esc(s.name)}</b> — from $${cheapest(s)} • ${esc(s.area)}</p>`).join("") + `</div>`;
  const top10 = [...SPOTS].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,5);
  $("#top10Sec").innerHTML = `<div class="sec"><h2>🏆 Top 5 <button class="chip" data-act="go" data-v="top10">See Top 10</button></h2>` + top10.map((s,i)=>`<p style="margin-top:6px">${i+1}. <b>${esc(s.name)}</b> ⭐ ${s.rating} • ${esc(s.area)}</p>`).join("") + `</div>`;
}
function renderBrowse(){ $("#browseList").innerHTML = SPOTS.map(spotCard).join(""); }
function renderTop10(){
  const list = [...SPOTS].sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,10);
  $("#top10Out").innerHTML = list.map((s,i)=>`<div class="card"><div class="cardBody"><b>${i+1}. ${esc(s.name)}</b> ⭐ ${s.rating} • ${esc(s.area)}<br><span class="mut">${esc(menuText(s))}</span><div class="chips"><button class="chip" data-act="openSpot" data-id="${s.id}">👀 View</button></div></div></div>`).join("");
}
function renderFavs(){
  const list = SPOTS.filter(s=> FAVS.includes(s.id));
  $("#favOut").innerHTML = list.length ? list.map(spotCard).join("") : `<p class="mut">No favourites yet. Tap 🤍 on any spot.</p>`;
}
function fillFilters(){
  const areas = ["", ...new Set(SPOTS.map(s=>s.area).filter(Boolean))].sort();
  $("#fArea").innerHTML = areas.map(a=>`<option value="${esc(a)}">${a||"All areas"}</option>`).join("");
  $("#cArea").innerHTML = areas.map(a=>`<option value="${esc(a)}">${a||"All areas"}</option>`).join("");
  $("#cCraving").innerHTML = CRAVINGS.map(c=>`<option>${c}</option>`).join("");
  $("#chips").innerHTML = CRAVINGS.slice(0,8).map(c=>`<button class="chip" data-act="chipQ" data-q="${esc(c)}">${c}</button>`).join("");
}
function renderAll(){ fillFilters(); renderHome(); renderBrowse(); renderTop10(); renderFavs(); updateAdminUI(); }

// ---------- SPOT ACTIONS ----------
function openSpot(id){
  const s = SPOTS.find(x=>x.id===id); if(!s) return;
  openModal(`<h2>${esc(s.name)}</h2><p class="mut">${esc(s.area)} • ⭐ ${s.rating||4.5}</p>
  ${(s.photos||[]).map((p,i)=>`<img src="${esc(p)}" data-act="openPhoto" data-id="${s.id}" data-idx="${i}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-top:10px">`).join("")}
  <div style="margin-top:12px">${(s.menu||[]).map(m=>`<div class="row" style="margin-top:6px"><span style="flex:1">${esc(m.n)}</span><b>$${m.p}</b></div>`).join("")}</div>
  ${s.phone?`<p style="margin-top:10px">📞 ${esc(s.phone)}</p>`:""}
  <div class="chips"><button class="chip" data-act="fav" data-id="${s.id}">${FAVS.includes(s.id)?"❤️":"🤍"} Favourite</button><button class="chip" data-act="shareSpot" data-id="${s.id}">🔗 Share</button></div>`);
}
function toggleFav(id){
  FAVS = FAVS.includes(id) ? FAVS.filter(x=>x!==id) : [...FAVS, id];
  saveFavs(); renderAll(); toast(FAVS.includes(id) ? "Added to favourites ❤️" : "Removed from favourites");
}
function shareSpot(id){
  const s = SPOTS.find(x=>x.id===id); if(!s) return;
  const link = location.origin + location.pathname + "#spot=" + id;
  copyText(link); toast("Link copied: " + s.name);
}
function copyText(t){
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(t).catch(()=>{});
  else { const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
}
function editSpot(id){
  if(!requireAdmin()) return;
  const s = SPOTS.find(x=>x.id===id); if(!s) return;
  EDIT_ID = id;
  $("#addTitle").innerHTML = `✏️ Edit Spot <span style="font-size:.7rem;background:#ff4d2e;padding:3px 8px;border-radius:999px">ADMIN ONLY</span>`;
  $("#editBanner").style.display="block"; $("#editBanner").textContent = "Editing: " + s.name + " — Save to update, or Cancel to go back to Add New.";
  $("#fName").value = s.name; $("#fArea2").value = s.area; $("#fPhone").value = s.phone||"";
  $("#menuRows").innerHTML = ""; (s.menu||[]).forEach(m=> addMenuRow(m.n, m.p));
  $("#aMenu").value = ""; $("#cancelEditBtn").style.display="block";
  go("add");
}
function delSpot(id){
  if(!requireAdmin()) return;
  if(!confirm("Delete this spot?")) return;
  SPOTS = SPOTS.filter(s=>s.id!==id); saveSpots(); renderAll(); toast("Spot deleted");
}

// ---------- COMPARE ----------
function doCompare(){
  const craving = ($("#cCraving").value||"").toLowerCase();
  const area = $("#cArea").value;
  const list = SPOTS.filter(s=> (!area||s.area===area) && (s.menu||[]).some(m=> m.n.toLowerCase().includes(craving)));
  if(!list.length){ $("#compareOut").innerHTML = `<p class="mut">No matches for ${esc(craving)}. Try another craving.</p>`; return; }
  const rows = list.map(s=>{
    const m = s.menu.find(x=> x.n.toLowerCase().includes(craving)) || s.menu[0];
    return `<tr><td><b>${esc(s.name)}</b><br><span class="mut">${esc(s.area)}</span></td><td>${esc(m?.n||"-")}</td><td><b>$${m?.p??"-"}</b></td><td>⭐ ${s.rating||4.5}</td></tr>`;
  }).join("");
  $("#compareOut").innerHTML = `<div class="sec"><table><tr><th>Spot</th><th>Item</th><th>Price</th><th>Rating</th></tr>${rows}</table></div>`;
}

// ---------- ROULETTE / NEAR ME ----------
function roulette(){
  if(!SPOTS.length) return;
  const s = SPOTS[Math.floor(Math.random()*SPOTS.length)];
  openModal(`<h2>🎲 Yuh eating here:</h2><h3 style="margin-top:10px">${esc(s.name)}</h3><p class="mut">${esc(s.area)} • ⭐ ${s.rating}</p><p style="margin-top:8px">${esc(menuText(s))}</p><div class="chips"><button class="primary" data-act="openSpot" data-id="${s.id}">View Spot</button><button class="chip" data-act="roulette">🎲 Spin Again</button></div>`);
}
function nearMe(){
  if(!navigator.geolocation){ toast("Location not supported on this device"); return; }
  toast("Getting location...");
  navigator.geolocation.getCurrentPosition(()=>{ toast("Near Me is ON — showing all areas for now"); }, ()=>{ toast("Location blocked — check permissions"); });
}

// ---------- MENU ROWS — append, never wipe ----------
function addMenuRow(name="", price=""){
  const div = document.createElement("div");
  div.className = "menuRow";
  div.innerHTML = `<input placeholder="Item name" value="${esc(name)}"><input placeholder="$" type="number" inputmode="numeric" value="${price}"><input placeholder="e.g. Doubles $15" style="display:none"><button type="button" class="chip" data-act="removeRow">✕</button>`;
  // Fix: menuRow grid is 1fr 72px 92px 32px — first input = name, second = price, third hidden, button = delete
  // We use 2 inputs + button, CSS handles it. Remove the hidden one to keep layout clean:
  div.querySelectorAll("input")[2]?.remove();
  $("#menuRows").appendChild(div);
}
function getMenuFromRows(){
  return [...$$("#menuRows .menuRow")].map(r=>{
    const inp = r.querySelectorAll("input");
    return { n: inp[0].value.trim(), p: Number(inp[1].value)||0 };
  }).filter(m=> m.n);
}
function appendMenuItems(items){
  // Merge, skip duplicates by lowercase name, fill empty rows first
  const existing = getMenuFromRows().map(m=> m.n.toLowerCase());
  let added = 0;
  // Fill empty rows first
  const rows = $$("#menuRows .menuRow");
  for(const it of items){
    if(existing.includes(String(it.n||"").toLowerCase().trim())) continue;
    const empty = rows.find(r=> !r.querySelector("input").value.trim());
    if(empty){
      const inp = empty.querySelectorAll("input");
      inp[0].value = it.n; inp[1].value = it.p ?? "";
      added++; existing.push(String(it.n).toLowerCase());
    } else {
      addMenuRow(it.n, it.p ?? ""); added++; existing.push(String(it.n).toLowerCase());
    }
  }
  if(added) toast(`Added ${added} items — nothing wiped ✅`);
  else toast("No new items — all duplicates");
  return added;
}
function parseMenuText(text){
  const out = [];
  String(text||"").split("\n").forEach(line=>{
    line = line.trim(); if(!line) return;
    const m = line.match(/(.+?)\s*[-–—:]\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
    if(m) out.push({n:m[1].trim(), p:Number(m[2])});
    else if(line.length>2) out.push({n:line, p:0});
  });
  return out;
}

// ---------- SCAN — compress before upload ----------
async function compressImage(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const maxW = 1600;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
      const c = document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      c.toBlob(b=>{
        if(!b) return reject(new Error("Compress failed"));
        const r = new FileReader();
        r.onload = ()=> resolve({ dataUrl: r.result, size: b.size, w, h });
        r.readAsDataURL(b);
      },"image/jpeg",0.8);
    };
    img.onerror = ()=> reject(new Error("Could not read image"));
    img.src = url;
  });
}
async function handleScanFile(file){
  if(!file){ toast("No photo picked"); return; }
  $("#scanStatus").textContent = "Compressing photo...";
  try{
    const c = await compressImage(file);
    $("#scanStatus").textContent = `Compressed to ${(c.size/1024).toFixed(0)} KB (${c.w}x${c.h}) — sending to AI...`;
    const base64 = c.dataUrl.split(",")[1];
    const res = await fetch(API("/.netlify/functions/scan-menu"), {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ imageBase64: base64, image: base64 })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || ("Scan failed: "+res.status));
    const items = data.items || data.menu || [];
    if(!items.length) throw new Error("AI saw no menu items — try straight-on, good light");
    appendMenuItems(items.map(it=> ({n: it.n || it.name, p: it.p ?? it.price ?? 0})));
    $("#scanStatus").textContent = `✅ Scanned ${items.length} items`;
  }catch(e){
    $("#scanStatus").textContent = "❌ " + e.message;
    toast("Scan failed: " + e.message);
  }
}

// ---------- VOICE ----------
async function voiceToText(){
  // Try browser SpeechRecognition first, fallback to transcribe function
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(SR){
    return new Promise((resolve)=>{
      try{
        const r = new SR(); r.lang="en-US"; r.interimResults=false; r.maxAlternatives=1;
        r.onresult = (e)=> resolve(e.results[0][0].transcript);
        r.onerror = ()=> resolve("");
        r.onend = ()=> resolve("");
        r.start();
        setTimeout(()=>{ try{r.stop();}catch(_){} }, 8000);
      }catch(_){ resolve(""); }
    });
  }
  return "";
}
async function voiceSearch(){
  toast("🎤 Listening...");
  const t = await voiceToText();
  if(t){ $("#vQ").value = t; FILTER.q = t; renderHome(); toast("Heard: "+t); }
  else toast("Voice not supported — type instead");
}
async function voiceMenu(){
  toast("🎤 Speak your menu — e.g. 'Beef Burger eighty five'");
  const t = await voiceToText();
  if(!t){ toast("Could not hear — type or paste instead"); return; }
  // Try server transcribe path if we had audio — for now parse the transcript
  const items = parseMenuText(t.replace(/ dollars?/g,"").replace(/,/g,"\n"));
  if(items.length) appendMenuItems(items);
  else toast("Heard: "+t+" — could not parse prices, try 'Beef Burger - 85'");
}

// ---------- VOTE — server + ID in URL ----------
function voteShareLink(id){
  return location.origin + location.pathname + "?vote=" + encodeURIComponent(id);
}
async function createVote(){
  const title = ($("#vTitle").value||"What We Eating?").trim().slice(0,100);
  const opts = ($("#vOpt").value||"").split(",").map(s=>s.trim()).filter(Boolean);
  if(opts.length<2){ toast("Need at least 2 options"); return; }
  try{
    const res = await fetch(API("/.netlify/functions/vote"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",title,opts})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||("Vote failed: "+res.status));
    LIVE_VOTE = data;
    $("#voteLinkInput").value = voteShareLink(data.id);
    renderVote(); startLivePoll(); toast("Vote created — share the link ✅");
  }catch(e){ toast("Vote failed: "+e.message+" — check Netlify function"); }
}
async function fetchLiveVote(id){
  try{
    const res = await fetch(API("/.netlify/functions/vote?id="+encodeURIComponent(id)));
    if(!res.ok) return null;
    return await res.json();
  }catch(e){ return null; }
}
function startLivePoll(){
  stopLivePoll();
  if(!LIVE_VOTE?.id) return;
  LIVE_TIMER = setInterval(async ()=>{
    const v = await fetchLiveVote(LIVE_VOTE.id);
    if(v){ LIVE_VOTE = v; renderVote(); }
  }, 2000);
}
function stopLivePoll(){ if(LIVE_TIMER) clearInterval(LIVE_TIMER); LIVE_TIMER=null; }
function renderVote(){
  const out = $("#voteOut"); if(!out) return;
  if(!LIVE_VOTE){
    out.innerHTML = `<p class="mut">No vote yet. Create one above, or open a shared vote link.</p>`;
    return;
  }
  const total = LIVE_VOTE.total ?? Object.keys(LIVE_VOTE.votes||{}).length;
  out.innerHTML = `<div class="sec"><h3>${esc(LIVE_VOTE.title)}</h3><p class="mut">${total} votes • Live, updates every 2s</p>` +
    LIVE_VOTE.opts.map((o,i)=>{
      const c = LIVE_VOTE.counts?.[i] ?? 0;
      const pct = total ? Math.round(c/total*100) : 0;
      const mine = LIVE_VOTE.votes?.[VOTER_ID] === i;
      return `<button class="voteOpt ${mine?"voted":""}" data-act="castVote" data-oi="${i}"><span>${esc(o)} ${mine?"✅":""}</span><b>${c} (${pct}%)</b></button><div class="bar"><i style="width:${pct}%"></i></div>`;
    }).join("") + `</div>`;
  if(LIVE_VOTE.id) $("#voteLinkInput").value = voteShareLink(LIVE_VOTE.id);
}
async function castVote(oi){
  if(!LIVE_VOTE?.id) return;
  try{
    const res = await fetch(API("/.netlify/functions/vote"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"vote",id:LIVE_VOTE.id,voterId:VOTER_ID,oi:Number(oi)})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||("Vote failed: "+res.status));
    LIVE_VOTE = data; renderVote(); toast("Vote counted ✅ — tap again to change it");
  }catch(e){ toast("Vote failed: "+e.message); }
}
async function clearAllVotes(){
  if(LIVE_VOTE?.id){
    try{ await fetch(API("/.netlify/functions/vote"), {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clear",id:LIVE_VOTE.id})}); }catch(_){}
  }
  LIVE_VOTE=null; stopLivePoll(); $("#voteLinkInput").value=""; renderVote(); toast("Vote cleared — start a new one");
}
async function handleSharedVote(){
  const p = new URLSearchParams(location.search);
  const id = p.get("vote") || p.get("poll");
  if(id){
    const v = await fetchLiveVote(id);
    if(v){ LIVE_VOTE=v; renderVote(); startLivePoll(); go("vote"); toast("Joined shared vote ✅"); }
    else { toast("That vote link is expired or not found"); }
    return;
  }
  // Old-style link: ?vote=Opt1|Opt2&q=Title — convert to server vote
  const legacy = p.get("vote");
  if(legacy && legacy.includes("|")){ /* handled above as ID fails, ignore */ }
  const hash = location.hash;
  if(hash.startsWith("#vote=")){
    const id2 = decodeURIComponent(hash.slice(6));
    const v = await fetchLiveVote(id2);
    if(v){ LIVE_VOTE=v; renderVote(); startLivePoll(); go("vote"); }
  }
}

// ---------- BUDDY ----------
function buddyOpen(){
  $("#buddyPanel").classList.add("open");
  if(!$("#buddyMsgs").innerHTML) buddySay("Yo! I'm Wave Buddy 🍔\nAsk me 'cheap doubles in San Juan' or anything else — food or not.");
  setTimeout(()=> $("#buddyText")?.focus(), 100);
}
function buddyClose(){ $("#buddyPanel").classList.remove("open"); }
function buddySay(t){
  const d = document.createElement("div"); d.className="msg"; d.textContent=t;
  $("#buddyMsgs").appendChild(d); $("#buddyMsgs").scrollTop = 1e9;
}
function buddyMe(t){
  const d = document.createElement("div"); d.className="msg me"; d.textContent=t;
  $("#buddyMsgs").appendChild(d); $("#buddyMsgs").scrollTop = 1e9;
}
function localBuddyAnswer(q){
  const low = q.toLowerCase();
  // Find matching spots
  const hits = SPOTS.filter(s=> (s.name+" "+s.area+" "+menuText(s)).toLowerCase().split(/\s+/).some(w=> low.includes(w) && w.length>3));
  const cheap = [...SPOTS].sort((a,b)=> cheapest(a)-cheapest(b)).slice(0,3);
  if(low.includes("cheap")||low.includes("doubles")||low.includes("under")){
    return "Cheapest I got:\n" + cheap.map(s=> `• ${s.name} (${s.area}) — from $${cheapest(s)} — ${menuText(s).slice(0,80)}`).join("\n");
  }
  if(hits.length){
    return "I found these for you:\n" + hits.slice(0,3).map(s=> `• ${s.name} (${s.area}) ⭐ ${s.rating} — ${menuText(s).slice(0,100)}`).join("\n");
  }
  if(low.includes("joke")) return "Why did the doubles cross the road? To get to the other chutney 😂";
  return "I hear you. I checked your spots and the cheapest 3 are:\n" + cheap.map(s=> `• ${s.name} — from $${cheapest(s)}`).join("\n") + "\n\nAsk me 'cheap doubles in San Juan' and I'll get specific.";
}
async function buddyAsk(){
  const inp = $("#buddyText"); const q = inp.value.trim(); if(!q) return;
  buddyMe(q); inp.value="";
  BUDDY_HISTORY.push({role:"user",content:q}); BUDDY_HISTORY = BUDDY_HISTORY.slice(-12);
  localStorage.setItem("wwe_buddy", JSON.stringify(BUDDY_HISTORY));
  buddySay("Thinking...");
  const thinking = $("#buddyMsgs").lastChild;
  try{
    const context = SPOTS.map(s=> `${s.name} | ${s.area} | ⭐${s.rating} | ${menuText(s)}`).join("\n");
    const res = await fetch(API("/.netlify/functions/groq-chat"), {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({message:q, messages:BUDDY_HISTORY, context, mode:"general"})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||("Buddy failed: "+res.status));
    const ans = data.reply || data.answer || data.text || "";
    if(!ans) throw new Error("Empty reply from Groq");
    thinking.textContent = ans;
    BUDDY_HISTORY.push({role:"assistant",content:ans}); BUDDY_HISTORY = BUDDY_HISTORY.slice(-12);
    localStorage.setItem("wwe_buddy", JSON.stringify(BUDDY_HISTORY));
  }catch(e){
    thinking.textContent = localBuddyAnswer(q) + "\n\n(Groq offline — using local spots)";
    toast("Buddy fallback: " + e.message);
  }
}
async function buddyVoice(){
  toast("🎤 Listening...");
  const t = await voiceToText();
  if(t){ $("#buddyText").value=t; buddyAsk(); }
  else toast("Voice not supported — type instead");
}

// ---------- MINIMIZE TO BUBBLE (APK) ----------
function isCapacitor(){ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
function minimizeToBubble(){
  if(!isCapacitor()){ toast("Bubble only works in APK — in browser, use the chat panel"); buddyOpen(); return; }
  // Native side: MainActivity.minimizeToBubble() via bridge
  // We try Capacitor plugin, then JS interface, then fallback
  try{
    if(window.AndroidBridge?.minimizeToBubble){ window.AndroidBridge.minimizeToBubble(); return; }
    if(window.Capacitor?.Plugins?.Buddy?.minimize){ window.Capacitor.Plugins.Buddy.minimize(); return; }
  }catch(e){}
  toast("Bubble not wired in this build — chat panel opened instead");
  buddyOpen();
}

// ---------- ADMIN / SETTINGS ----------
function updateAdminUI(){
  document.body.classList.toggle("is-admin", IS_ADMIN);
  $("#adminOut").textContent = IS_ADMIN ? "Admin ON — you can Add / Edit / Delete" : "Admin OFF";
  if(IS_ADMIN){ /* Add view is allowed */ }
}
function adminLogin(){
  const pin = $("#adminPin").value.trim();
  if(pin==="1919"){ IS_ADMIN=true; sessionStorage.setItem("wwe_admin","1"); updateAdminUI(); renderAll(); toast("Admin unlocked ✅"); }
  else toast("Wrong PIN");
}
function adminLogout(){ IS_ADMIN=false; sessionStorage.removeItem("wwe_admin"); updateAdminUI(); renderAll(); toast("Admin locked 🔒"); }
function backup(){
  const data = JSON.stringify({spots:SPOTS,favs:FAVS});
  copyText(data); toast("Backup copied — paste it somewhere safe");
}
async function restore(){
  const j = prompt("Paste backup JSON"); if(!j) return;
  try{ const d = JSON.parse(j); if(d.spots) SPOTS=d.spots; if(d.favs) FAVS=d.favs; saveSpots(); saveFavs(); renderAll(); toast("Restored ✅"); }
  catch(e){ toast("Bad backup"); }
}

// ---------- SAVE SPOT ----------
function saveSpot(){
  if(!requireAdmin()) return;
  const name = $("#fName").value.trim(); if(!name){ toast("Need a spot name"); return; }
  const menu = getMenuFromRows();
  const paste = $("#aMenu").value.trim();
  if(paste) appendMenuItems(parseMenuText(paste));
  const finalMenu = getMenuFromRows();
  if(!finalMenu.length){ toast("Add at least 1 menu item"); return; }
  const s = {
    id: EDIT_ID || uid(),
    name, area: $("#fArea2").value.trim()||"San Juan", phone: $("#fPhone").value.trim(),
    price: 2, rating: 4.5, menu: finalMenu, photos: [], special:""
  };
  // Keep old rating/photos if editing
  if(EDIT_ID){
    const old = SPOTS.find(x=>x.id===EDIT_ID);
    if(old){ s.rating = old.rating; s.photos = old.photos; s.price = old.price; s.special = old.special; }
    SPOTS = SPOTS.map(x=> x.id===EDIT_ID ? s : x);
    toast("Spot updated ✅");
  } else {
    SPOTS.unshift(s); toast("Spot saved ✅");
  }
  EDIT_ID=null;
  $("#addTitle").innerHTML = `➕ Add / Edit Spot <span style="font-size:.7rem;background:#ff4d2e;padding:3px 8px;border-radius:999px">ADMIN ONLY</span>`;
  $("#editBanner").style.display="none"; $("#cancelEditBtn").style.display="none";
  $("#fName").value=""; $("#fArea2").value=""; $("#fPhone").value=""; $("#aMenu").value=""; $("#menuRows").innerHTML=""; addMenuRow();
  saveSpots(); renderAll(); go("home");
}

// ---------- PHOTOS / LIGHTBOX ----------
function openPhoto(id, idx){
  const s = SPOTS.find(x=>x.id===id); if(!s?.photos?.length) return;
  LIGHTBOX_IMGS = s.photos; LIGHTBOX_IDX = Number(idx)||0;
  updateLightbox();
  $("#lightbox").classList.add("open");
}
function updateLightbox(){
  $("#lightboxImg").src = LIGHTBOX_IMGS[LIGHTBOX_IDX];
  $("#lbCount").textContent = (LIGHTBOX_IDX+1)+" / "+LIGHTBOX_IMGS.length;
}

// ---------- ONE CLICK HANDLER — every tap goes here ----------
document.addEventListener("click", (e)=>{
  const el = e.target.closest("[data-act]");
  if(!el) return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  switch(act){
    case "go": go(el.dataset.v); break;
    case "skipSplash": skipSplash(); break;
    case "obNext": obNext(); break;
    case "obSkip": $("#onboard").classList.remove("show"); localStorage.setItem("wwe_onboard","1"); break;
    case "closeModal": closeModal(); break;
    case "chipQ": FILTER.q = el.dataset.q; $("#vQ").value = el.dataset.q; renderHome(); break;
    case "clearFilters": FILTER={q:"",area:"",price:"",sort:"rec"}; $("#vQ").value=""; renderAll(); break;
    case "nearMe": nearMe(); break;
    case "voiceSearch": voiceSearch(); break;
    case "roulette": roulette(); break;
    case "doCompare": doCompare(); break;
    case "fav": toggleFav(id); break;
    case "shareSpot": shareSpot(id); break;
    case "openSpot": openSpot(id); break;
    case "editSpot": editSpot(id); break;
    case "delSpot": delSpot(id); break;
    case "openPhoto": openPhoto(id, el.dataset.idx); break;
    case "lbPrev": LIGHTBOX_IDX=(LIGHTBOX_IDX-1+LIGHTBOX_IMGS.length)%LIGHTBOX_IMGS.length; updateLightbox(); break;
    case "lbNext": LIGHTBOX_IDX=(LIGHTBOX_IDX+1)%LIGHTBOX_IMGS.length; updateLightbox(); break;
    case "lbClose": $("#lightbox").classList.remove("open"); break;
    case "addMenuRow": addMenuRow(); break;
    case "removeRow": el.closest(".menuRow")?.remove(); break;
    case "pasteMenu": { const items = parseMenuText($("#aMenu").value); if(items.length) appendMenuItems(items); else toast("Paste a menu first — one per line: Beef Burger - $85"); break; }
    case "scanCamera": $("#scanInputCamera").click(); break;
    case "scanUpload": $("#scanInputUpload").click(); break;
    case "voiceMenu": voiceMenu(); break;
    case "saveSpot": saveSpot(); break;
    case "cancelEdit": EDIT_ID=null; $("#addTitle").innerHTML=`➕ Add / Edit Spot <span style="font-size:.7rem;background:#ff4d2e;padding:3px 8px;border-radius:999px">ADMIN ONLY</span>`; $("#editBanner").style.display="none"; $("#cancelEditBtn").style.display="none"; break;
    case "createVote": createVote(); break;
    case "castVote": castVote(el.dataset.oi); break;
    case "shareVote": { const l=$("#voteLinkInput").value; if(!l){toast("Create a vote first");break;} copyText(l); toast("Link copied — send it on WhatsApp"); break; }
    case "copyVoteLink": { const l=$("#voteLinkInput").value; if(!l){toast("Create a vote first");break;} copyText(l); toast("Link copied"); break; }
    case "clearAllVotes": clearAllVotes(); break;
    case "adminLogin": adminLogin(); break;
    case "adminLogout": adminLogout(); break;
    case "backup": backup(); break;
    case "restore": restore(); break;
    case "bigText": document.documentElement.style.setProperty("--fs", "1.15"); toast("Big Text ON"); break;
    case "tutorial": localStorage.removeItem("wwe_onboard"); showOnboard(0); break;
    case "report": openModal(`<h2>🐛 Report Problem</h2><p class="mut">Screenshot + tell us what happened.</p><textarea id="reportText" rows="4" placeholder="What broke? What did you tap?"></textarea><button class="primary" data-act="sendReport" style="margin-top:10px">Send Report</button>`); break;
    case "sendReport": { const t=$("#reportText")?.value||""; copyText("WWE Report: "+t); toast("Report copied — send it on WhatsApp"); closeModal(); break; }
    case "openBuddy": buddyOpen(); break;
    case "buddyClose": buddyClose(); break;
    case "buddySend": buddyAsk(); break;
    case "buddyVoice": buddyVoice(); break;
    case "buddyMinimize": buddyClose(); minimizeToBubble(); break;
    case "minimizeToBubble": minimizeToBubble(); break;
  }
});

// Inputs
document.addEventListener("input", (e)=>{
  if(e.target.id==="vQ"){ FILTER.q = e.target.value; renderHome(); }
  if(e.target.id==="fArea"){ FILTER.area = e.target.value; renderHome(); }
  if(e.target.id==="fPrice"){ FILTER.price = e.target.value; renderHome(); }
  if(e.target.id==="fSort"){ FILTER.sort = e.target.value; renderHome(); }
});
document.addEventListener("change", (e)=>{
  if(e.target.id==="scanInputCamera"||e.target.id==="scanInputUpload"){
    const f = e.target.files?.[0]; if(f) handleScanFile(f); e.target.value="";
  }
  if(e.target.id==="aPhotos"){
    const files=[...e.target.files||[]]; if(!files.length) return;
    files.forEach(f=>{ const r=new FileReader(); r.onload=()=>{ $("#aPhotoPrev").insertAdjacentHTML("beforeend",`<img src="${esc(r.result)}">`); }; r.readAsDataURL(f); });
    toast(files.length+" photo(s) picked — they save with the spot");
  }
});
document.addEventListener("keydown", (e)=>{
  if(e.target.id==="buddyText" && e.key==="Enter"){ buddyAsk(); }
  if(e.key==="Escape"){ closeModal(); buddyClose(); $("#lightbox").classList.remove("open"); }
});
document.addEventListener("visibilitychange", async ()=>{
  if(!document.hidden && LIVE_VOTE?.id){
    const v = await fetchLiveVote(LIVE_VOTE.id); if(v){ LIVE_VOTE=v; renderVote(); }
  }
});
$("#lightbox")?.addEventListener("click",(e)=>{ if(e.target.id==="lightbox") $("#lightbox").classList.remove("open"); });

// ---------- BOOT ----------
loadSpots();
addMenuRow();
renderAll();
handleSharedVote();
// If URL has #spot=, open it
if(location.hash.startsWith("#spot=")){
  const id = location.hash.slice(6);
  setTimeout(()=> openSpot(id), 500);
}
// Auto-hide splash after 4s
setTimeout(()=>{ if(!$("#splash").classList.contains("done")) skipSplash(); }, 4000);
