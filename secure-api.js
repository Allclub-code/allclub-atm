/* All Club V6: public key identifies the project, not the user. Session stays in memory. */
(() => {
 const endpoint='https://yshkhkcplivhgxmedsfe.supabase.co/functions/v1/allclub-secure';
 const publicKey='sb_publishable_zzE1deqJoEQ6nz_KgirUgA_Kr8O1lTG';
 let session='';
 window.allclubAPI={
  async call(op,data={}){let r;try{r=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:publicKey,...(session?{'x-allclub-session':session}:{})},body:JSON.stringify({op,...data})});}catch(e){throw new Error('Secure bank unavailable. Check connection and Supabase setup.');}
   let j;try{j=await r.json();}catch(e){throw new Error('Secure bank returned an invalid response. Check setup.');}if(!r.ok)throw Object.assign(new Error(j.error||j.message||'Request rejected by the secure bank.'),{status:r.status});return j;},
  set(token){session=String(token||'');}, clear(){session='';}, active(){return !!session;},
  async logout(){try{if(session)await this.call('logout');}finally{session='';}}
 };
 // Clear insecure caches left by earlier editions. No new credentials or member data are cached.
 try{for(const k of ['allclub_cu_v2','allclub_base'])localStorage.removeItem(k);}catch(_){}
})();
