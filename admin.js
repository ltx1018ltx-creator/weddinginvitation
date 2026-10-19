(() => {
  const $=id=>document.getElementById(id), cfg=window.WEDDING_DB;
  if(!window.supabase){$('login-status').textContent='登录组件未能载入，请刷新。';$('login-button').disabled=true;return;}
  const db=supabase.createClient(cfg.url,cfg.key,{auth:{storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  let rows=[],authorized=false,channel=null,poll=null,loading=false,reload=false,selected=null,generation=0;
  const statuses={new:'待跟进',contacted:'已联系',confirmed:'已确认'};
  const time=v=>new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Kuala_Lumpur',hour12:false});
  $('setup-notice').hidden=!cfg.adminSetupPending;
  $('login-form').hidden=cfg.adminSetupPending;
  function clear(){generation++;authorized=false;rows=[];selected=null;clearInterval(poll);poll=null;if(channel){db.removeChannel(channel);channel=null;}$('dashboard').hidden=true;$('login-panel').hidden=false;$('rows').replaceChildren();$('stats').replaceChildren();if($('detail').open)$('detail').close();}
  function filtered(){const q=$('search').value.trim().toLowerCase(),a=$('attendance').value,f=$('follow-filter').value;return rows.filter(r=>(!q||(r.name+' '+r.contact).toLowerCase().includes(q))&&(a==='all'||r.attending===(a==='yes'))&&(f==='all'||r.follow_up===f));}
  function render(){
    const yes=rows.filter(r=>r.attending),adults=yes.reduce((s,r)=>s+r.adults,0),children=yes.reduce((s,r)=>s+r.children,0);
    $('stats').replaceChildren();for(const [label,value] of [['回复份数',rows.length],['出席总人数',adults+children],['成人',adults],['儿童',children],['婉拒份数',rows.length-yes.length],['待跟进份数',rows.filter(r=>r.follow_up==='new').length]]){const box=document.createElement('div');box.className='stat';const n=document.createElement('strong'),l=document.createElement('span');n.textContent=value;l.textContent=label;box.append(n,l);$('stats').append(box);}
    const data=filtered();$('result-count').textContent=`显示 ${data.length} / ${rows.length} 份回复 · 上方统计为全部回复 · 马来西亚时间`;$('empty').hidden=data.length!==0;$('rows').replaceChildren();
    for(const r of data){const tr=document.createElement('tr');const values=[r.name,r.attending?`${r.adults+r.children} 人`:'不出席',r.dietary||'—',statuses[r.follow_up],time(r.created_at)];values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===0){const sm=document.createElement('small');sm.textContent=r.contact;td.append(sm);}if(i===1&&r.attending){const sm=document.createElement('small');sm.textContent=`成人 ${r.adults} · 儿童 ${r.children}`;td.append(sm);}tr.append(td);});const td=document.createElement('td'),b=document.createElement('button');b.textContent='查看 / 跟进';b.className='secondary';b.addEventListener('click',()=>openDetail(r));td.append(b);tr.append(td);$('rows').append(tr);}
  }
  async function refresh(){
    if(!authorized)return;if(loading){reload=true;return;}loading=true;const epoch=generation;$('refresh').disabled=true;
    try{
      const all=[];for(let offset=0;;offset+=500){const {data,error}=await db.from('wedding_rsvps').select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)break;}
      if(!authorized||epoch!==generation)return;rows=all;render();$('load-error').textContent='';$('last-sync').textContent='最近同步：'+time(new Date());
    }catch{if(epoch===generation)$('load-error').textContent='同步失败，下面可能是上次的数据。请检查网络或重新登录。';}
    finally{loading=false;$('refresh').disabled=false;if(reload){reload=false;refresh();}}
  }
  async function enter(){
    const epoch=++generation;const {data:{user},error}=await db.auth.getUser();if(error||!user){clear();return;}
    const check=await db.from('wedding_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(epoch!==generation)return;
    if(check.error||!check.data){await db.auth.signOut();clear();$('login-status').textContent='这个账号尚未获授权查看宾客资料。';return;}
    authorized=true;$('login-panel').hidden=true;$('dashboard').hidden=false;await refresh();if(!authorized)return;
    if(channel)await db.removeChannel(channel);
    channel=db.channel('wedding-admin').on('postgres_changes',{event:'*',schema:'public',table:'wedding_rsvps'},refresh).subscribe(state=>{$('connection').textContent=state==='SUBSCRIBED'?'● 实时同步已连接':'○ 实时连接中断或连接中 · 每 15 秒补充刷新';});
    clearInterval(poll);poll=setInterval(()=>{if(!document.hidden)refresh();},15000);
  }
  $('login-form').addEventListener('submit',async e=>{e.preventDefault();const loginForm=e.currentTarget;$('login-button').disabled=true;$('login-status').textContent='正在登录…';try{const f=new FormData(loginForm);const {error}=await db.auth.signInWithPassword({email:String(f.get('email')).trim(),password:String(f.get('password'))});if(error)throw error;loginForm.reset();$('login-status').textContent='';await enter();}catch{$('login-status').textContent='无法登录，请检查账号和密码。';}finally{$('login-button').disabled=false;}});
  $('logout').onclick=async()=>{clear();await db.auth.signOut();};
  db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')clear();});
  $('refresh').onclick=refresh;['search','attendance','follow-filter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authorized)refresh();});
  function openDetail(r){selected={...r};$('guest-detail').replaceChildren();for(const [k,v]of Object.entries({'姓名':r.name,'联系方式':r.contact,'出席':r.attending?'是':'否','人数':`成人 ${r.adults} / 儿童 ${r.children}`,'饮食需求':r.dietary||'—','留言':r.message||'—','提交时间':time(r.created_at),'最近修改':time(r.updated_at)})){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;$('guest-detail').append(dt,dd);}$('detail-form').elements.follow_up.value=r.follow_up;$('detail-form').elements.notes.value=r.notes;$('detail-status').textContent='';$('detail').showModal();}
  $('close-detail').onclick=()=>$('detail').close();
  $('detail-form').onsubmit=async e=>{e.preventDefault();if(!selected||!authorized)return;$('save-detail').disabled=true;$('detail-status').textContent='保存中…';try{const f=new FormData(e.currentTarget);const {data,error}=await db.from('wedding_rsvps').update({follow_up:f.get('follow_up'),notes:String(f.get('notes')).trim()}).eq('id',selected.id).eq('updated_at',selected.updated_at).select('id,updated_at');if(error)throw error;if(!data.length){$('detail-status').textContent='这条回复已被其他操作修改，请关闭详情，刷新后重试。';return;}selected.updated_at=data[0].updated_at;$('detail-status').textContent='已保存';await refresh();}catch{$('detail-status').textContent='保存失败，请稍后重试。';}finally{$('save-detail').disabled=false;}};
  function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  $('export').onclick=()=>{if(!authorized)return;const data=[['姓名','联系方式','出席','成人','儿童','饮食需求','留言','跟进','内部备注','提交时间（马来西亚）'],...filtered().map(r=>[r.name,r.contact,r.attending?'是':'否',r.adults,r.children,r.dietary,r.message,statuses[r.follow_up],r.notes,time(r.created_at)])];const blob=new Blob(['\ufeff'+data.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='wedding-rsvp.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
  if(!cfg.adminSetupPending)db.auth.getSession().then(({data})=>{if(data.session)enter();});
})();
