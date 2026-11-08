'use strict';
/* Ideas tab. Two ways in: "Your idea" (describe a topic) and "Generate ideas" (from the brand).
   The research agent (Lyra) answers with five; the creator picks, rejects or refines. Everything stays on the board. */
const Ideas=(()=>{
 const {esc,api,toast,ago}=App;
 const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
 const S={host:null,screen:'home',mode:null,id:null,filter:'all',requests:[],opts:null,cfg:null,poll:null,tick:null,busy:false};
 const fmt=o=>o?o.source==='measured'?`adds about ${o.seconds} seconds (measured from your recent runs)`:`adds roughly ${o.min}–${o.max} seconds (estimate until enough runs are timed)`:'';
 const stop=()=>{clearInterval(S.poll);clearInterval(S.tick);S.poll=S.tick=null};

 function html(){return '<section class="hello"><h1>Ideas</h1></section><div id="ideasHost" class="idea-host"><p class="act-note">Loading…</p></div>'}
 async function mount(host){
  stop();S.host=host;if(!host)return;
  try{[S.cfg,S.opts]=await Promise.all([api('/config'),api('/ideas/options')]);await refresh()}catch(e){host.innerHTML=`<p class="empty">${esc(e.message)}</p>`;return}
  const open=S.requests.find(r=>r.status==='pending'||r.status==='working');
  if(S.screen==='request'&&S.id)show('request',S.id);else show('home');void open;
 }
 async function refresh(){S.requests=(await api('/ideas/requests')).requests}
 function show(screen,x){stop();S.screen=screen;if(screen==='request')S.id=x;if(screen==='compose')S.mode=x;draw()}
 function draw(){
  if(!S.host||!S.host.isConnected)return stop();
  ({home:drawHome,compose:drawCompose,request:drawRequest})[S.screen]();
 }

 /* ---------- switches (shared by compose and refine) ---------- */
 function switches(){return `<div class="idea-switches">
  <label class="idea-sw"><input type="checkbox" id="swPerp"><span><b>Research with Perplexity</b><small>Looks up live web facts to make your ideas more accurate and current. Useful for fact-heavy topics. <em>${esc(fmt(S.opts?.perplexity))}.</em></small></span></label>
  <label class="idea-sw"><input type="checkbox" id="swSteroid"><span><b>Steroid mode</b><small>Adds stronger attention-grabbing writing and an extra self-review and rewrite to improve the ideas. <em>${esc(fmt(S.opts?.steroid))}.</em></small></span></label></div>`}
 const flags=()=>({perplexity:!!q('#swPerp')?.checked,steroid:!!q('#swSteroid')?.checked});

 /* ---------- home: the two doors and the board ---------- */
 function drawHome(){
  const all=S.requests.flatMap(r=>r.ideas.map(i=>({...i,rid:r.id,rmode:r.mode,rprompt:r.prompt,at:r.completed_at||r.created_at})));
  const count=s=>all.filter(i=>i.status===s).length;
  const open=S.requests.filter(r=>r.status==='pending'||r.status==='working');
  const list=S.filter==='all'?S.requests:S.requests.filter(r=>r.ideas.some(i=>i.status===S.filter));
  S.host.innerHTML=`<div class="idea-doors">
   <button class="idea-door" data-go="own"><span class="idea-door-n">1</span><b>Your idea</b><small>Describe the content you want. Lyra researches it and gives you 5 ideas on that topic.</small></button>
   <button class="idea-door alt" data-go="generate"><span class="idea-door-n">2</span><b>Generate ideas</b><small>No idea in mind? Lyra writes 5 that fit your brand, your niche and your voice.</small></button></div>
   ${open.length?`<div class="idea-open">${open.map(r=>`<button class="idea-chip" data-open="${r.id}">⏳ Lyra is working on “${esc(r.mode==='own'?r.prompt.slice(0,60):'ideas for your brand')}”</button>`).join('')}</div>`:''}
   <div class="idea-board"><div class="idea-tabs" role="tablist">${[['all','All requests',S.requests.length],['picked','Picked',count('picked')],['rejected','Rejected',count('rejected')],['new','Not decided',count('new')],['used','Used in a post',count('used')]].map(([k,l,n])=>`<button role="tab" aria-selected="${S.filter===k}" data-filter="${k}">${l} <i>${n}</i></button>`).join('')}</div>
   ${list.length?list.map(r=>`<button class="idea-row" data-open="${r.id}"><span class="idea-row-t">${esc(r.mode==='own'?r.prompt:'Ideas for your brand')}${r.parent_id?' <em>· refined</em>':''}</span><small>${r.status==='done'?r.ideas.length+' ideas':r.status} · ${esc(ago(r.created_at))}${r.perplexity?' · Perplexity':''}${r.steroid?' · Steroid':''}</small></button>`).join(''):`<p class="empty">${S.requests.length?'Nothing here yet.':'Every idea you generate is kept here, including the ones you reject, so you can come back and post them later.'}</p>`}</div>`;
  S.host.onclick=e=>{const g=e.target.closest('[data-go]');if(g)return show('compose',g.dataset.go);const o=e.target.closest('[data-open]');if(o)return show('request',o.dataset.open);const f=e.target.closest('[data-filter]');if(f){S.filter=f.dataset.filter;draw()}};
 }

 /* ---------- compose ---------- */
 function drawCompose(){
  const own=S.mode==='own',c=S.cfg,needBrand=!own&&!c.niche;
  S.host.innerHTML=`<button class="idea-back" data-back>← Back to Ideas</button><div class="idea-compose cfg-form">
   <h2>${own?'Your idea':'Generate ideas'}</h2>
   ${own?`<p class="act-note">Write whatever you want. Lyra researches it and gives you 5 ideas on the same topic.</p>
   <label>What kind of content do you want?<textarea id="ideaPrompt" rows="6" maxlength="2000" placeholder="e.g. Why small teams should keep a human in the loop when they automate customer replies"></textarea></label>`
   :`<p class="act-note">${needBrand?'First time here? Tell Lyra about your brand once, so she can come up with ideas without you having a topic in mind.':'Lyra will write 5 ideas that fit this brand. Change anything below and it is saved for next time.'}</p>
   <label>Your niche and audience<textarea id="ideaNiche" rows="3" maxlength="300" placeholder="e.g. AI automation for small agencies and their clients">${esc(c.niche||'')}</textarea></label>
   <label>Your voice and tone<textarea id="ideaVoice" rows="3" maxlength="1200">${esc(c.voice||'')}</textarea></label>
   <label>Style of posting you want<textarea id="ideaStyle" rows="3" maxlength="600" placeholder="e.g. Short carousels, direct, one idea per post">${esc(c.style||'')}</textarea></label>`}
   ${switches()}
   <div class="cfg-actions"><button class="btn-dark" id="ideaGo">${own?'Get 5 ideas':'Generate 5 ideas'}</button><span class="act-note" id="ideaMsg"></span></div></div>`;
  S.host.onclick=e=>{if(e.target.closest('[data-back]'))show('home')};
  q('#ideaGo').onclick=async()=>{
   const go=q('#ideaGo'),msg=q('#ideaMsg');go.disabled=true;msg.textContent='';
   try{
    let body={mode:S.mode,...flags()};
    if(own)body.prompt=q('#ideaPrompt').value;
    else{const niche=q('#ideaNiche').value.trim();if(!niche)throw new Error('Describe your niche first.');
     S.cfg=await api('/config',{method:'PUT',body:{niche,voice:q('#ideaVoice').value,style:q('#ideaStyle').value}})}
    const r=await api('/ideas/requests',{method:'POST',body});await refresh();show('request',r.id);
   }catch(e){msg.textContent=e.message;go.disabled=false}
  };
 }

 /* ---------- one request: waiting, results, refine ---------- */
 const cur=()=>S.requests.find(r=>r.id===S.id);
 function drawRequest(){
  const r=cur();if(!r){show('home');return}
  const head=`<button class="idea-back" data-back>← Back to Ideas</button><div class="idea-head"><h2>${esc(r.mode==='own'?r.prompt:'Ideas for your brand')}</h2><small>${r.parent_id?'Refined · ':''}${r.perplexity?'Perplexity · ':''}${r.steroid?'Steroid mode · ':''}${esc(ago(r.created_at))}</small></div>`;
  if(r.status==='pending'||r.status==='working'){
   S.host.innerHTML=head+`<div class="idea-wait"><div class="idea-dots"><i></i><i></i><i></i></div><b>${r.status==='pending'?'Waiting for Lyra to pick this up…':'Lyra is researching and writing…'}</b><small id="ideaClock"></small><p class="act-note">You can leave this page. The ideas will be on your board when they are ready.</p></div>`;
   S.host.onclick=e=>{if(e.target.closest('[data-back]'))show('home')};
   const t0=Date.parse(r.created_at),clock=()=>{const s=Math.max(0,Math.round((Date.now()-t0)/1000)),el=q('#ideaClock');if(el)el.textContent=`${s} seconds so far`};clock();S.tick=setInterval(clock,1000);
   S.poll=setInterval(async()=>{try{await refresh();const n=cur();if(!n||n.status!==r.status){draw()}}catch{}},4000);return;
  }
  if(r.status==='failed'){
   S.host.innerHTML=head+`<div class="idea-wait fail"><b>Lyra could not finish this one.</b><p class="act-note">${esc(r.error||'Unknown error.')}</p><div class="cfg-actions"><button class="btn-dark" data-retry>Try again</button></div></div>`;
   S.host.onclick=async e=>{if(e.target.closest('[data-back]'))return show('home');if(e.target.closest('[data-retry]')){try{const n=await api('/ideas/requests',{method:'POST',body:{parent_id:r.id,perplexity:r.perplexity,steroid:r.steroid}});await refresh();show('request',n.id)}catch(er){toast(er.message)}}};
   return;
  }
  S.host.innerHTML=head+`<div class="idea-grid">${r.ideas.map((i,n)=>`<article class="idea-card ${i.status}" data-n="${n}">
    <header><span class="idea-fmt">${esc(i.format||'idea')}</span><span class="idea-state">${{picked:'Picked',rejected:'Rejected',used:'Used in a post',new:''}[i.status]}</span></header>
    <h3>${esc(i.title)}</h3><p class="idea-hook">“${esc(i.hook)}”</p><p>${esc(i.angle)}</p>${i.why_it_works?`<p class="idea-why"><b>Why it works</b> ${esc(i.why_it_works)}</p>`:''}
    ${i.sources.length?`<p class="idea-src"><b>Sources</b> ${i.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join(' · ')}</p>`:''}
    ${i.review_note?`<p class="idea-note">Review note: ${esc(i.review_note)}</p>`:''}
    <footer><button class="btn-dark" data-mark="picked">${i.status==='picked'?'Picked ✓':'Pick this'}</button><button class="btn-light" data-mark="${i.status==='rejected'?'new':'rejected'}">${i.status==='rejected'?'Undo reject':'Reject'}</button><button class="btn-light" data-make>Make a post</button></footer></article>`).join('')}</div>
   <div class="idea-refine cfg-form"><h2>Not quite right?</h2><p class="act-note">Tell Lyra what to change. She will not repeat these five.</p>
    <label>What should change?<textarea id="ideaFb" rows="3" maxlength="600" placeholder="e.g. Bolder, less about tools, more about people"></textarea></label>${switches()}
    <div class="cfg-actions"><button class="btn-dark" id="ideaRefine">Refine ideas</button><span class="act-note" id="ideaMsg"></span></div></div>`;
  qa('#swPerp,#swSteroid').forEach(x=>x.checked=x.id==='swPerp'?r.perplexity:r.steroid);
  S.host.onclick=async e=>{
   if(e.target.closest('[data-back]'))return show('home');
   const card=e.target.closest('.idea-card'),n=card?Number(card.dataset.n):-1;
   const mk=e.target.closest('[data-mark]');
   if(mk&&card){try{const u=await api(`/ideas/requests/${r.id}/ideas/${n}`,{method:'PATCH',body:{status:mk.dataset.mark}});Object.assign(r,u);draw()}catch(er){toast(er.message)}return}
   if(e.target.closest('[data-make]')&&card){await makePost(r,n);return}
  };
  q('#ideaRefine').onclick=async()=>{const b=q('#ideaRefine'),m=q('#ideaMsg');b.disabled=true;m.textContent='';
   try{const x=await api('/ideas/requests',{method:'POST',body:{parent_id:r.id,feedback:q('#ideaFb').value,...flags()}});await refresh();show('request',x.id)}catch(er){m.textContent=er.message;b.disabled=false}};
 }

 /* Starts a design for the idea and opens it in the editor; the idea is marked as used and keeps the link. */
 async function makePost(r,n){
  if(S.busy)return;S.busy=true;const i=r.ideas[n];
  try{
   const d=await api('/designs',{method:'POST',body:{template_id:3,platform:'instagram-post',title:i.title.slice(0,80)}});
   await api(`/ideas/requests/${r.id}/ideas/${n}`,{method:'PATCH',body:{status:'used',design_id:d.id}});
   toast('Started a post from this idea.');location.hash='#editor/'+d.id;
  }catch(e){toast(e.message)}finally{S.busy=false}
 }
 return {html,mount,stop};
})();
