'use strict';
/* Schedule: a month calendar of posts, a review queue for batches your agents prepare, and the connection to Postiz.
   Agents draft; you approve; only approved posts are sent. The server stays in dry-run until you switch live on. */
const Schedule=(()=>{
 const {$,$$,esc,icon,platformIcon,api,toast,state}=App;
 const PLATFORMS=[['instagram','Instagram'],['facebook','Facebook'],['linkedin','LinkedIn'],['x','X'],['tiktok','TikTok'],['youtube','YouTube']];
 const NAME=Object.fromEntries(PLATFORMS);
 const ICON={instagram:'instagram',facebook:'facebook',linkedin:'linkedin',x:'x',tiktok:'tiktok',youtube:'youtube'};
 const STATUS={review:'Needs review',draft:'Draft',approved:'Approved',posting:'Sending',posted:'Posted',simulated:'Dry run',failed:'Failed',cancelled:'Cancelled',rejected:'Sent back'};
 const S={month:new Date(new Date().getFullYear(),new Date().getMonth(),1),posts:[],batches:[],status:null,channels:null,loaded:false};
 const two=n=>String(n).padStart(2,'0');
 const day=d=>`${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`;
 const when=iso=>{const d=new Date(iso);return `${d.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})} ${two(d.getHours())}:${two(d.getMinutes())}`};
 const localInput=iso=>{const d=new Date(iso);return `${day(d)}T${two(d.getHours())}:${two(d.getMinutes())}`};
 const pfIcon=p=>platformIcon(ICON[p]||'',`pf-ic pf-${p}`);
 const channelOf=id=>(S.channels||[]).find(c=>c.id===id);

 async function load(){
  const from=new Date(S.month.getFullYear(),S.month.getMonth()-1,20),to=new Date(S.month.getFullYear(),S.month.getMonth()+2,10);
  const [st,posts,batches]=await Promise.all([api('/publish/status'),api(`/schedule/posts?from=${from.toISOString()}&to=${to.toISOString()}`),api('/schedule/batches')]);
  S.status=st;S.posts=posts.posts;S.batches=batches.batches;S.loaded=true;
  if(st.postiz_configured&&!S.channels){try{S.channels=(await api('/publish/channels')).channels}catch{S.channels=[]}}
 }
 const needsReview=()=>S.posts.filter(p=>p.status==='review');

 /* ---------- views ---------- */
 function banner(){
  const s=S.status;if(!s)return '';
  const on=PLATFORMS.filter(([id])=>s.platforms[id]).map(([,n])=>n);
  const text=s.paused?'Everything is paused. Nothing will be sent.':!s.postiz_configured?'Postiz is not connected yet. Posts are planned but nothing can be sent.':!s.live?'Dry run: approved posts are checked at their time but nothing is posted.':on.length?`Live on ${on.join(', ')}. Other platforms stay in dry run.`:'Live mode is on, but no platform is switched on yet.';
  return `<div class="sch-banner ${s.live&&!s.paused&&on.length?'live':''}"><b>${s.live&&!s.paused&&on.length?'LIVE':'SAFE'}</b><span>${esc(text)}</span><button class="btn-light" data-sch="pause">${s.paused?'Resume':'Pause all'}</button></div>`;
 }
 function html(tab){
  const head=`<section class="hello"><h1>Schedule</h1><button class="btn-maroon" data-sch="new">Schedule a design</button></section>`;
  if(!S.loaded)return head+'<p class="lead">Loading the schedule…</p>';
  return head+banner()+(tab==='Review'?reviewHtml():tab==='Setup'?setupHtml():calendarHtml());
 }
 function calendarHtml(){
  const y=S.month.getFullYear(),m=S.month.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-((first.getDay()+6)%7));
  const byDay={};for(const p of S.posts){(byDay[day(new Date(p.scheduled_at))]||(byDay[day(new Date(p.scheduled_at))]=[])).push(p)}
  let cells='';
  for(let i=0;i<42;i++){const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),list=byDay[day(d)]||[],other=d.getMonth()!==m,today=day(d)===day(new Date());
   cells+=`<div class="sch-day ${other?'other':''} ${today?'today':''}"><span class="sch-n">${d.getDate()}</span>${list.slice(0,3).map(p=>chip(p)).join('')}${list.length>3?`<button class="sch-more" data-sch="day" data-day="${day(d)}">+${list.length-3} more</button>`:''}</div>`}
  const total=S.posts.filter(p=>new Date(p.scheduled_at).getMonth()===m).length;
  return `<div class="sch-cal"><div class="sch-calhead"><button class="osbtn" data-sch="prev" aria-label="Previous month">${icon('back')}</button><h2>${S.month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><button class="osbtn" data-sch="next" aria-label="Next month">${icon('forward')}</button><span class="sch-count">${total} post${total===1?'':'s'}</span></div>
  <div class="sch-week">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div><div class="sch-grid">${cells}</div></div>`;
 }
 const chip=p=>`<button class="sch-chip st-${p.status}" data-post="${p.id}" title="${esc(NAME[p.platform]||p.platform)} · ${esc(STATUS[p.status]||p.status)}">${pfIcon(p.platform)}<b>${two(new Date(p.scheduled_at).getHours())}:${two(new Date(p.scheduled_at).getMinutes())}</b><span>${esc(p.title||p.caption)}</span></button>`;
 function reviewHtml(){
  const groups=S.batches.map(b=>({b,posts:S.posts.filter(p=>p.batch_id===b.id&&p.status==='review')})).filter(g=>g.posts.length);
  if(!groups.length)return `<div class="empty-card glass"><h2>Nothing waiting for you.</h2><p>When your agents prepare a batch of posts, it appears here for your approval. Nothing is sent until you approve it.</p></div>`;
  return groups.map(({b,posts})=>`<article class="sch-batch glass"><header><div><h2>${esc(b.title)}</h2><small>${posts.length} post${posts.length===1?'':'s'} · prepared by ${esc(b.created_by==='agent'?'your agents':'you')}${b.notes?' · '+esc(b.notes):''}</small></div><button class="btn-maroon" data-sch="approve-batch" data-batch="${b.id}">Approve all ${posts.length}</button></header>
   <div class="sch-rows">${posts.map(p=>`<div class="sch-row" data-post="${p.id}"><span class="sch-pf">${pfIcon(p.platform)}<small>${esc(channelOf(p.channel_id)?.name||NAME[p.platform])}</small></span><span class="sch-when">${esc(when(p.scheduled_at))}</span><p>${esc(p.caption.slice(0,160))}</p>${p.problems.length?`<em class="sch-warn">${esc(p.problems[0])}</em>`:''}<button class="btn-light" data-sch="open" data-post="${p.id}">Review</button></div>`).join('')}</div></article>`).join('');
 }
 function setupHtml(){
  const s=S.status,ch=S.channels||[];
  return `<div class="sch-setup glass"><h2>Connection</h2>
   <p class="lead">${s.postiz_configured?'Postiz is connected to this server.':'Postiz is not connected. On the server, set <code>POSTIZ_API_URL</code> and <code>POSTIZ_API_KEY</code> in the environment file and restart. Your API key is created in Postiz under Settings.'}</p>
   <div class="sch-actions"><button class="btn-dark" data-sch="test" ${s.postiz_configured?'':'disabled'}>Test connection</button></div>
   <h2>Channels</h2>${ch.length?`<div class="sch-channels">${ch.map(c=>`<div class="sch-channel">${pfIcon(c.platform)}<div><b>${esc(c.name)}</b><small>${esc(NAME[c.platform]||c.identifier)}${c.disabled?' · disabled in Postiz':''}</small></div><button class="btn-light" data-sch="test-channel" data-channel="${esc(c.id)}">Send test draft</button></div>`).join('')}</div>`:'<p class="lead">No channels yet. Connect your accounts inside Postiz and they appear here.</p>'}
   <h2>Going live</h2><p class="lead">Dry run is the default. Switch each platform on when you are happy with a test draft. Switching a platform on means approved posts for it are really published.</p>
   <label class="sch-switch"><input type="checkbox" data-sch-live ${s.live?'checked':''}> Live mode</label>
   <div class="sch-plats">${PLATFORMS.map(([id,n])=>`<label class="sch-switch"><input type="checkbox" data-sch-plat="${id}" ${s.platforms[id]?'checked':''}> ${pfIcon(id)} ${n}</label>`).join('')}</div></div>`;
 }

 /* ---------- actions ---------- */
 const ui=()=>Dashboard.state;
 async function refresh(){await load();if(Dashboard.state.view==='schedule')Dashboard.draw()}
 function wire(root){
  root.addEventListener('click',async e=>{
   const b=e.target.closest('[data-sch],[data-post]');if(!b||!root.contains(b))return;
   const a=b.dataset.sch,id=b.dataset.post;
   try{
    if(a==='prev'||a==='next'){S.month=new Date(S.month.getFullYear(),S.month.getMonth()+(a==='next'?1:-1),1);await refresh();return}
    if(a==='new')return openSchedule();
    if(a==='pause'){await api('/publish/settings',{method:'POST',body:{paused:!S.status.paused}});return refresh()}
    if(a==='test'){const r=await api('/publish/test',{method:'POST',body:{}});toast(r.message,6000);S.channels=r.channels;return refresh()}
    if(a==='test-channel'){const r=await api('/publish/test',{method:'POST',body:{channel_id:b.dataset.channel}});return toast(r.message,7000)}
    if(a==='approve-batch')return approveBatch(b.dataset.batch);
    if(a==='day'){const d=b.dataset.day;return openDay(d)}
    if(id)return openPost(id);
   }catch(err){toast(err.message,6000)}
  });
  root.addEventListener('change',async e=>{
   const live=e.target.closest('[data-sch-live]'),plat=e.target.closest('[data-sch-plat]');
   try{
    if(live){if(live.checked&&!confirm('Turn live mode on? Approved posts for platforms you have switched on will be published for real.')){live.checked=false;return}await api('/publish/settings',{method:'POST',body:{live:live.checked}});await refresh()}
    if(plat){if(plat.checked&&!confirm(`Switch ${NAME[plat.dataset.schPlat]} on? Approved ${NAME[plat.dataset.schPlat]} posts will be published for real once live mode is on.`)){plat.checked=false;return}await api('/publish/settings',{method:'POST',body:{platforms:{[plat.dataset.schPlat]:plat.checked}}});await refresh()}
   }catch(err){toast(err.message,6000)}
  });
 }
 function modal(inner,cls=''){
  closeModal();const w=document.createElement('div');w.className='modal-back';w.id='schModal';w.innerHTML=`<div class="modal glass-strong sch-modal ${cls}" role="dialog" aria-modal="true">${inner}</div>`;document.body.appendChild(w);
  w.addEventListener('mousedown',e=>{if(e.target===w)closeModal()});return w.firstElementChild;
 }
 const closeModal=()=>$('#schModal')?.remove();
 function openDay(d){
  const list=S.posts.filter(p=>day(new Date(p.scheduled_at))===d);
  const m=modal(`<h2>${new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'})}</h2><div class="sch-rows">${list.map(p=>`<div class="sch-row" data-post="${p.id}"><span class="sch-pf">${pfIcon(p.platform)}</span><span class="sch-when">${esc(when(p.scheduled_at))}</span><p>${esc(p.caption.slice(0,100))}</p><em class="st-tag st-${p.status}">${esc(STATUS[p.status])}</em><button class="btn-light" data-sch="open" data-post="${p.id}">Open</button></div>`).join('')}</div><div class="modal-actions"><button class="btn-light" data-m="close">Close</button></div>`);
  m.addEventListener('click',e=>{if(e.target.closest('[data-m=close]'))closeModal();const o=e.target.closest('[data-post]');if(o)openPost(o.dataset.post)});
 }
 async function openPost(id){
  const p=await api('/schedule/posts/'+id);const limit=S.status?.limits?.[p.platform];
  const editable=!['posting','posted','simulated'].includes(p.status);
  const chans=S.channels?.length?S.channels.filter(c=>c.platform===p.platform||c.id===p.channel_id):[];
  const m=modal(`<h2>${pfIcon(p.platform)} ${esc(NAME[p.platform]||p.platform)} <em class="st-tag st-${p.status}">${esc(STATUS[p.status])}</em></h2>
   ${p.error?`<p class="sch-warn">${esc(p.error)}</p>`:''}${p.problems.length&&editable?`<p class="sch-warn">${esc(p.problems.join(' '))}</p>`:''}
   <div class="sch-two"><label class="field">When<input type="datetime-local" id="spWhen" value="${localInput(p.scheduled_at)}" ${editable?'':'disabled'}></label>
   <label class="field">Channel<select id="spChan" ${editable?'':'disabled'}>${chans.length?chans.map(c=>`<option value="${esc(c.id)}" ${c.id===p.channel_id?'selected':''}>${esc(c.name)}</option>`).join(''):`<option value="${esc(p.channel_id)}">${esc(p.channel_id.startsWith('unassigned')?'Not assigned yet':p.channel_id)}</option>`}</select></label></div>
   <label class="field">Caption <small id="spCount"></small><textarea id="spCap" rows="6" ${editable?'':'disabled'}>${esc(p.caption)}</textarea></label>
   <label class="field">Hashtags<input id="spTags" value="${esc((p.hashtags||[]).join(' '))}" placeholder="#automation #ai" ${editable?'':'disabled'}></label>
   ${p.media.length?`<div class="sch-media">${p.media.map(f=>f.type==='video'?`<video src="${f.url}" controls muted></video>`:`<img src="${f.url}" alt="">`).join('')}</div>`:'<p class="hint">No pictures rendered yet. They are made from the design when you approve.</p>'}
   ${p.design_id?`<p class="hint"><a href="#editor/${esc(p.design_id)}">Open the design</a></p>`:''}
   ${p.notes?`<p class="hint">Agent note: ${esc(p.notes)}</p>`:''}
   <details class="sch-hist"><summary>History</summary>${(p.history||[]).slice().reverse().map(h=>`<div>${esc(when(h.at))} · ${esc(h.by)} · ${esc(h.event)}</div>`).join('')}</details>
   <div class="modal-actions">${editable?'<button class="btn-light" data-m="save">Save changes</button>':''}${['review','rejected','draft'].includes(p.status)?'<button class="btn-light" data-m="reject">Send back</button><button class="btn-maroon" data-m="approve">Approve</button>':''}${p.status==='approved'?'<button class="btn-maroon" data-m="now">Post now</button>':''}${p.status==='failed'?'<button class="btn-maroon" data-m="retry">Retry</button>':''}${editable&&p.status!=='cancelled'?'<button class="btn-light" data-m="cancel">Cancel post</button>':''}<span class="spacer"></span><button class="btn-light" data-m="close">Close</button></div>`);
  const cap=$('#spCap',m),count=$('#spCount',m),upd=()=>{const len=(cap.value+' '+($('#spTags',m).value||'')).trim().length;count.textContent=limit?`${len} / ${limit}`:'';count.className=limit&&len>limit?'over':''};cap.oninput=upd;$('#spTags',m).oninput=upd;upd();
  const patch=()=>({caption:cap.value,hashtags:($('#spTags',m).value.match(/[\p{L}\p{N}_]+/gu)||[]),scheduled_at:new Date($('#spWhen',m).value).toISOString(),channel_id:$('#spChan',m).value,...(S.channels?.find(c=>c.id===$('#spChan',m).value)?{identifier:S.channels.find(c=>c.id===$('#spChan',m).value).identifier}:{})});
  m.addEventListener('click',async e=>{
   const a=e.target.closest('[data-m]')?.dataset.m;if(!a)return;
   try{
    if(a==='close')return closeModal();
    if(a==='save'){await api('/schedule/posts/'+id,{method:'PATCH',body:patch()});toast('Saved.');closeModal();return refresh()}
    if(a==='approve'){await api('/schedule/posts/'+id,{method:'PATCH',body:patch()});await approvePosts([id]);closeModal();return refresh()}
    if(a==='reject'){const note=prompt('Tell the agent what to change (optional):')||'';await api(`/schedule/posts/${id}/reject`,{method:'POST',body:{note}});closeModal();return refresh()}
    if(a==='cancel'){if(!confirm('Cancel this post? It will not be sent.'))return;await api(`/schedule/posts/${id}/cancel`,{method:'POST',body:{}});closeModal();return refresh()}
    if(a==='now'){if(!confirm('Send this post now?'))return;await api(`/schedule/posts/${id}/post-now`,{method:'POST',body:{}});toast('Sending…');closeModal();setTimeout(refresh,2500);return}
    if(a==='retry'){await api(`/schedule/posts/${id}/retry`,{method:'POST',body:{}});toast('Retrying…');closeModal();setTimeout(refresh,2500)}
   }catch(err){toast(err.message,7000)}
  });
 }
 /* Rendering happens here in the browser, where the designs are drawn: pictures (or a video for YouTube) are made from the design, uploaded, and the post approved. */
 const b64=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(String(f.result).split(',')[1]);f.readAsDataURL(blob)});
 const variantOf=p=>p.platform==='youtube'?'video':p.platform==='x'?'x':'images';
 async function renderSet(designId,variant,design){
  design=design||await api('/designs/'+designId);
  let pages=design.pages.map((_,i)=>i);const limit=variant==='x'?4:10;
  if(pages.length>limit)pages=[0,...pages.slice(1,limit-1),pages.length-1];
  const files=await Exporter.renderBlobs(design,{pages,scale:1,video:variant==='video'});
  await api('/schedule/media-set',{method:'POST',body:{design_id:designId,variant,files:await Promise.all(files.map(async f=>({name:f.name,type:f.type,base64:await b64(f.blob)})))}});
 }
 async function approvePosts(ids){
  const posts=await Promise.all(ids.map(id=>api('/schedule/posts/'+id)));
  // Each design is drawn once per kind of picture, then shared by every post that needs it.
  const sets=new Map();for(const p of posts)if(!p.media.length){if(!p.design_id)throw Error('A post has no design to make pictures from.');sets.set(p.design_id+'|'+variantOf(p),[p.design_id,variantOf(p)])}
  let n=0;const designs={};
  for(const [designId,variant] of sets.values()){n++;toast(`Making pictures ${n} of ${sets.size}…`,60000);designs[designId]=designs[designId]||await api('/designs/'+designId);await renderSet(designId,variant,designs[designId])}
  for(const id of ids)await api(`/schedule/posts/${id}/approve`,{method:'POST',body:{}});
  toast(ids.length===1?'Approved. It will be sent at its time.':`${ids.length} posts approved.`);
 }
 async function approveBatch(batchId){
  const ids=S.posts.filter(p=>p.batch_id===batchId&&p.status==='review'&&!p.problems.length).map(p=>p.id);
  if(!ids.length)return toast('These posts need fixing first. Open one to see what is missing.',6000);
  if(!confirm(`Approve ${ids.length} post${ids.length===1?'':'s'}? They will be sent at their scheduled times.`))return;
  try{await approvePosts(ids)}catch(e){toast(e.message,8000)}
  refresh();
 }

 /* Schedule a design: choose channels, a caption, and a rhythm. It creates a batch you then approve. */
 async function openSchedule(designId=''){
  if(!state.designs.length)await App.loadDesigns().catch(()=>{});
  if(!S.loaded)await load();
  const designs=state.designs;if(!designs.length)return toast('Make a design first.');
  const chans=S.channels?.length?S.channels:PLATFORMS.map(([id,n])=>({id:'unassigned-'+id,name:n+' (not connected)',platform:id,identifier:id}));
  const t=new Date(Date.now()+86400000);t.setHours(9,0,0,0);
  const m=modal(`<h2>Schedule a design</h2><p class="lead">This makes a batch for you to review. Nothing is sent until you approve it.</p>
   <label class="field">Design<select id="sdDesign">${designs.map(d=>`<option value="${d.id}" ${d.id===designId?'selected':''}>${esc(d.title)} · ${d.pages} pages</option>`).join('')}</select></label>
   <fieldset class="sch-pick"><legend>Post to</legend>${chans.map(c=>`<label class="check"><input type="checkbox" name="sdChan" value="${esc(c.id)}" data-platform="${c.platform}" data-ident="${esc(c.identifier)}"><span>${pfIcon(c.platform)} ${esc(c.name)}</span></label>`).join('')}</fieldset>
   <label class="field">Caption<textarea id="sdCap" rows="4" maxlength="4000" placeholder="Write the caption. Agents can write these for you."></textarea></label>
   <label class="field">Hashtags<input id="sdTags" placeholder="#automation #ai"></label>
   <div class="sch-two"><label class="field">First post<input type="datetime-local" id="sdWhen" value="${localInput(t.toISOString())}"></label>
   <label class="field">Repeat<select id="sdRep"><option value="0">Just once</option><option value="1">Every day</option><option value="2">Every 2 days</option><option value="3">Every 3 days</option><option value="7">Every week</option></select></label></div>
   <label class="field">How many posts <small>(up to a month ahead)</small><input type="number" id="sdN" min="1" max="31" value="1"></label>
   <div class="modal-actions"><button class="btn-light" data-m="close">Cancel</button><button class="btn-maroon" data-m="make">Add to review</button></div>`);
  m.addEventListener('click',async e=>{
   const a=e.target.closest('[data-m]')?.dataset.m;if(a==='close')return closeModal();if(a!=='make')return;
   const picks=$$('[name=sdChan]:checked',m);if(!picks.length)return toast('Choose at least one place to post.');
   const caption=$('#sdCap',m).value.trim();if(!caption)return toast('Write a caption.');
   const tags=$('#sdTags',m).value.match(/[\p{L}\p{N}_]+/gu)||[],step=+$('#sdRep',m).value,n=step?Math.min(31,Math.max(1,+$('#sdN',m).value||1)):1,first=new Date($('#sdWhen',m).value);
   if(isNaN(first))return toast('Choose a date and time.');
   const items=[];for(let k=0;k<n;k++){const d=new Date(first.getTime()+k*step*86400000);for(const c of picks)items.push({design_id:$('#sdDesign',m).value,channel_id:c.value,identifier:c.dataset.ident,platform:c.dataset.platform,caption,hashtags:tags,scheduled_at:d.toISOString(),title:designs.find(x=>x.id===$('#sdDesign',m).value)?.title||''})}
   try{await api('/schedule/batches',{method:'POST',body:{title:`${designs.find(x=>x.id===$('#sdDesign',m).value)?.title||'Design'} · ${items.length} post${items.length===1?'':'s'}`,items}});closeModal();toast('Added. Review it, then approve.');Dashboard.state.schedTab='Review';location.hash='#schedule';await refresh()}
   catch(err){toast(err.message,7000)}
  });
 }
 return {html,wire,load,refresh,openSchedule,needsReview,get loaded(){return S.loaded}};
})();
