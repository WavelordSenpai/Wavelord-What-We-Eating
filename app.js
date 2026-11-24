const WAVELORD_EMAIL = "vireshsingh26@protonmail.com";
const ADMIN_PIN = "1919";
let IS_ADMIN = sessionStorage.getItem("wwe_admin") === "1";
let SPOTS = [];
let CURRENT_SPOT = null;
let USER_LOC = null;

// --- FIXES: menu, price, big text, report ---
function menuText(m){
  if(!m) return "";
  if(typeof m === "string") return m;
  const name = m.name || m.item || m.title || m.dish || "";
  const price = m.price ?? m.cost ?? m.amount ?? "";
  if(!name) return "";
  if(price === "" || price === null || price === undefined) return name;
  return name + " - $" + price;
}
function normalizeMenu(list){
  return (list || []).map(x => {
    if(typeof x === "string"){
      const p = x.split(" - $");
      return { name: (p[0] || x).trim(), price: (p[1] || "").trim() };
    }
    return { name: (x.name || x.item || x.title || x.dish || "").trim(), price: String(x.price ?? x.cost ?? x.amount ?? "").trim() };
  }).filter(x => x.name);
}
function cheapestPrice(spot){
  const prices = (spot.menu || []).map(m => {
    if(typeof m === "string"){ const n = Number(m.split(" - $")[1]); return n; }
    return Number(m.price ?? m.cost ?? m.amount);
  }).filter(n => !isNaN(n) && n > 0 && n < 900);
  if(!prices.length) return null;
  return Math.min(...prices);
}
function cheapestLabel(spot){
  const p = cheapestPrice(spot);
  return p ? "from $" + p : "price not listed yet";
}
function toggleBigText(){
  const on = document.body.classList.toggle("big-text");
  localStorage.setItem("wwe_bigtext", on ? "1" : "0");
  const btn = document.querySelector('[data-bigtext]');
  if(btn) btn.textContent = on ? "🔍 Big Text: ON - tap to turn off" : "🔍 Big Text";
}
if(localStorage.getItem("wwe_bigtext") === "1"){ document.body.classList.add("big-text"); }
function sendReport(){
  const text = (document.getElementById("reportText").value || "").trim();
  if(!text) return alert("Type what happened first");
  const subject = encodeURIComponent("What We Eating - Bug Report");
  const body = encodeURIComponent("What happened:\n" + text + "\n\nPhone: " + navigator.userAgent + "\nPage: " + location.href + "\nTime: " + new Date().toLocaleString());
  window.location.href = "mailto:" + WAVELORD_EMAIL + "?subject=" + subject + "&body=" + body;
}
// --- END FIXES ---

function saveLocal(){ localStorage.setItem("wwe_spots", JSON.stringify(SPOTS)); }
function loadLocal(){
  try{ SPOTS = JSON.parse(localStorage.getItem("wwe_spots") || "[]"); }catch(e){ SPOTS = []; }
  if(!SPOTS.length){
    SPOTS = [
      { id: "1", name: "Golden Bell Express", area: "Chaguanas", type: "Ramen", phone: "", menu: normalizeMenu([{name:"Original Ramyun",price:"51"},{name:"Chicken Ramen",price:"67"},{name:"Beef Ramen",price:"72"},{name:"Shrimp Ramen",price:"72"}]) },
      { id: "2", name: "Uncle Sam's", area: "San Juan", type: "Burgers", phone: "", menu: normalizeMenu([{name:"Classic Burger",price:"65"},{name:"Cheese Burger",price:"75"}]) },
      { id: "3", name: "Lemon Pepper", area: "Port of Spain", type: "Chinese", phone: "", menu: normalizeMenu([{name:"Fried Rice",price:"80"},{name:"Sweet & Sour Chicken",price:"95"}]) }
    ];
    saveLocal();
  } else {
    SPOTS = SPOTS.map(s => ({ ...s, menu: normalizeMenu(s.menu) }));
  }
}
function applyAdmin(){
  document.body.classList.toggle("is-admin", IS_ADMIN);
  document.querySelectorAll("[data-admin-only]").forEach(el => { el.style.display = IS_ADMIN ? "" : "none"; });
}
function tryAdmin(){
  const v = document.getElementById("adminPin").value;
  if(v === ADMIN_PIN){ IS_ADMIN = true; sessionStorage.setItem("wwe_admin","1"); applyAdmin(); alert("Admin unlocked"); document.getElementById("adminPin").value=""; }
  else alert("Wrong PIN");
}
function requireAdmin(){ if(!IS_ADMIN){ alert("Admin only. Go to Settings and enter PIN."); return false; } return true; }
function go(view){
  if(view === "add" && !requireAdmin()) return;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const el = document.getElementById("view-" + view);
  if(el) el.classList.add("active");
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === view));
  if(view === "browse") renderSpots();
}
function clearFilters(){ document.getElementById("fSearch").value=""; document.getElementById("fPrice").value=""; document.getElementById("fType").value=""; renderSpots(); }
function nearMe(){
  if(!navigator.geolocation) return alert("GPS not available");
  navigator.geolocation.getCurrentPosition(p => { USER_LOC = { lat: p.coords.latitude, lng: p.coords.longitude }; alert("Location saved. Nearest sort coming soon."); renderSpots(); }, () => alert("Allow location to use Near Me"));
}
function renderSpots(){
  const q = (document.getElementById("fSearch").value || "").toLowerCase();
  const pr = document.getElementById("fPrice").value;
  const ty = document.getElementById("fType").value;
  const box = document.getElementById("spots");
  let list = SPOTS.filter(s => {
    if(q && !(s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q) || (s.menu||[]).some(m => menuText(m).toLowerCase().includes(q)))) return false;
    if(ty && s.type !== ty) return false;
    if(pr){
      const [lo, hi] = pr.split("-").map(Number);
      const cp = cheapestPrice(s);
      if(cp === null) return false;
      if(cp < lo || cp > hi) return false;
    }
    return true;
  });
  if(!list.length){ box.innerHTML = "<p>No spots found. Try Clear.</p>"; return; }
  box.innerHTML = list.map(s => `
    <div class="card" onclick="openSpot('${s.id}')">
      <div class="card-top"><b>${s.name}</b><span>${s.area} • ${s.type}</span></div>
      <div class="card-price">${cheapestLabel(s)}</div>
      <div class="card-menu">${(s.menu||[]).slice(0,3).map(menuText).join(" • ")}</div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button onclick="openSpot('${s.id}')">View</button>
        <button data-admin-only onclick="editSpot('${s.id}')">Edit</button>
        <button data-admin-only onclick="delSpot('${s.id}')">Delete</button>
      </div>
    </div>`).join("");
  applyAdmin();
}
function openSpot(id){
  const s = SPOTS.find(x => String(x.id) === String(id));
  if(!s) return;
  CURRENT_SPOT = s;
  document.getElementById("spotDetail").innerHTML = `
    <h2>${s.name}</h2><p>${s.area} • ${s.type} • ${cheapestLabel(s)}</p>
    <p>${s.phone || ""}</p>
    <h3>Menu - TT$</h3>
    <div>${(s.menu||[]).map(m => `<div class="menuRow"><span>${menuText(m)}</span></div>`).join("") || "No menu yet"}</div>
    <button onclick="startVoteWith('${s.name}')">🗳️ Vote for this</button>`;
  go("spot");
}
function startVoteWith(name){
  go("vote");
  const opts = document.querySelectorAll(".voteOpt");
  if(opts[0]) opts[0].value = name;
}
function saveSpot(){
  if(!requireAdmin()) return;
  const name = document.getElementById("aName").value.trim();
  if(!name) return alert("Add a name");
  const menuLines = document.getElementById("aMenu").value.split("\n").map(l => l.trim()).filter(Boolean);
  const menu = normalizeMenu(menuLines);
  const spot = { id: Date.now().toString(), name, area: document.getElementById("aArea").value.trim(), type: document.getElementById("aType").value.trim(), phone: document.getElementById("aPhone").value.trim(), menu };
  SPOTS.push(spot); saveLocal();
  document.getElementById("addMsg").textContent = "Saved: " + name;
  document.getElementById("aName").value=""; document.getElementById("aMenu").value="";
  go("browse");
}
function editSpot(id){
  if(!requireAdmin()) return;
  const s = SPOTS.find(x => String(x.id) === String(id)); if(!s) return;
  go("add");
  document.getElementById("aName").value = s.name;
  document.getElementById("aArea").value = s.area || "";
  document.getElementById("aType").value = s.type || "";
  document.getElementById("aPhone").value = s.phone || "";
  document.getElementById("aMenu").value = (s.menu||[]).map(menuText).join("\n");
  SPOTS = SPOTS.filter(x => String(x.id) !== String(id)); saveLocal();
}
function delSpot(id){
  if(!requireAdmin()) return;
  if(!confirm("Delete this spot?")) return;
  SPOTS = SPOTS.filter(x => String(x.id) !== String(id)); saveLocal(); renderSpots();
}
function clearAll(){
  if(!requireAdmin()) return;
  if(!confirm("Clear ALL spots?")) return;
  localStorage.removeItem("wwe_spots"); loadLocal(); renderSpots();
}
function exportBackup(){
  const blob = new Blob([JSON.stringify(SPOTS, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "what-we-eating-backup.json"; a.click();
}
function appendMenuItems(items){
  const cur = document.getElementById("aMenu").value.split("\n").map(l => l.trim()).filter(Boolean);
  const existing = new Set(cur.map(l => l.toLowerCase()));
  const norm = normalizeMenu(items);
  norm.forEach(it => {
    const line = menuText(it);
    if(line && !existing.has(line.toLowerCase())){ cur.push(line); existing.add(line.toLowerCase()); }
  });
  document.getElementById("aMenu").value = cur.join("\n");
}
async function handleScanFile(input){
  const file = input.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try{
      const res = await fetch("/.netlify/functions/scan-menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: reader.result }) });
      const data = await res.json();
      if(data.items) appendMenuItems(data.items);
      else alert("Scan failed: " + (data.error || "unknown"));
    }catch(e){ alert("Scan failed: " + e.message); }
  };
  reader.readAsDataURL(file);
}
function createVote(){
  const q = document.getElementById("voteQ").value.trim() || "What we eating?";
  const opts = [...document.querySelectorAll(".voteOpt")].map(i => i.value.trim()).filter(Boolean);
  if(opts.length < 2) return alert("Add at least 2 options");
  const box = document.getElementById("voteResults");
  box.innerHTML = `<h3>${q}</h3>` + opts.map((o,i) => `<div class="voteRow"><button onclick="voteCast(${i})">${o}</button><span id="vc-${i}">0 votes</span></div>`).join("");
  box.dataset.opts = JSON.stringify(opts);
  box.dataset.counts = JSON.stringify(opts.map(()=>0));
}
function voteCast(i){
  const box = document.getElementById("voteResults");
  let counts = JSON.parse(box.dataset.counts || "[]");
  counts[i] = (counts[i]||0)+1;
  box.dataset.counts = JSON.stringify(counts);
  counts.forEach((c,idx) => { const el = document.getElementById("vc-"+idx); if(el) el.textContent = c + " votes"; });
}
function shareVote(){
  const q = document.getElementById("voteQ").value.trim() || "What we eating?";
  const opts = [...document.querySelectorAll(".voteOpt")].map(i => i.value.trim()).filter(Boolean);
  const link = location.origin + location.pathname + "#vote=" + encodeURIComponent(opts.join("|")) + "&q=" + encodeURIComponent(q);
  navigator.clipboard?.writeText(link).then(()=>alert("Vote link copied")).catch(()=>prompt("Copy vote link:", link));
}
function toggleBuddy(){
  const p = document.getElementById("buddyPanel");
  p.style.display = p.style.display === "none" ? "block" : "none";
}
async function sendBuddy(){
  const input = document.getElementById("buddyInput");
  const text = input.value.trim(); if(!text) return;
  input.value = "";
  const msgs = document.getElementById("buddyMsgs");
  msgs.innerHTML += `<div class="msg me">${text}</div>`;
  document.getElementById("buddyStatus").textContent = "Buddy thinking... (GPT-OSS)";
  try{
    const res = await fetch("/.netlify/functions/groq-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: text }], spots: SPOTS }) });
    const data = await res.json();
    if(data.reply) msgs.innerHTML += `<div class="msg buddy">${data.reply}</div>`;
    else msgs.innerHTML += `<div class="msg buddy">Groq offline — using local spots.<br>${SPOTS.slice(0,3).map(s => s.name + " - " + cheapestLabel(s)).join("<br>")}</div>`;
  }catch(e){
    msgs.innerHTML += `<div class="msg buddy">Groq offline — using local spots.<br>${SPOTS.slice(0,3).map(s => s.name + " - " + cheapestLabel(s)).join("<br>")}</div>`;
  }
  document.getElementById("buddyStatus").textContent = "";
  msgs.scrollTop = msgs.scrollHeight;
}
loadLocal(); applyAdmin(); renderSpots();
if(localStorage.getItem("wwe_bigtext") === "1"){ document.body.classList.add("big-text"); const b = document.querySelector("[data-bigtext]"); if(b) b.textContent = "🔍 Big Text: ON - tap to turn off"; }
