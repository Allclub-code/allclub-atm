/* Server-authorized adapter for the existing Main/West campus pages. */
'use strict';
const secAPI=window.allclubAPI,secEl=id=>document.getElementById(id);
const secValue=id=>secEl(id)?.value||'';
let secBusy=false,secScan={banker:null,store:null};
const secBlank=()=>({members:{},coachAccounts:{},coachRosterInitialized:false,devControls:{},v5Flags:{},payments:[],auditLog:[],sales:[],tellerLog:[],schedules:{},campusRates:{},campusInterestDays:{}});
function secAdopt(r){db=migrateDb(r.data);_base=null;_version=r.version;_syncReady=true;updateSyncStatus('Secure server · v'+r.version,true);}
function secClear(){currentUser=null;db=secBlank();_base=null;_version=0;_syncReady=false;secScan={banker:null,store:null};for(const e of document.querySelectorAll('input[type=password]'))e.value='';}
function secError(e){if((e.status===401||e.status===403)&&/Access paused|Credentials or card changed|Session expired|Sign in required/i.test(e.message)){secAPI.clear();secClear();window.location.reload();return;}toast(e.message||'Request rejected.',true);}
async function secLogin(role,username,secret,msgId){if(secBusy)return false;secBusy=true;try{const r=await secAPI.call('login',{role,campus:CAMPUS,username,secret});secAPI.set(r.token);currentUser=r.user;secAdopt(r);for(const e of document.querySelectorAll('input[type=password]'))e.value='';if(secEl('v5-member-scan-input'))secEl('v5-member-scan-input').value='';
 const panel={member:'member',banker:'banker',store:'store',admin:'admin'}[currentUser.role];showScreen('screen-'+panel);const first={member:'m-home',banker:'bk-teller',store:'st-charge',admin:'ad-dash'}[panel];const t=document.querySelector('#screen-'+panel+' [data-tab="'+first+'"]');if(t)switchTab(panel,t);refreshOpenUI();toast('Signed in through secure server');return true;
 }catch(e){if(msgId&&secEl(msgId))secEl(msgId).textContent=e.message;else secError(e);return false;}finally{secBusy=false;}}
window.memberLogin=()=>secLogin('member',secValue('m-acc'),secValue('m-pin'),'m-login-msg');
window.bankerLogin=()=>secLogin('banker','banker',secValue('b-pin'),'b-login-msg');
window.storeLogin=()=>secLogin('store','store',secValue('s-pin'),'s-login-msg');
window.adminLogin=()=>secLogin('admin',secValue('a-user'),secValue('a-pin'),'a-login-msg');
window.v5CardMemberLogin=raw=>secLogin('card','',raw,'m-login-msg');
window.v5CardLoginInput=()=>window.v5CardMemberLogin(secValue('v5-member-scan-input'));
window.logout=async()=>{secClear();showScreen('screen-role');try{await secAPI.logout();}catch(_){secAPI.clear();}window.location.reload();};
window.demoLogin=()=>{showScreen('screen-member-login');toast('Live demo bypass removed. Ask dev to issue a test member PIN or card.');};
async function secRefresh(manual=false){if(secBusy)return;if(!secAPI.active()){if(manual)toast('Sign in to sync.');return;}if(!manual&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;secBusy=true;try{const r=await secAPI.call('state');if(!secAPI.active())return;secAdopt(r);refreshOpenUI();if(manual)toast('Secure sync complete');}catch(e){if(e.status===401||e.status===403)secError(e);else updateSyncStatus('Connection unavailable · changes require server',false);}finally{secBusy=false;}}
window.syncNow=()=>secRefresh(true);
window.fetchCloud=()=>secAPI.call('state');
window.saveDB=()=>{throw Error('Direct writes are disabled. Use a server-authorized action.');};
window.pushCloud=()=>Promise.reject(Error('Direct writes disabled.'));
window.pullCloud=()=>secRefresh();
window.initCloud=()=>secRefresh();
window.loadDB=()=>{db=secBlank();};window.saveDBLocal=()=>{};
window.v5Commit=()=>Promise.reject(Error('Use a server-authorized action.'));
window.v5ResolvePhysicalCard=async(raw)=>{const x=await secAPI.call('scan',{code:raw});return {code:true,key:x.key,card:{id:x.id}};};
window.scanMember=async(role,code)=>{let raw=String(code||secValue(role==='banker'?'bk-scan':role==='store'?'st-scan':'v5-member-scan-input')).trim();if(role==='member')return window.v5CardMemberLogin(raw);if(!['banker','store'].includes(role)||currentUser?.role!==role)return false;try{let key;if(/^AC5-/i.test(raw)){const f=await secAPI.call('scan',{code:raw});key=f.key;secScan[role]={key,token:raw};}else{key=parseMemberCode(raw);secScan[role]=null;}if(!key||!db.members[key])throw Error('Member not available in this campus.');const select=secEl(role==='banker'?'bk-member-select':'st-member-select');select.value=key;if(role==='banker')previewBankerMember();else previewMemberBalance();secEl(role==='banker'?'bk-scan':'st-scan').value='';toast('Member loaded · '+db.members[key].name);return true;}catch(e){secScan[role]=null;secError(e);return false;}};
// Only these action names are accepted by the server, with independent role and feature checks.
const secFields={doWithdraw:['wd-account','wd-amount'],doTransfer:['tr-from','tr-to','tr-amount'],sendMemberPayment:['pay-member','pay-from','pay-amount','pay-note'],changeMemberPin:['pin-old','pin-new','pin-confirm'],claimDailyReward:[],addGoal:['goal-name','goal-target'],contributeGoal:[],buyReward:[],buyLotteryTicket:[],toggleOwnCard:[],markAllNotifsRead:[],clearAllNotifs:[],uploadMemberPhoto:[],v5ApplyLoan:['v5-loan-amount','v5-loan-months','v5-loan-purpose'],v5RepayLoan:[],v5AddBill:['v5-bill-name','v5-bill-amount','v5-bill-account','v5-bill-date','v5-bill-repeat'],v5PayBill:[],v5PauseBill:[],v5BuyShopItem:[],v5AnswerMission:[],v5ReportLostCard:[],bankerDeposit:['bk-member-select','bk-dep-account','bk-dep-amount','bk-dep-note'],bankerWithdraw:['bk-member-select','bk-wd-account','bk-wd-amount','bk-wd-note'],bankerBulkDeposit:['bk-bulk-account','bk-bulk-amount','bk-bulk-note'],storeCharge:['st-member-select','st-from','st-amount','st-desc'],editMemberName:[],editMemberPin:[],createMember:['new-name','new-checking','new-savings','new-pin'],editBalances:['edit-acc','edit-checking','edit-savings'],unlockMember:[],setInterestRate:['ad-interest-rate'],applyInterest:[],postAnnouncement:['ad-announce-msg'],saveDaySchedule:['sched-date'],payDaySchedule:['sched-date','sched-pay-account'],clearDaySchedule:['sched-date'],adminToggleCard:[],saveMemberProfile:['profile-account','profile-name','profile-pin','profile-card','profile-campus']};
const secConfirm=new Set(['sendMemberPayment','v5RepayLoan','v5PayBill','v5BuyShopItem','v5ReportLostCard','payDaySchedule','clearDaySchedule','editBalances','bankerBulkDeposit','applyInterest']);
async function secRun(name,args){if(!secAPI.active()||!currentUser)return toast('Sign in first.',true);if(secBusy)return toast('Another secure request is processing.',true);let data={action:name,fields:Object.fromEntries(secFields[name].map(id=>[id,secValue(id)])),args:args.filter(x=>typeof x==='string'||typeof x==='number')};
 if(name==='editMemberName'||name==='editMemberPin'){data.prompt=prompt(name==='editMemberPin'?'New 4–6 digit PIN (not shown after save)':'New account holder name',name==='editMemberName'?db.members[args[0]]?.name||'':'');if(data.prompt===null)return;}
 if(name==='uploadMemberPhoto'){const file=args[0]?.target?.files?.[0];if(!file)return;if(file.size>650000)return toast('Photo must be under 650 KB.',true);data.photo=await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(file);});}
 if(name==='v5AnswerMission')data.choice=secValue('v5-mission-choice-'+args[0]);
 if(name==='bankerBulkDeposit')data.selected=[...document.querySelectorAll('.bk-bulk-check:checked')].map(x=>x.value);
 if(name==='saveDaySchedule'||name==='payDaySchedule')data.slots=collectDaySlots();
 if(name==='storeCharge'||name==='bankerWithdraw'){const role=name==='storeCharge'?'store':'banker',scan=secScan[role];data.cardToken=scan?.token||'';}
 if(secConfirm.has(name)&&!confirm('Confirm this simulated banking action?'))return;
 if(name==='saveMemberProfile'&&data.fields['profile-campus']!==CAMPUS&&!confirm('Move this member to the other campus?'))return;
 secBusy=true;try{const r=await secAPI.call('action',data);for(const id of secFields[name])if(/pin/i.test(id)&&secEl(id))secEl(id).value='';if(r.reauth){await window.logout();toast(r.message);return;}secAdopt(r);if(name==='saveMemberProfile')closeProfileModal();if(name==='storeCharge')secScan.store=null;if(name==='bankerWithdraw')secScan.banker=null;refreshOpenUI();if(currentUser?.role==='member')v5RenderMemberLab();toast(r.message||'Saved securely.');}
 catch(e){secError(e);}finally{secBusy=false;}}
for(const name of Object.keys(secFields)){window[name]=(...args)=>{args[0]?.preventDefault?.();return secRun(name,args);};}
window.changeStaffPin=()=>toast('Shared teller and merchant PINs are now managed by dev only.',true);
// Privacy: other members' balances are not supplied. Preserve savings challenges using a server aggregate.
const secMemberUI=window.refreshMemberUI;
window.refreshMemberUI=function(){secMemberUI();const mini=secEl('m-mini-board'),board=secEl('leaderboard');if(currentUser?.role==='member'){const m=db.members[currentUser.account];if(mini)mini.innerHTML='<div class="muted">Your savings: <strong>'+money(m?.savings)+'</strong> · Individual peer balances are private.</div>';if(board)board.innerHTML='<div class="muted">Campus savings total: '+money(db.campusSavings||0)+' · Your rank: '+Number(db.savingsRank||1)+' of '+Number(db.campusMemberCount||1)+' savers. Peer balances stay private.</div>';}};
async function secureCampusBoot(){secClear();showScreen('screen-role');try{const p=await secAPI.call('public');db.devControls={bank:{locked:p.bankLocked},campuses:{main:{locked:p.campuses.main},west:{locked:p.campuses.west}}};updateSafetyBanner();}catch(e){updateSyncStatus('Secure server setup required',false);toast(e.message,true);}setInterval(()=>secRefresh(),15000);}
secureCampusBoot();
