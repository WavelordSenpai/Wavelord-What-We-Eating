'use strict';
// ONE BUDDY ONLY - native FloatingBuddy is the only buddy
// Hide/remove any web buddy so it can never duplicate
(function(){
  document.querySelectorAll('#buddyFab').forEach((el,i)=>{ if(i>0) el.remove(); });
  document.querySelectorAll('.floating-buddy, #floatingBuddy, #buddyFloat, .buddy-float, [id*="FloatingBuddy"], [class*="FloatingBuddy"]').forEach(el=>el.remove());
})();
(function(){
  try{
    document.body.classList.remove('modal-open','minimized');
    if(location.search.includes('wwe_safe=1')||location.hash.includes('wwe_safe=1')){
      document.body.classList.add('safe-mode');
    }
  }catch(e){}
})();
function killSplash(){
  const s=document.getElementById('splash');
  if(s){s.classList.add('done');s.style.display='none';s.style.visibility='hidden';s.style.pointerEvents='none';}
  document.body.classList.add('splash-done');
  // HIDE web buddy - native floating buddy is the ONLY buddy
  const fab=document.getElementById('buddyFab');
  if(fab){ fab.style.display='none'; fab.style.pointerEvents='none'; }
  document.querySelectorAll('#buddyFab').forEach((el,i)=>{ if(i>0) el.remove(); });
}
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
const bl=$('#browseList');if(bl)bl.innerHTML=`
