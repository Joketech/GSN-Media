'use strict';
/* GSN design editor. Canva's workflow (pages strip, click to select, drag/resize/rotate, contextual toolbar, tools that
   slide out only when asked for), applied to GSN's own templates. Every change is saved to the server with a revision,
   so a person and a Hermes agent can work on the same design. */
const Editor=(()=>{
 const {$,$$,esc,icon,api,toast,state:app,preset,platformIcon}=App;
 const COPY={title:'Headline',body:'Write-up',kicker:'Label',brandText:'Brand line',footerText:'Footer'};
 const TOOLS=[['templates','templates','Templates'],['elements','shapes','Elements'],['text','text','Text'],['uploads','upload','Uploads'],['brand','brand','Brand'],['pages','list','Page content'],['resize','grid','Resize']];
 const DEFAULT_ORDER=['artwork','brandText','kicker','title','body','footerText'];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const round=v=>Math.round(v*100)/100;
 let design=null,page=0,sel=null,multi=[],zoom=1,tool=null,dockOpen=false,editing=false,undo=[],redo=[],saveTimer=0,polling=0,saving=false,dirty=false,conflict=false,thumbTimer=0,uploads=[],raf=0,lastCoalesce='',lastCoalesceAt=0,drag=null,spaceKey='';
 let el={};
 const slide=()=>design.pages[page];
 const role=i=>i===0?'Hook':i===design.pages.length-1?'CTA':`Page ${i+1}`;

 /* ---------- loading and saving ---------- */
 let opening=0;
 async function open(id){
  if(design?.id===id&&el.root?.isConnected)return;
  close();
  const ticket=++opening;
  const d=await api('/designs/'+id);
  await KitHost.sheet();
  if(ticket!==opening)return;
  design=d;page=0;sel=null;undo=[];redo=[];dirty=false;conflict=false;tool=null;dockOpen=false;
  build();render();thumbs();fit();
  polling=setInterval(poll,8000);
 }
 function close(){
  opening++;
  clearInterval(polling);clearTimeout(saveTimer);
  if(design&&dirty&&!conflict)save(true);
  document.removeEventListener('keydown',onKey);window.removeEventListener('resize',fit);
  design=null;const root=$('#editorRoot');if(root)root.innerHTML='';el={};
 }
 const snapshot=()=>JSON.stringify({pages:design.pages,template_id:design.template_id,brand:design.brand});
 function commit(mutate,key=''){
  const now=Date.now();
  if(!(key&&key===lastCoalesce&&now-lastCoalesceAt<900)){undo.push(snapshot());if(undo.length>80)undo.shift();redo=[]}
  lastCoalesce=key;lastCoalesceAt=now;
  mutate();
  if(design.status==='approved')design.status='draft';
  markDirty();render({thumbs:[page]});
 }
 function markDirty(){dirty=true;setSaveState('Unsaved changes');clearTimeout(saveTimer);saveTimer=setTimeout(()=>save(),900)}
 function setSaveState(text,bad=false){if(el.save){el.save.textContent=text;el.save.classList.toggle('bad',bad)}}
 async function save(quiet=false){
  if(!design||saving||conflict||!dirty)return;
  saving=true;dirty=false;setSaveState('Saving…');
  const {title,platform,template_id,brand,status,notes,pages,revision}=design;
  try{
   const r=await api('/designs/'+design.id,{method:'PUT',body:{title,platform,template_id,brand,status,...(notes?{notes}:{}),pages,revision}});
   design.revision=r.revision;design.updated_at=r.updated_at;design.updated_by=r.updated_by;
   setSaveState(dirty?'Unsaved changes':'Saved to server');
  }catch(e){
   dirty=true;
   if(e.status===409){conflict=true;showConflict()}else{setSaveState('Not saved. Retrying…',true);if(!quiet)saveTimer=setTimeout(()=>{saving=false;save()},4000)}
  }finally{saving=false}
  if(dirty&&!conflict&&!saveTimer)markDirty();
 }
 function showConflict(){
  setSaveState('Changed elsewhere',true);
  el.banner.hidden=false;
  el.banner.innerHTML=`<span>An agent or another person saved a newer version of this design.</span><button class="btn-light" data-act="theirs">Load their version</button><button class="btn-maroon" data-act="mine">Keep my edits</button>`;
 }
 async function resolveConflict(keepMine){
  const latest=await api('/designs/'+design.id);
  if(keepMine){design.revision=latest.revision;conflict=false;el.banner.hidden=true;dirty=true;save()}
  else{design=latest;conflict=false;dirty=false;undo=[];redo=[];sel=null;page=Math.min(page,design.pages.length-1);el.banner.hidden=true;fullRefresh();setSaveState('Loaded latest')}
 }
 async function poll(){
  if(!design||editing||drag||saving)return;
  try{
   const latest=await api('/designs/'+design.id);
   if(latest.revision>design.revision){
    if(dirty){conflict=true;showConflict();return}
    design=latest;page=Math.min(page,design.pages.length-1);sel=null;fullRefresh();
    toast(latest.updated_by==='agent'?'An agent just updated this design.':'This design was updated.');
   }
  }catch{}
 }

 /* ---------- layout ---------- */
 function build(){
  const root=$('#editorRoot');
  root.innerHTML=`<div class="ed">
  <header class="ed-top">
   <button class="ed-icon" data-act="back" title="Back to designs" aria-label="Back to designs">${icon('back')}</button>
   <input class="ed-title" id="edTitle" maxlength="100" aria-label="Design name" value="${esc(design.title)}">
   <span class="ed-chip" id="edSize"></span>
   <nav class="ed-pack" id="edPack" aria-label="Sizes in this pack"></nav>
   <span class="spacer"></span>
   <span class="ed-save" id="edSave" role="status"></span>
   <button class="ed-icon" data-act="undo" id="edUndo" title="Undo (Ctrl+Z)" aria-label="Undo">${icon('undo')}</button>
   <button class="ed-icon" data-act="redo" id="edRedo" title="Redo (Ctrl+Y)" aria-label="Redo">${icon('redo')}</button>
   <select id="edStatus" aria-label="Status"><option value="draft">Draft</option><option value="review">Ready for review</option><option value="approved">Approved</option></select>
   <button class="ed-icon" data-act="present" title="Present" aria-label="Present">${icon('play')}</button>
   <button class="btn-maroon" data-act="download">${icon('download')}Download</button>
  </header>
  <div class="ed-banner" id="edBanner" hidden></div>
  <aside class="ed-dock" id="edDock"><button class="ed-plus" data-act="dock" aria-label="Show tools" aria-expanded="false" title="Tools">${icon('plus')}</button><div class="ed-tools" id="edTools">${TOOLS.map(([id,ic,label])=>`<button data-tool="${id}" title="${label}" aria-label="${label}">${icon(ic)}<span>${label}</span></button>`).join('')}</div></aside>
  <section class="ed-flyout" id="edFly" hidden></section>
  <main class="ed-area" id="edArea"><div class="ed-stagewrap" id="edWrap"><div class="ed-page" id="edPage"><div class="ed-host" id="edHost"></div><div class="ed-over" id="edOver"></div></div></div><div class="ed-bar" id="edBar" hidden></div>
</main>
  <div class="ed-zoom"><button data-act="zoomout" aria-label="Zoom out">−</button><button data-act="zoomfit" id="edZoomLabel">Fit</button><button data-act="zoomin" aria-label="Zoom in">+</button></div>
  <footer class="ed-strip"><div class="ed-pages" id="edPages"></div></footer>
  <div class="ed-modal" id="edModal" hidden></div>
  </div>`;
  el={root:root.firstElementChild,page:$('#edPage'),host:$('#edHost'),over:$('#edOver'),bar:$('#edBar'),area:$('#edArea'),wrap:$('#edWrap'),fly:$('#edFly'),dock:$('#edDock'),strip:$('#edPages'),save:$('#edSave'),banner:$('#edBanner'),title:$('#edTitle'),status:$('#edStatus'),modal:$('#edModal')};
  el.status.value=design.status;
  el.title.oninput=()=>{design.title=el.title.value.trim()||'Untitled design';markDirty()};
  el.status.onchange=()=>{design.status=el.status.value;dirty=true;markDirty();if(design.status==='review')toast('Sent for review. It now shows under the bell on the dashboard.')};
  root.onclick=onClick;
  if(window.ResizeObserver){new ResizeObserver(()=>fit()).observe(el.area)}
  el.over.addEventListener('pointerdown',onDown);el.over.addEventListener('pointermove',onHover);el.over.addEventListener('dblclick',onDouble);
  el.area.addEventListener('pointerdown',e=>{if(e.target===el.area||e.target===el.wrap){select(null)}});
  el.area.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.1:.9))}},{passive:false});
  document.addEventListener('keydown',onKey);window.addEventListener('resize',fit);
  setSaveState('Saved to server');
 }
 function fullRefresh(){el.title.value=design.title;el.status.value=design.status;render();thumbs();if(tool)openTool(tool)}

 // Fit the page inside the work area, like Canva's "fit" zoom.
 function fit(){
  if(!el.area||!design)return;
  const [w,h]=design.ratio.split(' / ').map(Number),aw=el.area.clientWidth-80,ah=el.area.clientHeight-100;
  const width=Math.max(120,Math.min(aw,ah*w/h))*zoom;
  el.page.style.width=width+'px';el.page.style.height=(width*h/w)+'px';
  el.wrap.classList.toggle('zoomed',zoom>1.01);
  $('#edZoomLabel').textContent=zoom===1?'Fit':Math.round(zoom*100)+'%';
  drawOverlay();
 }
 function setZoom(z){zoom=clamp(round(z),.4,3);fit()}

 /* ---------- rendering ---------- */
 function render(opts={}){
  if(!design||editing)return;
  if(!el.host)return;
  KitHost.mount(el.host,KitHost.pageHtml(design,page));
  el.size ||= $('#edSize');
  $('#edSize').textContent=`${preset(design.platform)?.name||design.platform} · ${design.size.w}×${design.size.h}`;
  $('#edUndo').disabled=!undo.length;$('#edRedo').disabled=!redo.length;
  const sibs=app.designs.filter(d=>d.pack_id&&d.pack_id===design.pack_id&&d.id!==design.id);
  $('#edPack').innerHTML=sibs.map(d=>`<button class="ed-chip link" data-open="${d.id}" title="Open ${esc(preset(d.platform)?.name||d.platform)}">${esc(preset(d.platform)?.name||d.platform)}</button>`).join('');
  fit();
  if(opts.thumbs){queueThumbs(opts.thumbs)}
 }
 function nodeFor(s=sel){
  const root=el.host.shadowRoot;if(!root||!s)return null;
  const q=s.t==='copy'?`[data-canvas-copy="${s.k}"]`:s.t==='text'?`[data-canvas-text="${s.i}"]`:s.t==='element'?`[data-canvas-element="${s.i}"]`:'.campaign-visual';
  return root.querySelector(q);
 }
 const pageBox=()=>el.page.getBoundingClientRect();
 const members=()=>multi.length>1?multi:(sel?[sel]:[]);
 const selOf=k=>k.startsWith('text:')?{t:'text',i:+k.slice(5)}:k.startsWith('element:')?{t:'element',i:+k.slice(8)}:k==='artwork'?{t:'art'}:{t:'copy',k};
 const groupFor=k=>(slide().groups||[]).find(g=>g.includes(k));
 function drawOverlay(){
  el.over.innerHTML='';el.bar.hidden=!sel;
  if(!sel||editing)return;
  const pb=pageBox(),ms=members();
  if(ms.length>1){
   const rects=ms.map(m=>nodeFor(m)?.getBoundingClientRect()).filter(Boolean);
   if(!rects.length){sel=null;multi=[];el.bar.hidden=true;return}
   for(const r of rects){const b=document.createElement('div');b.className='ed-sel multi';Object.assign(b.style,{left:(r.left-pb.left)+'px',top:(r.top-pb.top)+'px',width:r.width+'px',height:r.height+'px'});el.over.appendChild(b)}
   const u={left:Math.min(...rects.map(r=>r.left)),top:Math.min(...rects.map(r=>r.top)),right:Math.max(...rects.map(r=>r.right)),bottom:Math.max(...rects.map(r=>r.bottom))};
   const box=document.createElement('div');box.className='ed-sel';Object.assign(box.style,{left:(u.left-pb.left)+'px',top:(u.top-pb.top)+'px',width:(u.right-u.left)+'px',height:(u.bottom-u.top)+'px'});el.over.appendChild(box);
   const ur={left:u.left,top:u.top,right:u.right,bottom:u.bottom,width:u.right-u.left,height:u.bottom-u.top};
   positionBar(ur,pb);drawBar();return;
  }
  let node=nodeFor();
  if(!node){sel=null;el.bar.hidden=true;return}
  const r=node.getBoundingClientRect();
  const box=document.createElement('div');box.className='ed-sel';
  Object.assign(box.style,{left:(r.left-pb.left)+'px',top:(r.top-pb.top)+'px',width:r.width+'px',height:r.height+'px'});
  const side=sel.t==='copy'||sel.t==='text'?'<i class="h e" data-h="width"></i><i class="h rot" data-h="rotate"></i>':'<i class="h e" data-h="sx"></i><i class="h s" data-h="sy"></i>';
  box.innerHTML=`<i class="h se" data-h="scale"></i>${side}`;
  el.over.appendChild(box);
  positionBar(r,pb);drawBar();
 }
 function positionBar(r,pb){
  const ar=el.area.getBoundingClientRect(),bar=el.bar;
  bar.style.visibility='hidden';bar.hidden=false;
  const bw=bar.offsetWidth,bh=bar.offsetHeight;
  let x=r.left+r.width/2-ar.left-bw/2,y=r.top-ar.top-bh-14;
  if(y<8)y=r.bottom-ar.top+14;
  x=clamp(x,8,ar.width-bw-8);y=clamp(y,8,ar.height-bh-8);x+=el.area.scrollLeft;y+=el.area.scrollTop;
  bar.style.left=x+'px';bar.style.top=y+'px';bar.style.visibility='';
 }

 /* ---------- selection and pointer editing ---------- */
 function select(s){
  sel=s;multi=[];
  // Picking one member of a group picks the whole group.
  const g=s&&groupFor(layerKey(s));if(g&&g.length>1)multi=g.map(selOf);
  drawOverlay();if(tool==='pages')openTool('pages');
 }
 function hit(x,y){
  const root=el.host.shadowRoot;if(!root)return null;
  for(const n of root.elementsFromPoint(x,y)){
   if(n.dataset?.canvasText!==undefined)return {t:'text',i:+n.dataset.canvasText};
   if(n.dataset?.canvasElement!==undefined)return {t:'element',i:+n.dataset.canvasElement};
   if(n.dataset?.canvasCopy)return {t:'copy',k:n.dataset.canvasCopy};
   if(n.closest?.('.campaign-visual')&&(n.matches('img,.campaign-photo,.campaign-upload,svg,svg *,[class*=photo]')))return {t:'art'};
  }
  // The artwork is decorative (pointer-events:none in the template), so test its box directly.
  const v=root.querySelector('.campaign-visual');
  if(v){const r=(v.firstElementChild||v).getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return {t:'art'}}
  return null;
 }
 function onHover(e){
  if(drag)return;
  const h=hit(e.clientX,e.clientY);
  el.over.style.cursor=h?'move':'default';
 }
 const sameSel=(a,b)=>a&&b&&a.t===b.t&&a.k===b.k&&a.i===b.i;
 function onDown(e){
  if(e.button!==0||editing)return;
  const handle=e.target.dataset?.h;
  let target=handle?sel:hit(e.clientX,e.clientY);
  if(!target){select(null);return}
  // Shift or Ctrl click adds or removes an item, so several can be moved, grouped or deleted together.
  if(!handle&&(e.shiftKey||e.ctrlKey||e.metaKey)){
   const k=layerKey(target);let cur=members();
   cur=cur.some(m=>layerKey(m)===k)?cur.filter(m=>layerKey(m)!==k):[...cur,target];
   multi=cur.length>1?cur:[];sel=cur[cur.length-1]||null;drawOverlay();return;
  }
  if(!handle&&!(multi.length>1&&multi.some(m=>sameSel(m,target)))&&!sameSel(target,sel))select(target);
  else if(!handle&&!multi.length&&groupFor(layerKey(target))&&!sameSel(target,sel))select(target);
  const node=nodeFor();if(!node)return;
  e.preventDefault();el.over.setPointerCapture(e.pointerId);
  const pb=pageBox(),r=node.getBoundingClientRect(),s=slide();
  const W=pb.width,H=pb.height,cx=r.left+r.width/2,cy=r.top+r.height/2;
  const base=JSON.parse(JSON.stringify(s));
  const layer=sel.t==='copy'?(s.textLayers?.[sel.k]||{}):sel.t==='text'?s.texts[sel.i]:{};
  const fontPx=parseFloat(getComputedStyle(node).fontSize)||0;
  const start={x:e.clientX,y:e.clientY,W,H,cx,cy,r,mode:handle||'move',size:fontPx/W*100,
   dist:Math.hypot(e.clientX-cx,e.clientY-cy)||1,width:r.width/W*100,angle:Math.atan2(e.clientY-cy,e.clientX-cx),rot:layer.rotation||0,moved:false,
   pos:sel.t==='element'?(s.elementPositions?.[sel.i]||{x:(cx-pb.left)/W*100,y:(cy-pb.top)/H*100}):null,
   frameW:node.closest?.('.campaign-visual')?.getBoundingClientRect().width||r.width,frameH:node.closest?.('.campaign-visual')?.getBoundingClientRect().height||r.height,
   elSize:s.elementSizes?.[sel.i]||100,art:s.artScale||100,
   sx:s.elementStretchX?.[sel.i]||100,sy:s.elementStretchY?.[sel.i]||100,asx:s.artStretchX||100,asy:s.artStretchY||100,
   centers:(s.elements||[]).map((_,i)=>s.elementPositions?.[i]||elementCenter(i)),
   frames:Object.fromEntries(members().map(m=>{const n=nodeFor(m),f=n?.closest?.('.campaign-visual')?.getBoundingClientRect()||n?.getBoundingClientRect();return [layerKey(m),{w:f?.width||1,h:f?.height||1}]}))};
  undo.push(snapshot());if(undo.length>80)undo.shift();redo=[];
  drag={start,base,pending:null};
  el.over.onpointermove=ev=>{
   const dx=ev.clientX-start.x,dy=ev.clientY-start.y;
   if(!start.moved&&Math.hypot(dx,dy)<3)return;start.moved=true;
   drag.pending={ev,dx,dy,shift:ev.shiftKey};
   if(!raf)raf=requestAnimationFrame(applyDrag);
  };
  el.over.onpointerup=el.over.onpointercancel=()=>{
   el.over.onpointermove=el.over.onpointerup=el.over.onpointercancel=null;
   cancelAnimationFrame(raf);raf=0;if(drag.pending)applyDrag();
   const moved=drag.start.moved;drag=null;
   if(!moved){undo.pop();return}
   if(design.status==='approved')design.status='draft';
   markDirty();queueThumbs([page]);render();
  };
 }
 function applyDrag(){
  raf=0;if(!drag?.pending)return;
  const {start:st,base,pending:{ev,dx,dy,shift}}=drag,s=slide();
  const set=(k,v)=>{s[k]=v};
  const x=sel&&sel.t,k=sel?.k;
  if(st.mode==='move'){
   const pos=[...(s.elementPositions||[])];let movedPos=false;
   for(const m of members()){
    if(m.t==='copy'){const p=base.textLayers?.[m.k]||{};s.textLayers={...s.textLayers,[m.k]:{...p,x:round(clamp((p.x||0)+dx/st.W*100,-100,100)),y:round(clamp((p.y||0)+dy/st.H*100,-100,100))}}}
    else if(m.t==='text'){const t=base.texts[m.i];s.texts[m.i]={...s.texts[m.i],left:round(clamp(t.left+dx/st.W*100,-50,150)),top:round(clamp(t.top+dy/st.H*100,-50,150))}}
    else if(m.t==='element'){const c=st.centers[m.i];pos[m.i]={x:round(clamp(c.x+dx/st.W*100,0,100)),y:round(clamp(c.y+dy/st.H*100,0,100))};movedPos=true}
    else if(m.t==='art'){const sc=(base.artScale||100)/100,f=st.frames.artwork||{w:st.frameW,h:st.frameH};s.artX=round(clamp((base.artX||0)+dx/f.w*100*sc,-100,100));s.artY=round(clamp((base.artY||0)+dy/f.h*100*sc,-100,100))}
   }
   if(movedPos){for(let i=0;i<(s.elements||[]).length;i++)if(!pos[i])pos[i]=st.centers[i];s.elementPositions=pos}
  }else if(st.mode==='scale'){
   const f=clamp(Math.hypot(ev.clientX-st.cx,ev.clientY-st.cy)/st.dist,.2,6);
   if(sel.t==='copy'){const p=base.textLayers?.[k]||{};s.textLayers={...s.textLayers,[k]:{...p,size:round(clamp(st.size*f,1,30))}}}
   else if(sel.t==='text'){s.texts[sel.i]={...s.texts[sel.i],size:round(clamp(st.size*f,1,30))}}
   else if(sel.t==='element'){const a=[...(s.elementSizes||[])];a[sel.i]=Math.round(clamp(st.elSize*f,25,500));s.elementSizes=a.map(v=>v??100)}
   else if(sel.t==='art'){s.artScale=Math.round(clamp(st.art*f,35,180))}
  }else if(st.mode==='sx'||st.mode==='sy'){
   // Reshape: stretch one side to change the width or height of a shape or image on its own.
   const f=clamp(st.mode==='sx'?(st.r.width+dx)/st.r.width:(st.r.height+dy)/st.r.height,.25,5);
   if(sel.t==='element'){const n=s.elements.length,key=st.mode==='sx'?'elementStretchX':'elementStretchY',old=st.mode==='sx'?st.sx:st.sy,arr=Array.from({length:n},(_,i)=>base[key]?.[i]??100);arr[sel.i]=Math.round(clamp(old*f,25,400));s[key]=arr}
   else if(sel.t==='art'){const key=st.mode==='sx'?'artStretchX':'artStretchY';s[key]=Math.round(clamp((st.mode==='sx'?st.asx:st.asy)*f,35,300))}
  }else if(st.mode==='width'){
   const w=round(clamp(st.width+dx/st.W*100,8,150));
   if(sel.t==='copy')s.textLayers={...s.textLayers,[k]:{...(base.textLayers?.[k]||{}),boxWidth:w}};else s.texts[sel.i]={...s.texts[sel.i],boxWidth:w};
  }else if(st.mode==='rotate'){
   let deg=(Math.atan2(ev.clientY-st.cy,ev.clientX-st.cx)-st.angle)*180/Math.PI+st.rot;
   deg=Math.round(clamp(((deg+540)%360)-180,-360,360));if(shift||Math.abs(deg%15)<3)deg=Math.round(deg/15)*15;
   if(sel.t==='copy')s.textLayers={...s.textLayers,[k]:{...(base.textLayers?.[k]||{}),rotation:deg}};else s.texts[sel.i]={...s.texts[sel.i],rotation:deg};
  }
  drag.pending=null;
  KitHost.mount(el.host,KitHost.pageHtml(design,page));
  drawOverlay();
 }
 // Center of an element in page percent, needed so one dragged element doesn't make its siblings jump.
 function elementCenter(i){
  const n=nodeFor({t:'element',i}),pb=pageBox();if(!n)return {x:50,y:50};
  const r=n.getBoundingClientRect();return {x:round((r.left+r.width/2-pb.left)/pb.width*100),y:round((r.top+r.height/2-pb.top)/pb.height*100)};
 }

 /* ---------- inline text editing ---------- */
 function onDouble(e){
  const h=hit(e.clientX,e.clientY);if(!h||h.t==='art'||h.t==='element')return;
  select(h);startEdit();
 }
 function startEdit(){
  const node=nodeFor();if(!node||!sel||!['copy','text'].includes(sel.t))return;
  const target={...sel},pg=page;
  editing=true;el.over.innerHTML='';el.bar.hidden=true;el.over.style.pointerEvents='none';
  node.contentEditable='plaintext-only';if(node.contentEditable!=='plaintext-only')node.contentEditable='true';
  document.activeElement?.blur?.();node.style.outline='2px solid #7c5cff';node.style.cursor='text';node.style.userSelect='text';node.style.webkitUserSelect='text';node.focus();
  const range=document.createRange();range.selectNodeContents(node);const sc=el.host.shadowRoot.getSelection?.()||getSelection();sc.removeAllRanges?.();sc.addRange?.(range);
  const finish=cancel=>{
   node.removeEventListener('blur',onBlur);node.removeEventListener('keydown',onKeyEdit);
   const text=node.innerText.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').trim();
   editing=false;el.over.style.pointerEvents='';
   if(!cancel){
    if(pg!==page||!design.pages[pg])return render();
    const sl=design.pages[pg],cur=target.t==='copy'?sl[target.k]:sl.texts[target.i]?.text;if(cur===undefined)return render();
    if(target.t==='copy'&&target.k==='title'&&!text){}
    else if(text!==cur&&!(target.t==='text'&&!text)){commit(()=>{if(target.t==='copy')sl[target.k]=text;else sl.texts[target.i].text=text},'edit')}
    else if(target.t==='text'&&!text){commit(()=>{sl.texts.splice(target.i,1);sel=null})}
   }
   render({thumbs:[page]});
  };
  const onBlur=()=>finish(false);
  const onKeyEdit=ev=>{if(ev.key==='Escape'){ev.preventDefault();finish(false)}ev.stopPropagation()};
  node.addEventListener('blur',onBlur);node.addEventListener('keydown',onKeyEdit);
 }

 /* ---------- contextual toolbar (only exists while something is selected) ---------- */
 function layerOf(k){const a=sel.t==='copy'?slide().textLayers?.[sel.k]:sel.t==='text'?slide().texts[sel.i]:null;return a||{}}
 function patchLayer(patch,key){
  commit(()=>{const s=slide();if(sel.t==='copy')s.textLayers={...s.textLayers,[sel.k]:{...(s.textLayers?.[sel.k]||{}),...patch}};else s.texts[sel.i]={...s.texts[sel.i],...patch}},key);
 }
 function curSize(){
  const l=layerOf();if(Number.isFinite(l.size))return l.size;
  const n=nodeFor();return n?Math.round(parseFloat(getComputedStyle(n).fontSize)/pageBox().width*1000)/10:6;
 }
 function drawBar(){
  const bar=el.bar,s=slide();
  const b=(act,ic,label,on)=>`<button class="${on?'on':''}" data-b="${act}" title="${label}" aria-label="${label}" aria-pressed="${!!on}">${icon(ic)}</button>`;
  const sep='<i class="sep"></i>';
  let html='';
  if(multi.length>1){
   const grouped=members().some(m=>groupFor(layerKey(m)));
   bar.innerHTML=`<span class="count">${multi.length} selected</span>${sep}<button class="txt" data-b="group">Group</button>${grouped?'<button class="txt" data-b="ungroup">Ungroup</button>':''}${sep}${b('forward','up','Bring forward')}${b('backward','down','Send backward')}${b('del','trash','Delete selected')}`;
   const u=members().map(m=>nodeFor(m)?.getBoundingClientRect()).filter(Boolean);
   if(u.length){const L=Math.min(...u.map(r=>r.left)),T=Math.min(...u.map(r=>r.top)),R=Math.max(...u.map(r=>r.right)),B=Math.max(...u.map(r=>r.bottom));positionBar({left:L,top:T,right:R,bottom:B,width:R-L,height:B-T},pageBox())}
   return;
  }
  if(sel.t==='copy'||sel.t==='text'){
   const l=layerOf();
   html=`<select data-b="font" aria-label="Font">${[['sans','Sans'],['serif','Serif'],['mono','Mono']].map(([v,n])=>`<option value="${v}" ${(l.font||'sans')===v?'selected':''}>${n}</option>`).join('')}</select>
   <button data-b="smaller" aria-label="Smaller">−</button><output>${curSize()}</output><button data-b="bigger" aria-label="Bigger">+</button>${sep}
   ${b('bold','bold','Bold',l.bold)}${b('italic','italic','Italic',l.italic)}${b('underline','underline','Underline',l.underline)}${b('uppercase','text','Uppercase',l.uppercase)}${sep}
   ${b('align','alignLeft','Alignment: '+(l.align||'left'),false)}${b('bullets','list','Bullets',l.bullets)}<label class="swatch" title="Text colour"><input type="color" data-b="color" value="${/^#[0-9a-f]{6}$/i.test(l.color||'')?l.color:s.ink||'#ffffff'}"></label>
   <select data-b="effect" aria-label="Effect"><option value="">No effect</option>${['shadow','glow','outline'].map(v=>`<option ${l.effect===v?'selected':''}>${v}</option>`).join('')}</select>${sep}`;
  }else if(sel.t==='element'){
   html=`<label class="rng">Size<input type="range" min="25" max="500" value="${s.elementSizes?.[sel.i]||100}" data-b="elsize"></label><label class="rng">Width<input type="range" min="25" max="400" value="${s.elementStretchX?.[sel.i]||100}" data-b="elsx"></label><label class="rng">Height<input type="range" min="25" max="400" value="${s.elementStretchY?.[sel.i]||100}" data-b="elsy"></label><label class="swatch" title="Colour"><input type="color" data-b="elcolor" value="${/^#[0-9a-f]{6}$/i.test(s.elementColors?.[sel.i]||'')?s.elementColors[sel.i]:'#25c8ff'}"></label>${sep}`;
  }else{
   html=`<label class="rng">Size<input type="range" min="35" max="180" value="${s.artScale||100}" data-b="artsize"></label><label class="rng">Width<input type="range" min="35" max="300" value="${s.artStretchX||100}" data-b="artsx"></label><label class="rng">Height<input type="range" min="35" max="300" value="${s.artStretchY||100}" data-b="artsy"></label><select data-b="artlayer" aria-label="Image layer">${[['behind','Behind text'],['front','In front'],['background','Background']].map(([v,n])=>`<option value="${v}" ${(s.artLayer||'behind')===v?'selected':''}>${n}</option>`).join('')}</select><button data-b="replace" class="txt">Replace</button><button data-b="clearimg" class="txt">Reset</button>${sep}`;
  }
  html+=`${b('forward','up','Bring forward')}${b('backward','down','Send backward')}`;
  if(sel.t==='text'||sel.t==='element')html+=b('dup','copy','Duplicate (Ctrl+D)');
  const g=groupFor(layerKey());if(g)html+='<button class="txt" data-b="ungroup">Ungroup</button>';
  if(sel.t==='text'||sel.t==='element'||sel.t==='art'||(sel.t==='copy'&&sel.k!=='title'))html+=b('del','trash',sel.t==='art'?'Delete image':'Delete');
  bar.innerHTML=html;
  const r=nodeFor()?.getBoundingClientRect();if(r)positionBar(r,pageBox());
 }
 function onBar(e){
  const t=e.target.closest('[data-b]');if(!t||!sel)return;
  const a=t.dataset.b,l=sel.t==='copy'||sel.t==='text'?layerOf():null;
  if(a==='smaller'||a==='bigger')return patchLayer({size:round(clamp(curSize()+(a==='bigger'?.5:-.5),1,30))},'size'),drawBar();
  if(['bold','italic','underline','uppercase','bullets'].includes(a))return patchLayer({[a]:!l[a]}),drawBar();
  if(a==='align'){const order=['left','center','right','justify'];return patchLayer({align:order[(order.indexOf(l.align||'left')+1)%4]}),drawBar()}
  if(a==='group')return groupSel();
  if(a==='ungroup')return ungroupSel();
  if(a==='forward'||a==='backward')return reorder(a==='forward'?1:-1);
  if(a==='dup')return duplicateSel();
  if(a==='del')return deleteSel();
  if(a==='replace')return pickImage(url=>commit(()=>{slide().image=url}));
  if(a==='clearimg')return commit(()=>{delete slide().image;delete slide().artX;delete slide().artY;delete slide().artScale});
 }
 function onBarInput(e){
  const t=e.target.closest('[data-b]');if(!t||!sel)return;const a=t.dataset.b,v=t.value;
  if(a==='font')patchLayer({font:v});
  else if(a==='color')patchLayer({color:v},'color');
  else if(a==='effect')patchLayer({effect:v||undefined});
  else if(a==='elsize')commit(()=>{const x=[...(slide().elementSizes||[])];x[sel.i]=+v;slide().elementSizes=Array.from({length:slide().elements.length},(_,i)=>x[i]??100)},'elsize');
  else if(a==='elcolor')commit(()=>{const x=[...(slide().elementColors||[])];x[sel.i]=v;slide().elementColors=Array.from({length:slide().elements.length},(_,i)=>x[i]||'#25c8ff')},'elcolor');
  else if(a==='elsx'||a==='elsy'){const key=a==='elsx'?'elementStretchX':'elementStretchY';commit(()=>{const n=slide().elements.length,x=slide()[key]||[];const arr=Array.from({length:n},(_,i)=>x[i]??100);arr[sel.i]=+v;slide()[key]=arr},a)}
  else if(a==='artsx'||a==='artsy')commit(()=>{slide()[a==='artsx'?'artStretchX':'artStretchY']=+v},a);
  else if(a==='artsize')commit(()=>{slide().artScale=+v},'artsize');
  else if(a==='artlayer')commit(()=>{slide().artLayer=v});
  if(e.type==='change')drawOverlay();
 }
 function layerKey(s=sel){return s.t==='copy'?s.k:s.t==='text'?'text:'+s.i:s.t==='element'?'element:'+s.i:'artwork'}
 function fullOrder(){
  const s=slide(),keys=[...DEFAULT_ORDER,...(s.elements||[]).map((_,i)=>'element:'+i),...(s.texts||[]).map((_,i)=>'text:'+i)];
  const own=(s.layerOrder||[]).filter(k=>keys.includes(k));return [...own,...keys.filter(k=>!own.includes(k))];
 }
 function reorder(dir){
  commit(()=>{const o=fullOrder(),k=layerKey(),i=o.indexOf(k),j=clamp(i+dir,0,o.length-1);o.splice(i,1);o.splice(j,0,k);slide().layerOrder=o});drawOverlay();
 }
 function duplicateSel(){
  if(!sel)return;
  commit(()=>{const s=slide();
   if(sel.t==='text'){s.texts=[...s.texts,{...s.texts[sel.i],left:clamp(s.texts[sel.i].left+3,-50,150),top:clamp(s.texts[sel.i].top+3,-50,150)}];sel={t:'text',i:s.texts.length-1}}
   else if(sel.t==='element'){const n=s.elements.length;if(n>=24)return toast('A page can hold 24 elements.');const c=elementCenter(sel.i);
    s.elements=[...s.elements,s.elements[sel.i]];s.elementPositions=[...Array.from({length:n},(_,i)=>s.elementPositions?.[i]||elementCenter(i)),{x:clamp(c.x+3,0,100),y:clamp(c.y+3,0,100)}];
    s.elementSizes=[...Array.from({length:n},(_,i)=>s.elementSizes?.[i]??100),s.elementSizes?.[sel.i]??100];
    if(s.elementColors)s.elementColors=[...Array.from({length:n},(_,i)=>s.elementColors[i]||'#25c8ff'),s.elementColors[sel.i]||'#25c8ff'];
    for(const k of ['elementStretchX','elementStretchY'])if(s[k])s[k]=[...Array.from({length:n},(_,i)=>s[k][i]??100),s[k][sel.i]??100];
    sel={t:'element',i:n}}
  });
  drawOverlay();
 }
 function deleteOne(s,m){
  if(m.t==='text'){s.texts=s.texts.filter((_,i)=>i!==m.i);s.layerOrder=remap(s.layerOrder,'text:',m.i);remapGroups(s,'text:',m.i)}
  else if(m.t==='element'){const i=m.i,f=a=>a?.filter((_,n)=>n!==i);s.elements=f(s.elements);for(const k of ['elementPositions','elementSizes','elementColors','elementStretchX','elementStretchY'])if(s[k])s[k]=f(s[k]);s.layerOrder=remap(s.layerOrder,'element:',i);remapGroups(s,'element:',i)}
  else if(m.t==='copy'&&m.k!=='title')s[m.k]='';
  else if(m.t==='art'){delete s.image;s.motif='none'}
 }
 function deleteSel(){
  if(!sel)return;
  commit(()=>{const s=slide();
   // Highest index first so earlier deletions do not shift the later ones.
   for(const m of members().slice().sort((a,b)=>(b.i??-1)-(a.i??-1)))deleteOne(s,m);
   sel=null;multi=[];
  });
  drawOverlay();
 }
 // Keeps groups correct when a numbered layer is removed.
 function remapGroups(s,prefix,removed){
  if(!s.groups)return;
  s.groups=s.groups.map(g=>g.filter(k=>k!==prefix+removed).map(k=>{if(k.startsWith(prefix)){const n=+k.slice(prefix.length);return n>removed?prefix+(n-1):k}return k})).filter(g=>g.length>1);
  if(!s.groups.length)delete s.groups;
 }
 function groupSel(){
  const keys=members().map(m=>layerKey(m));if(keys.length<2)return;
  commit(()=>{const s=slide();s.groups=[...(s.groups||[]).map(g=>g.filter(k=>!keys.includes(k))).filter(g=>g.length>1),keys].slice(-12)});
  toast('Grouped. They now move together.');drawOverlay();
 }
 function ungroupSel(){
  const keys=members().map(m=>layerKey(m));
  commit(()=>{const s=slide();s.groups=(s.groups||[]).filter(g=>!g.some(k=>keys.includes(k)));if(!s.groups.length)delete s.groups});
  multi=[];drawOverlay();toast('Ungrouped.');
 }
 function selectAll(){
  const ks=fullOrder().filter(k=>nodeFor(selOf(k)));
  if(ks.length>1){multi=ks.map(selOf);sel=multi[multi.length-1];drawOverlay()}
 }
 function remap(order,prefix,removed){
  if(!order)return order;
  return order.filter(k=>k!==prefix+removed).map(k=>{if(k.startsWith(prefix)){const n=+k.slice(prefix.length);return n>removed?prefix+(n-1):k}return k});
 }

 /* ---------- keyboard ---------- */
 function onKey(e){
  if(!design||editing||$('#editorRoot').hidden)return;
  const inField=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();return e.shiftKey?doRedo():doUndo()}
  if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();return doRedo()}
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();clearTimeout(saveTimer);return save()}
  if(inField)return;
  if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();return duplicateSel()}
  if(mod&&e.key.toLowerCase()==='g'){e.preventDefault();if(!sel)return;return e.shiftKey?ungroupSel():groupSel()}
  if(mod&&e.key.toLowerCase()==='a'){e.preventDefault();return selectAll()}
  if(e.key==='Escape'){if(!el.modal.hidden)return closeModal();if(multi.length)return select(null);if(sel)return select(null);if(tool)return closeTool();if(dockOpen)return toggleDock(false)}
  if(!sel)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();return deleteSel()}
  if(e.key==='Enter'&&['copy','text'].includes(sel.t)){e.preventDefault();return startEdit()}
  const step=e.shiftKey?1:.25,dir={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
  if(dir){e.preventDefault();nudge(dir[0],dir[1])}
 }
 function nudge(dx,dy){
  commit(()=>{const s=slide();
   if(sel.t==='copy'){const p=s.textLayers?.[sel.k]||{};s.textLayers={...s.textLayers,[sel.k]:{...p,x:round(clamp((p.x||0)+dx,-100,100)),y:round(clamp((p.y||0)+dy,-100,100))}}}
   else if(sel.t==='text'){const t=s.texts[sel.i];s.texts[sel.i]={...t,left:round(t.left+dx),top:round(t.top+dy)}}
   else if(sel.t==='element'){const pos=Array.from({length:s.elements.length},(_,i)=>s.elementPositions?.[i]||elementCenter(i));pos[sel.i]={x:round(clamp(pos[sel.i].x+dx,0,100)),y:round(clamp(pos[sel.i].y+dy,0,100))};s.elementPositions=pos}
   else{s.artX=round(clamp((s.artX||0)+dx,-100,100));s.artY=round(clamp((s.artY||0)+dy,-100,100))}
  },'nudge');
  drawOverlay();
 }
 function doUndo(){if(!undo.length)return;redo.push(snapshot());restore(undo.pop())}
 function doRedo(){if(!redo.length)return;undo.push(snapshot());restore(redo.pop())}
 function restore(json){const d=JSON.parse(json);design.pages=d.pages;design.template_id=d.template_id;design.brand=d.brand;page=Math.min(page,design.pages.length-1);sel=null;markDirty();render();thumbs();if(tool)openTool(tool)}

 /* ---------- page strip ---------- */
 function queueThumbs(list){clearTimeout(thumbTimer);thumbTimer=setTimeout(()=>thumbs(list),250)}
 function thumbs(only){
  if(!el.strip)return;
  const n=design.pages.length;
  if(!only||only.length===0||el.strip.children.length!==n+1){
   el.strip.innerHTML=design.pages.map((p,i)=>`<div class="ed-thumb ${i===page?'on':''}" data-page="${i}" draggable="true" role="button" tabindex="0" aria-label="Page ${i+1}, ${role(i)}"><div class="ed-thumbpic" style="aspect-ratio:${design.ratio}"><div class="ed-thumbhost"></div></div><span class="ed-tag ${i===0?'hook':i===n-1?'cta':''}">${role(i)}</span></div>`).join('')+`<button class="ed-addpage" data-act="addpage" title="Add a page after this one" aria-label="Add page">${icon('plus')}<span>Add page</span></button>`;
   only=design.pages.map((_,i)=>i);
  }
  $$('.ed-thumb',el.strip).forEach((t,i)=>t.classList.toggle('on',i===page));
  for(const i of only){const host=$$('.ed-thumbhost',el.strip)[i];if(host&&design.pages[i])KitHost.mount(host,KitHost.pageHtml(design,i))}
  const tag=$$('.ed-thumb',el.strip)[page];tag?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 function gotoPage(i){
  if(i<0||i>=design.pages.length)return;
  page=i;sel=null;render();$$('.ed-thumb',el.strip).forEach((t,n)=>t.classList.toggle('on',n===i));if(tool==='pages')openTool('pages');
 }
 const NEW_PAGE=()=>({deckLayout:'feature',title:'Add your point here',body:'Write one clear idea for this page. Keep it short and specific.'});
 function pageOps(op){
  const n=design.pages.length;
  commit(()=>{const p=design.pages;
   if(op==='add'){if(n>=30)return toast('A pack can have up to 30 pages.');const base=n>2?Math.min(Math.max(page,1),n-2):0;const src=n>1?JSON.parse(JSON.stringify(p[base])):NEW_PAGE();if(src.deckLayout==='hook'||src.deckLayout==='cta')src.deckLayout='feature';p.splice(page+1,0,src);page=page+1}
   else if(op==='dup'){if(n>=30)return toast('A pack can have up to 30 pages.');p.splice(page+1,0,JSON.parse(JSON.stringify(p[page])));page++}
   else if(op==='del'){if(n<=1)return toast('A pack needs at least one page. Delete the design from My designs instead.');p.splice(page,1);page=Math.min(page,p.length-1)}
   else if(op==='left'||op==='right'){const j=page+(op==='left'?-1:1);if(j<0||j>n-1)return;[p[page],p[j]]=[p[j],p[page]];page=j}
   sel=null;multi=[];
  });
  thumbs();render();
 }

 /* ---------- tools (hidden until asked for) ---------- */
 function toggleDock(on=!dockOpen){
  dockOpen=on;el.dock.classList.toggle('open',on);el.dock.querySelector('.ed-plus').setAttribute('aria-expanded',on);
  if(!on)closeTool();
 }
 function closeTool(){tool=null;el.root.classList.remove('has-fly');el.fly.hidden=true;$$('[data-tool]',el.dock).forEach(b=>b.classList.remove('on'))}
 function openTool(id){
  tool=id;$$('[data-tool]',el.dock).forEach(b=>b.classList.toggle('on',b.dataset.tool===id));
  const label=TOOLS.find(t=>t[0]===id)[2];
  el.root.classList.add('has-fly');el.fly.hidden=false;el.fly.innerHTML=`<header><h2>${label}</h2><button class="ed-icon" data-act="closetool" aria-label="Close ${label}">${icon('close')}</button></header><div class="ed-flybody" id="edFlyBody"></div>`;
  const body=$('#edFlyBody');
  ({templates:toolTemplates,elements:toolElements,text:toolText,uploads:toolUploads,brand:toolBrand,pages:toolPages,resize:toolResize})[id](body);
  requestAnimationFrame(fit);
 }
 function toolTemplates(body){
  body.innerHTML=`<p class="hint">Switch the look. Your write-up and pages stay as they are.</p><label class="ed-search">${icon('search')}<input type="search" id="edTq" placeholder="Search templates" aria-label="Search templates"></label><div class="ed-tgrid" id="edTg"></div><button class="btn-light" id="edTm" hidden>Show more</button>`;
  let shown=18,q='';
  const draw=()=>{
   const list=Library.filter({query:q,tab:'Popular'}),g=$('#edTg');
   g.innerHTML=list.slice(0,shown).map(t=>`<button class="ed-tpl ${t.id===design.template_id?'on':''}" data-tpl="${t.id}" title="${esc(Library.nameOf(t))}" style="aspect-ratio:${design.ratio}"><div class="ed-tplhost" data-id="${t.id}"></div><span>${esc(Library.nameOf(t))}</span></button>`).join('');
   $('#edTm').hidden=list.length<=shown;
   const io=new IntersectionObserver(es=>{for(const x of es){if(!x.isIntersecting)continue;io.unobserve(x.target);const h=x.target.querySelector('.ed-tplhost'),d={...KitHost.starterDesign(+h.dataset.id,design.ratio),brand:design.brand};KitHost.mount(h,KitHost.pageHtml(d,0))}},{root:body});
   $$('.ed-tpl',g).forEach(n=>io.observe(n));
  };
  $('#edTq').oninput=e=>{q=e.target.value;shown=18;draw()};$('#edTm').onclick=()=>{shown+=18;draw()};draw();
 }
 function toolElements(body){
  const keys=Object.keys(GSNKit.slideElements);
  body.innerHTML=`<p class="hint">Click to add. Drag it into place; resize from the corner.</p><div class="ed-egrid">${keys.map(k=>`<button data-el="${k}" title="${esc(GSNKit.slideElements[k][0])}" aria-label="Add ${esc(GSNKit.slideElements[k][0])}">${platformIcon(k)}<span>${esc(GSNKit.slideElements[k][0])}</span></button>`).join('')}</div>`;
 }
 function addElement(key){
  const s=slide();if((s.elements||[]).length>=24)return toast('A page can hold 24 elements.');
  commit(()=>{const n=(s.elements||[]).length;
   s.elementPositions=[...Array.from({length:n},(_,i)=>s.elementPositions?.[i]||(nodeFor({t:'element',i})?elementCenter(i):{x:50,y:50})),{x:50,y:50}];
   s.elements=[...(s.elements||[]),key];
   s.elementSizes=[...Array.from({length:n},(_,i)=>s.elementSizes?.[i]??100),key.length>1&&/^data:/.test(key)?60:100];
   if(s.elementColors)s.elementColors=[...Array.from({length:n},(_,i)=>s.elementColors[i]||'#25c8ff'),'#25c8ff'];
   sel={t:'element',i:n}});
  drawOverlay();
 }
 function toolText(body){
  body.innerHTML=`<p class="hint">Add a text box, then double-click it to type.</p><button class="ed-bigbtn h1" data-addtext="heading">Add a heading</button><button class="ed-bigbtn h2" data-addtext="sub">Add a subheading</button><button class="ed-bigbtn h3" data-addtext="body">Add body text</button>`;
 }
 function addText(kind){
  const s=slide();if((s.texts||[]).length>=24)return toast('A page can hold 24 text boxes.');
  const spec={heading:{text:'Add a heading',size:9,bold:true},sub:{text:'Add a subheading',size:5.5,bold:true},body:{text:'Add a little bit of body text',size:3.6}}[kind];
  commit(()=>{s.texts=[...(s.texts||[]),{...spec,left:12,top:42,boxWidth:70}];sel={t:'text',i:s.texts.length-1}});
  drawOverlay();requestAnimationFrame(startEdit);
 }
 function toolUploads(body){
  body.innerHTML=`<p class="hint">Photos are saved with the design on the server.</p><label class="ed-drop"><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden id="edFile">${icon('upload')}<b>Upload images</b><small>PNG, JPG or WebP</small></label><div class="ed-ugrid" id="edUg"></div>`;
  const draw=()=>{$('#edUg').innerHTML=uploads.map((u,i)=>`<div class="ed-up"><img src="${u}" alt="Upload ${i+1}"><div><button data-up="el" data-i="${i}">Add to page</button><button data-up="bg" data-i="${i}">Set as image</button></div></div>`).join('')};
  $('#edFile').onchange=async e=>{for(const f of e.target.files){try{uploads.unshift(await compress(f))}catch(err){toast(err.message)}}e.target.value='';draw()};
  draw();
 }
 async function compress(file){
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Use a PNG, JPG or WebP image.');
  const bitmap=await createImageBitmap(file);let max=1600,q=.86;
  for(let i=0;i<8;i++){
   const k=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.round(bitmap.width*k);c.height=Math.round(bitmap.height*k);
   const ctx=c.getContext('2d');const alpha=file.type==='image/png';if(!alpha){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)}ctx.drawImage(bitmap,0,0,c.width,c.height);
   const url=c.toDataURL(alpha&&i<3?'image/png':'image/jpeg',q);
   if(url.length<1_300_000)return url;max*=.8;q=Math.max(.5,q-.06);
  }
  throw Error('That image is too large. Try a smaller one.');
 }
 function pickImage(done){
  const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';
  input.onchange=async()=>{try{const u=await compress(input.files[0]);uploads.unshift(u);done(u)}catch(e){toast(e.message)}};input.click();
 }
 function toolBrand(body){
  const s=slide(),pal=GSNKit.palettes,hex=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
  body.innerHTML=`<p class="hint">Colours apply to this page. Tick the box to apply them to every page.</p>
  <label class="ed-check"><input type="checkbox" id="edAll"> Apply to all pages</label>
  ${[['accent','Accent','#ac82f4'],['background','Background','#101323'],['ink','Text','#f8faff']].map(([k,l,f])=>`<label class="ed-colour">${l}<span><input type="color" data-col="${k}" value="${hex(s[k],f)}"><input type="text" data-hex="${k}" value="${hex(s[k],f)}" maxlength="7" aria-label="${l} hex"></span></label>`).join('')}
  <h3>Palettes</h3><div class="ed-pal">${pal.map(p=>`<button data-pal="${p[0]}" title="${p[0]}" aria-label="${p[0]} palette"><i style="background:${p[1]}"></i><i style="background:${p[2]}"></i><i style="background:${p[3]}"></i></button>`).join('')}</div>
  <h3>Brand</h3><label class="ed-colour">Brand name<input id="edBn" maxlength="80" value="${esc(design.brand.name)}"></label><label class="ed-colour">Handle<input id="edBh" maxlength="80" value="${esc(design.brand.handle)}"></label><button class="btn-light" data-act="resetcolors">Reset page colours</button>`;
  const apply=(patch)=>commit(()=>{const targets=$('#edAll').checked?design.pages:[slide()];for(const t of targets)Object.assign(t,patch)},'colour');
  $$('[data-col]',body).forEach(i=>i.oninput=()=>{apply({[i.dataset.col]:i.value});$(`[data-hex=${i.dataset.col}]`,body).value=i.value});
  $$('[data-hex]',body).forEach(i=>i.onchange=()=>{if(/^#[0-9a-f]{6}$/i.test(i.value))apply({[i.dataset.hex]:i.value.toLowerCase()});else toast('Use a hex colour such as #ac82f4.')});
  $$('[data-pal]',body).forEach(b=>b.onclick=()=>{const p=pal.find(x=>x[0]===b.dataset.pal);apply({background:p[1],ink:p[2],accent:p[3]});toolBrand(body)});
  const brand=()=>commit(()=>{design.brand={name:$('#edBn').value.trim()||design.brand.name,handle:$('#edBh').value.trim()||design.brand.handle}},'brand');
  $('#edBn').oninput=brand;$('#edBh').oninput=brand;
 }
 function toolPages(body){
  const s=slide(),n=design.pages.length;
  const field=(k,label,rows)=>`<label class="ed-field">${label}<textarea data-f="${k}" rows="${rows}" maxlength="${k==='title'?300:1200}">${esc(s[k]??'')}</textarea></label>`;
  body.innerHTML=`<p class="hint">${role(page)} · the words on this page. They update as you type.</p><div class="ed-actions"><button class="btn-light" data-pg="dup">Duplicate</button><button class="btn-light" data-pg="left">Move earlier</button><button class="btn-light" data-pg="right">Move later</button><button class="btn-light" data-pg="del">Delete page</button></div>${field('title','Headline',2)}${field('body','Write-up',5)}${field('kicker','Label',1)}${field('footerText','Footer',1)}
  <h3>Layers on this page</h3><ol class="ed-layers" id="edLayers"></ol>`;
  $$('[data-f]',body).forEach(t=>t.oninput=()=>{const k=t.dataset.f;if(k==='title'&&!t.value.trim())return;commit(()=>{slide()[k]=t.value},'f'+k)});
  const names=k=>k.startsWith('text:')?'Text: '+(s.texts[+k.slice(5)]?.text||'').slice(0,24):k.startsWith('element:')?GSNKit.canvasElementLabel(s.elements[+k.slice(8)])||'Element':k==='artwork'?'Image':COPY[k];
  $('#edLayers').innerHTML=fullOrder().slice().reverse().filter(k=>names(k)).map(k=>`<li class="${sel&&layerKey()===k?'on':''}" data-layer="${k}"><span>${esc(names(k))}</span></li>`).join('');
  $$('[data-layer]',body).forEach(li=>li.onclick=()=>{const k=li.dataset.layer;select(k.startsWith('text:')?{t:'text',i:+k.slice(5)}:k.startsWith('element:')?{t:'element',i:+k.slice(8)}:k==='artwork'?{t:'art'}:{t:'copy',k})});
 }
 function toolResize(body){
  body.innerHTML=`<p class="hint">Resize this design in place, or copy the whole design to another size.</p>${app.groups.map(g=>`<h3>${platformIcon(g.id==='trending'?'trend':g.id)} ${esc(g.name)}</h3>${app.presets.filter(p=>p.platform===g.id).map(p=>`<div class="ed-size ${p.id===design.platform?'on':''}"><span>${esc(p.name)}<small>${p.w}×${p.h}</small></span><button data-resize="${p.id}" ${p.id===design.platform?'disabled':''}>Resize</button><button data-copy="${p.id}">Copy to size</button></div>`).join('')}`).join('')}`;
 }
 async function resizeTo(id){
  const p=preset(id);commit(()=>{design.platform=id;design.ratio=p.ratio;design.size={w:p.w,h:p.h}});
  clearTimeout(saveTimer);await save();design.ratio=p.ratio;thumbs();render();openTool('resize');toast(`Resized to ${p.name}.`);
 }
 async function copyToSize(id){
  clearTimeout(saveTimer);await save();
  try{const p=preset(id);
   const d=await api('/designs',{method:'POST',body:{template_id:design.template_id,platform:id,title:`${design.title.replace(/ · .*$/,'')} · ${p.name}`,brand:design.brand,pages:design.pages,status:'draft',...(design.pack_id?{pack_id:design.pack_id}:{})}});
   toast(`Copied to ${p.name}.`);await App.loadDesigns();location.hash='#editor/'+d.id;
  }catch(e){toast(e.message,6000)}
 }

 /* ---------- download, present ---------- */
 function openModal(html){el.modal.innerHTML=`<div class="ed-dialog glass-strong" role="dialog" aria-modal="true">${html}</div>`;el.modal.hidden=false}
 function closeModal(){el.modal.hidden=true;el.modal.innerHTML=''}
 function openDownload(){
  const n=design.pages.length,mp4=globalThis.MediaRecorder?.isTypeSupported?.('video/mp4');
  openModal(`<form id="edDl"><h2>Download</h2>
  <label class="field">File type<select id="dlType"><option value="png">PNG</option><option value="jpeg">JPG</option><option value="pdf">PDF (all pages)</option>${mp4?'<option value="mp4">MP4 video</option>':''}<option value="html">HTML</option></select></label>
  <label class="field">Pages<select id="dlPages"><option value="all">All ${n} pages</option><option value="current">This page (${page+1})</option></select></label>
  <label class="field">Size<select id="dlScale"><option value="1">${design.size.w}×${design.size.h}</option><option value="2">2× larger</option></select></label>
  <p class="hint" id="dlMsg"></p><div class="modal-actions"><span class="spacer"></span><button type="button" class="btn-light" data-act="closemodal">Cancel</button><button class="btn-maroon" type="submit">Download</button></div></form>`);
  $('#edDl').onsubmit=async e=>{e.preventDefault();const b=e.submitter,msg=$('#dlMsg');b.disabled=true;
   const pages=$('#dlPages').value==='all'?design.pages.map((_,i)=>i):[page];
   try{await Exporter.run(design,{pages,type:$('#dlType').value,scale:+$('#dlScale').value,onProgress:(i,t)=>{msg.textContent=i<t?`Rendering page ${i+1} of ${t}…`:'Done.'}});closeModal()}
   catch(err){msg.textContent=err.message||'The export failed. Try a smaller size.';b.disabled=false}};
 }
 function present(){
  let i=page;const o=document.createElement('div');o.className='ed-present';o.innerHTML='<div class="ed-pfit"><div id="edPh"></div></div><div class="ed-pnav"><button aria-label="Previous">‹</button><span></span><button aria-label="Next">›</button><button aria-label="Close presentation">✕</button></div>';
  document.body.appendChild(o);
  const [w,h]=design.ratio.split(' / ').map(Number),host=$('#edPh',o);
  const draw=()=>{const k=Math.min(innerWidth*.92,innerHeight*.86*w/h);host.style.width=k+'px';KitHost.mount(host,KitHost.pageHtml(design,i,'animate'));o.querySelector('span').textContent=`${i+1} / ${design.pages.length} · ${role(i)}`};
  const end=()=>{o.remove();document.removeEventListener('keydown',key,true)};
  const go=d=>{i=clamp(i+d,0,design.pages.length-1);draw()};
  const key=e=>{if(e.key==='Escape')end();else if(e.key==='ArrowRight'||e.key===' ')go(1);else if(e.key==='ArrowLeft')go(-1);else return;e.preventDefault();e.stopPropagation()};
  document.addEventListener('keydown',key,true);
  const btn=o.querySelectorAll('button');btn[0].onclick=()=>go(-1);btn[1].onclick=()=>go(1);btn[2].onclick=end;host.onclick=()=>go(1);draw();
 }

 /* ---------- clicks ---------- */
 function onClick(e){
  const act=e.target.closest('[data-act]')?.dataset.act;
  if(act){
   if(act==='back'){location.hash='#designs'}
   else if(act==='undo')doUndo();else if(act==='redo')doRedo();
   else if(act==='dock')toggleDock();
   else if(act==='closetool')closeTool();
   else if(act==='download')openDownload();else if(act==='present')present();else if(act==='closemodal')closeModal();
   else if(act==='zoomin')setZoom(zoom*1.2);else if(act==='zoomout')setZoom(zoom/1.2);else if(act==='zoomfit')setZoom(1);
   else if(act==='addpage')pageOps('add');
   else if(act==='theirs')resolveConflict(false);else if(act==='mine')resolveConflict(true);
   else if(act==='resetcolors'){commit(()=>{const s=slide();delete s.accent;delete s.background;delete s.ink});toolBrand($('#edFlyBody'))}
   return;
  }
  if(e.target.closest('#edBar'))return onBar(e);
  const toolBtn=e.target.closest('[data-tool]');if(toolBtn){return tool===toolBtn.dataset.tool?closeTool():openTool(toolBtn.dataset.tool)}
  const tpl=e.target.closest('[data-tpl]');if(tpl){commit(()=>{design.template_id=+tpl.dataset.tpl});$$('.ed-tpl',el.fly).forEach(b=>b.classList.toggle('on',b===tpl));thumbs();return}
  const elb=e.target.closest('[data-el]');if(elb)return addElement(elb.dataset.el);
  const at=e.target.closest('[data-addtext]');if(at)return addText(at.dataset.addtext);
  const up=e.target.closest('[data-up]');if(up){const u=uploads[+up.dataset.i];if(up.dataset.up==='el')addElement(u);else commit(()=>{slide().image=u});return}
  const rs=e.target.closest('[data-resize]');if(rs)return resizeTo(rs.dataset.resize);
  const cp=e.target.closest('[data-copy]');if(cp)return copyToSize(cp.dataset.copy);
  const pg=e.target.closest('[data-pg]');if(pg&&!el.modal.contains(pg)){pageOps(pg.dataset.pg);if(tool==='pages')openTool('pages');return}
  const open=e.target.closest('[data-open]');if(open){location.hash='#editor/'+open.dataset.open;return}
  const th=e.target.closest('.ed-thumb');if(th){const i=+th.dataset.page;if(i!==page)gotoPage(i);return}
  if(e.target.closest('.ed-addpage'))return;
 }
 document.addEventListener('input',e=>{if(design&&e.target.closest?.('#edBar'))onBarInput(e)});
 document.addEventListener('change',e=>{if(design&&e.target.closest?.('#edBar'))onBarInput(e)});
 // Page strip: per-page actions and drag-to-reorder for content pages (the Hook stays first and the CTA stays last).
 document.addEventListener('contextmenu',e=>{const th=e.target.closest?.('.ed-thumb');if(!th||!design)return;e.preventDefault();const i=+th.dataset.page;if(i!==page)gotoPage(i);
  openModal(`<h2>Page ${i+1} · ${role(i)}</h2><div class="ed-actions"><button class="btn-light" data-pg="dup">Duplicate page</button><button class="btn-light" data-pg="left">Move earlier</button><button class="btn-light" data-pg="right">Move later</button><button class="btn-light" data-pg="del">Delete page</button><button class="btn-light" data-act="closemodal">Close</button></div>`);
  el.modal.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{pageOps(b.dataset.pg);closeModal()})});
 document.addEventListener('dragstart',e=>{const th=e.target.closest?.('.ed-thumb');if(th&&design)e.dataTransfer.setData('text/plain',th.dataset.page)});
 document.addEventListener('dragover',e=>{if(design&&e.target.closest?.('.ed-thumb'))e.preventDefault()});
 document.addEventListener('drop',e=>{const th=e.target.closest?.('.ed-thumb');if(!th||!design)return;e.preventDefault();
  const from=+e.dataTransfer.getData('text/plain'),to=+th.dataset.page,n=design.pages.length;
  if(!(from>=0&&from<n&&to>=0&&to<n)||from===to)return;
  commit(()=>{const [m]=design.pages.splice(from,1);design.pages.splice(to,0,m);page=to;sel=null;multi=[]});thumbs();render()});
 return {open,close,get design(){return design}};
})();
