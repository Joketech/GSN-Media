'use strict';
/* Glass dashboard: shell, overview, template library, saved designs and agents. */
const Dashboard=(()=>{
 const {$,$$,esc,icon,platformIcon,api,toast,state,preset,ago}=App;
 const ui={view:'dashboard',query:'',format:'All',style:'All',tab:'Popular',designTab:'All',shown:12,built:false};
 // Agents are shown as living orbs with their initials, not as artwork.
 const agentTone={Mira:'#8b6cf0',Seline:'#ef6f9a',Spectra:'#1fb5c4',Lyra:'#f0a339',Flux:'#4b8df0',Relay:'#2fb98a'};
 const initials=name=>name.slice(0,2).toUpperCase();
 const agentAvatar=(name,i=0)=>`<span class="orb" style="--tone:${agentTone[name]||'#ddd'};--d:${(i*-.7).toFixed(1)}s" aria-hidden="true"><i class="orb-ring"></i><i class="orb-ring r2"></i><i class="orb-dot"></i><b>${initials(name)}</b></span>`;
 const navItems=[['dashboard','home','Home'],['templates','templates','Templates'],['designs','designs','My designs'],['schedule','calendar','Schedule'],['agents','agents','Agents']];
 const titles={dashboard:'Dashboard',templates:'Templates',designs:'My designs',agents:'Agents',schedule:'Schedule'};
 const statusText={draft:'Draft',review:'In review',approved:'Approved'};

 function build(){
  const stage=$('#stage');
  stage.innerHTML=`<div class="stage-bg" aria-hidden="true"></div><canvas class="water" aria-hidden="true"></canvas>
  <header class="osbar glass" aria-label="Studio address bar">
   <div class="osgroup"><button class="osbtn" data-os="home" title="Back to the globe" aria-label="Back to the globe">${icon('globe')}</button><button class="osbtn" data-os="back" title="Back" aria-label="Back">${icon('back')}</button><button class="osbtn" data-os="forward" title="Forward" aria-label="Forward">${icon('forward')}</button></div>
   <div class="osaddress"><span class="osdot"></span><span>${esc(location.host||'gsn-media.studio')}</span><b id="osPath">/dashboard</b></div>
   <div class="osgroup"><button class="osbtn" data-os="reload" title="Refresh" aria-label="Refresh">${icon('reload')}</button><button class="osbtn" data-os="share" title="Copy link" aria-label="Copy link">${icon('share')}</button><button class="osbtn" data-os="new" title="New pack" aria-label="New pack">${icon('plus')}</button><button class="osbtn" data-nav="designs" title="My designs" aria-label="My designs">${icon('layers')}</button></div>
  </header>
  <aside class="rail glass-dark" aria-label="Studio navigation">${navItems.map(([id,ic,label])=>`<button data-nav="${id}" title="${label}" aria-label="${label}">${icon(ic)}</button>`).join('')}</aside>
  <main class="panel glass">
   <header class="panel-top">
    <a class="brand" href="#dashboard"><span class="brand-mark">g.</span><span class="brand-text"><b>GSN MEDIA</b><small>Social media studio</small></span></a>
    <label class="search">${icon('search')}<input id="search" type="search" placeholder="Search templates…" autocomplete="off" aria-label="Search templates"></label>
    <div class="pop-wrap"><button class="pill-btn" id="filterBtn" aria-haspopup="true" aria-expanded="false">Filter ${icon('chevron')}</button><div class="popover glass-strong" id="filterPop" hidden></div></div>
    <div class="pop-wrap"><button class="round-btn" id="bellBtn" aria-label="Notifications" aria-haspopup="true">${icon('bell')}<i class="badge" id="bellBadge" hidden></i></button><div class="popover glass-strong" id="bellPop" hidden></div></div>
    <div class="pop-wrap"><button class="user-btn" id="userBtn" aria-haspopup="true" aria-label="Account menu"><span class="user-avatar">g</span>${icon('chevron')}</button><div class="popover glass-strong" id="userPop" hidden></div></div>
   </header>
   <div class="panel-scroll" id="view" tabindex="-1"></div>
  </main>
  <nav class="tabs glass" id="bottomTabs" aria-label="Filter"></nav>`;
  stage.addEventListener('click',onClick);
  $('#search').addEventListener('input',debounce(e=>{ui.query=e.target.value;ui.shown=12;if(!['dashboard','templates'].includes(ui.view)){location.hash='#templates'}else draw()},180));
  $('#filterBtn').addEventListener('click',()=>togglePop('filter'));$('#bellBtn').addEventListener('click',()=>togglePop('bell'));$('#userBtn').addEventListener('click',()=>togglePop('user'));
  document.addEventListener('click',e=>{if(!e.target.closest('.pop-wrap'))closePops()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePops();closeModal()}});
  ui.built=true;
 }
 const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};

 function closePops(){$$('.popover').forEach(p=>p.hidden=true);$$('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'))}
 function togglePop(kind){
  const pop=$('#'+kind+'Pop'),wasOpen=!pop.hidden;closePops();if(wasOpen)return;
  if(kind==='filter')pop.innerHTML=`<label>Format<select id="fFormat">${Library.formats().map(f=>`<option ${f===ui.format?'selected':''}>${esc(f)}</option>`).join('')}</select></label><label>Style<select id="fStyle">${Library.styles().map(f=>`<option ${f===ui.style?'selected':''}>${esc(f)}</option>`).join('')}</select></label><button class="btn-light" data-act="clearfilter">Clear filters</button>${Library.hiddenCount()?`<button class="btn-light" data-act="restore">Restore ${Library.hiddenCount()} removed templates</button>`:''}`;
  if(kind==='bell')pop.innerHTML=bellHtml();
  if(kind==='user')pop.innerHTML=`<button data-nav="dashboard">Dashboard</button><button data-nav="designs">My designs</button><button data-act="globe">Back to the globe</button>`;
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
  if(view==='dashboard')return [['Popular','Popular'],['Trending','Trending'],['Carousels','Carousels'],['Stories','Stories']];
  if(view==='templates')return [['All','All styles'],['Photo','Photo'],['3D agency','3D agency'],['Business metaphors','Metaphors']];
  if(view==='schedule')return [['Calendar','Calendar'],['Review',`Needs review${Schedule.needsReview().length?' ('+Schedule.needsReview().length+')':''}`],['Setup','Setup']];
  if(view==='designs')return [['All','All'],['draft','Draft'],['review','In review'],['approved','Approved']];
  return [];
 }
 function drawTabs(){
  const items=tabsFor(ui.view),el=$('#bottomTabs');el.hidden=!items.length;
  const active=ui.view==='dashboard'?ui.tab:ui.view==='designs'?ui.designTab:ui.view==='schedule'?(ui.schedTab||'Calendar'):ui.style;
  el.innerHTML=items.map(([id,label])=>`<button data-tab="${esc(id)}" class="${id===active?'on':''}">${esc(label)}</button>`).join('');
  if(ui.view==='templates')$$('[data-tab]',el).forEach(b=>b.addEventListener('click',()=>{ui.style=b.dataset.tab},{capture:true}));
 }

 function dashboardHtml(){
  const list=Library.filter({query:ui.query,format:ui.format,style:ui.style,tab:ui.tab}).slice(0,14),p=curPreset();
  const agents=GSNKit.agents;
  return `<div class="dash"><section class="hello"><h1>Hello, GSN Media</h1>${chipsHtml()}</section>
  <section class="hero-row">
   <article class="hero"><span class="hero-tag">Today’s pack</span><h2>SOCIAL<br>MEDIA PACK</h2><p>One idea for every platform. Hook, write-up pages and a call to action, ready for your agents and your final say.</p><button class="btn-maroon" data-act="newpack">Start a pack</button></article>
   <article class="agents-card"><div class="sec-head"><h2>Your agents</h2><a href="#agents">See more ${icon('chevronRight')}</a></div>
    <div class="agents-grid">${agents.map(([name,role],i)=>`<a class="agent-row" href="#agents">${agentAvatar(name,i)}<span><b>${esc(name)}</b><small>${esc(role)}</small></span>${icon('chevronRight','chev')}</a>`).join('')}</div></article>
  </section>
  <section class="tpass"><div class="sec-head"><h2>Templates</h2><a href="#templates">See more ${icon('chevronRight')}</a></div>
   ${list.length?`<div class="marquee" id="tgrid" aria-label="Templates, scrolling"><div class="marquee-track" style="--n:${list.length}">${[...list,...list].map(t=>Library.cardHtml(t,p)).join('')}</div></div>`:'<p class="empty">No templates match. Clear the search or filters.</p>'}</section></div>`;
 }
 const PAGE=24;
 function libraryHtml(){
  const all=Library.filter({query:ui.query,format:ui.format,style:ui.style}),list=all.slice(0,Math.max(ui.shown,PAGE)),p=curPreset(),gone=Library.hiddenCount();
  return `<section class="hello"><h1>Template library</h1>${chipsHtml()}</section>
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
  <div class="agents-page">${GSNKit.agents.map(([name,role,text],i)=>`<article class="agent-card">${agentAvatar(name,i)}<div><h3>${esc(name)}</h3><small>${esc(role)}</small><p>${esc(text)}</p></div></article>`).join('')}</div>`;
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
  view.innerHTML=ui.view==='templates'?libraryHtml():ui.view==='designs'?designsHtml():ui.view==='agents'?agentsHtml():ui.view==='schedule'?Schedule.html(ui.schedTab||'Calendar'):dashboardHtml();
  $('#osPath').textContent='/'+ui.view;
  $$('.rail [data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===ui.view));
  document.title=`GSN Media · ${titles[ui.view]}`;
  drawTabs();refreshBell();const water=$('#stage .water');if(water)Water.start(water,{light:true,glass:true});
  const search=$('#search');if(search&&search.value!==ui.query)search.value=ui.query;
  const grid=$('#tgrid');if(ui.view==='templates'&&grid){Library.hydrate(grid,curPreset().ratio,$('#view'));wireLibrary()}else if(grid){const [rw,rh]=curPreset().ratio.split(' / ').map(Number);grid.style.setProperty('--ar',rw/rh);Library.hydrate(grid,curPreset().ratio)}
  if(ui.view==='designs')drawDesignPreviews();
 }
 async function show(view){
  ui.view=view;ui.shown=12;
  try{const saved=localStorage.getItem('gsn-platform');if(saved&&App.groupOf(saved)&&!ui.restored){state.platform=saved;ui.restored=true}}catch{}
  if(!App.groupOf(state.platform))state.platform='instagram';
  if(!ui.built)build();
  try{if(!state.designs.length)await App.loadDesigns()}catch{}
  if(view==='schedule'){try{await Schedule.load()}catch(e){toast(e.message)}}
  if(!ui.wired){Schedule.wire($('#view'));ui.wired=true}
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
