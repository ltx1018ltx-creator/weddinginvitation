(() => {
  const form=document.getElementById('rsvp-form');
  const status=document.getElementById('rsvp-message');
  const button=document.getElementById('rsvp-submit');
  const attendance=form.elements.attending;
  const counts=document.getElementById('rsvp-counts');
  const storeKey='wedding-rsvp-submission-v1';
  let pending=null;
  try { pending=JSON.parse(localStorage.getItem(storeKey)||'null'); } catch {}
  const db=window.supabase?.createClient(WEDDING_DB.url,WEDDING_DB.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  function success(){form.hidden=true;document.getElementById('rsvp-success').hidden=false;document.getElementById('rsvp-success').focus();}
  if(pending?.done) success();
  function countsState(){const yes=attendance.value==='yes';counts.hidden=!yes;form.elements.adults.disabled=!yes;}
  attendance.addEventListener('change',countsState);countsState();
  if(!db){button.disabled=true;status.textContent='The form could not load. Please refresh and try again.';}
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!db||button.disabled)return;
    if(form.elements.website.value)return;
    const f=new FormData(form),yes=f.get('attending')==='yes';
    const payload={name:String(f.get('name')).trim(),contact:String(f.get('contact')).trim(),attending:yes,adults:yes?Number(f.get('adults')):0,message:String(f.get('message')||'').trim()};
    if(!payload.name||payload.contact.length<6){status.textContent='Please enter your name and a valid contact number.';return;}
    // A retry reuses the same UUID. Only a fingerprint, not guest details, is saved locally.
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(!pending||pending.fingerprint!==fingerprint)pending={id:crypto.randomUUID(),fingerprint,done:false};
    try{localStorage.setItem(storeKey,JSON.stringify(pending));}catch{}
    button.disabled=true;button.textContent='Saving…';status.textContent='';
    try{
      const {error}=await db.from('wedding_rsvps').insert({id:pending.id,...payload});
      if(error&&error.code!=='23505')throw error;
      pending.done=true;try{localStorage.setItem(storeKey,JSON.stringify(pending));}catch{}
      success();
    }catch{status.textContent='We could not confirm your response. Please try again. Your details are still on this page; retrying will not create a duplicate.';}
    finally{button.disabled=false;button.textContent='Send RSVP →';}
  });
})();
