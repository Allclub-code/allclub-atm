/* All Club V8: Coach card-printing desk. The server issues and stores card credentials. */
(function () {
'use strict';
var selected = new Set(), recentCards = [], working = false, query = '';
var el = function(id){ return document.getElementById(id); };
var safe = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];}); };
var members = function(){
  return Object.entries(db && db.members || {}).filter(function(pair){
    return pair[1] && (pair[1].campus || 'main') === CAMPUS;
  }).sort(function(a,b){return String(a[1].name).localeCompare(String(b[1].name));});
};
function notice(msg,bad) {
  var box = el('v8-card-feedback');
  if(box){box.textContent=msg; box.style.color=bad?'#ad2944':'#267242';}
  if(bad && typeof toast==='function')toast(msg,true);
}
function refreshList(){
  if(!el('v8-coach-card-list')||!db||currentUser?.role!=='admin')return;
  var matches=members().filter(function(p){return !query||String(p[1].name+' '+p[0]).toLowerCase().includes(query);});
  el('v8-coach-card-list').innerHTML=matches.map(function(p){
    var key=p[0], m=p[1], checked=selected.has(key)?' checked':'';
    var active=(m.v5Cards||[]).filter(function(c){return c.status==='active';}).length;
    return '<label class="v8-choose"><input type="checkbox" data-v8-select="'+safe(key)+'"'+checked+
      (m.locked?' disabled':'')+'><span><strong>'+safe(m.name)+'</strong><small>Account '+safe(key.replace(/^ACC/,''))+
      ' · '+active+' active card(s)'+(m.locked?' · Locked':'')+'</small></span>'+
      '<button type="button" class="secondary v8-small" data-v8-one="'+safe(key)+'">Print one</button>'+
      '<button type="button" class="secondary v8-small" data-v8-replace="'+safe(key)+'">Replace</button></label>';
  }).join('')||'<p class="muted">No matching members.</p>';
  el('v8-coach-count').textContent=selected.size+' selected · '+matches.length+' shown';
}
function refreshRegistry(){
  if(!el('v8-coach-card-registry'))return;
  var rows=members().flatMap(function(p){return (p[1].v5Cards||[]).map(function(c){return {key:p[0],name:p[1].name,c:c};});});
  rows.sort(function(a,b){return String(b.c.issuedAt||'').localeCompare(String(a.c.issuedAt||''));});
  el('v8-coach-card-registry').innerHTML=rows.slice(0,120).map(function(x){
    var c=x.c, actions=(c.status==='active'||c.status==='frozen')?
      '<button type="button" class="secondary v8-small" data-v8-card="'+safe(x.key)+'" data-v8-id="'+safe(c.id)+'" data-v8-status="'+(c.status==='frozen'?'active':'frozen')+'">'+(c.status==='frozen'?'Unfreeze':'Freeze')+'</button> '+
      '<button type="button" class="secondary v8-small" data-v8-card="'+safe(x.key)+'" data-v8-id="'+safe(c.id)+'" data-v8-status="lost">Lost</button>' : 'Disabled';
    return '<tr><td>'+safe(c.id)+'</td><td>'+safe(x.name)+'</td><td>'+safe(c.status)+'</td><td>'+actions+'</td></tr>';
  }).join('')||'<tr><td colspan="4">No cards issued yet.</td></tr>';
}
function refresh(){
  if(currentUser?.role!=='admin'||!el('ad-cards'))return;
  refreshList();refreshRegistry();
  var repeat=el('v8-card-reprint');
  if(repeat)repeat.hidden=!recentCards.length;
}
function asDataURL(path){
  return fetch(path,{cache:'force-cache'}).then(function(r){if(!r.ok)throw Error('logo');return r.blob();})
  .then(function(blob){return new Promise(function(resolve,reject){var f=new FileReader();f.onload=function(){resolve(f.result);};f.onerror=reject;f.readAsDataURL(blob);});})
  .catch(function(){return '';});
}
function printHTML(rows,logos){
  var pieces=rows.map(function(c){
    var west=c.cam==='west', design=c.design==='royal'||(c.design!=='midnight'&&west);
    var src=logos[design?'west':'main'];
    return '<article class="card '+(design?'west':'main')+'"><div class="top"><span class="brand">'+(src?'<img src="'+src+'" alt="All Club">':'ALL CLUB')+
      '</span><span class="cardtag">'+(west?'WEST':'MAIN')+' CAMPUS</span></div>'+
      '<div class="label">ALL CLUB CREDIT UNION · MEMBER CARD</div><div class="person">'+safe(c.name)+'</div>'+
      '<div class="barcode">'+allclubBarcode(c.token)+'</div><div class="code">'+safe(c.token)+'</div>'+
      '<div class="bottom"><span>ACCOUNT '+safe(String(c.key).replace(/^ACC/,''))+'</span><span>'+safe(c.id)+'</span></div></article>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>All Club · Printed Member Cards</title><style>'+
  '*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f0f4f1;color:#172638;margin:0}'+
  '.tools{padding:16px;background:#fff;border-bottom:1px solid #ddd}.tools button{padding:9px 20px}'+
  '.page{margin:14px auto;display:grid;grid-template-columns:3.375in 3.375in;gap:.2in .32in;justify-content:center}'+
  '.card{width:3.375in;height:2.125in;overflow:hidden;page-break-inside:avoid;break-inside:avoid;position:relative;border:1px dashed #829c8b;border-radius:10px;padding:.14in .17in;color:#eafff2;background:linear-gradient(130deg,#0b1b18,#245343)}'+
  '.card.west{background:linear-gradient(125deg,#2c1045,#64269a);color:#eeffda;border-color:#b9ed69}'+
  '.top,.bottom{display:flex;justify-content:space-between;align-items:center}.brand img{width:1.13in;max-height:.36in;object-fit:contain;object-position:left}.brand{font-size:15px;font-weight:900}'+
  '.cardtag{font-size:8px;letter-spacing:1.1px;font-weight:bold}.label{letter-spacing:1px;font-size:7px;opacity:.84;margin-top:5px}'+
  '.person{font-size:15px;font-weight:850;margin-top:3px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}'+
  '.barcode{height:.55in;background:#fff;padding:3px 9px;border-radius:5px;margin-top:6px}'+
  '.barcode svg{display:block;width:100%;height:100%;object-fit:fill}.code{font:8px monospace;text-align:center;margin-top:3px;letter-spacing:1px}'+
  '.bottom{font:8px monospace;opacity:.95;margin-top:4px}'+
  '@page{size:letter;margin:.4in}@media print{body{background:white}.tools{display:none}.page{margin:0 auto;gap:.17in .28in}.card{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'+
  '</style></head><body><div class="tools"><button onclick="window.print()">Print cards · 100% size</button> '+
  '<strong>Codes are login credentials. Keep these pages private and delete the file after printing.</strong></div>'+
  '<main class="page">'+pieces+'</main></body></html>';
}
async function downloadCards(cards){
  if(!cards.length)return;
  if(typeof allclubBarcode!=='function')throw Error('The barcode generator is unavailable.');
  var logos=await Promise.all([asDataURL('./allclub-logo-green.png'),asDataURL('./allclub-logo-lime.png')]);
  var content=printHTML(cards,{main:logos[0],west:logos[1]});
  var url=URL.createObjectURL(new Blob([content],{type:'text/html;charset=utf-8'}));
  var link=document.createElement('a');link.href=url;link.download='allclub_cards_'+new Date().toISOString().slice(0,10)+'.html';
  document.body.append(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},10000);
}
async function issue(keys,replace){
  if(working||currentUser?.role!=='admin')return;
  keys=[...new Set(keys)].filter(function(k){return members().some(function(pair){return pair[0]===k;});});
  if(!keys.length)return notice('Select at least one campus member.',true);
  if(keys.length>50)return notice('Print at most 50 cards at a time.',true);
  if(!confirm((replace?'Replace existing card(s) and print new ones for ':'Issue and print a new card for ')+keys.length+' member(s)?'))return;
  working=true;notice('Issuing cards securely…');
  try{
    var r=await window.allclubAPI.call('issueCards',{members:keys,replace:!!replace,design:'auto'});
    if(!r.issued||r.issued.length!==keys.length)throw Error('The server did not return all the newly issued codes.');
    recentCards=r.issued;selected.clear();
    await downloadCards(recentCards);
    notice('Cards issued. Downloaded print sheet has '+recentCards.length+' card(s). Keep it private.');
    await window.syncNow();
    refresh();
  }catch(e){notice(e.message||'Card issuance failed.',true);}
  finally{working=false;}
}
async function status(key,id,value){
  if(working||currentUser?.role!=='admin')return;
  if(!confirm((value==='lost'?'Permanently disable this lost card?':'Change this card to '+value+'?')))return;
  working=true;
  try{await window.allclubAPI.call('cardStatus',{account:key,id:id,status:value});
    notice('Card updated.');await window.syncNow();refresh();
  }catch(e){notice(e.message||'Card change failed.',true);}
  finally{working=false;}
}
function boot(){
  var admin=el('screen-admin');if(!admin||el('ad-cards'))return;
  var before=admin.querySelector('[data-tab="ad-payroll"]');
  if(before)before.insertAdjacentHTML('beforebegin','<div class="tab" data-tab="ad-cards" onclick="switchTab(\'admin\',this)">▣ Cards & Printing</div>');
  admin.insertAdjacentHTML('beforeend','<div class="tab-panel hidden" id="ad-cards">'+
    '<div class="page-heading interior-page-heading"><div class="section-eyebrow">ALL CLUB / COACH OPERATIONS</div><h1>Member Card Desk</h1><p>Issue individual or group barcode cards for your campus.</p></div>'+
    '<div class="card"><h3>Issue and print member cards</h3><p class="muted">Select members or use Print one. Replacing a card disables all older cards for that account. Each printed barcode is a sign-in credential.</p>'+
    '<input id="v8-coach-search" placeholder="Find a member or account number…" autocomplete="off">'+
    '<div class="btn-row" style="margin:10px 0;flex-wrap:wrap"><button class="secondary" type="button" id="v8-coach-all">Select shown</button>'+
    '<button class="secondary" type="button" id="v8-coach-clear">Clear</button>'+
    '<button type="button" id="v8-coach-print">Issue selected & print</button>'+
    '<button class="secondary" type="button" id="v8-card-reprint" hidden>Re-download last sheet</button></div>'+
    '<p id="v8-coach-count" class="muted"></p><div class="v8-list" id="v8-coach-card-list"></div>'+
    '<p id="v8-card-feedback" role="status" aria-live="polite" class="muted"></p></div>'+
    '<div class="card"><h3>Active and issued cards</h3><p class="muted">Freeze, unfreeze or permanently report a printed card lost. Lost cards cannot be reactivated.</p>'+
    '<div style="overflow-x:auto"><table><thead><tr><th>Card</th><th>Member</th><th>Status</th><th>Controls</th></tr></thead><tbody id="v8-coach-card-registry"></tbody></table></div></div></div>');
  var css=document.createElement('style');css.textContent=
    '.v8-list{max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:12px}'+
    '.v8-choose{display:flex;align-items:center;gap:10px;margin:0;padding:9px 12px;border-bottom:1px solid var(--border);flex-wrap:wrap;cursor:pointer}'+
    '.v8-choose>input{width:19px;height:19px;min-width:19px}'+
    '.v8-choose>span{flex:1;min-width:160px}.v8-choose strong{display:block}.v8-choose small{display:block;color:var(--muted)}'+
    '.v8-small{padding:6px 9px!important;font-size:12px!important}';
  document.head.append(css);
  var base=window.switchTab;
  window.switchTab=function(area,tab){if(area==='admin')el('ad-cards').classList.add('hidden');
    var out=base.apply(this,arguments);
    if(area==='admin'&&tab.dataset.tab==='ad-cards')refresh();
    return out;};
  el('v8-coach-search').addEventListener('input',function(e){query=e.target.value.trim().toLowerCase();refreshList();});
  el('v8-coach-all').onclick=function(){members().filter(function(p){return !query||String(p[1].name+' '+p[0]).toLowerCase().includes(query);}).forEach(function(p){if(!p[1].locked)selected.add(p[0]);});refreshList();};
  el('v8-coach-clear').onclick=function(){selected.clear();refreshList();};
  el('v8-coach-print').onclick=function(){issue([...selected],false);};
  el('v8-card-reprint').onclick=function(){downloadCards(recentCards).catch(function(e){notice(e.message,true);});};
  el('ad-cards').addEventListener('change',function(e){
    var id=e.target.dataset.v8Select;if(id){if(e.target.checked)selected.add(id);else selected.delete(id);el('v8-coach-count').textContent=selected.size+' selected';}
  });
  el('ad-cards').addEventListener('click',function(e){
    var t=e.target.closest('button');if(!t)return;
    if(t.dataset.v8One)issue([t.dataset.v8One],false);
    if(t.dataset.v8Replace)issue([t.dataset.v8Replace],true);
    if(t.dataset.v8Card)status(t.dataset.v8Card,t.dataset.v8Id,t.dataset.v8Status);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
