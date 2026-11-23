'use strict';
(function(){
  try{
    document.body.classList.remove('modal-open','minimized');
    if(location.search.includes('wwe_safe=1')||location.hash.includes('wwe_safe=1')){
      document.body.classList.add('safe-mode');
    }
  }catch(e){}
})();
function killSplash(){const s=document.getElementById('splash');if(s){s.classList.add('done');s.style.display='none';s.style.visibility='hidden';s.style.pointerEvents='none';}}
const APP={name:'What We Eating?',by:'Wavelord',version:'2.0.0',ownerEmail:'vireshsingh26@protonmail.com',adminPassword:'1919',siteUrl:'https://wavelord-what-we-eating.netlify.app',fnBase:'https://wavelord-what-we-eating.netlify.app/.netlify/functions',fnChat:'groq-chat',maxPhotos:5,tz:'America/Port_of_Spain'};
const AREAS=['San Juan','Port of Spain','St James','Westmoorings','Chaguanas','Couva','Arima','Sangre Grande','San Fernando','Point Fortin','Tobago','Curepe','Tunapuna','Diego Martin','Barataria','Morvant'];
const CRAVINGS=[{k:'Beef',re:/beef|steak|burger|smash/i},{k:'Burger',re:/burger|smash/i},{k:'Roti',re:/roti|dhalpuri|paratha|buss/i},{k:'Doubles',re:/doubles/i},{k:'Pizza',re:/pizza/i},{k:'Chicken',re:/chicken|wings/i},{k:'Seafood',re:/seafood|shrimp|fish|shark|crab|lobster|calamari/i},{k:'Sides',re:/fries|sides|salad|rice/i},{k:'Drinks',re:/juice|soda|drink|shake|water|sorrel|punch/i},{k:'Dessert',re:/cake|ice cream|dessert|pudding|brownie/i},{k:'Breakfast',re:/breakfast|egg|bake/i},{k:'Korean',re:/ramyun|ramen|kimchi|bibimbap|bulgogi|donkatsu|mandu/i}];
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const money=n=>'$'+(Math.round(n*100)%100===0?Math.round(n):(+n).toFixed(2));
const cap=s=>String(s||'').replace(/\b\w/g,c=>c.toUpperCase());
const normArea=s=>String(s||'').split(',')[0].trim();
function cleanArea(raw){const t=normArea(raw);const found=AREAS.find(a=>t.toLowerCase().includes(a.toLowerCase())||a.toLowerCase().includes(t.toLowerCase()));return found||t||'San Juan';}
function toast(m){const t=$('#toast');if(!t)return;t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',2600)}
const Store={load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f}},save(k,v){localStorage.setItem(k,JSON.stringify(v))}};
let __scanBusy=false;
let __voiceBusy=false;
function normItemName(n){return String(n||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function dedupItems(items,existing){
  const seen=new Set((existing||[]).map(i=>normItemName(i.name)));
  const out=[];
  for(const it of (items||[])){
    const k=normItemName(it.name);
    if(!k||seen.has(k)) continue;
    seen.add(k); out.push(it);
  }
  return out;
}
let spots=Store.load('wwe_spots',null);
if(!spots){
spots=[
{id:'s1',name:'Doubles King',area:'San Juan',phone:'',rating:4.8,photos:[],menu:[{name:'Doubles',price:15,cat:'Doubles'},{name:'Sorrel',price:12,cat:'Drinks'}],hours:'6am - 2pm'},
{id:'s2',name:'Roti Palace',area:'Chaguanas',phone:'',rating:4.7,photos:[],menu:[{name:'Chicken Roti',price:65,cat:'Roti'},{name:'Beef Roti',price:70,cat:'Roti'}],hours:'10am - 8pm'},
{id:'s3',name:'Smash Burger Lime',area:'Port of Spain',phone:'',rating:4.9,photos:[],menu:[{name:'Smash Burger',price:85,cat:'Beef'},{name:'Loaded Fries',price:45,cat:'Sides'}],hours:'11am - 10pm'},
{id:'s4',name:'Lemon Pepper',area:'San Juan',phone:'',rating:5,photos:[],menu:[{name:'Lemon Pepper Wings',price:60,cat:'Chicken'},{name:'Seafood Bisque',price:35,cat:'Seafood'}],hours:'11am - 9pm'},
{id:'s5',name:'Chicken Delight',area:'San Juan',phone:'',rating:4.6,photos:[],menu:[{name:'Fried Chicken',price:45,cat:'Chicken'},{name:'Chicken Wings',price:55,cat:'Chicken'}],hours:'10am - 9pm'},
{id:'s6',name:'Island Grill',area:'Chaguanas',phone:'',rating:4.5,photos:[],menu:[{name:'Grilled Chicken',price:70,cat:'Chicken'},{name:'BBQ Chicken',price:75,cat:'Chicken'}],hours:'11am - 10pm'}
];
Store.save('wwe_spots',spots);
}
let favs=new Set(Store.load('wwe_favs',[]));
let votes=Store.load('wwe_votes',[]);
votes=votes.filter((v,i,a)=>a.findIndex(x=>x.title===v.title)===i);
Store.save('wwe_votes',votes);
let voterId=localStorage.getItem('wwe_voter')||uid();
localStorage.setItem('wwe_voter',voterId);
function saveSpots(){Store.save('wwe_spots',spots)}
function saveFavs(){Store.save('wwe_favs',[...favs])}
let isAdmin=localStorage.getItem('wwe_admin')==='1';
let editingId=null;
function updateAdminUI(){const addBtn=document.querySelector('#nav button[data-v="add"]');if(addBtn)addBtn.style.display=isAdmin?'':'none';const addView=$('#v-add');if(!isAdmin&&addView&&addView.classList.contains('active'))go('home');}
function unlockAdmin(){isAdmin=true;localStorage.setItem('wwe_admin','1');updateAdminUI();toast('Admin unlocked ✅ Add Spot is now visible');render();}
function lockAdmin(){isAdmin=false;localStorage.removeItem('wwe_admin');updateAdminUI();toast('Admin locked 🔒 Add hidden from guests');render();}
const AREA_COORDS={'San Juan':[10.6500,-61.4500],'Port of Spain':[10.6500,-61.5167],'St James':[10.6667,-61.5333],'Westmoorings':[10.6667,-61.5500],'Chaguanas':[10.5167,-61.4167],'Couva':[10.4167,-61.4500],'Arima':[10.6333,-61.2833],'Sangre Grande':[10.5833,-61.1333],'San Fernando':[10.2833,-61.4667],'Point Fortin':[10.1667,-61.6667],'Tobago':[11.2500,-60.6667],'Curepe':[10.6333,-61.4000],'Tunapuna':[10.6333,-61.3833],'Diego Martin':[10.7167,-61.5500],'Barataria':[10.6500,-61.4667],'Morvant':[10.6500,-61.4833]};
let userLoc=null;
let nearMode=false;
function distKm(a,b,c,d){const R=6371,dLat=(c-a)*Math.PI/180,dLng=(d-b)*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function spotDist(s){if(!userLoc)return null;const c=AREA_COORDS[normArea(s.area)];if(!c)return null;return distKm(userLoc.lat,userLoc.lng,c[0],c[1]);}
function syncNearBtn(){const b=$('#nearMeBtn');if(b)b.classList.toggle('on',nearMode);}
function useFallbackLoc(msg){userLoc={lat:10.65,lng:-61.45};nearMode=true;syncNearBtn();const fs=$('#fSort');if(fs)fs.value='near';toast(msg);renderFiltered();}
function doNearMe(btn){
if(nearMode){nearMode=false;syncNearBtn();toast('Near Me off — showing all');renderFiltered();return;}
if(!navigator.geolocation){useFallbackLoc('Location not supported - using San Juan centre');return;}
toast('📍 Getting your location… tap Allow when asked');
navigator.geolocation.getCurrentPosition(pos=>{
userLoc={lat:pos.coords.latitude,lng:pos.coords.longitude};
nearMode=true;syncNearBtn();
const fs=$('#fSort');if(fs)fs.value='near';
toast('📍 Near you — closest first');renderFiltered();
document.getElementById('homeList')?.scrollIntoView({behavior:'smooth'});
},()=>{
useFallbackLoc('Location blocked - using San Juan centre. To use real GPS: tap 🔒 in browser bar → Location → Allow, then try again.');
},{enableHighAccuracy:true,timeout:8000});
}
function requestNearForSort(){if(nearMode&&userLoc)return;doNearMe();}
const CAT_RULES=[['Korean',/\b(ramyun|ramen|kimchi|bibimbap|bulgogi|donkatsu|mandu|tofu)\b/i],['Drinks',/\b(juice|soda|water|coke|pepsi|sorrel|punch|drink|beer|smoothie|coffee|tea|shake|ginger beer|mauby|coconut)\b/i],['Dessert',/\b(cake|ice cream|brownie|pudding|dessert|sweet|cookie|pie|flan)\b/i],['Pizza',/\bpizza|calzone/i],['Roti',/\broti|dhalpuri|dhal puri|paratha|buss ?up ?shut|wrap\b/i],['Doubles',/\bdoubles\b/i],['Seafood',/\b(shrimp|fish|shark|crab|lobster|calamari|seafood|salmon|kingfish|prawn)\b/i],['Breakfast',/\b(breakfast|egg|omelet|omelette|pancake|sausage bake|bake & saltfish|saltfish)\b/i],['Chicken',/\b(chicken|wings?|nuggets?|tenders?)\b/i],['Beef',/\b(beef|burger|steak|smash|patty|bacon|goat|ribs?)\b/i],['Sides',/\b(fries|sides?|salad|rice|coleslaw|plantain|corn|onion rings|chow)\b/i]];
function categorize(n){for(const [c,re] of CAT_RULES)if(re.test(n||''))return c;return 'Other'}
function parseMenuText(raw,opts){
opts=opts||{};
let text=String(raw||'').replace(/TT\s*\$/gi,'$').replace(/\bTTD?\s*(?=\d)/gi,'$').replace(/\$\s+(?=\d)/g,'$');
if(opts.ocr)text=text.replace(/(^|\s)S(\d{2,3})(?!\d)/g,'$1$$$2');
const items=[],seen=new Set();
let ctx=null;
const cleanName=n=>n.replace(/^[\s,;|:\-–—.•*_=~]+/,'').replace(/[\s,;|:\-–—.•*_=~…]+$/,'').replace(/\s{2,}/g,' ').trim();
const add=(name,price)=>{
name=cleanName(name);price=parseFloat(price);
if(!/[A-Za-z]{2}/.test(name)||!(price>0&&price<=5000)||name.length>80)return;
const key=normItemName(name);if(seen.has(key))return;seen.add(key);
const c=categorize(name);items.push({name,price,cat:c!=='Other'?c:(ctx||'Other')});
};
for(let line of text.split(/\r?\n/)){
line=line.replace(/^\s*[•·*]\s*/,'').replace(/^\s*\d{1,2}[.)]\s+(?=[A-Za-z])/,'').replace(/[|_=~]{1,}/g,' ').trim();
if(!line)continue;
if(/^[A-Z][A-Z \-&]{3,}$/.test(line)&&!line.includes('$')){ctx=cap(line.toLowerCase());continue}
const re=/\$(\d{1,4}(?:\.\d{1,2})?)/g;
const ms=[...line.matchAll(re)];
if(ms.length){let prev=0;ms.forEach((m,i)=>{const before=line.slice(prev,m.index);if(cleanName(before))add(before,m[1]);else if(i===ms.length-1)add(line.slice(m.index+m[0].length),m[1]);prev=m.index+m[0].length});continue}
const b=line.match(/^(.*[A-Za-z)].*?)[\s.\-–—:…]+(\d{1,4}(?:\.\d{1,2})?)$/);
if(b){add(b[1],b[2]);continue}
}
return items;
}
function bestFor(spot,craving){const re=CRAVINGS.find(c=>c.k===craving)?.re;if(!re)return null;let best=null;for(const it of spot.menu)if(re.test(it.name))if(!best||it.price<best.price)best=it;return best}
function go(v){
if(v==='add'&&!isAdmin){toast('🔒 Add is admin-only. Unlock in Settings.');v='home';}
$('#buddy')?.classList.remove('open');
const bm=$('#buddyMenu');if(bm)bm.style.display='none';
$$('.view').forEach(el=>el.classList.remove('active'));
$('#v-'+v)?.classList.add('active');
$$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
render();
if(v==='vote'&&liveVoteId){fetchLiveVote(liveVoteId);startLivePoll();}
window.scrollTo({top:0});
}
function closeModalFn(){$('#modal').classList.remove('open');document.body.classList.remove('modal-open');}
function startEdit(id){
if(!isAdmin)return toast('🔒 Admin only');
const s=spots.find(x=>x.id===id);if(!s)return;
editingId=id;closeModalFn();
$('#aName').value=s.name;$('#aArea').value=s.area||'';$('#aPhone').value=s.phone||'';
$('#aMenu').value=(s.menu||[]).map(m=>`${m.name} - $${m.price}`).join('\n');
pendingPhotos=[...(s.photos||[])];
$('#aPhotoPrev').innerHTML=pendingPhotos.map(p=>`<img src="${p}">`).join('');
const t=$('#addTitle');if(t)t.innerHTML='✏️ Edit Spot <span style="font-size:.7rem;background:#ff4d2e;padding:3px 8px;border-radius:999px">ADMIN ONLY</span>';
const b=$('#editBanner');if(b){b.style.display='block';b.textContent='Editing: '+s.name+' — change anything, then tap Update Spot.';}
const sb=$('#saveSpotBtn');if(sb)sb.textContent='Update Spot ✅';
const cb=$('#cancelEditBtn');if(cb)cb.style.display='block';
go('add');window.scrollTo({top:0});toast('Editing '+s.name+' ✏️');
}
function cancelEdit(){
editingId=null;pendingPhotos=[];
$('#aName').value='';$('#aArea').value='';$('#aPhone').value='';$('#aMenu').value='';$('#aPhotoPrev').innerHTML='';
const t=$('#addTitle');if(t)t.innerHTML='➕ Add / Edit Spot <span style="font-size:.7rem;background:#ff4d2e;padding:3px 8px;border-radius:999px">ADMIN ONLY</span>';
const b=$('#editBanner');if(b)b.style.display='none';
const sb=$('#saveSpotBtn');if(sb)sb.textContent='Save Spot';
const cb=$('#cancelEditBtn');if(cb)cb.style.display='none';
toast('Back to Add New');
}
function deleteSpot(id){
if(!isAdmin)return toast('🔒 Admin only');
const s=spots.find(x=>x.id===id);if(!s)return;
if(!confirm('Delete "'+s.name+'"? This cannot be undone.'))return;
spots=spots.filter(x=>x.id!==id);saveSpots();
if(editingId===id)cancelEdit();
closeModalFn();render();toast('Deleted '+s.name+' 🗑️');
}
function cardHTML(s){
const img=s.photos?.[0]?`<img src="${esc(s.photos[0])}" data-photo="${esc(s.photos[0])}" data-spot="${s.id}" alt="">`:`<div style="height:150px;background:linear-gradient(135deg,#ff4d2e,#ff9a00);display:grid;place-items:center;font-size:3rem">🍔</div>`;
const dist=(nearMode&&spotDist(s)!=null)?` • 📍 ${spotDist(s).toFixed(1)} km away`:'';
const adminRow=isAdmin?`<div class="row" style="margin-top:6px"><button class="sm" data-act="editSpot" data-id="${s.id}" style="background:#ff9a00;color:#111">✏️ Edit</button><button class="sm" data-act="deleteSpot" data-id="${s.id}" style="background:#e5484d;color:#fff">🗑️ Delete</button></div>`:'';
return `<div class="card"><div data-act="openSpot" data-id="${s.id}">${img}<div class="cardBody"><h3>${esc(s.name)}</h3><p class="mut">${esc(s.area)} • ⭐ ${s.rating}${dist} • ${esc(s.hours||'')}</p><p style="margin-top:6px">${s.menu.slice(0,3).map(m=>`<span class="pill">${esc(m.name)} — ${money(m.price)}</span>`).join('')}${s.photos?.length?`<span class="pill">📸 ${s.photos.length} photo${s.photos.length>1?'s':''} — tap to view</span>`:''}</p></div></div><div class="cardBody" style="padding-top:0"><div class="row"><button class="sm primary" data-act="openSpot" data-id="${s.id}">View Menu</button><button class="sm" data-act="fav" data-id="${s.id}" style="background:var(--card2);color:var(--text)">${favs.has(s.id)?'❤️ Saved':'🤍 Save'}</button><button class="sm" data-act="shareSpot" data-id="${s.id}" data-name="${esc(s.name)}" style="background:var(--card2);color:var(--text)">🔗 Share</button></div>${adminRow}</div></div>`;
}
function getFilteredSpots(){
const q=($('#q')?.value||'').trim().toLowerCase();
const area=$('#fArea')?.value||'';
const sort=$('#fSort')?.value||'rec';
const price=$('#fPrice')?.value||'';
const craving=CRAVINGS.find(c=>c.k.toLowerCase()===q);
const matchesQuery=s=>{
if(!q)return true;
if(craving)return (s.menu||[]).some(m=>craving.re.test(m.name)||craving.re.test(m.cat||''));
return s.name.toLowerCase().includes(q)||normArea(s.area).toLowerCase().includes(q)||(s.menu||[]).some(m=>m.name.toLowerCase().includes(q)||(m.cat||'').toLowerCase().includes(q));
};
const matchesPrice=s=>{
if(!price)return true;
let list=s.menu||[];
if(q){list=list.filter(m=>{if(craving)return craving.re.test(m.name)||craving.re.test(m.cat||'');return m.name.toLowerCase().includes(q)||(m.cat||'').toLowerCase().includes(q);});}
return list.some(m=>{if(price==='1')return m.price<=35;if(price==='2')return m.price>35&&m.price<=80;if(price==='3')return m.price>80;return true;});
};
let list=spots.filter(matchesQuery);
let withAP=list.filter(s=>(!area||normArea(s.area)===area)&&matchesPrice(s));
if(withAP.length===0&&(area||price)){withAP=list.filter(s=>(!area||normArea(s.area)===area));}
if(withAP.length===0&&area){withAP=list;}
list=withAP;
if(sort==='near'||(nearMode&&userLoc)){list=[...list].sort((a,b)=>(spotDist(a)??999)-(spotDist(b)??999));}
else if(sort==='rating'){list=[...list].sort((a,b)=>b.rating-a.rating);}
else if(sort==='low'){list=[...list].sort((a,b)=>Math.min(...a.menu.map(m=>m.price))-Math.min(...b.menu.map(m=>m.price)));}
return list;
}
function renderFiltered(){
const list=getFilteredSpots();
const home=$('#homeList');if(!home)return;
const cnt=$('#homeCount');
const q=($('#q')?.value||'').trim();
const area=$('#fArea')?.value||'';
const price=$('#fPrice')?.value||'';
if(cnt)cnt.textContent='Showing '+list.length+' of '+spots.length+' spots'+(q?' for "'+q+'"':'')+(nearMode?' • 📍 Nearest first':'');
if(!list.length){home.innerHTML=`<div class="sec"><p>No spots for "${q||'that'}" yet.</p><p class="mut" style="margin-top:6px">Try just typing Beef alone, with Area = All areas + Price = Any price. That always works.</p><button class="primary" data-act="clearFilters" style="margin-top:10px">✕ Clear filters - Show all</button></div>`;return;}
let note='';
if((area||price)&&list.some(s=>area&&normArea(s.area)!==area))note=`<p class="mut" style="margin-bottom:8px">No exact match for Area + Price together, so showing closest matches for "${q||'all'}". Tap Clear filters to see all.</p>`;
home.innerHTML=note+`<div class="grid">${list.map(cardHTML).join('')}</div>`;
}
function clearFilters(){
const q=$('#q');if(q)q.value='';
const a=$('#fArea');if(a)a.value='';
const p=$('#fPrice');if(p)p.value='';
const s=$('#fSort');if(s)s.value='rec';
nearMode=false;syncNearBtn();
document.querySelectorAll('#chips .chip').forEach(c=>c.classList.remove('on'));
renderFiltered();toast('Filters cleared — showing all');
}
function render(){
const top=[...spots].sort((a,b)=>b.rating-a.rating).slice(0,10);
const bl=$('#browseList');if(bl)bl.innerHTML=`<div class="grid">${spots.map(cardHTML).join('')}</div>`;
const fo=$('#favOut');if(fo)fo.innerHTML=`<div class="grid">${spots.filter(s=>favs.has(s.id)).map(cardHTML).join('')||'<p class="mut">No favourites yet.</p>'}</div>`;
const t10=$('#top10Sec');if(t10)t10.innerHTML=`<div class="sec"><div class="secHead"><h2>🏆 Top 10</h2><button class="sm primary" data-act="go" data-v="top10">See All</button></div>${top.slice(0,3).map((s,i)=>`<p style="margin-top:8px">${i+1}. <b>${esc(s.name)}</b> — ⭐ ${s.rating} • ${esc(s.area)}</p>`).join('')}</div>`;
const t10o=$('#top10Out');if(t10o)t10o.innerHTML=`<div class="grid">${top.map(cardHTML).join('')}</div>`;
const fy=$('#forYou');if(fy)fy.innerHTML=`<h2>🔥 For You</h2><p class="sub">Trending in Trinidad right now</p>`;
const sp=$('#specialsSec');if(sp)sp.innerHTML=`<div class="sec" style="background:linear-gradient(135deg,#ff4d2e,#ff9a00)"><h2>🔥 Today’s Lime</h2><p>Doubles in San Juan from $15 — tap a card to see full menu + photos.</p></div>`;
const tr=$('#trendSec');if(tr)tr.innerHTML=`<div class="sec"><h2>📈 Trending</h2><p class="sub">${spots.map(s=>esc(s.name)).join(' • ')}</p></div>`;
renderVotes();
const sl=$('#savedLine');if(sl)sl.textContent=spots.length+' spots • '+favs.size+' favourites';
renderFiltered();
}
function openSpot(id){
const s=spots.find(x=>x.id===id);if(!s)return;
let adminBtn='';
if(isAdmin){adminBtn=`<div class="row" style="margin-top:10px"><button class="primary" data-act="editSpot" data-id="${s.id}" style="background:#ff9a00;color:#111">✏️ Edit This Spot</button><button class="primary" data-act="deleteSpot" data-id="${s.id}" style="background:#e5484d">🗑️ Delete</button></div>`;}
const body=`<div class="modal-close-bar"><b>${esc(s.name)}</b><button class="primary" data-act="closeModal" style="background:#333;padding:10px 16px">✕ Close</button></div><h2>${esc(s.name)}</h2><p class="mut">${esc(s.area)} • ⭐ ${s.rating} • ${esc(s.hours||'')}</p>${s.photos?.length?`<div class="photoRow">${s.photos.map((p,i)=>`<img src="${esc(p)}" data-photo="${esc(p)}" data-spot="${s.id}" data-idx="${i}">`).join('')}</div><p class="mut">Tap a photo to open fullscreen.</p>`:`<p class="mut" style="margin-top:8px">No photos yet.</p>`}<h3 style="margin-top:12px">Menu</h3>${s.menu.map(m=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(m.name)} <span class="pill">${esc(m.cat)}</span></span><b>${money(m.price)}</b></div>`).join('')}<div class="row" style="margin-top:12px"><button class="primary" data-act="fav" data-id="${s.id}">${favs.has(s.id)?'❤️ Saved':'🤍 Save'}</button><button class="primary" data-act="shareSpot" data-id="${s.id}" data-name="${esc(s.name)}" style="background:var(--card2)">🔗 Share</button><button class="primary" data-act="closeModal" style="background:var(--card2)">Close</button></div>${adminBtn}`;
$('#modalBody').innerHTML=body;
$('#modal').classList.add('open');
document.body.classList.add('modal-open');
}
let pendingPhotos=[];
document.getElementById('aPhotos')?.addEventListener('change',e=>{
pendingPhotos=[];
[...e.target.files].slice(0,5).forEach(f=>{
const r=new FileReader();
r.onload=()=>{pendingPhotos.push(r.result);$('#aPhotoPrev').innerHTML=pendingPhotos.map(p=>`<img src="${p}">`).join('')};
r.readAsDataURL(f);
});
});
function saveSpot(){
if(!isAdmin)return toast('🔒 Only admin can add spots');
const name=$('#aName').value.trim();if(!name)return toast('Add a name first');
const menu=dedupItems(parseMenuText($('#aMenu').value),[]);
if(!menu.length)return toast('Add menu — e.g. Beef Burger - $85');
const area=cleanArea($('#aArea').value);
if(editingId){
const idx=spots.findIndex(x=>x.id===editingId);
if(idx>=0){spots[idx]={...spots[idx],name,area,phone:$('#aPhone').value.trim(),menu,photos:pendingPhotos.length?[...pendingPhotos]:spots[idx].photos};saveSpots();toast('Updated '+name+' ✅');cancelEdit();go('browse');return;}
}
const s={id:uid(),name,area,phone:$('#aPhone').value.trim(),rating:4.5,photos:[...pendingPhotos],menu,hours:'See spot for hours'};
spots.unshift(s);saveSpots();pendingPhotos=[];$('#aPhotoPrev').innerHTML='';toast('Saved! ✅');go('browse');
}
const SCAN_FN=APP.fnBase+'/scan-menu';
function compressImage(dataUrl,maxW=1200){
return new Promise((res)=>{
const img=new Image();
img.onload=()=>{
const scale=Math.min(1,maxW/img.width);
const c=document.createElement('canvas');
c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
c.getContext('2d').drawImage(img,0,0,c.width,c.height);
res(c.toDataURL('image/jpeg',0.82));
};
img.onerror=()=>res(dataUrl);
img.src=dataUrl;
});
}
async function loadTesseract(){
if(window.【entity-Tesseract¦canonical_name=Tesseract】)return window.【entity-Tesseract¦canonical_name=Tesseract】;
return new Promise((res,rej)=>{
const s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
s.onload=()=>res(window.【entity-Tesseract¦canonical_name=Tesseract】);
s.onerror=()=>rej(new Error('OCR failed to load'));
document.head.appendChild(s);
});
}
async function scanMenuFile(file){
const status=$('#scanStatus');
if(status) status.textContent='📸 AI READ… reading menu, please wait…';
try{
const dataUrl=await new Promise((res,rej)=>{
const r=new FileReader();
r.onload=()=>res(r.result);
r.onerror=rej;
r.readAsDataURL(file);
});
const compressed=await compressImage(dataUrl);
let items=[];
let ocrText='';
try{
const r=await fetch(SCAN_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:compressed})});
const j=await r.json().catch(()=>({}));
if(r.ok && Array.isArray(j.items) && j.items.length) items=j.items;
else if(!r.ok) throw new Error(j.error||'Scan failed');
}catch(e){
if(status) status.textContent='Vision missed — trying OCR cleanup…';
const T=await loadTesseract();
const out=await T.recognize(file,'eng');
ocrText=(out && out.data && out.data.text) || '';
if(ocrText.trim()){
const r2=await fetch(SCAN_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:ocrText})});
const j2=await r2.json().catch(()=>({}));
if(r2.ok && Array.isArray(j2.items)) items=j2.items;
}
if(!items.length){ items=parseMenuText(ocrText,{ocr:true}); }
}
items=dedupItems(items.map(i=>({...i,cat:categorize(i.name)})),[]);
if(!items.length){
if(status) status.textContent='Could not read prices. Try a clearer photo, straight-on, good light.';
toast('Could not read prices — try clearer photo');
return;
}
$('#aMenu').value=items.map(i=>`${i.name} - $${i.price}`).join('\n');
if(status) status.textContent='✅ AI READ '+items.length+' items! Check menu below, fix any wrong price, then tap '+(editingId?'Update Spot':'Save Spot')+'.';
toast('Scanned '+items.length+' items ✅ Check before saving');
}catch(e){
if(status) status.textContent='Scan failed: '+e.message+'. Try Paste Menu instead.';
toast('Scan failed — try Paste Menu');
}
}
function handleScanFile(e){
const f=e.target.files?.[0];if(!f)return;
e.target.value='';
if(__scanBusy){toast('Already scanning… wait');return;}
__scanBusy=true;
const r=new FileReader();
r.onload=()=>{pendingPhotos.push(r.result);$('#aPhotoPrev').innerHTML=pendingPhotos.map(p=>`<img src="${p}">`).join('');};
r.readAsDataURL(f);
scanMenuFile(f).finally(()=>{__scanBusy=false;});
}
document.getElementById('scanInputCamera')?.addEventListener('change',handleScanFile);
document.getElementById('scanInputUpload')?.addEventListener('change',handleScanFile);
async function voiceToTextViaGroq(){
  if(!navigator.mediaDevices?.getUserMedia) return null;
  if(__voiceBusy) return null;
  __voiceBusy=true;
  toast('🎤 Listening… speak now');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4';
    const rec=new MediaRecorder(stream,{mimeType:mime});
    const chunks=[];
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const done=new Promise(res=>rec.onstop=res);
    rec.start();
    setTimeout(()=>{if(rec.state==='recording')rec.stop();},12000);
    const stopEarly=()=>{if(rec.state==='recording')rec.stop();};
    document.addEventListener('click',stopEarly,{once:true});
    await done;
    stream.getTracks().forEach(t=>t.stop());
    if(!chunks.length) return null;
    const blob=new Blob(chunks,{type:mime});
    const base64=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(blob);});
    const r=await fetch(APP.fnBase+'/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:base64,mime})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||'Voice failed');
    return (j.text||'').trim();
  }catch(e){toast('Voice: '+e.message);return null;}
  finally{__voiceBusy=false;}
}
function doVoice(target){
  voiceToTextViaGroq().then(txt=>{
    if(txt){
      if(target==='search'){$('#q').value=txt;renderFiltered();}
      else{$('#aMenu').value+=('\n'+txt);}
      toast('Heard: '+txt); return;
    }
    try{
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){toast('Voice not supported — type instead');return;}
      const r=new SR();r.lang='en-US';
      r.onresult=e=>{const t=e.results[0][0].transcript;if(target==='search'){$('#q').value=t;renderFiltered();}else{$('#aMenu').value+=('\n'+t);};toast('Heard: '+t);};
      r.onerror=()=>toast('Could not hear — try again');
      r.start();toast('🎤 Listening…');
    }catch(e){toast('Voice failed');}
  });
}
function doCompare(){
const cr=$('#cCraving').value,ar=$('#cArea').value;
let list=spots.map(s=>({s,b:bestFor(s,cr)})).filter(x=>x.b&&(!ar||normArea(x.s.area)===ar)).sort((a,b)=>a.b.price-b.b.price);
$('#compareOut').innerHTML=list.length?`<div class="sec"><table><tr><th>Spot</th><th>Item</th><th>Price</th><th>Photo</th></tr>${list.map(x=>`<tr><td>${esc(x.s.name)}<br><span class="mut">${esc(x.s.area)}</span></td><td>${esc(x.b.name)}</td><td>${money(x.b.price)}</td><td>${x.s.photos?.[0]?`<img src="${esc(x.s.photos[0])}" data-photo="${esc(x.s.photos[0])}" data-spot="${x.s.id}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;cursor:pointer">`:'—'}</td></tr>`).join('')}</table></div>`:`<div class="sec"><p class="mut">No matches.</p></div>`;
}
const VOTE_FN=APP.fnBase+'/vote';
let liveVoteId=localStorage.getItem('wwe_live_vote')||null;
let liveVote=null;
let livePollTimer=null;
function renderVotes(){
const el=$('#voteOut');if(!el)return;
if(!liveVote){el.innerHTML='<p class="mut">No active vote — create one above and share it. Family will see live counts.</p>';return;}
const total=liveVote.total||0;
const counts=liveVote.counts||liveVote.opts.map(()=>0);
el.innerHTML=`<div class="sec"><h3>${esc(liveVote.title)}</h3><p class="mut">${total} vote${total!==1?'s':''} • 1 per person • LIVE 🔴</p>${liveVote.opts.map((o,oi)=>{const c=counts[oi]||0;const pct=total?Math.round(c/total*100):0;const mine=liveVote.votes?.[voterId]===oi;return `<div class="voteOpt ${mine?'voted':''}" data-act="voteCast" data-oi="${oi}"><span>${esc(o)} ${mine?'✅ You':''}</span><b>${c} (${pct}%)</b></div><div class="bar"><i style="width:${pct}%"></i></div>`}).join('')}<div class="row" style="margin-top:10px"><button class="sm primary" data-act="shareVote">🔗 Share This Vote</button><button class="sm" data-act="clearVote" style="background:var(--card2);color:var(--text)">🗑️ Delete / Start New</button></div><p class="mut" style="margin-top:8px">Vote ID: ${esc(liveVote.id)}</p></div>`;
}
async function fetchLiveVote(id){
try{
const r=await fetch(VOTE_FN+'?id='+encodeURIComponent(id));
if(!r.ok)throw new Error('Vote not found');
const j=await r.json();
liveVote=j;liveVoteId=j.id;localStorage.setItem('wwe_live_vote',j.id);
votes=[{id:j.id,title:j.title,opts:j.opts,votes:j.votes||{}}];
Store.save('wwe_votes',votes);
renderVotes();
return j;
}catch(e){return null}
}
function onVisPoll(){if(!document.hidden&&liveVoteId)fetchLiveVote(liveVoteId);}
function startLivePoll(){
stopLivePoll();
if(!liveVoteId)return;
fetchLiveVote(liveVoteId);
livePollTimer=setInterval(()=>{if(liveVoteId)fetchLiveVote(liveVoteId);},2000);
document.removeEventListener('visibilitychange',onVisPoll);
document.addEventListener('visibilitychange',onVisPoll);
}
function stopLivePoll(){if(livePollTimer)clearInterval(livePollTimer);livePollTimer=null;}
let creatingVote=false;
async function createVote(){
if(creatingVote)return;creatingVote=true;setTimeout(()=>creatingVote=false,800);
const t=$('#voteTitle').value.trim()||'What We Eating?';
const opts=[...new Set($('#voteOpts').value.split(',').map(s=>s.trim()).filter(Boolean))];
if(opts.length<2)return toast('Add at least 2 options, comma separated');
try{
const r=await fetch(VOTE_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',title:t,opts})});
const j=await r.json();
if(!r.ok)throw new Error(j.error||'Create failed');
liveVote=j;liveVoteId=j.id;localStorage.setItem('wwe_live_vote',j.id);
votes=[{id:j.id,title:j.title,opts:j.opts,votes:{}}];
Store.save('wwe_votes',votes);
$('#voteTitle').value='';$('#voteOpts').value='';
renderVotes();startLivePoll();
toast('New live vote started ✅ Old vote cleared');
}catch(e){toast('Vote create failed: '+e.message)}
}
async function voteCast(oi){
const optIndex=Number(oi);
if(!liveVote)return toast('Create a vote first');
if(isNaN(optIndex))return;
try{
const r=await fetch(VOTE_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'vote',id:liveVote.id,voterId,oi:optIndex})});
const j=await r.json();
if(!r.ok)throw new Error(j.error||'Vote failed');
liveVote=j;renderVotes();toast('Vote counted ✅ Live!');
}catch(e){toast('Vote failed: '+e.message)}
}
async function clearAllVotes(){
if(!confirm('Clear live vote and start fresh? Everyone will lose this vote.'))return;
if(liveVoteId){try{await fetch(VOTE_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear',id:liveVoteId})});}catch(e){}}
liveVote=null;liveVoteId=null;localStorage.removeItem('wwe_live_vote');
votes=[];Store.save('wwe_votes',votes);
stopLivePoll();renderVotes();toast('Votes cleared 🗑️');
}
function encodeVoteLink(v){return location.origin+location.pathname+'#vote='+v.id;}
function decodeVoteFromHash(){
const m=location.hash.match(/#vote=([A-Za-z0-9_-]+)/);if(!m)return null;
if(m[1].length>20){try{const j=JSON.parse(decodeURIComponent(escape(atob(m[1]))));return {legacy:j};}catch(e){return {id:m[1]};}}
return {id:m[1]};
}
async function handleSharedVote(){
const shared=decodeVoteFromHash();if(!shared)return;
if(shared.legacy){
try{
const r=await fetch(VOTE_FN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',title:shared.legacy.t,opts:shared.legacy.o})});
const j=await r.json();
if(r.ok){liveVote=j;liveVoteId=j.id;localStorage.setItem('wwe_live_vote',j.id);}
}catch(e){}
}else if(shared.id){await fetchLiveVote(shared.id);}
go('vote');startLivePoll();toast('Live vote opened — cast your 1 vote! 🗳️');
}
function roulette(){
if(!spots.length)return;
const s=spots[Math.floor(Math.random()*spots.length)];
toast('🎲 '+s.name+' — '+s.area);openSpot(s.id);
}
function shareLink(title,url){
const full=url||location.href.split('#')[0];
if(navigator.share){navigator.share({title,text:title,url:full}).catch(()=>{})}
else if(navigator.clipboard){navigator.clipboard.writeText(full).then(()=>toast('Link copied! 📋'))}
else{prompt('Copy link:',full)}
}
function setupChips(){
const el=$('#chips');if(!el)return;
el.innerHTML=CRAVINGS.map(c=>`<button class="chip" data-crav="${c.k}">${c.k}</button>`).join('');
el.querySelectorAll('.chip').forEach(ch=>{
ch.onclick=()=>{
const isOn=ch.classList.contains('on');
el.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));
if(isOn){$('#q').value=''}else{ch.classList.add('on');$('#q').value=ch.dataset.crav}
renderFiltered();
document.getElementById('homeList')?.scrollIntoView({behavior:'smooth',block:'start'});
};
});
}
$('#q')?.addEventListener('input',()=>{
const q=$('#q').value.trim().toLowerCase();
document.querySelectorAll('#chips .chip').forEach(ch=>ch.classList.toggle('on',ch.dataset.crav.toLowerCase()===q));
renderFiltered();
});
$('#fArea')?.addEventListener('change',renderFiltered);
$('#fPrice')?.addEventListener('change',renderFiltered);
$('#fSort')?.addEventListener('change',()=>{
const v=$('#fSort').value;
if(v==='near'&&(!nearMode||!userLoc)){requestNearForSort();}
renderFiltered();
});
let lbPhotos=[],lbIndex=0;
function openLightbox(photos,idx){lbPhotos=photos;lbIndex=idx||0;const lb=$('#lightbox');lb.style.display='flex';updateLightbox()}
function updateLightbox(){$('#lightboxImg').src=lbPhotos[lbIndex];$('#lbCount').textContent=(lbIndex+1)+' / '+lbPhotos.length}
function closeLightbox(){$('#lightbox').style.display='none'}
let lbX=0;
$('#lightboxImg')?.addEventListener('touchstart',e=>lbX=e.touches[0].clientX,{passive:true});
$('#lightboxImg')?.addEventListener('touchend',e=>{
const dx=e.changedTouches[0].clientX-lbX;
if(Math.abs(dx)>40){lbIndex=dx<0?(lbIndex+1)%lbPhotos.length:(lbIndex-1+lbPhotos.length)%lbPhotos.length;updateLightbox()}
},{passive:true});
function openBuddy(){
if(document.body.classList.contains('safe-mode'))return;
const buddy=$('#buddy');
buddy.classList.add('open');
const bm=$('#buddyMenu');if(bm)bm.style.display='none';
const md=$('#miniDock');if(md)md.style.display='none';
if(!buddy.dataset.welcomed){
buddy.dataset.welcomed='1';
const msgs=$('#buddyMsgs');
const d=document.createElement('div');
d.className='msg bot';
d.textContent="Wah gwan! 👋 I'm Wave Buddy. I can talk even while the app is minimized. Tap Return when yuh ready to come back.";
msgs.appendChild(d);
}
setTimeout(()=>$('#buddyInput')?.focus(),100);
}
function buildBuddyContext(){return 'SPOTS:\n'+spots.map(s=>`- ${s.name} in ${s.area} | ⭐ ${s.rating} | Hours: ${s.hours||'n/a'} | Menu: ${(s.menu||[]).map(i=>`${i.name} $${i.price}`).join(', ')}`).join('\n')}
let buddyHistory=[];
async function buddyAsk(q){
const msgs=$('#buddyMsgs');
const add=(t,me)=>{const d=document.createElement('div');d.className='msg '+(me?'me':'bot');d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d};
add(q,true);
const thinking=add('Thinking…',false);
buddyHistory.push({role:'user',content:q});
buddyHistory=buddyHistory.slice(-12);
try{
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),15000);
const r=await fetch(APP.fnBase+'/'+APP.fnChat,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:buddyHistory,context:buildBuddyContext(),fast:false}),signal:controller.signal});
clearTimeout(timer);
const j=await r.json().catch(()=>({}));
if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
const txt=j.text||j.reply||j.choices?.[0]?.message?.content||'';
if(!txt)throw new Error('Empty reply');
thinking.textContent=txt;
buddyHistory.push({role:'assistant',content:txt});
buddyHistory=buddyHistory.slice(-12);
}catch(e){
const l=q.toLowerCase();
const craving=CRAVINGS.find(c=>l.includes(c.k.toLowerCase()));
if(craving){
const matches=spots.filter(s=>s.menu.some(m=>craving.re.test(m.name))).sort((a,b)=>(bestFor(a,craving.k)?.price||999)-(bestFor(b,craving.k)?.price||999));
if(matches.length){
thinking.textContent=`For ${craving.k} (from your spots):\n`+matches.slice(0,3).map(s=>{const b=bestFor(s,craving.k);return `• ${s.name} (${s.area}) — ${b.name} ${money(b.price)} ⭐ ${s.rating}`}).join('\n');
return;
}
}
thinking.textContent='Wave Buddy couldn\'t reach Groq: '+e.message+'. Check Netlify → Functions → groq-chat log + GROQ_API_KEY.';
}
}
$('#buddyForm')?.addEventListener('submit',e=>{e.preventDefault();const v=$('#buddyInput').value.trim();if(!v)return;$('#buddyInput').value='';buddyAsk(v)});
function buddyVoice(){
  voiceToTextViaGroq().then(txt=>{if(txt) buddyAsk(txt);});
}
$('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')closeModalFn();});
document.addEventListener('click',e=>{
const photo=e.target.closest('[data-photo]');
if(photo){e.stopPropagation();const spot=spots.find(s=>s.id===photo.dataset.spot);if(spot&&spot.photos?.length){const idx=spot.photos.indexOf(photo.dataset.photo);openLightbox(spot.photos,idx>=0?idx:0)}else{openLightbox([photo.dataset.photo],0)}return}
if(e.target.id==='lightbox'){closeLightbox();return}
const b=e.target.closest('[data-act]');if(!b)return;
const act=b.dataset.act;
if(act==='skipSplash'){killSplash();return}
if(act==='go')go(b.dataset.v);
if(act==='openSpot')openSpot(b.dataset.id);
if(act==='editSpot'){startEdit(b.dataset.id);return}
if(act==='deleteSpot'){deleteSpot(b.dataset.id);return}
if(act==='cancelEdit'){cancelEdit();return}
if(act==='clearFilters'){clearFilters();return}
if(act==='closeModal')closeModalFn();
if(act==='fav'){const id=b.dataset.id;favs.has(id)?favs.delete(id):favs.add(id);saveFavs();render();return}
if(act==='nearMe')doNearMe(b);
if(act==='voiceSearch')doVoice('search');
if(act==='voiceMenu')doVoice('menu');
if(act==='buddyVoice')buddyVoice();
if(act==='buddyTalk'){openBuddy();return}
if(act==='pasteMenu'){navigator.clipboard?.readText().then(t=>{$('#aMenu').value=t;toast('Pasted!')}).catch(()=>toast('Paste manually'))}
if(act==='scanCamera'){if(!isAdmin){toast('🔒 Add is admin-only');return;}$('#scanInputCamera')?.click();}
if(act==='scanUpload'){if(!isAdmin){toast('🔒 Add is admin-only');return;}$('#scanInputUpload')?.click();}
if(act==='scanMenu'){if(!isAdmin){toast('🔒 Add is admin-only');return;}$('#scanInputUpload')?.click();}
if(act==='saveSpot')saveSpot();
if(act==='doCompare')doCompare();
if(act==='createVote')createVote();
if(act==='voteCast')voteCast(+b.dataset.oi);
if(act==='clearVote')clearAllVotes();
if(act==='clearAllVotes')clearAllVotes();
if(act==='roulette')roulette();
if(act==='shareVote'){if(!liveVote)return toast('Create a vote first');shareLink('Vote: '+liveVote.title,encodeVoteLink(liveVote));}
if(act==='shareSpot'){shareLink(b.dataset.name,location.href.split('#')[0]+'#spot-'+b.dataset.id)}
if(act==='lbClose')closeLightbox();
if(act==='lbNext'){lbIndex=(lbIndex+1)%lbPhotos.length;updateLightbox()}
if(act==='lbPrev'){lbIndex=(lbIndex-1+lbPhotos.length)%lbPhotos.length;updateLightbox()}
if(act==='bigText'){const cur=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||1;document.documentElement.style.setProperty('--fs',cur>=1.2?1:1.2)}
if(act==='tutorial'){showOnboard(true)}
if(act==='backup'){const blob=new Blob([JSON.stringify({spots,votes,favs:[...favs]})],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wwe-backup.json';a.click()}
if(act==='restore'){
const inp=document.createElement('input');inp.type='file';inp.accept='.json';
inp.onchange=()=>{const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);spots=j.spots||spots;votes=j.votes||votes;saveSpots();Store.save('wwe_votes',votes);render();toast('Restored!')}catch(e){toast('Bad backup file')}};r.readAsText(inp.files[0])};
inp.click()
}
if(act==='report'){location.href='mailto:'+APP.ownerEmail+'?subject=What We Eating? Problem'}
if(act==='adminLogin'){if($('#adminPin').value===APP.adminPassword){unlockAdmin();$('#adminOut').innerHTML='<p>✅ Admin unlocked. Add Spot is now visible.</p>'}else{$('#adminOut').innerHTML='<p>❌ Wrong PIN</p>'}}
if(act==='adminLogout'){lockAdmin();$('#adminOut').innerHTML='<p>🔒 Admin locked.</p>'}
if(act==='buddyClose'){$('#buddy').classList.remove('open');const bm=$('#buddyMenu');if(bm)bm.style.display='none';const md=$('#miniDock');if(md)md.style.display='none';}
if(act==='buddyMin'){document.body.classList.add('minimized');$('#buddy').classList.remove('open');const bm=$('#buddyMenu');if(bm)bm.style.display='none';const md=$('#miniDock');if(md)md.style.display='none';toast('App minimized — drag Buddy anywhere. Tap him for options.');}
if(act==='buddyReturn'){document.body.classList.remove('minimized');$('#buddy').classList.remove('open');const bm=$('#buddyMenu');if(bm)bm.style.display='none';const md=$('#miniDock');if(md)md.style.display='none';go('home');}
if(act==='buddyExit'){if(confirm('Exit? Buddy will stay floating, app will stay minimized.')){document.body.classList.add('minimized');$('#buddy').classList.remove('open');const bm=$('#buddyMenu');if(bm)bm.style.display='none';const md=$('#miniDock');if(md)md.style.display='none';}}
});
(function(){
const fab=$('#buddyFab');
if(!fab||document.body.classList.contains('safe-mode'))return;
let startX=0,startY=0,curX=0,curY=0,dragging=false,moved=0;
function setPos(x,y){fab.style.left=x+'px';fab.style.right='auto';fab.style.top=y+'px';fab.style.bottom='auto';fab.style.position='fixed';}
function placeMenu(){const menu=$('#buddyMenu');if(!menu||menu.style.display!=='block')return;const r=fab.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(window.innerWidth-230,r.left-10))+'px';menu.style.right='auto';menu.style.top=(r.bottom+8)+'px';menu.style.bottom='auto';}
fab.addEventListener('touchstart',e=>{const t=e.touches[0];startX=t.clientX;startY=t.clientY;const r=fab.getBoundingClientRect();curX=r.left;curY=r.top;dragging=true;moved=0;},{passive:true});
fab.addEventListener('touchmove',e=>{if(!dragging)return;const t=e.touches[0];const dx=t.clientX-startX,dy=t.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>10)moved=1;if(moved){const nx=Math.max(8,Math.min(window.innerWidth-60,curX+dx));const ny=Math.max(80,Math.min(window.innerHeight-80,curY+dy));setPos(nx,ny);placeMenu();}},{passive:true});
fab.addEventListener('touchend',()=>{dragging=false;if(moved)return;const menu=$('#buddyMenu');const willOpen=menu.style.display!=='block';menu.style.display=willOpen?'block':'none';if(willOpen)placeMenu();});
})();
document.addEventListener('click',e=>{
const menu=$('#buddyMenu');if(!menu||menu.style.display!=='block')return;
if(e.target.closest('#buddyMenu')||e.target.closest('#buddyFab'))return;
menu.style.display='none';
});
function showOnboard(force){
if(document.body.classList.contains('safe-mode'))return;
const ob=$('#onboard');
if(!force&&localStorage.getItem('wwe_seen'))return;
ob.classList.add('show');
let step=0;
const steps=[{em:'🔍',h:'Search what yuh feeling for',p:'Type beef, roti, doubles, pizza…'},{em:'⚖️',h:'Compare before yuh spend',p:'See best value in a table.'},{em:'🗳️',h:'Vote with family',p:'1 vote per person. Share the link.'}];
const paint=()=>{const s=steps[step];$('#obEm').textContent=s.em;$('#obH').textContent=s.h;$('#obP').textContent=s.p};
paint();
$('#obBtn').onclick=()=>{step++;if(step>=steps.length){ob.classList.remove('show');localStorage.setItem('wwe_seen','1')}else paint()};
document.querySelector('[data-act="obSkip"]').onclick=()=>{ob.classList.remove('show');localStorage.setItem('wwe_seen','1')};
}
(function(){
try{
const fa=$('#fArea'),ca=$('#cArea'),cc=$('#cCraving');
if(fa)fa.innerHTML='<option value="">All areas</option>'+AREAS.map(a=>`<option>${a}</option>`).join('');
if(ca)ca.innerHTML='<option value="">All areas</option>'+AREAS.map(a=>`<option>${a}</option>`).join('');
if(cc)cc.innerHTML=CRAVINGS.map(c=>`<option>${c.k}</option>`).join('');
setupChips();showOnboard(false);render();updateAdminUI();
}catch(e){console.error(e);}
setTimeout(killSplash,1500);
if(liveVoteId)fetchLiveVote(liveVoteId).then(()=>startLivePoll());
if(!location.search.includes('wwe_safe'))handleSharedVote();
})();
window.addEventListener('load',()=>{setTimeout(killSplash,1500);});
