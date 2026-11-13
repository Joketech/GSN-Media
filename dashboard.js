'use strict';
/* Glass dashboard: shell, overview, template library, saved designs and agents. */
const Dashboard=(()=>{
 const {$,$$,esc,icon,platformIcon,api,toast,state,preset,ago}=App;
 const ui={view:'dashboard',query:'',format:'All',style:'All',tab:'Popular',designTab:'All',shown:12,built:false};
 // Each agent is a small glossy robot in its own colour. The robot glows while a job from that agent is running.
 const agentTone={Mira:'#0f7a4a',Seline:'#ef6f9a',Spectra:'#8b5cf6',Lyra:'#f0a339',Flux:'#4b8df0',Relay:'#1fb5c4'};
 let botCount=0;
 // Mira leads the other agents, so she is always first wherever the agents are listed.
 const lead=list=>[...list].sort((a,b)=>(b[0]==='Mira')-(a[0]==='Mira'));
 const agentAvatar=(name,i=0)=>{const id='b'+(botCount++),tone=agentTone[name]||'#8b6cf0';
  // A friendly full-figure robot: dome head with a dark smiling visor, ear piece, antenna, a waving hand and boots. Only its accent colour changes per agent.
  return `<span class="bot" data-agent="${esc(name)}" style="--tone:${tone};--d:${(i*-.6).toFixed(1)}s" role="img" aria-label="${esc(name)}, agent"><svg viewBox="0 0 80 100" aria-hidden="true">
<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f0ecfa"/><stop offset="1" stop-color="#cfc8e8"/></linearGradient><radialGradient id="${id}h"><stop offset="0" stop-color="var(--tone)" stop-opacity=".5"/><stop offset="1" stop-color="var(--tone)" stop-opacity="0"/></radialGradient></defs>
<ellipse class="halo" cx="40" cy="95.5" rx="27" ry="4" fill="url(#${id}h)"/>
<g class="legs"><rect x="29" y="74" width="6" height="11" rx="3" fill="#3a3d4a"/><rect x="46" y="74" width="6" height="11" rx="3" fill="#3a3d4a"/>
<ellipse cx="29" cy="88" rx="10" ry="5.6" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".7"/><ellipse cx="53" cy="88.5" rx="10" ry="5.6" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".7"/></g>
<g class="arm l"><path d="M25 61 Q19 66 25 72" fill="none" stroke="#3a3d4a" stroke-width="4.2" stroke-linecap="round"/><ellipse cx="25.5" cy="72.5" rx="4" ry="3.6" fill="#3a3d4a"/><ellipse cx="25" cy="58" rx="6" ry="6.6" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".7"/></g>
<g class="body"><path d="M24 58 Q24 47 40 47 Q56 47 56 58 Q58 76 40 78 Q22 76 24 58Z" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".8"/>
<path d="M33.5 58 h13 q0 8.5 -6.5 11 q-6.5 -2.5 -6.5 -11Z" fill="var(--tone)" opacity=".92"/><ellipse cx="38" cy="60.5" rx="2.4" ry="1.4" fill="#fff" opacity=".55"/></g>
<g class="head"><g class="ant"><line x1="40" y1="17" x2="40" y2="10.5" stroke="#3a3d4a" stroke-width="1.8" stroke-linecap="round"/><circle class="tip" cx="40" cy="8" r="3.4" fill="var(--tone)"/></g>
<ellipse cx="13.4" cy="33" rx="4.4" ry="8.4" fill="var(--tone)"/><ellipse cx="66.6" cy="33" rx="4.4" ry="8.4" fill="var(--tone)"/>
<rect x="14" y="17" width="52" height="34" rx="17" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".8"/>
<rect x="19" y="22" width="42" height="24" rx="12" fill="#0c1230"/>
<g class="eyes"><path class="eye" d="M26 35 Q31 27.6 36 35 Q31 31.4 26 35Z" fill="var(--tone)"/><path class="eye" d="M44 35 Q49 27.6 54 35 Q49 31.4 44 35Z" fill="var(--tone)"/><path class="eye" d="M35.4 38.6 Q40 43.6 44.6 38.6 Q40 41.2 35.4 38.6Z" fill="var(--tone)"/>
<circle class="glint" cx="24.6" cy="26" r="1.3" fill="#fff" opacity=".8"/><circle class="glint" cx="56" cy="26" r="1.3" fill="#fff" opacity=".8"/></g></g>
<g class="arm r"><path d="M56 58 Q68 58 72 47" fill="none" stroke="#3a3d4a" stroke-width="4.2" stroke-linecap="round"/><ellipse cx="74" cy="40.5" rx="6.4" ry="7" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".7"/>
<path d="M68 36 Q67.4 31.6 69.2 30 Q71 31.6 70.6 36Z" fill="#3a3d4a"/><path d="M72.4 35 Q72.2 29.6 74 28.4 Q75.8 29.6 75.6 35Z" fill="#3a3d4a"/><path d="M77.4 36 Q77.6 31.6 79.4 30.4 Q81 32 79.8 36Z" fill="#3a3d4a"/>
<ellipse cx="56" cy="57" rx="5.6" ry="6.2" fill="url(#${id}w)" stroke="#cfc8e6" stroke-width=".7"/></g>
</svg></span>`};
 // Which agents have a job running now. A job counts while it is not finished and was touched in the last 15 minutes.
 let working=new Set(),pollTimer=0;
 function applyWorking(){$$('.bot').forEach(b=>b.classList.toggle('working',working.has(b.dataset.agent.toLowerCase())))}
 async function pollJobs(){
  clearTimeout(pollTimer);
  if(!['dashboard','agents'].includes(ui.view))return;
  try{const {jobs}=await api('/jobs');const now=Date.now();
   working=new Set(jobs.filter(j=>!['complete','failed','error','cancelled','rejected'].includes(j.state)&&now-Date.parse(j.updated_at||j.created_at||0)<15*60e3).map(j=>String(j.agent||'').toLowerCase()));applyWorking()}catch{}
  pollTimer=setTimeout(pollJobs,6000);
 }
 const navItems=[['dashboard','home','Home'],['ideas','ideas','Ideas'],['templates','templates','Templates'],['ugc','templates','UGC'],['designs','designs','My designs'],['schedule','calendar','Schedule'],['agents','agents','Agents'],['people','users','People'],['team','team','Team'],['settings','brand','Settings']];
 const titles={dashboard:'Dashboard',ideas:'Ideas',templates:'Templates',ugc:'UGC collection',designs:'My designs',agents:'Agents',schedule:'Schedule',people:'People',team:'Team',settings:'Settings'};
 const statusText={draft:'Draft',review:'In review',approved:'Approved'};

 // Motion switch: turns every animation and light off (rain, robots, scrolling templates) and back on. Animation is on by default; the switch remembers your choice.
 const Motion={
  on:true,
  init(){let v=null;try{v=localStorage.getItem('gsn-motion')}catch{}this.on=v?v==='off'?false:true:true;this.apply()},
  apply(){document.documentElement.dataset.motion=this.on?'on':'off';const s=$('#motionSwitch');if(s){s.setAttribute('aria-checked',String(this.on));s.title='Animation and light: '+(this.on?'on':'off')}if(typeof Water!=='undefined')typeof Ripples!=='undefined'&&Ripples.resume();Water.setMotion();if(typeof HeroGlobe!=='undefined')HeroGlobe.refresh()},
  set(on){this.on=on;try{localStorage.setItem('gsn-motion',on?'on':'off')}catch{}this.apply();draw()},
  // Speed check: if this computer cannot keep the animations smooth, switch them off once and say so. A choice made with the switch always wins.
  watch(){let chosen=null;try{chosen=localStorage.getItem('gsn-motion')}catch{}if(chosen||this.watched)return;this.watched=true;
   const run=()=>{let n=0,t0=0,slow=0;const tick=now=>{if(document.hidden){return}if(!t0)t0=now;else{n++;if(now-(tick.last||now)>40)slow++}tick.last=now;
    if(now-t0<4000){requestAnimationFrame(tick);return}
    const fps=n/((now-t0)/1000);let c=null;try{c=localStorage.getItem('gsn-motion')}catch{}
    if(fps<40&&!c&&this.on){this.on=false;this.apply();draw();try{toast('Animations switched off to keep the dashboard fast. Turn them back on with the Motion switch.',7000)}catch{}}};requestAnimationFrame(tick)};
   setTimeout(run,2500)}
 };
 function build(){
  const stage=$('#stage');
  stage.innerHTML=`<div class="stage-bg" aria-hidden="true"></div><canvas class="water" aria-hidden="true"></canvas><canvas class="water-front" aria-hidden="true"></canvas>
  <header class="osbar glass" aria-label="Studio address bar">
   <div class="osgroup"><button class="osbtn" data-os="home" title="Back to the globe" aria-label="Back to the globe">${icon('globe')}</button><button class="osbtn" data-os="back" title="Back" aria-label="Back">${icon('back')}</button><button class="osbtn" data-os="forward" title="Forward" aria-label="Forward">${icon('forward')}</button></div>
   <div class="osaddress"><span class="osdot"></span><span>${esc(location.host||'gsn-media.studio')}</span><b id="osPath">/dashboard</b></div>
   <div class="osgroup"><button class="motion-switch" id="motionSwitch" role="switch" aria-checked="true" title="Animation and light: on"><span class="ms-track" aria-hidden="true"><i></i></span><span class="ms-label">Motion</span></button><button class="osbtn" data-os="reload" title="Refresh" aria-label="Refresh">${icon('reload')}</button><button class="osbtn" data-os="share" title="Copy link" aria-label="Copy link">${icon('share')}</button><button class="osbtn" data-os="new" title="New pack" aria-label="New pack">${icon('plus')}</button><button class="osbtn" data-nav="designs" title="My designs" aria-label="My designs">${icon('layers')}</button></div>
  </header>
  <aside class="rail glass-dark" aria-label="Studio navigation">${navItems.map(([id,ic,label])=>`<button data-nav="${id}" title="${label}" aria-label="${label}">${icon(ic)}</button>`).join('')}</aside>
  <main class="panel glass">
   <header class="panel-top">
    <a class="brand" href="#dashboard"><span class="brand-mark">g.</span><span class="brand-text"><b>GSN MEDIA</b><small>Social media studio</small></span></a>
    <label class="search">${icon('search')}<input id="search" type="search" placeholder="Search templates…" autocomplete="off" aria-label="Search templates"></label>
    <div class="pop-wrap"><button class="pill-btn" id="filterBtn" aria-haspopup="true" aria-expanded="false">Filter ${icon('chevron')}</button><div class="popover glass-strong" id="filterPop" hidden></div></div>
    <div class="pop-wrap"><button class="round-btn" id="bellBtn" aria-label="Notifications" aria-haspopup="true">${icon('bell')}<i class="badge" id="bellBadge" hidden></i></button><div class="popover glass-strong" id="bellPop" hidden></div></div>
    <div class="pop-wrap"><button class="user-btn" id="userBtn" aria-haspopup="true" aria-label="Account menu"><span class="user-avatar">${Team.initial()}</span>${icon('chevron')}</button><div class="popover glass-strong" id="userPop" hidden></div></div>
   </header>
   <div class="panel-scroll" id="view" tabindex="-1"></div>
  </main>
  <nav class="tabs glass" id="bottomTabs" aria-label="Filter"></nav>`;
  stage.addEventListener('click',onClick);
  $('#search').addEventListener('input',debounce(e=>{ui.query=e.target.value;ui.shown=12;if(!['dashboard','templates'].includes(ui.view)){location.hash='#templates'}else draw()},180));
  $('#filterBtn').addEventListener('click',()=>togglePop('filter'));$('#bellBtn').addEventListener('click',()=>togglePop('bell'));$('#userBtn').addEventListener('click',()=>togglePop('user'));
  document.addEventListener('click',e=>{if(!e.target.closest('.pop-wrap'))closePops()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePops();closeModal()}});
  Motion.init();Motion.watch();document.addEventListener('pointerdown',e=>{if(document.documentElement.dataset.motion==='off')return;const d=document.createElement('i');d.className='click-dot';d.style.left=e.clientX+'px';d.style.top=e.clientY+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),600)},{passive:true});$('#motionSwitch').addEventListener('click',()=>Motion.set(!Motion.on));
  ui.built=true;
 }
 const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};

 function closePops(){$$('.popover').forEach(p=>p.hidden=true);$$('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'))}
 function togglePop(kind){
  const pop=$('#'+kind+'Pop'),wasOpen=!pop.hidden;closePops();if(wasOpen)return;
  if(kind==='filter')pop.innerHTML=`<label>Format<select id="fFormat">${Library.formats().map(f=>`<option ${f===ui.format?'selected':''}>${esc(f)}</option>`).join('')}</select></label><label>Style<select id="fStyle">${Library.styles().map(f=>`<option ${f===ui.style?'selected':''}>${esc(f)}</option>`).join('')}</select></label><button class="btn-light" data-act="clearfilter">Clear filters</button>${Library.hiddenCount()?`<button class="btn-light" data-act="restore">Restore ${Library.hiddenCount()} removed templates</button>`:''}`;
  if(kind==='bell')pop.innerHTML=bellHtml();
  if(kind==='user')pop.innerHTML=Team.menuHtml()+`<button data-nav="dashboard">Dashboard</button><button data-nav="designs">My designs</button><button data-nav="team">Team and workspaces</button><button data-act="globe">Back to the globe</button>`+Team.signOutHtml();
  pop.hidden=false;$('#'+kind+'Btn').setAttribute('aria-expanded','true');
  if(kind==='filter'){$('#fFormat').onchange=e=>{ui.format=e.target.value;ui.shown=12;draw()};$('#fStyle').onchange=e=>{ui.style=e.target.value;ui.shown=12;draw()}}
 }
 function bellHtml(){
  const review=state.designs.filter(d=>d.status==='review');
  if(!review.length)return '<p class="pop-empty">Nothing is waiting for your review.</p>';
  return `<p class="pop-title">Waiting for your review</p>${review.map(d=>`<a href="#editor/${d.id}"><b>${esc(d.title)}</b><small>${esc(preset(d.platform)?.name||d.platform)} · ${ago(d.updated_at)}${d.updated_by==='agent'?' · by an agent':''}</small></a>`).join('')}`;
 }
 function refreshBell(){const n=state.designs.filter(d=>d.status==='review').length;const b=$('#bellBadge');b.hidden=!n;b.textContent=n}

 function onClick(e){
  const nav=e.target.closest('[data-nav]');if(nav){closePops();location.hash='#'+nav.dataset.nav;return}
  const os=e.target.closest('[data-os]');
  if(os){const a=os.dataset.os;
   if(a==='home'){location.hash='#home'}else if(a==='back')history.back();else if(a==='forward')history.forward();else if(a==='reload')draw(true);
   else if(a==='share'){navigator.clipboard?.writeText(location.href).then(()=>toast('Link copied.'),()=>toast('Copy the address from your browser.'))}
   else if(a==='new')openPackModal();return}
  const act=e.target.closest('[data-act]');
  if(act){const a=act.dataset.act;
   if(a==='newpack')openPackModal();
   else if(a==='globe'){closePops();location.hash='#home'}
   else if(a==='clearfilter'){ui.format='All';ui.style='All';ui.query='';$('#search').value='';closePops();draw()}
   else if(a==='more'){ui.shown+=12;draw()}
   else if(a==='restore'){Library.restoreAll();toast('Removed templates are back.');draw()}
   else if(a==='delete'){deleteDesign(act.dataset.id)}
   return}
  const hideBtn=e.target.closest('[data-hide]');
  if(hideBtn){e.stopPropagation();Library.hide(Number(hideBtn.dataset.hide));hideBtn.closest('.tcard').remove();const n=$('#libCount');if(n)n.textContent=Number(n.textContent)-1;const lead=$('#libCount')?.parentElement,g=Library.hiddenCount();if(lead){let r=lead.querySelector('[data-act=restore]');if(!r){r=document.createElement('button');r.className='linklike';r.dataset.act='restore';lead.append(' ',r)}r.textContent='Restore '+g+' removed'}toast('Removed from your library. You can restore it from the Filter menu or this page.');return}
  const chip=e.target.closest('[data-platform]');
  if(chip){state.platform=chip.dataset.platform;state.presetId=App.groupOf(state.platform).defaultPreset;try{localStorage.setItem('gsn-platform',state.platform)}catch{}draw();return}
  const use=e.target.closest('[data-use]');if(use){openPackModal(Number(use.dataset.use));return}
  const tab=e.target.closest('[data-tab]');if(tab){if(ui.view==='designs')ui.designTab=tab.dataset.tab;else if(ui.view==='schedule')ui.schedTab=tab.dataset.tab;else ui.tab=tab.dataset.tab;ui.shown=12;draw();return}
  const open=e.target.closest('[data-open]');if(open){location.hash='#editor/'+open.dataset.open;return}
 }

 const chipsHtml=()=>`<div class="chips" role="group" aria-label="Platform">${state.groups.map(g=>`<button class="chip" data-platform="${g.id}" aria-pressed="${g.id===state.platform}">${platformIcon(g.id==='trending'?'trend':g.id)}<span>${esc(g.name)}</span></button>`).join('')}</div>`;
 const curPreset=()=>preset(App.groupOf(state.platform)?.defaultPreset)||state.presets[0];

 function tabsFor(view){
  if(view==='dashboard')return [['Popular','Popular'],['Trending','Trending'],['Carousels','Carousels'],['Stories','Stories'],['Photo','Photo'],['3D agency','3D agency'],['Business metaphors','Metaphors'],['Photo layouts','Layouts'],['Monthly','Monthly'],['Comic','Comic'],['UGC','UGC · 200']];
  if(view==='templates')return [['All','All styles'],['Photo','Photo'],['3D agency','3D agency'],['Business metaphors','Metaphors'],['Photo layouts','Layouts'],['Monthly','Monthly'],['Comic','Comic']];
  if(view==='schedule')return [['Calendar','Calendar'],['Review',`Needs review${Schedule.needsReview().length?' ('+Schedule.needsReview().length+')':''}`],['Setup','Setup']];
  if(view==='designs')return [['All','All'],['draft','Draft'],['review','In review'],['approved','Approved']];
  return [];
 }
 function drawTabs(){
  const items=tabsFor(ui.view),el=$('#bottomTabs');el.hidden=!items.length;
  const active=ui.view==='dashboard'?(ui.style!=='All'?ui.style:ui.tab):ui.view==='designs'?ui.designTab:ui.view==='schedule'?(ui.schedTab||'Calendar'):ui.style;
  el.innerHTML=items.map(([id,label])=>`<button data-tab="${esc(id)}" class="${id===active?'on':''}">${esc(label)}</button>`).join('');
  if(ui.view==='dashboard')$$('[data-tab]',el).forEach(b=>b.addEventListener('click',e=>{const id=b.dataset.tab;if(id==='UGC'){e.stopImmediatePropagation();location.hash='#ugc';return}const base=['Popular','Trending','Carousels','Stories'].includes(id);ui.style=base?'All':id;if(!base)ui.tab='Popular'},{capture:true}));
  if(ui.view==='templates')$$('[data-tab]',el).forEach(b=>b.addEventListener('click',()=>{ui.style=b.dataset.tab},{capture:true}));
 }

 function dashboardHtml(){
  // Home shows a mix of every style. If the chosen tab leaves nothing (3D agency and Business metaphors are all carousels), show the style anyway and say so.
  let found=Library.filter({query:ui.query,format:ui.format,style:ui.style,tab:ui.tab}),note='';
  if(!found.length&&ui.tab!=='Popular'){found=Library.filter({query:ui.query,format:ui.format,style:ui.style});if(found.length)note=`None of these are in the ${ui.tab} tab, so all of them are shown.`}
  const list=ui.style==='All'?Library.mix(found,18):found.slice(0,18),p=curPreset();
  const agents=lead(GSNKit.agents);
  return `<div class="dash"><section class="hello"><h1>Hello, GSN Media</h1>${chipsHtml()}</section>
  <section class="hero-row">
   <article class="hero"><canvas class="hero-globe" aria-hidden="true"></canvas><h2>SOCIAL<br>MEDIA PACK</h2><p>One idea for every platform. Hook, write-up pages and a call to action, ready for your agents and your final say.</p><button class="btn-maroon" data-act="newpack">Start a pack</button></article>
   <article class="agents-card"><div class="sec-head"><h2>Your agents</h2><a href="#agents">See more ${icon('chevronRight')}</a></div>
    <div class="agents-grid">${agents.map(([name,role],i)=>`<a class="agent-row${name==='Mira'?' lead':''}" href="#agents">${agentAvatar(name,i)}<span><b>${esc(name)}</b><small>${esc(role)}</small></span>${icon('chevronRight','chev')}</a>`).join('')}</div></article>
  </section>
  <section class="tpass"><div class="sec-head"><h2>Templates</h2><a href="#templates">See more ${icon('chevronRight')}</a></div>
   ${note?`<p class="hint">${esc(note)}</p>`:''}${list.length?`<div class="marquee" id="tgrid" aria-label="Templates, scrolling"><div class="marquee-track" style="--n:${list.length}">${[...list,...list].map(t=>Library.cardHtml(t,p)).join('')}</div></div>`:'<p class="empty">No templates match. Clear the search or filters.</p>'}</section></div>`;
 }
 function ugcHtml(){return '<section class="hello"><h1>UGC collection</h1></section><iframe class="ugc-frame" src="/ugc/?embed=1" title="UGC collection, 200 single-page designs" loading="lazy"></iframe>'}
 const PAGE=24;
 function libraryHtml(){
  const all=Library.filter({query:ui.query,format:ui.format,style:ui.style}),list=all.slice(0,Math.max(ui.shown,PAGE)),p=curPreset(),gone=Library.hiddenCount();
  return `<section class="hello"><h1>Template library</h1>${chipsHtml()}<a class="btn-light" href="#ugc">UGC collection · 200 single-page designs</a></section>
  <p class="lead"><b id="libCount">${all.length}</b> templates. Every one starts with a Hook, continues with write-up pages and ends with a call to action. Showing the ${esc(p.name)} size (${p.w}×${p.h}). Scroll to see them all.${gone?` <button class="linklike" data-act="restore">Restore ${gone} removed</button>`:''}</p>
  ${list.length?`<div class="tgrid tgrid-wide" id="tgrid">${list.map(t=>Library.cardHtml(t,p,{removable:true})).join('')}</div>`:'<p class="empty">No templates match. Clear the search or filters.</p>'}
  <div class="more" id="libMore" ${all.length>list.length?'':'hidden'}>Loading more templates…</div>`;
 }
 let libObserver;
 // Infinite scroll: the library adds the next batch whenever the end of the list comes into view.
 function wireLibrary(){
  libObserver?.disconnect();
  const more=$('#libMore'),grid=$('#tgrid');if(!more||!grid)return;
  libObserver=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting))return;
   const all=Library.filter({query:ui.query,format:ui.format,style:ui.style}),have=$$('.tcard',grid).length;
   if(have>=all.length){more.hidden=true;return}
   const next=all.slice(have,have+PAGE),p=curPreset();
   grid.insertAdjacentHTML('beforeend',next.map(t=>Library.cardHtml(t,p,{removable:true})).join(''));
   Library.observeMore($$('.tcard',grid).slice(have));
   ui.shown=have+next.length;more.hidden=have+next.length>=all.length;
  },{root:$('#view'),rootMargin:'400px'});
  libObserver.observe(more);
 }
 function designsHtml(){
  let list=state.designs;if(ui.designTab!=='All')list=list.filter(d=>d.status===ui.designTab);
  const head=`<section class="hello"><h1>My designs</h1><button class="btn-maroon" data-act="newpack">New pack</button></section>`;
  if(!list.length)return head+`<p class="empty">${state.designs.length?'No designs with this status.':'You have no saved designs yet. Pick a template to start your first pack.'}</p>`;
  return head+`<div class="tgrid tgrid-wide" id="dgrid">${list.map(d=>`<article class="tcard dcard" data-design="${d.id}"><div class="tcard-media" data-open="${d.id}" role="button" tabindex="0" aria-label="Open ${esc(d.title)}"><div class="tpreview" data-dpreview="${d.id}"></div><span class="tcard-role status-${d.status}">${statusText[d.status]}</span></div>
   <h3 title="${esc(d.title)}">${esc(d.title)}</h3><p class="tsub">${esc(preset(d.platform)?.name||d.platform)} · ${d.pages} pages · ${ago(d.updated_at)}${d.updated_by==='agent'?' · agent':''}</p>
   <div class="tcard-foot"><button class="btn-dark" data-open="${d.id}">Open</button><button class="btn-light" data-act="delete" data-id="${d.id}" aria-label="Delete ${esc(d.title)}">${icon('trash')}</button></div></article>`).join('')}</div>`;
 }
 function agentsHtml(){
  return `<section class="hello"><h1>Agents</h1></section>
  <div class="agents-page">${lead(GSNKit.agents).map(([name,role,text],i)=>`<article class="agent-card${name==='Mira'?' lead':''}">${agentAvatar(name,i)}<div><h3>${esc(name)}</h3><small>${esc(role)}</small><p>${esc(text)}</p><p class="act-stat" data-stat="${esc(name)}">Loading activity…</p></div></article>`).join('')}</div>
  <section class="act-log"><div class="sec-head"><h2>What the agents did</h2></div><div id="actLog"><p class="act-empty">Loading…</p></div>
  <p class="act-note">These are the agents' own records: each one logs its name, the task, the AI model and the time. Nothing here is estimated.</p></section>`;
 }
 // Fills the Agents page from the activity the agents logged themselves.
 async function loadActivity(){
  const log=$('#actLog');if(!log)return;
  try{
   const r=await api('/activity?limit=40');
   $$('[data-stat]').forEach(n=>{const m=r.summary.find(x=>x.agent===n.dataset.stat);
    if(!m||!m.last_at){n.innerHTML='<b>No activity yet</b>';return}
    const models=Object.entries(m.models).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(k)} ×${v}`).join(', ');
    n.innerHTML=`<b>${m.done} done</b>${m.failed?` · ${m.failed} failed`:''} · last ${esc(ago(m.last_at))}<br><span>${esc(m.last_task)}${models?' · '+models:''}</span>`});
   log.innerHTML=r.activity.length?`<table class="act-table"><thead><tr><th>Agent</th><th>Task</th><th>AI model</th><th>Result</th><th>When</th></tr></thead><tbody>${r.activity.map(a=>`<tr><td>${esc(a.agent)}</td><td>${esc(a.task)}${a.detail?`<small>${esc(a.detail)}</small>`:''}</td><td>${esc(a.model||'–')}</td><td><span class="act-pill ${esc(a.status)}">${esc(a.status)}</span></td><td title="${esc(a.created_at)}">${esc(ago(a.created_at))}</td></tr>`).join('')}</tbody></table>`:'<p class="act-empty">No activity yet. When the agents work, each task appears here with the AI model used and the time.</p>';
  }catch(e){log.innerHTML=`<p class="act-empty">Could not load activity: ${esc(e.message)}</p>`;$$('[data-stat]').forEach(n=>n.textContent='')}
 }
 // Settings: the brand name, handle and voice every new design and every agent's writing starts from.
 function configHtml(){
  return `<section class="hello"><h1>Settings</h1></section>
  <section class="cfg"><div class="cfg-form"><h2>Brand and voice</h2>
   <p class="act-note">These flow into every new design, and the agents read them before they write, so the words always sound like your brand.</p>
   <label>Brand name<input id="cfgName" type="text" maxlength="80" autocomplete="off"></label>
   <label>Handle<input id="cfgHandle" type="text" maxlength="80" autocomplete="off" placeholder="@yourbrand"></label>
   <label>Brand voice<textarea id="cfgVoice" rows="5" maxlength="1200" placeholder="How should the agents write? Tone, words to use, words to avoid."></textarea></label>
   <label>Niche and audience<textarea id="cfgNiche" rows="2" maxlength="300" placeholder="What you post about, and who for."></textarea></label>
   <label>Style of posting<textarea id="cfgStyle" rows="2" maxlength="600" placeholder="e.g. Short carousels, direct, one idea per post."></textarea></label>
   <div class="cfg-colors"><h3>Brand colours</h3><p class="act-note">Every new design, from you or from the agents, starts in these colours. Leave the background or text colour off to keep each template's own.</p>
    <div class="cfg-crow"><label>Accent<input id="cfgAccent" type="color" value="#FA754E"></label>
     <label>Background<input id="cfgBg" type="color" value="#101323"><button type="button" class="btn-light" data-off="cfgBg">Template's own</button></label>
     <label>Text<input id="cfgInk" type="color" value="#f8faff"><button type="button" class="btn-light" data-off="cfgInk">Template's own</button></label></div>
    <label>My colour palette<span class="cfg-pal" id="cfgPal"></span></label><div class="cfg-crow"><input id="cfgPalNew" type="color" value="#1e6bff"><button type="button" class="btn-light" id="cfgPalAdd">Add to palette</button></div></div>
   <div class="cfg-actions"><button class="btn-dark" id="cfgSave" disabled>Save</button><span class="act-note" id="cfgMsg">Loading…</span></div></div>
   <div class="cfg-preview"><h2>Preview</h2><div class="cfg-page" id="cfgPage"></div><p class="act-note">This is how your brand name appears on a page.</p></div></section>`;
 }
 async function loadConfig(){
  const name=$('#cfgName');if(!name)return;
  const msg=$('#cfgMsg'),save=$('#cfgSave');
  let pal=[],bgOn=false,inkOn=false,state_cfg=null;
  const paintPal=()=>{pal=[...(state_cfg?.palette||pal)];const box=$('#cfgPal');if(box)box.innerHTML=pal.map((c,i)=>`<span class="cfg-sw" style="background:${c}" title="${c}"><button type="button" data-rm="${i}" aria-label="Remove ${c}">×</button></span>`).join('')||'<small>No colours yet.</small>'};
  const paint=()=>{try{const d=KitHost.starterDesign(3,'4 / 5');d.brand={name:name.value||'Your brand',handle:$('#cfgHandle').value||name.value||'Your brand'};KitHost.mount($('#cfgPage'),KitHost.pageHtml(d,0))}catch{}};
  try{
   const c=await api('/config');
   name.value=c.brand_name;$('#cfgHandle').value=c.handle;$('#cfgVoice').value=c.voice;$('#cfgNiche').value=c.niche||'';$('#cfgStyle').value=c.style||'';$('#cfgAccent').value=c.accent;state_cfg=c;paintPal();bgOn=!!c.background;inkOn=!!c.ink;if(c.background)$('#cfgBg').value=c.background;if(c.ink)$('#cfgInk').value=c.ink;
   msg.textContent=c.is_default?'Showing the defaults. Save to make them yours.':`Last saved ${ago(c.updated_at)} by ${c.updated_by||'a manager'}.`;save.disabled=false;paint();
   ['#cfgName','#cfgHandle'].forEach(i=>$(i).addEventListener('input',()=>{clearTimeout(paint.t);paint.t=setTimeout(paint,200)}));
   $('#cfgBg').oninput=()=>{bgOn=true};$('#cfgInk').oninput=()=>{inkOn=true};
   $$('[data-off]').forEach(b=>b.onclick=()=>{if(b.dataset.off==='cfgBg')bgOn=false;else inkOn=false;toast('Using the template\'s own colour. Save to apply.')});
   $('#cfgPalAdd').onclick=()=>{const c=$('#cfgPalNew').value.toLowerCase();if(!pal.includes(c)&&pal.length<12)pal.push(c);state_cfg={...state_cfg,palette:pal};paintPal()};
   $('#cfgPal').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){pal.splice(+b.dataset.rm,1);state_cfg={...state_cfg,palette:pal};paintPal()}};
   save.onclick=async()=>{save.disabled=true;try{const r=await api('/config',{method:'PUT',body:{brand_name:name.value,handle:$('#cfgHandle').value,voice:$('#cfgVoice').value,niche:$('#cfgNiche').value,style:$('#cfgStyle').value,accent:$('#cfgAccent').value,background:bgOn?$('#cfgBg').value:'',ink:inkOn?$('#cfgInk').value:'',palette:pal}});msg.textContent='Saved. New designs and the agents now use this.';toast('Brand settings saved.')}catch(e){msg.textContent=e.message;toast(e.message)}save.disabled=false};
  }catch(e){msg.textContent='Could not load settings: '+e.message}
 }
 function drawDesignPreviews(){
  const grid=$('#dgrid');if(!grid)return;
  const io=new IntersectionObserver(async entries=>{for(const e of entries){if(!e.isIntersecting)continue;io.unobserve(e.target);
   const host=e.target.querySelector('[data-dpreview]');try{const d=await api('/designs/'+host.dataset.dpreview);
    const [w,h]=d.ratio.split(' / ').map(Number);host.style.width=Math.min(100,(w/h)/.8*100)+'%';await KitHost.mount(host,KitHost.pageHtml(d,0))}catch{host.textContent=''}}},{rootMargin:'120px'});
  $$('.dcard',grid).forEach(c=>io.observe(c));
 }
 async function deleteDesign(id){
  const d=state.designs.find(x=>x.id===id);if(!d||!confirm(`Delete “${d.title}”? This cannot be undone.`))return;
  try{await api('/designs/'+id,{method:'DELETE'});state.designs=state.designs.filter(x=>x.id!==id);toast('Design deleted.');draw()}catch(e){toast(e.message)}
 }

 async function draw(refresh=false){
  if(!ui.built)build();
  Library.dispose();libObserver?.disconnect();
  if(refresh||ui.view==='designs'||ui.view==='agents'){try{await App.loadDesigns()}catch(e){toast(e.message)}}
  const view=$('#view');
  view.innerHTML=ui.view==='templates'?libraryHtml():ui.view==='designs'?designsHtml():ui.view==='agents'?agentsHtml():ui.view==='schedule'?Schedule.html(ui.schedTab||'Calendar'):ui.view==='team'?Team.html():ui.view==='settings'?configHtml():ui.view==='people'?People.html():ui.view==='ideas'?Ideas.html():ui.view==='ugc'?ugcHtml():dashboardHtml();
  $('#osPath').textContent='/'+ui.view;
  $$('.rail [data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===ui.view));
  document.title=`GSN Media · ${titles[ui.view]}`;
  drawTabs();refreshBell();const water=$('#stage .water');if(water)Water.start(water,{light:true,glass:true,sparse:false});
  const search=$('#search');if(search&&search.value!==ui.query)search.value=ui.query;
  const grid=$('#tgrid');if(ui.view==='templates'&&grid){Library.hydrate(grid,curPreset().ratio,$('#view'));wireLibrary()}else if(grid){const [rw,rh]=curPreset().ratio.split(' / ').map(Number);grid.style.setProperty('--ar',rw/rh);Library.hydrate(grid,curPreset().ratio)}
  if(ui.view==='designs')drawDesignPreviews();
  if(ui.view==='settings')loadConfig();
  if(ui.view==='agents')loadActivity();
  applyWorking();pollJobs();if(ui.view==='dashboard')HeroGlobe.mount($('.hero-globe'));
  if(ui.view==='people')People.mount($('#ppHost'));
  if(ui.view==='ideas')Ideas.mount($('#ideasHost'));
 }
 async function show(view){
  ui.view=view;ui.shown=12;
  try{const saved=localStorage.getItem('gsn-platform');if(saved&&App.groupOf(saved)&&!ui.restored){state.platform=saved;ui.restored=true}}catch{}
  if(!App.groupOf(state.platform))state.platform='instagram';
  if(!ui.built)build();
  try{if(!state.designs.length)await App.loadDesigns()}catch{}
  if(view==='schedule'){try{await Schedule.load()}catch(e){toast(e.message)}}
  if(view==='team'){try{await Team.load()}catch(e){toast(e.message)}}
  if(!ui.wired){Schedule.wire($('#view'));Team.wire($('#view'));ui.wired=true}
  await draw();$('#view').scrollTop=0;
 }

 // Create a post: ask for the idea; with no idea, propose one. The best-fitting template is chosen unless one was picked.
 function openPackModal(templateId=null){
  closeModal();
  let chosen=templateId,locked=templateId!=null,skip=[];
  const current=curPreset();
  const wrap=document.createElement('div');wrap.className='modal-back';wrap.id='packModal';
  wrap.innerHTML=`<form class="modal glass-strong" role="dialog" aria-modal="true" aria-labelledby="packTitle">
   <h2 id="packTitle">Create a post</h2>
   <p class="lead">Tell us your idea in a sentence or a few lines. No idea yet? Leave it empty and we will suggest one and build it for you.</p>
   <label class="field">Your idea<textarea id="packIdea" rows="3" maxlength="600" placeholder="For example: three ways a small bakery can win more local customers"></textarea></label>
   <div class="idea-tools"><button type="button" class="btn-light" data-m="surprise">Surprise me</button><span class="idea-tpl" id="packTpl"></span><button type="button" class="btn-light" data-m="shuffle" id="packShuffle">Try another template</button></div>
   <div class="preset-grid">${state.groups.map(g=>`<fieldset><legend>${platformIcon(g.id==='trending'?'trend':g.id)} ${esc(g.name)}</legend>${state.presets.filter(p=>p.platform===g.id).map(p=>`<label class="check"><input type="checkbox" name="preset" value="${p.id}" ${p.id===current.id?'checked':''}><span>${esc(p.name)}<small>${p.w}×${p.h}</small></span></label>`).join('')}</fieldset>`).join('')}</div>
   <div class="modal-actions"><button type="button" class="btn-light" data-m="all">Select all sizes</button><span class="spacer"></span><button type="button" class="btn-light" data-m="cancel">Cancel</button><button class="btn-maroon" type="submit">Create and open</button></div></form>`;
  document.body.appendChild(wrap);
  const form=wrap.firstElementChild,idea=$('#packIdea',form),label=$('#packTpl',form);
  const showTemplate=()=>{
   if(!locked)chosen=Composer.match(idea.value,skip);
   const t=GSNKit.templates[chosen];
   label.textContent=(locked?'Template: ':idea.value.trim()?'Best match: ':'Template picked for you: ')+Library.nameOf(t);
   $('#packShuffle',form).hidden=locked;
  };
  showTemplate();idea.focus();
  idea.addEventListener('input',debounce(()=>{skip=[];showTemplate()},250));
  wrap.addEventListener('mousedown',e=>{if(e.target===wrap)closeModal()});
  form.addEventListener('click',e=>{const m=e.target.closest('[data-m]')?.dataset.m;
   if(m==='cancel')closeModal();
   if(m==='all'){const boxes=$$('[name=preset]',form),all=boxes.every(b=>b.checked);boxes.forEach(b=>b.checked=!all)}
   if(m==='surprise'){const [h,b]=Composer.suggest();idea.value=`${h}. ${b}`;skip=[];showTemplate();idea.focus()}
   if(m==='shuffle'){skip.push(chosen);if(skip.length>20)skip=[chosen];showTemplate()}
  });
  form.addEventListener('submit',async e=>{e.preventDefault();
   const ids=$$('[name=preset]:checked',form).map(b=>b.value);if(!ids.length)return toast('Choose at least one platform size.');
   const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Building your post…';
   try{
    const text=idea.value.trim();
    // A template picked from the library keeps its own starter pages unless an idea was written.
    const plan=(text||!locked)?Composer.compose(text,chosen):null;
    const templateChosen=plan?plan.templateId:chosen;
    await App.createPack(templateChosen,ids,plan?plan.title:Library.nameOf(GSNKit.templates[chosen]),plan?{pages:plan.pages,notes:plan.idea}:{});
    closeModal();state.designs=[];
   }catch(error){toast(error.message,6000);button.disabled=false;button.textContent='Create and open'}
  });
 }
 function closeModal(){$('#packModal')?.remove()}

 return {show,draw,openPackModal,state:ui};
})();
