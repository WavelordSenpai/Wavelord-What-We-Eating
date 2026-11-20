'use strict';
/* PART 1 — CONFIG • HELPERS • STORAGE • STARTER SPOTS */
const APP = {
  name:'What We Eating?', by:'Wavelord', version:'2.0.0',
  ownerEmail:'vireshsingh26@protonmail.com',
  adminPassword:'1919',
  siteUrl:'https://YOUR-SITE.netlify.app',
  fnBase:'/.netlify/functions',
  maxPhotos:5, maxImgW:1200, pageSize:10,
  tz:'America/Port_of_Spain',
  ocrCdn:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
};
const AREAS = ['San Juan','Port of Spain','St James','Westmoorings','Chaguanas','Couva','Arima','Sangre Grande','San Fernando','Point Fortin','Tobago','Curepe','Tunapuna','Diego Martin','Barataria','Morvant'];
const CATS = ['Beef','Chicken','Roti','Doubles','Pizza','Seafood','Sides','Drinks','Breakfast','Dessert'];
const CRAVINGS = [
  {k:'Beef',re:/beef|steak|burger|smash/i},{k:'Burger',re:/burger|smash/i},{k:'Roti',re:/roti|dhalpuri|paratha|buss/i},
  {k:'Doubles',re:/doubles/i},{k:'Pizza',re:/pizza/i},{k:'Chicken',re:/chicken|wings/i},
  {k:'Seafood',re:/seafood|shrimp|fish|shark|crab|lobster|calamari/i},{k:'Sides',re:/fries|sides|salad|rice/i},
  {k:'Drinks',re:/juice|soda|drink|shake|water|sorrel|punch/i},{k:'Dessert',re:/cake|ice cream|dessert|pudding|brownie/i},
  {k:'Breakfast',re:/breakfast|egg|bake/i}
];
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const money=n=>'$'+(Math.round(n*100)%100===0?Math.round(n):(+n).toFixed(2));
const cap=s=>String(s||'').replace(/\b\w/g,c=>c.toUpperCase());
const nowISO=()=>new Date().toISOString();
const fmtDate=iso=>{try{return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:APP.tz})}catch(e){return''}};
const isNative=()=>!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const apiUrl=p=>(isNative()||location.protocol==='file:'?APP.siteUrl:'')+APP.fnBase+'/'+p;
function timeAgo(iso){if(!iso)return'never';const s=Math.max(0,(Date.now()-new Date(iso))/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+' mins ago';if(s<86400)return Math.floor(s/3600)+' hrs ago';return Math.floor(s/86400)+' days ago'}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
let toastT;
function toast(msg){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#222;border:1px solid #444;padding:10px 14px;border-radius:999px;z-index:999;font-size:.9rem';document.body.appendChild(el)}el.textContent=msg;el.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>el.style.display='none',2200)}

/* Storage */
const Store={
  get(k,def){try{const v=JSON.parse(localStorage.getItem('wwe_'+k));return v==null?def:v}catch(e){return def}},
  set(k,v){localStorage.setItem('wwe_'+k,JSON.stringify(v))},
  spots(){return this.get('spots',null)},
  saveSpots(s){this.set('spots',s)},
  favs(){return new Set(this.get('favs',[]))},
  toggleFav(id){const f=this.get('favs',[]);const i=f.indexOf(id);if(i>=0)f.splice(i,1);else f.push(id);this.set('favs',f);return i<0},
  settings(){return Object.assign({bigText:false,openOnly:false,priceAlert:true,onboarded:false,lastVisit:null},this.get('settings',{}))},
  saveSettings(s){this.set('settings',Object.assign(this.settings(),s))},
  errors(){return this.get('errors',[])},
  logError(e){const a=this.errors();a.unshift({msg:String(e&&e.message||e),at:nowISO()});this.set('errors',a.slice(0,50))}
};
window.addEventListener('error',e=>Store.logError(e.error||e.message));

const STARTER_SPOTS=[
  {id:'s1',name:"Uncle Sam's Doubles",area:'Tunapuna',addr:'Eastern Main Rd, Tunapuna',phone:'',hours:'Mon-Sun 7am-6pm',price:1,rating:4.8,notes:'Classic doubles, pepper on point.',menu:[{name:'Doubles',price:12,cat:'Doubles'},{name:'Doubles with Slight Pepper',price:12,cat:'Doubles'},{name:'Sorrel',price:15,cat:'Drinks'}],photos:[],created:nowISO(),updated:nowISO(),visits:12},
  {id:'s2',name:'Patraj Roti Shop',area:'Tunapuna',addr:'Tunapuna',phone:'',hours:'Mon-Sat 9am-7pm',price:1,rating:4.7,notes:'Buss up shut specialist.',menu:[{name:'Chicken Roti',price:55,cat:'Roti'},{name:'Beef Roti',price:60,cat:'Roti'},{name:'Buss Up Shut + Chicken',price:65,cat:'Roti'}],photos:[],created:nowISO(),updated:nowISO(),visits:8},
  {id:'s3',name:'Smash Burger Lime',area:'St James',addr:'Ariapita Ave, St James',phone:'',hours:'Tue-Sun 11am-11pm',price:2,rating:4.6,notes:'Smash burgers + loaded fries.',menu:[{name:'Smash Burger',price:85,cat:'Beef'},{name:'Double Smash',price:130,cat:'Beef'},{name:'Loaded Fries',price:55,cat:'Sides'},{name:'Milkshake',price:45,cat:'Drinks'}],photos:[],created:nowISO(),updated:nowISO(),visits:20},
  {id:'s4',name:'Shark & Bake Shack',area:'Barataria',addr:'Barataria',phone:'',hours:'Mon-Sun 10am-8pm',price:1,rating:4.5,notes:'',menu:[{name:'Shark & Bake',price:65,cat:'Seafood'},{name:'Fried Fish & Chips',price:75,cat:'Seafood'}],photos:[],created:nowISO(),updated:nowISO(),visits:5},
  {id:'s5',name:'Pizza Lime',area:'Chaguanas',addr:'Chaguanas Main Rd',phone:'',hours:'Mon-Sun 11am-10pm',price:2,rating:4.4,notes:'',menu:[{name:'Cheese Pizza (Medium)',price:120,cat:'Pizza'},{name:'Pepperoni Pizza',price:145,cat:'Pizza'},{name:'Garlic Bread',price:40,cat:'Sides'}],photos:[],created:nowISO(),updated:nowISO(),visits:9}
];
let SPOTS = Store.spots();
if(!SPOTS){SPOTS=STARTER_SPOTS;Store.saveSpots(SPOTS)}
let STATE={view:'home',q:'',area:'',price:'',sort:'rec',openOnly:false,craving:'',near:null,currentId:null,vote:{q:'What we eating tonight?',opts:[],votes:{}},editingPhotos:[]};

/* PART 2 — PURE LOGIC */
const CAT_RULES=[
  ['Drinks',/\b(juice|soda|water|coke|pepsi|sorrel|punch|drink|beer|smoothie|coffee|tea|shake|ginger beer|mauby|coconut)\b/i],
  ['Dessert',/\b(cake|ice cream|brownie|pudding|dessert|sweet|cookie|pie|flan)\b/i],
  ['Pizza',/\bpizza|calzone/i],
  ['Roti',/\broti|dhalpuri|dhal puri|paratha|buss ?up ?shut|wrap\b/i],
  ['Doubles',/\bdoubles\b/i],
  ['Seafood',/\b(shrimp|fish|shark|crab|lobster|calamari|seafood|salmon|kingfish|prawn)\b/i],
  ['Breakfast',/\b(breakfast|egg|omelet|omelette|pancake|sausage bake|bake & saltfish|saltfish)\b/i],
  ['Chicken',/\b(chicken|wings?|nuggets?|tenders?)\b/i],
  ['Beef',/\b(beef|burger|steak|smash|patty|bacon|goat|ribs?)\b/i],
  ['Sides',/\b(fries|sides?|salad|rice|coleslaw|plantain|corn|onion rings|chow)\b/i]
];
function categorize(name){for(const [c,re] of CAT_RULES)if(re.test(name||''))return c;return 'Other'}
function parseMenuText(raw,opts){
  opts=opts||{};let text=String(raw||'').replace(/\u00A0/g,' ').replace(/TT\s*\$/gi,'$').replace(/\bTTD?\s*(?=\d)/gi,'$').replace(/\$\s+(?=\d)/g,'$');
  if(opts.ocr)text=text.replace(/(^|\s)S(\d{2,3})(?!\d)/g,'$1$$$2');
  const items=[],seen=new Set();let ctx=null,skipped=0;
  const cleanName=n=>n.replace(/^[\s,;|:\-–—.•*_=~]+/,'').replace(/[\s,;|:\-–—.•*_=~…]+$/,'').replace(/\s{2,}/g,' ').trim();
  const add=(name,price)=>{name=cleanName(name);price=parseFloat(price);if(!/[A-Za-z]{2}/.test(name)||!(price>0&&price<=5000)||name.length>60){skipped++;return}const key=name.toLowerCase();if(seen.has(key))return;seen.add(key);const c=categorize(name);items.push({name,price,cat:c!=='Other'?c:(ctx||'Other')})};
  for(let line of text.split(/\r?\n/)){
    line=line.replace(/^\s*[•·*]\s*/,'').replace(/^\s*\d{1,2}[.)]\s+(?=[A-Za-z])/,'').replace(/[|_=~]{1,}/g,' ').trim();
    if(!line)continue;
    if(/^[A-Z][A-Z \-&]{3,}$/.test(line)&&!/\d/.test(line)){ctx=cap(line.toLowerCase());continue}
    const re=/\$(\d{1,4}(?:\.\d{1,2})?)/g;const ms=[...line.matchAll(re)];
    if(ms.length){let prev=0;ms.forEach((m,i)=>{const before=line.slice(prev,m.index);if(cleanName(before))add(before,m[1]);else if(i===ms.length-1)add(line.slice(m.index+m[0].length),m[1]);prev=m.index+m[0].length});continue}
    const b=line.match(/^(.*[A-Za-z)].*?)[\s.\-–—:…]+(\d{1,4}(?:\.\d{1,2})?)$/);
    if(b){add(b[1],b[2]);continue}
    // No price — could be a header or incomplete item, skip
    if(line.length<35&&!/[0-9]/.test(line))ctx=cap(line.toLowerCase());
  }
  return {items,skipped};
}
function isOpenNow(spot){
  if(!spot||!spot.hours)return true;
  const h=spot.hours.toLowerCase();if(h.includes('24'))return true;
  const now=new Date();const day=['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
  const map={mon:'mon',tue:'tue',wed:'wed',thu:'thu',fri:'fri',sat:'sat',sun:'sun'};
  // Simple parser: find "8am-8pm" style ranges, ignore day logic if not specified
  const m=h.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if(!m)return true;
  const toMin=(hh,mm,ap)=>{let h=+hh;if(ap==='pm'&&h!==12)h+=12;if(ap==='am'&&h===12)h=0;return h*60+(+mm||0)};
  const open=toMin(m[1],m[2],m[3]),close=toMin(m[4],m[5],m[6]);const cur=now.getHours()*60+now.getMinutes();
  if(close<open)return cur>=open||cur<close;
  return cur>=open&&cur<=close;
}
function cheapestFor(spot,craving){
  if(!spot.menu||!spot.menu.length)return null;
  const re=craving?CRAVINGS.find(c=>c.k===craving)?.re:null;
  const list=re?spot.menu.filter(i=>re.test(i.name)):spot.menu;
  if(!list.length)return null;
  return Math.min(...list.map(i=>i.price));
}
function scoreSpot(spot){
  let s=(spot.rating||3)*20+(spot.visits||0)*0.5;
  if(isOpenNow(spot))s+=10;
  return s;
}
function filteredSpots(){
  let list=[...SPOTS];
  if(STATE.q){const q=STATE.q.toLowerCase();list=list.filter(s=>s.name.toLowerCase().includes(q)||s.area.toLowerCase().includes(q)||(s.menu||[]).some(i=>i.name.toLowerCase().includes(q)))}
  if(STATE.area)list=list.filter(s=>s.area===STATE.area);
  if(STATE.price)list=list.filter(s=>String(s.price)===String(STATE.price));
  if(STATE.craving){const re=CRAVINGS.find(c=>c.k===STATE.craving)?.re;if(re)list=list.filter(s=>(s.menu||[]).some(i=>re.test(i.name)))}
  if(STATE.openOnly||Store.settings().openOnly)list=list.filter(isOpenNow);
  if(STATE.sort==='rating')list.sort((a,b)=>b.rating-a.rating);
  else if(STATE.sort==='low')list.sort((a,b)=>(cheapestFor(a,STATE.craving)||999)-(cheapestFor(b,STATE.craving)||999));
  else list.sort((a,b)=>scoreSpot(b)-scoreSpot(a));
  return list;
}
function findDuplicates(newSpot){
  return SPOTS.filter(s=>s.name.toLowerCase().trim()===newSpot.name.toLowerCase().trim()&&s.area===newSpot.area);
}
function toMarkdown(spot){
  let md=`# ${spot.name}\n\n- Area: ${spot.area}\n- Address: ${spot.addr||''}\n- Hours: ${spot.hours||''}\n- Rating: ${spot.rating}\n- Price: ${'$'.repeat(spot.price)}\n\n## Menu\n`;
  (spot.menu||[]).forEach(i=>md+=`- ${i.name} — ${money(i.price)} (${i.cat})\n`);
  return md;
}

/* PART 3 — UI CORE */
function go(view){
  STATE.view=view;$$('.view').forEach(v=>v.classList.remove('active'));const el=$('#v-'+view);if(el)el.classList.add('active');
  $$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
  window.scrollTo({top:0});
  if(view==='home')renderHome();if(view==='favs')renderFavs();if(view==='top10')renderTop10();if(view==='compare')renderCompareForm();if(view==='settings')renderSettings();
}
function cardHTML(s){
  const open=isOpenNow(s);const cheap=cheapestFor(s,STATE.craving);
  const fav=Store.favs().has(s.id)?'❤️':'🤍';
  return `<div class="card" data-act="detail" data-id="${s.id}">
    <h3>${esc(s.name)} ${open?'':'<span class="badge closed">Closed</span>'} ${s.visits>15?'<span class="badge hot">🔥 Popular</span>':''}</h3>
    <div class="meta">📍 ${esc(s.area)} ${s.addr?'• '+esc(s.addr):''} • ${'$'.repeat(s.price)} • ⭐ ${s.rating}</div>
    <div class="meta">${cheap!=null?'From '+money(cheap)+' • ':''}${esc(s.notes||'')} • Updated ${timeAgo(s.updated)}</div>
    <div class="row" style="margin-top:8px"><button class="sm" data-act="fav" data-id="${s.id}">${fav} Save</button><button class="sm primary" data-act="detail" data-id="${s.id}">View menu ›</button></div>
  </div>`;
}
function renderHome(){
  const chips=$('#chips');if(chips)chips.innerHTML=CRAVINGS.map(c=>`<button class="chip ${STATE.craving===c.k?'on':''}" data-act="crave" data-v="${c.k}">${c.k}</button>`).join('');
  const fa=$('#fArea');if(fa&&!fa.dataset.done){fa.dataset.done='1';fa.innerHTML='<option value="">All areas</option>'+AREAS.map(a=>`<option>${a}</option>`).join('')}
  const fy=$('#forYou');if(fy){const top=[...SPOTS].sort((a,b)=>scoreSpot(b)-scoreSpot(a)).slice(0,3);fy.innerHTML=`<div class="secHead"><h2>⭐ For you in Trinidad</h2></div><p class="sub">Based on ratings + visits + open now.</p>`+top.map(cardHTML).join('')}
  const tr=$('#trendSec');if(tr){const hot=[...SPOTS].sort((a,b)=>b.visits-a.visits).slice(0,3);tr.innerHTML=`<div class="sec"><div class="secHead"><h2>🔥 Trending</h2></div>${hot.map(cardHTML).join('')}</div>`}
  const t10=$('#top10Sec');if(t10){const top=[...SPOTS].sort((a,b)=>b.rating-a.rating).slice(0,3);t10.innerHTML=`<div class="sec"><div class="secHead"><h2>🏆 Top rated</h2><button class="sm primary" data-act="go" data-v="top10">See Top 10</button></div>${top.map(cardHTML).join('')}</div>`}
  const sp=$('#specialsSec');if(sp){sp.innerHTML=`<div class="sec"><div class="secHead"><h2>💸 Cheap eats under $65</h2></div>${SPOTS.filter(s=>cheapestFor(s,'')!=null&&cheapestFor(s,'')<=65).slice(0,3).map(cardHTML).join('')||'<p class="sub">No cheap eats found yet — add one!</p>'}</div>`}
  renderList();
}
function renderList(){
  const list=filteredSpots();const el=$('#homeList');if(!el)return;
  el.innerHTML=`<div class="secHead" style="margin-top:14px"><h2>${list.length} spot${list.length!==1?'s':''} found</h2></div>`+(list.length?list.slice(0,STATE.pageSize||10).map(cardHTML).join(''):'<p class="empty">Nothing found. Try another craving or area — or add the spot!</p>');
  const more=$('#homeMore');if(more)more.innerHTML=list.length>10?`<button class="ghost" data-act="showMore">Show more</button>`:'';
  const saved=$('#savedLine');if(saved)saved.textContent=`${SPOTS.length} spots saved • ${Store.favs().size} favourites • Updated ${timeAgo(Math.max(...SPOTS.map(s=>new Date(s.updated||0))))}`;
}
function renderDetail(id){
  const s=SPOTS.find(x=>x.id===id);if(!s)return;STATE.currentId=id;s.visits=(s.visits||0)+1;Store.saveSpots(SPOTS);
  const fav=Store.favs().has(s.id)?'❤️ Remove from favourites':'🤍 Save to favourites';
  $('#detailBody').innerHTML=`
    <div class="sec"><h2>${esc(s.name)}</h2><p class="meta">📍 ${esc(s.area)} ${s.addr?'• '+esc(s.addr):''}</p><p class="sub">🕒 ${esc(s.hours||'Hours not listed')} • ${isOpenNow(s)?'🟢 Open now':'🔴 Closed'} • ⭐ ${s.rating} • ${'$'.repeat(s.price)}</p>
    <p style="margin-top:8px">${esc(s.notes||'')}</p>
    ${s.phone?`<p style="margin-top:8px">📞 <a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></p>`:''}
    <div class="row" style="margin-top:12px"><button class="sm" data-act="fav" data-id="${s.id}">${fav}</button><button class="sm" data-act="edit" data-id="${s.id}">✏️ Edit</button><button class="sm" data-act="share" data-id="${s.id}">🔗 Share</button><button class="sm" data-act="exportMd" data-id="${s.id}">📄 .md</button></div></div>
    <div class="sec"><h3>Menu</h3>${(s.menu||[]).length?`<table><tr><th>Item</th><th>Category</th><th>Price</th></tr>${s.menu.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(i.cat)}</td><td>${money(i.price)}</td></tr>`).join('')}</table>`:'<p class="sub">No menu yet.</p>'}</div>`;
  go('detail');
}

/* PART 4 — ADD / EDIT • SCAN • PASTE • VOICE */
function fillAreaSelects(){
  const a2=$('#fArea2');if(a2)a2.innerHTML=AREAS.map(a=>`<option>${a}</option>`).join('');
  const ca=$('#cArea');if(ca)ca.innerHTML='<option value="">All areas</option>'+AREAS.map(a=>`<option>${a}</option>`).join('');
  const cc=$('#cCrave');if(cc)cc.innerHTML=CRAVINGS.map(c=>`<option>${c.k}</option>`).join('');
  const tc=$('#tCat');if(tc)tc.innerHTML='<option value="">All categories</option>'+CATS.map(c=>`<option>${c}</option>`).join('');
}
function menuRowHTML(item={name:'',price:'',cat:'Other'}){
  return `<div class="row menuRow" style="margin-top:6px"><input class="mName" placeholder="Item name" value="${esc(item.name)}"><input class="mPrice" type="number" step="0.01" placeholder="Price" value="${item.price}"><select class="mCat">${['Other',...CATS].map(c=>`<option ${c===item.cat?'selected':''}>${c}</option>`).join('')}</select><button type="button" class="sm" data-act="delMenuRow">✕</button></div>`;
}
function openAdd(id){
  $('#addForm').reset();$('#fId').value=id||'';$('#photoPrev').innerHTML='';STATE.editingPhotos=[];
  if(id){const s=SPOTS.find(x=>x.id===id);if(!s)return;$('#addTitle').textContent='Edit spot';$('#fName').value=s.name;$('#fArea2').value=s.area;$('#fAddr').value=s.addr||'';$('#fPhone').value=s.phone||'';$('#fHours').value=s.hours||'';$('#fPriceLvl').value=s.price;$('#fRating').value=s.rating;$('#fNotes').value=s.notes||'';$('#menuRows').innerHTML=(s.menu||[]).map(menuRowHTML).join('');}
  else{$('#addTitle').textContent='Add a spot';$('#menuRows').innerHTML=menuRowHTML()+menuRowHTML();}
  go('add');
}
function collectMenu(){
  return $$('.menuRow').map(r=>({name:$('.mName',r).value.trim(),price:parseFloat($('.mPrice',r).value)||0,cat:$('.mCat',r).value})).filter(i=>i.name&&i.price>0).map(i=>({...i,cat:i.cat==='Other'?categorize(i.name):i.cat}));
}
function saveSpot(e){
  if(e)e.preventDefault();
  const id=$('#fId').value||uid();
  const spot={id,name:$('#fName').value.trim(),area:$('#fArea2').value,addr:$('#fAddr').value.trim(),phone:$('#fPhone').value.trim(),hours:$('#fHours').value.trim(),price:+$('#fPriceLvl').value,rating:parseFloat($('#fRating').value)||4,notes:$('#fNotes').value.trim(),menu:collectMenu(),photos:STATE.editingPhotos,created:nowISO(),updated:nowISO(),visits:0};
  if(!spot.name)return toast('Add a name first');
  const dup=findDuplicates(spot).filter(s=>s.id!==id);
  if(dup.length&&!confirm(`"${dup[0].name}" in ${dup[0].area} already exists. Save anyway?`))return;
  const idx=SPOTS.findIndex(s=>s.id===id);
  if(idx>=0){spot.created=SPOTS[idx].created;spot.visits=SPOTS[idx].visits;SPOTS[idx]=spot}else SPOTS.unshift(spot);
  Store.saveSpots(SPOTS);toast('Saved!');go('home');renderHome();
}
function openModal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){$('#modal').classList.add('hidden')}
function openPaste(){
  openModal(`<h3>📋 Paste menu</h3><p class="sub">Paste menu text — one item per line, with price.</p><textarea id="pasteText" rows="8" placeholder="Beef Burger - $85\nDoubles - $12"></textarea><button class="primary" data-act="doPaste" style="margin-top:10px">Parse menu</button><p class="sub" id="pasteMsg"></p>`);
}
function openScan(){
  openModal(`<h3>📸 Scan menu</h3><p class="sub">Take a photo of a menu — OCR reads it, then GROQ cleans it up.</p><input type="file" id="scanFile" accept="image/*" capture="environment"><button class="primary" data-act="doScan" style="margin-top:10px">Scan & parse</button><p class="sub" id="scanMsg"></p>`);
}
async function doScan(){
  const f=$('#scanFile').files[0];if(!f)return toast('Pick a photo first');
  $('#scanMsg').textContent='Reading photo… (this can take 10-20s)';
  try{
    if(!window.Tesseract){await new Promise((res,rej)=>{const s=document.createElement('script');s.src=APP.ocrCdn;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
    const {data:{text}}=await Tesseract.recognize(f,'eng');
    let parsed=parseMenuText(text,{ocr:true});
    // Try GROQ cleanup via Netlify function if available
    try{const r=await fetch(apiUrl('scan-menu'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(r.ok){const j=await r.json();if(j.items&&j.items.length)parsed={items:j.items,skipped:0}}}catch(e){}
    if(!parsed.items.length){$('#scanMsg').textContent='No items found — try a clearer photo or paste instead.';return}
    $('#menuRows').innerHTML=parsed.items.map(menuRowHTML).join('');
    closeModal();toast(`Scanned ${parsed.items.length} items`);
  }catch(e){Store.logError(e);$('#scanMsg').textContent='Scan failed: '+e.message}
}
function openVoice(){
  if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){openModal(`<h3>🎤 Voice</h3><p class="sub">Voice isn't supported in this browser. Type or paste the menu instead.</p>`);return}
  openModal(`<h3>🎤 Voice</h3><p class="sub">Say the spot name + menu, e.g. "Uncle Sam's, Doubles 12 dollars, Sorrel 15 dollars"</p><button class="primary" data-act="doVoice">🎤 Start listening</button><p class="sub" id="voiceMsg"></p>`);
}

/* PART 5 — COMPARE • TOP 10 • BUDGET • VOTE • FAVS • CLAIM • SETTINGS • ADMIN */
function renderCompareForm(){fillAreaSelects()}
function runCompare(){
  const craving=$('#cCrave').value,area=$('#cArea').value;
  let list=SPOTS.filter(s=>!area||s.area===area).map(s=>({s,cheap:cheapestFor(s,craving)})).filter(x=>x.cheap!=null).sort((a,b)=>a.cheap-b.cheap);
  $('#compareOut').innerHTML=list.length?`<div class="sec"><h3>Best value — ${craving} ${area?'in '+area:''}</h3><table><tr><th>Spot</th><th>Area</th><th>Cheapest</th><th>Rating</th></tr>${list.map(x=>`<tr><td><a href="#" data-act="detail" data-id="${x.s.id}">${esc(x.s.name)}</a></td><td>${esc(x.s.area)}</td><td>${money(x.cheap)}</td><td>⭐ ${x.s.rating}</td></tr>`).join('')}</table></div>`:'<p class="empty">No spots match that craving yet.</p>';
}
function renderTop10(){
  fillAreaSelects();const cat=$('#tCat')?.value||'';
  let list=[...SPOTS];if(cat)list=list.filter(s=>(s.menu||[]).some(i=>i.cat===cat));
  list=list.sort((a,b)=>b.rating-a.rating).slice(0,10);
  $('#top10Out').innerHTML=list.length?list.map((s,i)=>`<div class="card" data-act="detail" data-id="${s.id}"><h3>#${i+1} ${esc(s.name)}</h3><div class="meta">${esc(s.area)} • ⭐ ${s.rating} • ${'$'.repeat(s.price)}</div></div>`).join(''):'<p class="empty">No spots yet.</p>';
}
function runBudget(){
  const total=+$('#bTotal').value||200,people=+$('#bPeople').value||2,per=total/people;
  const fits=SPOTS.map(s=>({s,cheap:cheapestFor(s,'')})).filter(x=>x.cheap!=null&&x.cheap<=per).sort((a,b)=>a.cheap-b.cheap);
  $('#budgetOut').innerHTML=`<div class="sec"><p><b>$${total} for ${people} people = ${money(per)} each.</b></p>${fits.length?fits.map(x=>`<div class="card" data-act="detail" data-id="${x.s.id}"><h3>${esc(x.s.name)}</h3><div class="meta">${esc(x.s.area)} • From ${money(x.cheap)}</div></div>`).join(''):'<p class="sub">Nothing fits that budget — try raising it a bit.</p>'}</div>`;
}
function renderFavs(){
  const favs=SPOTS.filter(s=>Store.favs().has(s.id));
  $('#favOut').innerHTML=favs.length?favs.map(cardHTML).join(''):'<p class="empty">No favourites yet — tap 🤍 on any spot.</p>';
}
function renderSettings(){
  const st=Store.settings();$('#sBigText').checked=st.bigText;$('#sOpenOnly').checked=st.openOnly;$('#sPriceAlert').checked=st.priceAlert;
  document.documentElement.style.setProperty('--fs',st.bigText?'1.15':'1');
}
function exportBackup(){
  const blob=new Blob([JSON.stringify({spots:SPOTS,favs:[...Store.favs()],settings:Store.settings(),exported:nowISO()},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='what-we-eating-backup.json';a.click();toast('Backup downloaded');
}
async function importBackup(file){
  try{const j=JSON.parse(await file.text());if(j.spots){SPOTS=j.spots;Store.saveSpots(SPOTS);if(j.favs)Store.set('favs',j.favs);toast('Restored '+SPOTS.length+' spots');renderHome()}}catch(e){toast('That file didn\'t work')}
}
function renderAdmin(){
  const errs=Store.errors();
  $('#adminBody').innerHTML=`<div class="sec"><h3>Admin — ${SPOTS.length} spots</h3><div class="row"><button class="sm" data-act="exportBackup">⬇️ Backup</button><button class="sm" data-act="clearAll">🗑️ Clear all data</button></div><h3 style="margin-top:14px">Error log</h3>${errs.length?errs.map(e=>`<p class="sub">${esc(e.at)} — ${esc(e.msg)}</p>`).join(''):'<p class="sub">No errors logged.</p>'}</div>${SPOTS.map(s=>`<div class="card"><h3>${esc(s.name)}</h3><div class="meta">${esc(s.area)} • ⭐ ${s.rating}</div><div class="row" style="margin-top:8px"><button class="sm" data-act="edit" data-id="${s.id}">Edit</button><button class="sm" data-act="delSpot" data-id="${s.id}">Delete</button></div></div>`).join('')}`;
  $('#adminBody').classList.remove('hidden');$('#adminLogin').classList.add('hidden');
}

/* PART 6 — BUDDY • ROULETTE • SPLASH • ONBOARDING • BOOT */
function buddyToggle(){$('#buddy').classList.toggle('hidden');if(!$('#buddy').classList.contains('hidden')&&!$('#buddyMsgs').children.length)buddySay('Wah yuh feeling for? Tell me a craving + area and I go find it. Try "cheap doubles near me" or "best roti in Tunapuna".')}
function buddySay(text){const d=document.createElement('div');d.className='msg bot';d.textContent=text;$('#buddyMsgs').appendChild(d);$('#buddyMsgs').scrollTop=9999}
function buddySend(text){
  text=text||$('#buddyText').value.trim();if(!text)return;
  const me=document.createElement('div');me.className='msg me';me.textContent=text;$('#buddyMsgs').appendChild(me);$('#buddyText').value='';
  setTimeout(async()=>{
    // Try GROQ chat first, fall back to local search
    try{const r=await fetch(apiUrl('groq-chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,spots:SPOTS.slice(0,30)})});if(r.ok){const j=await r.json();if(j.reply){buddySay(j.reply);return}}}catch(e){}
    const q=text.toLowerCase();const craving=CRAVINGS.find(c=>q.includes(c.k.toLowerCase()));
    const area=AREAS.find(a=>q.includes(a.toLowerCase()));
    let list=[...SPOTS];if(craving)list=list.filter(s=>(s.menu||[]).some(i=>craving.re.test(i.name)));if(area)list=list.filter(s=>s.area===area);
    list.sort((a,b)=>scoreSpot(b)-scoreSpot(a));
    if(!list.length)buddySay('Hmm, I didn\'t find that yet. Try another craving, or add the spot with the + button!');
    else buddySay(`Top pick: ${list[0].name} in ${list[0].area} — from ${money(cheapestFor(list[0],craving?.k)||cheapestFor(list[0],'')||0)} ⭐ ${list[0].rating}. Tap it in Home to see the full menu.`);
  },300);
}
function roulette(){
  const pool=STATE.openOnly?filteredSpots().filter(isOpenNow):filteredSpots();
  if(!pool.length)return toast('No spots to pick from');
  const pick=pool[Math.floor(Math.random()*pool.length)];
  $('#rouletteTitle').textContent='🎲 '+pick.name;$('#rouletteText').textContent=`${pick.area} • ⭐ ${pick.rating} • From ${money(cheapestFor(pick,'')||0)} — ${pick.notes||'Go try it!'}`;
  STATE.roulettePick=pick;$('#rouletteBox').classList.remove('hidden');
}
let obStep=0;
const OB=[{em:'🔍',h:'Search what yuh feeling for',p:'Type beef, roti, doubles, pizza — or tap a craving chip. We search menus, not just names.'},{em:'⚖️',h:'Compare before yuh spend',p:'See cheapest price for that craving in your area, side by side.'},{em:'🌊',h:'Ask Wave Buddy',p:'Tap the 🌊 button and tell Buddy what yuh feeling for. He go find it.'}];
function showOnboard(step=0){obStep=step;const o=OB[step];$('#obEm').textContent=o.em;$('#obH').textContent=o.h;$('#obP').textContent=o.p;$('#obBtn').textContent=step===OB.length-1?'Start eating 🍔':'Next';$$('#onboard .dots i').forEach((d,i)=>d.classList.toggle('on',i===step));$('#onboard').classList.add('show')}
function hideOnboard(){$('#onboard').classList.remove('show');Store.saveSettings({onboarded:true})}

/* Global click handler */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t)return;const act=t.dataset.act,v=t.dataset.v,id=t.dataset.id;
  if(act==='go')go(v||'home');
  else if(act==='skipSplash')hideSplash();
  else if(act==='obNext'){if(obStep<OB.length-1)showOnboard(obStep+1);else hideOnboard()}
  else if(act==='obSkip')hideOnboard();
  else if(act==='detail')renderDetail(id);
  else if(act==='fav'){const added=Store.toggleFav(id);toast(added?'Saved to favourites':'Removed');renderHome();if(STATE.view==='favs')renderFavs();if(STATE.view==='detail')renderDetail(id)}
  else if(act==='edit')openAdd(id);
  else if(act==='delSpot'){if(confirm('Delete this spot?')){SPOTS=SPOTS.filter(s=>s.id!==id);Store.saveSpots(SPOTS);renderAdmin();toast('Deleted')}}
  else if(act==='share'){const s=SPOTS.find(x=>x.id===id);if(navigator.share)navigator.share({title:s.name,text:`${s.name} in ${s.area} — found on What We Eating?`,url:location.href}).catch(()=>{});else{prompt('Copy link:',location.href)}}
  else if(act==='exportMd'){const s=SPOTS.find(x=>x.id===id);const b=new Blob([toMarkdown(s)],{type:'text/markdown'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=s.name+'.md';a.click()}
  else if(act==='crave'){STATE.craving=STATE.craving===v?'':v;renderHome()}
  else if(act==='nearMe'){if(!navigator.geolocation)return toast('Location not available');navigator.geolocation.getCurrentPosition(()=>{toast('Near me on — showing open spots first');STATE.openOnly=true;renderHome()},()=>toast('Couldn\'t get location'))}
  else if(act==='toggleOpen'){STATE.openOnly=!STATE.openOnly;$('#openBtn').classList.toggle('on',STATE.openOnly);renderHome()}
  else if(act==='addMenuRow'){$('#menuRows').insertAdjacentHTML('beforeend',menuRowHTML())}
  else if(act==='delMenuRow'){t.closest('.menuRow')?.remove()}
  else if(act==='scanOpen')openScan();
  else if(act==='pasteOpen')openPaste();
  else if(act==='voiceOpen')openVoice();
  else if(act==='doPaste'){const txt=$('#pasteText').value;const p=parseMenuText(txt);if(!p.items.length){$('#pasteMsg').textContent='No items found — check format: "Name - $85"';return}$('#menuRows').innerHTML=p.items.map(menuRowHTML).join('');closeModal();toast(`Parsed ${p.items.length} items`)}
  else if(act==='doScan')doScan();
  else if(act==='doVoice'){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;const rec=new SR();rec.onresult=ev=>{const txt=ev.results[0][0].transcript;$('#voiceMsg').textContent='Heard: '+txt;const p=parseMenuText(txt.replace(/ dollars?/g,' $'));if(p.items.length)$('#menuRows').innerHTML=p.items.map(menuRowHTML).join('');};rec.onerror=()=>{$('#voiceMsg').textContent='Couldn\'t hear — try again.'};rec.start();$('#voiceMsg').textContent='Listening…'}
  else if(act==='runCompare')runCompare();
  else if(act==='runBudget')runBudget();
  else if(act==='addVoteOpt'){const val=$('#vOpt').value.trim();if(!val)return;STATE.vote.opts.push(val);$('#vOpt').value='';$('#voteOpts').innerHTML=STATE.vote.opts.map(o=>`<span class="chip">${esc(o)}</span>`).join('')}
  else if(act==='startVote'){if(!STATE.vote.opts.length)return toast('Add at least one option');STATE.vote.q=$('#vQ').value||STATE.vote.q;STATE.vote.votes={};$('#voteOut').innerHTML=`<div class="sec"><h3>${esc(STATE.vote.q)}</h3>${STATE.vote.opts.map(o=>`<button class="chip" data-act="castVote" data-v="${esc(o)}" style="margin:4px">${esc(o)}</button>`).join('')}<div id="voteResults"></div></div>`}
  else if(act==='castVote'){STATE.vote.votes[v]=(STATE.vote.votes[v]||0)+1;const total=Object.values(STATE.vote.votes).reduce((a,b)=>a+b,0);$('#voteResults').innerHTML=STATE.vote.opts.map(o=>{const n=STATE.vote.votes[o]||0;return `<p style="margin-top:10px">${esc(o)} — ${n} vote${n!==1?'s':''}</p><div class="voteBar"><i style="width:${total?Math.round(n/total*100):0}%"></i></div>`}).join('');toast('Voted for '+v)}
  else if(act==='submitClaim'){const n=$('#clName').value.trim();if(!n)return toast('Add the spot name');$('#claimMsg').textContent='Claim sent! We\'ll reach out to '+esc($('#clPhone').value||'you')+' to verify. (Demo: saved locally)';const claims=Store.get('claims',[]);claims.push({name:n,owner:$('#clOwner').value,phone:$('#clPhone').value,at:nowISO()});Store.set('claims',claims)}
  else if(act==='showTutorial')showOnboard(0);
  else if(act==='exportBackup')exportBackup();
  else if(act==='importBackup')$('#importFile').click();
  else if(act==='reportProblem'){location.href=`mailto:${APP.ownerEmail}?subject=${encodeURIComponent('What We Eating? — problem report')}&body=${encodeURIComponent('What happened?\n\nSpot:\nPhone model:')}`}
  else if(act==='adminLogin'){if($('#adminPass').value===APP.adminPassword)renderAdmin();else toast('Wrong password')}
  else if(act==='clearAll'){if(confirm('Clear ALL spots + favourites? This can\'t be undone.')){localStorage.clear();location.reload()}}
  else if(act==='closeModal')closeModal();
  else if(act==='roulette')roulette();
  else if(act==='rouletteSpin')roulette();
  else if(act==='rouletteClose')$('#rouletteBox').classList.add('hidden');
  else if(act==='buddyToggle')buddyToggle();
  else if(act==='buddySend')buddySend();
  else if(act==='buddyQuick')buddySend(v);
  else if(act==='showMore'){STATE.pageSize=(STATE.pageSize||10)+10;renderList()}
});
$('#addForm')?.addEventListener('submit',saveSpot);
$('#q')?.addEventListener('input',debounce(e=>{STATE.q=e.target.value.trim();renderList()},250));
$('#fArea')?.addEventListener('change',e=>{STATE.area=e.target.value;renderList()});
$('#fPrice')?.addEventListener('change',e=>{STATE.price=e.target.value;renderList()});
$('#fSort')?.addEventListener('change',e=>{STATE.sort=e.target.value;renderList()});
$('#tCat')?.addEventListener('change',renderTop10);
$('#sBigText')?.addEventListener('change',e=>{Store.saveSettings({bigText:e.target.checked});renderSettings()});
$('#sOpenOnly')?.addEventListener('change',e=>{Store.saveSettings({openOnly:e.target.checked});renderHome()});
$('#sPriceAlert')?.addEventListener('change',e=>{Store.saveSettings({priceAlert:e.target.checked})});
$('#importFile')?.addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0])});
$('#buddyText')?.addEventListener('keydown',e=>{if(e.key==='Enter')buddySend()});
$('#fPhotos')?.addEventListener('change',e=>{
  [...e.target.files].slice(0,APP.maxPhotos).forEach(f=>{
    const r=new FileReader();r.onload=ev=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');const scale=Math.min(1,APP.maxImgW/img.width);c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);const url=c.toDataURL('image/jpeg',0.8);STATE.editingPhotos.push(url);$('#photoPrev').innerHTML=STATE.editingPhotos.map(u=>`<img src="${u}" style="width:90px;height:70px;object-fit:cover;border-radius:10px">`).join('')};img.src=ev.target.result};r.readAsDataURL(f);
  });
});
function hideSplash(){$('#splash').style.display='none';if(!Store.settings().onboarded)showOnboard(0)}
function boot(){
  fillAreaSelects();renderSettings();renderHome();go('home');
  setTimeout(hideSplash,3500);
  // Remember box
  const last=Store.settings().lastVisit;if(last)$('#rememberBox').innerHTML=`<div class="sec"><p class="sub">Welcome back! Last visit ${timeAgo(last)} — ${SPOTS.length} spots waiting.</p></div>`;
  Store.saveSettings({lastVisit:nowISO()});
}
document.addEventListener('DOMContentLoaded',boot);
