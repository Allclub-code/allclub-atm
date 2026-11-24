/* ALL CLUB V5 — Campus-side extension; fictional accounts only.  */
'use strict';
const v5$=id=>document.getElementById(id);
const v5Esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v5Money=n=>money(Number(n)||0);
const v5Fixed=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const v5Today=()=>new Date().toISOString().slice(0,10);
const v5CardPattern=/^AC5-[A-F0-9]{24}$/;
async function v5Digest(code){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function v5FlagsReady(name,key='',d=db){const f=d?.v5Flags||{};const member=key||currentUser?.account||'',m=d?.members?.[member];const c=m?.campus==='west'?'west':CAMPUS;return f.global?.[name]!==false&&f.campus?.[c]?.[name]!==false&&(!member||f.members?.[member]?.[name]!==false);}
function v5Permission(name,key=''){if(v5FlagsReady(name,key))return true;toast('This feature has been temporarily paused by dev. Please contact your Coach.',true);return false;}
function v5SafetyRemote(data,key){const m=data.members?.[key];if(data.devControls?.bank?.locked)return 'Whole bank locked';if(data.devControls?.campuses?.[CAMPUS]?.locked)return 'Campus locked';if(m?.locked||m?.devLock?.locked||data.devControls?.members?.[key]?.locked)return 'Member account locked';return '';}
// CAS saves keep new V5 operations together under the shared Supabase version.
async function v5Commit(mutator){
 if(!sb||!_syncReady)throw Error('This operation requires a working cloud connection. No changes were saved.');
 if(_pushing)throw Error('Your previous bank change is still syncing. Try again in a moment.');
 for(let attempt=0;attempt<6;attempt++){
  const row=await fetchCloud();if(!row?.data?.members)throw Error('Shared bank state unavailable.');
  const next=clone(row.data),result=mutator(next)||{};next.updatedAt=new Date().toISOString();
  const {data,error}=await sb.from('club_state').update({data:next,version:row.version+1,updated_at:next.updatedAt}).eq('id',STATE_ID).eq('version',row.version).select('version');
  if(error)throw Error('Cloud save failed: '+error.message);
  if(data?.length){adopt(next,row.version+1,null,true);refreshOpenUI();return result;}
 }
 throw Error('Other banking changes happened simultaneously; retry this operation.');
}
function v5Log(d,action,details,key=''){d.auditLog=Array.isArray(d.auditLog)?d.auditLog:[];d.auditLog.unshift({id:uid(),date:new Date().toISOString(),actor:currentUser?.role||'member',action,details:String(details||'').slice(0,200),target:key,campus:CAMPUS,severity:'normal'});d.auditLog.length=Math.min(d.auditLog.length,1500);}
function v5Ledger(m,typ,acct,amt,note){m.transactions=Array.isArray(m.transactions)?m.transactions:[];m.transactions.unshift({id:uid(),date:new Date().toISOString(),type:typ,account:acct,amount:v5Fixed(amt),note:String(note||'').slice(0,175)});if(m.transactions.length>500)m.transactions.length=500;}
function v5Message(m,msg){m.notifications=Array.isArray(m.notifications)?m.notifications:[];m.notifications.unshift({id:uid(),date:new Date().toISOString(),message:String(msg).slice(0,320),read:false,type:'info'});if(m.notifications.length>150)m.notifications.length=150;}
function v5MemberNeed(d,name){const key=currentUser?.account,m=d.members[key];if(!key||!m)throw Error('Sign in to your member account first.');if(m.campus!==CAMPUS&&!(CAMPUS==='main'&&!m.campus))throw Error('Member belongs to another campus.');if(v5SafetyRemote(d,key))throw Error('Account is currently locked.');if(!v5FlagsReady(name,key,d))throw Error('This feature is currently paused by dev.');return m;}
function v5MaxAmount(value){const n=Number(value);return Number.isFinite(n)&&n>=.01&&n<=100000&&Math.abs(n*100-Math.round(n*100))<.00001;}
function v5MemberRank(p){return p>=1000?'Platinum':p>=500?'Gold':p>=150?'Silver':'Bronze';}

// Printed physical cards carry an opaque per-card token, never a PIN or account number.
async function v5ResolvePhysicalCard(raw){
 const token=String(raw||'').trim().toUpperCase();if(!v5CardPattern.test(token))return {code:false};
 if(!crypto?.subtle)throw Error('HTTPS is required to scan card codes.');
 if(!sb||!_syncReady)throw Error('Card scanning needs the live cloud connection.');
 const row=await fetchCloud();if(!row?.data?.members)throw Error('Could not verify the card against the bank.');
 const digest=await v5Digest(token);
 for(const [key,m] of Object.entries(row.data.members)){const card=(m.v5Cards||[]).find(x=>x.digest===digest);if(!card)continue;
  if(card.status!=='active')throw Error('This card is '+card.status+'. Please ask dev for a replacement.');
  if(m.cardFrozen)throw Error('This member has frozen their cards.');
  if((m.campus||'main')!==CAMPUS)throw Error('Card belongs to '+((m.campus||'main')==='west'?'West Campus':'Main Campus')+'.');
  if(v5SafetyRemote(row.data,key))throw Error('Member or campus is currently locked.');
  return {code:true,key,m,card,remote:row.data,version:row.version};
 }
 throw Error('Unknown or revoked card. Ask dev to issue an active card.');
}
async function v5CardMemberLogin(raw){
 if(!v5Permission('cardLogin'))return false;
 try{const found=await v5ResolvePhysicalCard(raw);if(!found.code)throw Error('Scan an issued All Club card, not an account number.');
  if(!v5FlagsReady('cardLogin',found.key,found.remote))throw Error('Card login is disabled for this account by dev.');
  adopt(found.remote,found.version,null,true);currentUser={role:'member',account:found.key,cardId:found.card.id};
  showScreen('screen-member');
  const tabs=[...document.querySelectorAll('#member-tabs .tab')];tabs.forEach((t,i)=>t.classList.toggle('active',i===0));
  const list=['m-home','m-transact','m-history','m-payments','m-insights','m-rewards','m-card','m-goals','m-notifs','m-settings','m-v5'];list.forEach((id,i)=>{const el=document.getElementById(id);if(el)el.classList.toggle('hidden',i!==0);});
  refreshMemberUI();renderCampusChallenge();v5RenderMemberLab();
  document.getElementById('v5-member-scan-input').value='';toast('Welcome '+found.m.name+' · Card '+found.card.id);
  // Record a non-secret reference. Never record the raw token.
  v5Commit(d=>{if(!d.members[found.key]?.v5Cards?.find(x=>x.id===found.card.id&&x.status==='active'))return;const c=d.members[found.key].v5Cards.find(x=>x.id===found.card.id);c.usedAt=new Date().toISOString();v5Log(d,'Member signed in with printed card','Card '+c.id,found.key);}).catch(()=>{});
  return true;
 }catch(e){const msg=v5$('v5-member-scan-error');if(msg)msg.textContent=e.message;toast(e.message,true);return false;}
}
async function v5CardLoginInput(){const t=v5$('v5-member-scan-input')?.value||'';return v5CardMemberLogin(t);}
// Existing account-lookup codes continue to work for bank/store, but never count as login credentials.
const v5LegacyScan=window.scanMember;
window.scanMember=async function(role,codeFromScanner){
 let raw=String(codeFromScanner||v5$(role==='banker'?'bk-scan':role==='store'?'st-scan':'v5-member-scan-input')?.value||'').trim();
 if(role==='member')return v5CardMemberLogin(raw);
 if(!['banker','store'].includes(role))return false;
 if(v5CardPattern.test(raw.toUpperCase())){
  try{const found=await v5ResolvePhysicalCard(raw);if(!v5FlagsReady(role==='store'?'store':'deposits',found.key,found.remote))throw Error('Card use for this service is paused by dev.');
   // Update stale state before showing the account.
   if(!_pushing)adopt(found.remote,found.version,null,true);
   const select=v5$(role==='banker'?'bk-member-select':'st-member-select');if(!select)throw Error('Open the terminal first.');
   if(!Array.from(select.options).some(x=>x.value===found.key)){if(role==='store')refreshStoreUI();else refreshBankerUI();}
   select.value=found.key;
   if(role==='store'){previewMemberBalance();v5$('st-amount')?.focus();}else{previewBankerMember();v5$('bk-dep-amount')?.focus();}
   const inp=v5$(role==='banker'?'bk-scan':'st-scan');if(inp)inp.value='';toast('Verified card '+found.card.id+' · '+found.m.name);return true;
  }catch(e){toast(e.message,true);return false;}
 }
 if(v5CardPattern.test(raw.toUpperCase())===false&&/^AC5-/i.test(raw))return toast('Invalid card code',true),false;
 return v5LegacyScan(role,raw);
};
// Add feature gate on every existing supported entry point (including manual merchant selection).
const v5GuardedActions={
 doTransfer:'transfers',sendMemberPayment:'payments',doWithdraw:'withdrawals',
 storeCharge:'store',bankerDeposit:'deposits',bankerBulkDeposit:'deposits',bankerWithdraw:'tellerWithdrawals',
 toggleOwnCard:'cards',claimDailyReward:'rewards',buyReward:'rewards',buyLotteryTicket:'rewards',
 payDaySchedule:'payroll'
};
for(const [fn,feature] of Object.entries(v5GuardedActions)){
 const original=window[fn];if(typeof original!=='function')continue;
 window[fn]=function(...args){const key=fn==='storeCharge'?v5$('st-member-select')?.value:fn==='bankerDeposit'||fn==='bankerWithdraw'?v5$('bk-member-select')?.value:currentUser?.account||'';if(!v5Permission(feature,key))return false;return original.apply(this,args);};
}
function v5CreditScore(m){const l=m.v5Loans||[];return Math.max(300,Math.min(850,620+Math.min(100,Math.floor((m.points||0)/15))+l.filter(x=>x.status==='paid').length*25-l.filter(x=>x.status==='overdue').length*55));}
function v5FeatureNotice(name,key){return v5FlagsReady(name,key)?'':'<div class="v5-locked">🔒 This feature is currently disabled by dev.</div>';}

function v5RenderMemberLab(){const content=v5$('v5-member-content');if(!content||currentUser?.role!=='member')return;const m=db.members[currentUser.account];if(!m)return;
 const cards=m.v5Cards||[],loans=m.v5Loans||[],bills=m.v5Bills||[],orders=m.v5Orders||[],missions=(db.v5Missions||[]).filter(x=>x.enabled),items=(db.v5ShopItems||[]).filter(x=>x.enabled&&x.stock>0&&(x.campus==='all'||x.campus===CAMPUS)),score=v5CreditScore(m);
 content.innerHTML=`<div class="v5-panel-hero ${CAMPUS}"><div><span>ALL CLUB · NEXT-GEN BANKING</span><h2>Your financial lab</h2><p>Learn to save, build a simulated credit history, and explore your campus marketplace.</p></div><div class="v5-score"><small>CLUB CREDIT SCORE</small><strong>${score}</strong><span>Simulated · educational only</span></div></div>
 <div class="v5-cards-grid"><section class="card"><div class="v5-section-title"><h3>💳 Physical member cards</h3><span class="v5-pill">${cards.filter(x=>x.status==='active').length} active</span></div><p class="muted">Ask dev for a printed barcode card. Scanning an active card signs you into this fictional account. Report a lost card immediately.</p>
 ${cards.map(c=>`<div class="v5-inline"><span><strong>${v5Esc(c.id)}</strong><small>${v5Esc(c.status)} · ${new Date(c.issuedAt).toLocaleDateString()}</small></span>${c.status==='active'?`<button class="secondary" onclick="v5ReportLostCard('${v5Esc(c.id)}')">Report lost</button>`:''}</div>`).join('')||'<p class="muted">No printed cards issued yet.</p>'}
 </section>
 <section class="card"><div class="v5-section-title"><h3>🏦 Club loan studio</h3><span class="v5-pill">6% APR simulation</span></div>${v5FeatureNotice('loans',currentUser.account)}
 <p class="muted">Apply for an educational, fictional loan. Developer approval is required; monthly repayment amounts are simulated.</p><form onsubmit="v5ApplyLoan(event)"><div class="v5-fields"><label>Amount <input id="v5-loan-amount" type="number" min="25" max="10000" step="1" required placeholder="250"></label><label>Term<select id="v5-loan-months"><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option></select></label></div><label>Purpose <input id="v5-loan-purpose" maxlength="80" placeholder="School project" required></label><button type="submit" ${!v5FlagsReady('loans',currentUser.account)?'disabled':''}>Submit loan application</button></form>
 <div class="v5-sublist">${loans.map(l=>`<div class="v5-inline"><span><strong>${v5Money(l.amount)} · ${v5Esc(l.status)}</strong><small>${l.months} months · ${l.status==='active'?'Remaining '+v5Money(l.remaining):v5Esc(l.purpose||'Application')}</small></span>${l.status==='active'?`<button class="secondary" onclick="v5RepayLoan('${v5Esc(l.id)}')">Pay ${v5Money(Math.min(l.monthly,l.remaining))}</button>`:''}</div>`).join('')}</div></section>
 <section class="card"><div class="v5-section-title"><h3>🗓️ Bill planner</h3></div>${v5FeatureNotice('bills',currentUser.account)}<p class="muted">Schedule a fictional recurring bill. Dev can process all bills on a simulation date; you can also pay early.</p>
 <form onsubmit="v5AddBill(event)"><label>Bill name<input id="v5-bill-name" maxlength="60" placeholder="Club membership" required></label><div class="v5-fields"><label>Amount<input id="v5-bill-amount" type="number" min="0.01" max="5000" step="0.01" required></label><label>Pay from<select id="v5-bill-account"><option value="checking">Checking</option><option value="savings">Savings</option></select></label></div><div class="v5-fields"><label>First due date<input id="v5-bill-date" type="date" value="${v5Today()}" required></label><label>Repeat<select id="v5-bill-repeat"><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label></div><button type="submit" ${!v5FlagsReady('bills',currentUser.account)?'disabled':''}>Schedule bill</button></form>
 ${bills.map(b=>`<div class="v5-inline"><span><strong>${v5Esc(b.name)} · ${v5Money(b.amount)}</strong><small>Next: ${v5Esc(b.due)} · ${b.active?'Active':'Paused'}</small></span><div><button class="secondary" onclick="v5PayBill('${v5Esc(b.id)}')" ${!b.active?'disabled':''}>Pay now</button><button class="secondary" onclick="v5PauseBill('${v5Esc(b.id)}')">${b.active?'Pause':'Resume'}</button></div></div>`).join('')}</section>
 <section class="card"><div class="v5-section-title"><h3>🛍️ Campus marketplace</h3><span class="v5-pill">${items.length} items</span></div>${v5FeatureNotice('marketplace',currentUser.account)}<p class="muted">Shop fictional items. Purchases create a receipt and update inventory.</p>${items.map(x=>`<div class="v5-inline"><span><strong>${v5Esc(x.name)}</strong><small>${v5Money(x.price)} · ${x.stock} available · Earn ${Math.floor(x.price/5)} pts</small></span><button onclick="v5BuyShopItem('${v5Esc(x.id)}')" ${!v5FlagsReady('marketplace',currentUser.account)?'disabled':''}>Buy</button></div>`).join('')||'<p class="muted">No products in the shop yet. Dev can stock the marketplace.</p>'}<p class="v5-tiny">Previous orders: ${orders.length} · Fictional only</p></section>
 <section class="card"><div class="v5-section-title"><h3>🎓 Learning missions</h3><span class="v5-pill">Earn points</span></div>${v5FeatureNotice('missions',currentUser.account)}<p class="muted">Answer financial literacy questions. Each mission can be attempted once.</p>${missions.map(q=>{const outcome=m.v5MissionAnswers?.[q.id];return `<div class="v5-mission"><strong>${v5Esc(q.name)} · +${q.points} pts</strong><p>${v5Esc(q.question)}</p>${outcome?`<div class="v5-pill">${outcome.correct?'✓ Correct — points earned':'Attempt complete — try another mission'}</div>`:`<div class="v5-mission-answers"><select id="v5-mission-choice-${v5Esc(q.id)}">${q.answers.map((v,i)=>`<option value="${i}">${['A','B','C'][i]}. ${v5Esc(v)}</option>`).join('')}</select><button onclick="v5AnswerMission('${v5Esc(q.id)}')" ${!v5FlagsReady('missions',currentUser.account)?'disabled':''}>Submit answer</button></div>`}</div>`;}).join('')||'<p class="muted">New missions are being prepared. Check back later.</p>'}</section></div>`;
}
async function v5ApplyLoan(e){e.preventDefault();if(!v5Permission('loans'))return;const amount=Number(v5$('v5-loan-amount').value),months=Number(v5$('v5-loan-months').value),purpose=v5$('v5-loan-purpose').value.trim();if(!Number.isFinite(amount)||amount<25||amount>10000||![3,6,12].includes(months)||!purpose)return toast('Enter a valid loan request.',true);try{await v5Commit(d=>{const m=v5MemberNeed(d,'loans');m.v5Loans=m.v5Loans||[];if(m.v5Loans.some(x=>x.status==='pending'))throw Error('Only one pending application is allowed.');const id='LN-'+uid().toUpperCase();m.v5Loans.unshift({id,amount,months,purpose,status:'pending',createdAt:new Date().toISOString()});v5Message(m,'Your fictional loan application '+id+' is pending dev review.');v5Log(d,'Student loan application',v5Money(amount)+' · '+months+' months',currentUser.account);});v5RenderMemberLab();toast('Loan application submitted for dev review.');}catch(x){toast(x.message,true);}}
async function v5RepayLoan(id){if(!v5Permission('loans'))return;const m=db.members[currentUser.account],l=m?.v5Loans?.find(x=>x.id===id);if(!l||l.status!=='active')return;const amount=v5Fixed(Math.min(l.monthly,l.remaining));if(!confirm('Pay '+v5Money(amount)+' toward loan '+id+' from checking?'))return;try{await v5Commit(d=>{const m=v5MemberNeed(d,'loans'),loan=m.v5Loans?.find(x=>x.id===id);if(!loan||loan.status!=='active')throw Error('Loan changed or is no longer active.');const amt=v5Fixed(Math.min(loan.monthly,loan.remaining));if(m.checking<amt)throw Error('Insufficient checking funds.');m.checking=v5Fixed(m.checking-amt);loan.remaining=v5Fixed(Math.max(0,loan.remaining-amt));loan.paidCount=(loan.paidCount||0)+1;if(loan.remaining===0){loan.status='paid';loan.paidAt=new Date().toISOString();m.points=(m.points||0)+50;m.rank=v5MemberRank(m.points);v5Message(m,'Loan paid off! +50 club points.');}v5Ledger(m,'Loan payment','checking',-amt,'Loan '+id);v5Log(d,'Student repaid loan',id+' · '+v5Money(amt),currentUser.account);});refreshMemberUI();v5RenderMemberLab();toast('Loan installment paid.');}catch(x){toast(x.message,true);}}
function v5NextDue(iso,freq){const [y,m,d]=iso.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));if(freq==='weekly')dt.setUTCDate(dt.getUTCDate()+7);else{dt.setUTCDate(1);dt.setUTCMonth(dt.getUTCMonth()+1);dt.setUTCDate(Math.min(d,new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate()));}return dt.toISOString().slice(0,10);}
async function v5AddBill(e){e.preventDefault();if(!v5Permission('bills'))return;const name=v5$('v5-bill-name').value.trim(),amount=Number(v5$('v5-bill-amount').value),account=v5$('v5-bill-account').value,due=v5$('v5-bill-date').value,frequency=v5$('v5-bill-repeat').value;if(!name||!v5MaxAmount(amount)||amount>5000||!['checking','savings'].includes(account)||!/\d{4}-\d{2}-\d{2}/.test(due)||!['weekly','monthly'].includes(frequency))return toast('Check bill details.',true);try{await v5Commit(d=>{const m=v5MemberNeed(d,'bills');m.v5Bills=m.v5Bills||[];m.v5Bills.push({id:'B-'+uid(),name,amount:v5Fixed(amount),account,due,frequency,active:true});v5Log(d,'Student created scheduled bill',name+' · '+v5Money(amount),currentUser.account);});v5RenderMemberLab();toast('Bill scheduled.')}catch(x){toast(x.message,true);}}
async function v5PayBill(id){if(!v5Permission('bills'))return;const m=db.members[currentUser.account],b=m.v5Bills?.find(x=>x.id===id);if(!b||!b.active)return;if(!confirm('Pay '+b.name+' '+v5Money(b.amount)+' today?'))return;try{await v5Commit(d=>{const m=v5MemberNeed(d,'bills'),bill=m.v5Bills?.find(x=>x.id===id);if(!bill||!bill.active)throw Error('Bill unavailable.');if(m[bill.account]<bill.amount)throw Error('Not enough fictional funds.');m[bill.account]=v5Fixed(m[bill.account]-bill.amount);v5Ledger(m,'Bill payment',bill.account,-bill.amount,bill.name);bill.lastPaid=v5Today();bill.due=v5NextDue(bill.due,bill.frequency);v5Log(d,'Student paid bill',bill.name+' · '+v5Money(bill.amount),currentUser.account);});refreshMemberUI();v5RenderMemberLab();toast('Bill paid.')}catch(x){toast(x.message,true);}}
async function v5PauseBill(id){if(!v5Permission('bills'))return;try{await v5Commit(d=>{const m=v5MemberNeed(d,'bills'),b=m.v5Bills?.find(x=>x.id===id);if(!b)throw Error('Bill not found.');b.active=!b.active;v5Log(d,'Student '+(b.active?'resumed':'paused')+' bill',b.name,currentUser.account);});v5RenderMemberLab();}catch(x){toast(x.message,true);}}
async function v5BuyShopItem(id){if(!v5Permission('marketplace'))return;const x=db.v5ShopItems?.find(i=>i.id===id);if(!x)return;if(!confirm('Buy '+x.name+' for '+v5Money(x.price)+' in fictional dollars?'))return;try{await v5Commit(d=>{const m=v5MemberNeed(d,'marketplace'),item=d.v5ShopItems?.find(i=>i.id===id);if(!item||!item.enabled||item.stock<1||(item.campus!=='all'&&item.campus!==CAMPUS))throw Error('Item is no longer in stock.');if(m.checking<item.price)throw Error('Insufficient checking balance.');item.stock--;m.checking=v5Fixed(m.checking-item.price);const points=Math.floor(item.price/5);m.points=(m.points||0)+points;m.rank=v5MemberRank(m.points);m.v5Orders=m.v5Orders||[];m.v5Orders.unshift({id:'ORD-'+uid(),name:item.name,price:item.price,at:new Date().toISOString(),itemId:id});v5Ledger(m,'Marketplace purchase','checking',-item.price,item.name);v5Message(m,'Order confirmed: '+item.name+' · '+v5Money(item.price));v5Log(d,'Campus marketplace purchase',item.name+' · '+v5Money(item.price),currentUser.account);});refreshMemberUI();v5RenderMemberLab();toast('Purchase complete — digital receipt saved!');}catch(e){toast(e.message,true);}}
async function v5AnswerMission(id){if(!v5Permission('missions'))return;const selection=v5$('v5-mission-choice-'+id),choice=Number(selection?.value);try{await v5Commit(d=>{const m=v5MemberNeed(d,'missions'),q=d.v5Missions?.find(x=>x.id===id&&x.enabled);if(!q)throw Error('Mission unavailable.');m.v5MissionAnswers=m.v5MissionAnswers||{};if(m.v5MissionAnswers[id])throw Error('You already attempted this mission.');const correct=choice===q.correct;m.v5MissionAnswers[id]={correct,answeredAt:new Date().toISOString()};if(correct){m.points=(m.points||0)+q.points;m.rank=v5MemberRank(m.points);v5Message(m,'Mission '+q.name+' completed — +'+q.points+' points!');}v5Log(d,'Financial literacy mission attempted',q.name+' · '+(correct?'correct':'incorrect'),currentUser.account);return {correct};}).then(x=>{refreshMemberUI();v5RenderMemberLab();toast(x.correct?'Great work! Reward points added.':'Good try! Explore another mission.');});}catch(e){toast(e.message,true);}}
async function v5ReportLostCard(id){const m=db.members[currentUser?.account];const card=m?.v5Cards?.find(x=>x.id===id&&x.status==='active');if(!card)return;if(!confirm('Report card '+id+' LOST? Its barcode will stop working, and only dev can issue a new code.'))return;try{await v5Commit(d=>{const m=d.members?.[currentUser?.account];if(!m||v5SafetyRemote(d,currentUser.account))throw Error('Member unavailable or locked.');const card=m.v5Cards?.find(x=>x.id===id);if(!card||card.status!=='active')throw Error('Card already disabled.');card.status='lost';v5Log(d,'Member reported printed card lost','Card '+id+' revoked',currentUser.account);v5Message(m,'Card '+id+' was reported lost and disabled. Please contact dev.');});v5RenderMemberLab();toast('Lost card deactivated.')}catch(e){toast(e.message,true);}}

const v5OldTab=window.switchTab;
window.switchTab=function(area,el){const result=v5OldTab(area,el);if(area==='member'&&el?.dataset?.tab==='m-v5')v5RenderMemberLab();return result;};
const v5OldOpen=window.refreshOpenUI;
window.refreshOpenUI=function(...args){const result=v5OldOpen(...args);if(currentUser?.role==='member'&&!v5$('m-v5')?.classList.contains('hidden'))v5RenderMemberLab();v5UpdateFeatureBanner();return result;};
function v5UpdateFeatureBanner(){const target=v5$('v5-paused-features');if(!target)return;const paused=[['transfers','transfers'],['payments','send money'],['store','store spending'],['loans','loans'],['marketplace','marketplace'],['missions','missions']].filter(([key])=>!v5FlagsReady(key,currentUser?.account||'')).map(([,label])=>label);target.hidden=!paused.length;target.textContent=paused.length?'🔒 Temporarily paused by dev: '+paused.join(', ')+'.':'';}
window.addEventListener('DOMContentLoaded',()=>{v5UpdateFeatureBanner();});

/* V5 scanner-authorized checkout and assisted teller withdrawal.
   For members who have received printed cards, the physical card must be verified
   for store charges / teller cash withdrawals. Legacy accounts without issued cards
   retain the older manual staff workflow until dev issues their first printed card. */
let v5TerminalCard={store:null,banker:null};
function v5ClearTerminalCard(role){if(v5TerminalCard[role])v5TerminalCard[role]=null;}
const v5ScanOriginal=window.scanMember;
window.scanMember=async function(role,code){
 const raw=String(code||v5$(role==='store'?'st-scan':role==='banker'?'bk-scan':'v5-member-scan-input')?.value||'').trim();
 const found=await v5ScanOriginal(role,raw);
 if(found&&['store','banker'].includes(role)){
  if(v5CardPattern.test(raw.toUpperCase()))v5TerminalCard[role]={token:raw.toUpperCase(),key:v5$(role==='store'?'st-member-select':'bk-member-select').value};
  else v5TerminalCard[role]=null;
 }
 return found;
};
const v5StoreLegacy=window.storeCharge;
window.storeCharge=async function(){
 const key=v5$('st-member-select')?.value,m=db.members?.[key];
 if(!m)return toast('Choose a member.',true);
 if(!v5Permission('store',key))return;
 if(!(m.v5Cards||[]).length){try{const latest=await fetchCloud();if((latest?.data?.members?.[key]?.v5Cards||[]).length){if(!_pushing)adopt(latest.data,latest.version,null,true);return toast('This member now has printed cards. Please scan an active physical card.',true);}}catch(e){return toast('Unable to verify member card status. Connect to the cloud.',true);}return v5StoreLegacy();}
 const scan=v5TerminalCard.store;
 if(!scan||scan.key!==key)return toast('This member has printed cards. Scan an ACTIVE physical card before charging.',true);
 const amt=Number(v5$('st-amount')?.value),description=(v5$('st-desc')?.value||'Store purchase').trim().slice(0,100),acct=v5$('st-from')?.value;
 if(!v5MaxAmount(amt)||!['checking','savings'].includes(acct))return toast('Enter a valid charge amount and account.',true);
 try{
  const verify=await v5ResolvePhysicalCard(scan.token);
  if(verify.key!==key)throw Error('Scanned card belongs to another member.');
  await v5Commit(d=>{
   const member=d.members?.[key],card=member?.v5Cards?.find(x=>x.id===verify.card.id);
   if(!member||!card||card.status!=='active'||member.cardFrozen||v5SafetyRemote(d,key))throw Error('The scanned card or member is locked.');
   if(!v5FlagsReady('store',key,d))throw Error('Store purchases paused by dev.');
   if(numericAmount(member[acct])<amt)throw Error('Insufficient fictional funds.');
   member[acct]=v5Fixed(member[acct]-amt);v5Ledger(member,'Purchase',acct,-amt,'Store: '+description+' · card '+card.id);
   d.sales=d.sales||[];d.sales.push({id:uid(),date:new Date().toISOString(),account:key,memberName:member.name,campus:CAMPUS,amount:amt,desc:description,from:acct,cardId:card.id});
   member.points=(member.points||0)+Math.floor(amt/5);member.rank=v5MemberRank(member.points);
   v5Message(member,'Store charge of '+v5Money(amt)+' for '+description+' · card '+card.id);v5Log(d,'Verified-card store charge',description+' · '+v5Money(amt)+' · '+card.id,key);
   card.usedAt=new Date().toISOString();
  });
  v5TerminalCard.store=null;v5$('st-amount').value='';v5$('st-desc').value='';refreshStoreUI();toast('Card verified · Charged '+v5Money(amt));
 }catch(e){v5TerminalCard.store=null;toast(e.message,true);}
};
function numericAmount(v){return Number(v)||0;}
const v5WithdrawLegacy=window.bankerWithdraw;
window.bankerWithdraw=async function(){
 const key=v5$('bk-member-select')?.value,m=db.members?.[key];if(!m)return toast('Choose a member.',true);
 if(!v5Permission('tellerWithdrawals',key))return;
 if(!(m.v5Cards||[]).length){try{const latest=await fetchCloud();if((latest?.data?.members?.[key]?.v5Cards||[]).length){if(!_pushing)adopt(latest.data,latest.version,null,true);return toast('This member now has printed cards. Please scan an active physical card.',true);}}catch(e){return toast('Unable to verify member card status. Connect to the cloud.',true);}return v5WithdrawLegacy();}
 const scanned=v5TerminalCard.banker;if(!scanned||scanned.key!==key)return toast('Scan an ACTIVE physical member card to authorize teller withdrawal.',true);
 const amt=Number(v5$('bk-wd-amount')?.value),note=(v5$('bk-wd-note')?.value||'Card verified cash withdrawal').trim().slice(0,100),acct=v5$('bk-wd-account')?.value;
 if(!v5MaxAmount(amt)||!['checking','savings'].includes(acct))return toast('Enter a valid amount and account.',true);
 try{const verify=await v5ResolvePhysicalCard(scanned.token);if(verify.key!==key)throw Error('Wrong card.');
  await v5Commit(d=>{const member=d.members?.[key],card=member?.v5Cards?.find(x=>x.id===verify.card.id);if(!member||!card||card.status!=='active'||member.cardFrozen||v5SafetyRemote(d,key))throw Error('Card or account locked.');if(!v5FlagsReady('tellerWithdrawals',key,d))throw Error('Withdrawals paused by dev.');if(numericAmount(member[acct])<amt)throw Error('Insufficient balance.');member[acct]=v5Fixed(member[acct]-amt);v5Ledger(member,'Withdrawal',acct,-amt,'Teller: '+note+' · card '+card.id);d.tellerLog=d.tellerLog||[];d.tellerLog.push({id:uid(),date:new Date().toISOString(),account:key,memberName:member.name,campus:CAMPUS,type:'Withdrawal',acctType:acct,amount:-amt,note,cardId:card.id});if(d.tellerLog.length>500)d.tellerLog=d.tellerLog.slice(-500);v5Log(d,'Verified-card teller withdrawal',v5Money(amt)+' · '+card.id,key);card.usedAt=new Date().toISOString();});
  v5TerminalCard.banker=null;v5$('bk-wd-amount').value='';v5$('bk-wd-note').value='';refreshBankerUI();toast('Card verified · Withdrew '+v5Money(amt));
 }catch(e){v5TerminalCard.banker=null;toast(e.message,true);}
};
