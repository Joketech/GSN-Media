'use strict';
/* GSN design editor. Canva's workflow (pages strip, click to select, drag/resize/rotate, contextual toolbar, tools that
   slide out only when asked for), applied to GSN's own templates. Every change is saved to the server with a revision,
   so a person and a Hermes agent can work on the same design. */
const Editor=(()=>{
 const {$,$$,esc,icon,api,toast,state:app,preset,platformIcon}=App;
 const COPY={title:'Headline',body:'Write-up',kicker:'Label',brandText:'Brand line',footerText:'Footer'};
 const TOOLS=[['templates','templates','Templates'],['elements','shapes','Elements'],['text','text','Text'],['uploads','upload','Uploads'],['people','user','People'],['background','image','Background'],['brand','brand','Brand'],['pages','list','Page content'],['resize','grid','Resize']];
 const DEFAULT_ORDER=['artwork','brandText','kicker','title','body','footerText'];
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const round=v=>Math.round(v*100)/100;
 let design=null,page=0,sel=null,multi=[],zoom=1,tool=null,dockOpen=false,editing=false,undo=[],redo=[],saveTimer=0,polling=0,saving=false,dirty=false,conflict=false,thumbTimer=0,uploads=[],raf=0,lastCoalesce='',lastCoalesceAt=0,drag=null,spaceKey='';
 let el={};
 const slide=()=>design.pages[page];
 const role=i=>i===0?'Hook':i===design.pages.length-1?'CTA':`Page ${i+1}`;

 /* ---------- loading and saving ---------- */
 let opening=0;
 // Uploads are kept on the server for the creator's workspace until they delete them.
 const upIds=new Map();
 const wsHeader=()=>{let w='';try{w=localStorage.getItem('gsn_ws')||''}catch{}return w?{'X-GSN-Workspace':w}:{}};
 async function loadUploads(){
  try{
   const r=await api('/uploads');
   const got=await Promise.all(r.uploads.slice(0,40).map(async it=>{try{const b=await (await fetch(it.url,{headers:wsHeader()})).blob();const u=await new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=no;fr.readAsDataURL(b)});return [it.id,u]}catch{return null}}));
   const mem=uploads.filter(u=>!upIds.has(u));uploads=[];for(const g of got)if(g){uploads.push(g[1]);upIds.set(g[1],g[0])}for(const u of mem)if(!uploads.includes(u))uploads.unshift(u);
   if(tool==='uploads')openTool('uploads');
  }catch{}
 }
 function addUpload(u){uploads.unshift(u);if(!upIds.has(u))api('/uploads',{method:'POST',body:{image:u}}).then(r=>upIds.set(u,r.id)).catch(()=>{})}
 function dropUpload(u){const id=upIds.get(u);upIds.delete(u);if(id)api('/uploads/'+id,{method:'DELETE'}).catch(()=>{})}
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
  loadUploads();loadBrand();
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
   <button class="btn-light" data-act="schedule">${icon('calendar')}Schedule</button><button class="btn-maroon" data-act="download">${icon('download')}Download</button>
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
  const [w,h]=design.ratio.split(' / ').map(Number),narrow=el.area.clientWidth<700,aw=el.area.clientWidth-(narrow?24:80),ah=el.area.clientHeight-(narrow?70:100);
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
 /* ---------- the template's own decorations (badges, bars, numbers, icons) ---------- */
 // Each one is found by its place in the page, such as "3" or "3.1", so it can be moved, resized, recoloured or hidden on any template.
 const partKids=n=>[...n.children].filter(c=>!c.classList.contains('page-bg')&&!c.classList.contains('slide-shapes')&&c.tagName!=='STYLE');
 function partKey(node){const root=el.host.shadowRoot?.querySelector('.art');if(!root)return '';const path=[];let n=node;while(n&&n!==root){const p=n.parentElement;if(!p)return '';path.unshift(partKids(p).indexOf(n)+1);n=p}return n===root?path.join('.'):''}
 function partNode(key){let n=el.host.shadowRoot?.querySelector('.art');for(const i of String(key).split('.').map(Number)){if(!n)return null;n=partKids(n)[i-1]}return n||null}
 const PART_SKIP='.slide-shapes,[data-canvas-copy],[data-canvas-text],[data-canvas-element],[data-slot],.campaign-visual,.slide-element-strip,.free-text,.campaign-copy,.page-bg,style';
 function partAt(x,y){
  const root=el.host.shadowRoot,art=root?.querySelector('.art');if(!art)return null;
  const pg=art.getBoundingClientRect(),pageArea=pg.width*pg.height;let best=null,area0=Infinity;
  for(const n of art.querySelectorAll('*')){
   if(n.matches?.(PART_SKIP)||n.closest?.(PART_SKIP.replace('.campaign-copy,','')))continue;
   if(n.closest('svg')&&n.tagName!=='svg')continue;
   const r=n.getBoundingClientRect();if(r.width<6||r.height<6)continue;
   const a=r.width*r.height;if(a>pageArea*.985||a>=area0)continue;
   if(x<r.left||x>r.right||y<r.top||y>r.bottom)continue;
   if(getComputedStyle(n).visibility==='hidden')continue;
   best=n;area0=a;
  }
  const k=best&&partKey(best);return k?{t:'part',k}:null;
 }
 function nodeFor(s=sel){
  const root=el.host.shadowRoot;if(!root||!s)return null;
  if(s.t==='part')return partNode(s.k);
  if(s.t==='shape')return root.querySelector(`[data-canvas-shape="${s.i}"]`);
  if(s.t==='page')return root.querySelector('.art');
  const q=s.t==='copy'?`[data-canvas-copy="${s.k}"]`:s.t==='text'?`[data-canvas-text="${s.i}"]`:s.t==='element'?`[data-canvas-element="${s.i}"]`:s.t==='slot'?`[data-slot="${s.k}"]`:s.t==='panel'?'.campaign-copy':'.campaign-visual';
  return root.querySelector(q);
 }
 const pageBox=()=>el.page.getBoundingClientRect();
 const members=()=>multi.length>1?multi:(sel?[sel]:[]);
 const selOf=k=>k.startsWith('shape:')?{t:'shape',i:+k.slice(6)}:k.startsWith('slot:')?{t:'slot',k:k.slice(5)}:k.startsWith('text:')?{t:'text',i:+k.slice(5)}:k.startsWith('element:')?{t:'element',i:+k.slice(8)}:k==='artwork'?{t:'art'}:{t:'copy',k};
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
  const side=sel.t==='copy'||sel.t==='text'?'<i class="h e" data-h="width"></i><i class="h w" data-h="widthW"></i><i class="h s" data-h="height"></i><i class="h rot" data-h="rotate"></i>':sel.t==='slot'||sel.t==='panel'?'':sel.t==='shape'?'<i class="h e" data-h="sx"></i><i class="h s" data-h="sy"></i><i class="h rot" data-h="rotate"></i>':'<i class="h e" data-h="sx"></i><i class="h s" data-h="sy"></i>';
  box.innerHTML=sel.t==='panel'||sel.t==='page'?'':sel.t==='part'?'<i class="h se" data-h="scale"></i>':`<i class="h se" data-h="scale"></i>${side}`;
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
 function select(s,solo){
  sel=s;multi=[];
  // Picking one member of a group picks the whole group. Double-click, Alt-click or the item buttons in the bar pick just one item.
  const g=!solo&&s&&groupFor(layerKey(s));if(g&&g.length>1)multi=g.map(selOf);
  drawOverlay();if(tool==='pages')openTool('pages');
 }
 function hit(x,y){
  const root=el.host.shadowRoot;if(!root)return null;
  for(const n of root.elementsFromPoint(x,y)){
   if(n.dataset?.canvasText!==undefined)return {t:'text',i:+n.dataset.canvasText};
   const shp=n.closest?.('[data-canvas-shape]');if(shp)return {t:'shape',i:+shp.dataset.canvasShape};
   if(n.dataset?.canvasElement!==undefined)return {t:'element',i:+n.dataset.canvasElement};
   if(n.dataset?.canvasCopy)return {t:'copy',k:n.dataset.canvasCopy};
   const slotNode=n.closest?.('[data-slot]');if(slotNode)return {t:'slot',k:slotNode.dataset.slot};
   if(n.closest?.('.campaign-visual')&&(n.matches('img,.campaign-photo,.campaign-upload,svg,svg *,[class*=photo]')))return {t:'art'};
  }
  // Empty space on the template's text card picks the card itself (move it, recolour it, hide it).
  const cp=root.querySelector('.campaign-copy');
  if(cp){const r=cp.getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){const v=root.querySelector('.campaign-visual'),vr=v&&(v.firstElementChild||v).getBoundingClientRect();if(!(vr&&vr.width&&x>=vr.left&&x<=vr.right&&y>=vr.top&&y<=vr.bottom&&y<r.top+8))return {t:'panel'}}}
  // The artwork is decorative (pointer-events:none in the template), so test its box directly.
  const v=root.querySelector('.campaign-visual');
  if(v){const r=(v.firstElementChild||v).getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return {t:'art'}}
  const pt=partAt(x,y);if(pt)return pt;
  // Nothing smaller is under the pointer, so it is the page itself: its background and colours.
  const art=root.querySelector('.art');if(art){const r=art.getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return {t:'page'}}
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
  const again=!handle&&!multi.length&&sameSel(target,sel)&&['copy','text'].includes(target.t)&&!(e.shiftKey||e.ctrlKey||e.metaKey||e.altKey);
  if(!handle&&e.altKey&&!(e.shiftKey||e.ctrlKey||e.metaKey)){select(target,true)}
  else if(!handle&&!(multi.length>1&&multi.some(m=>sameSel(m,target)))&&!sameSel(target,sel))select(target);
  else if(!handle&&!multi.length&&groupFor(layerKey(target))&&!sameSel(target,sel))select(target);
  const node=nodeFor();if(!node)return;
  e.preventDefault();el.over.setPointerCapture(e.pointerId);
  const pb=pageBox(),r=node.getBoundingClientRect(),s=slide();
  const W=pb.width,H=pb.height,cx=r.left+r.width/2,cy=r.top+r.height/2;
  const base=JSON.parse(JSON.stringify(s));
  const layer=sel.t==='copy'?(s.textLayers?.[sel.k]||{}):sel.t==='text'?s.texts[sel.i]:sel.t==='shape'?{rotation:s.shapes?.[sel.i]?.rot||0}:{};
  const fontPx=parseFloat(getComputedStyle(node).fontSize)||0;
  const start={x:e.clientX,y:e.clientY,W,H,cx,cy,r,mode:handle||'move',size:fontPx/unitPx(node),
   unit:unitPx(node),dist:Math.hypot(e.clientX-cx,e.clientY-cy)||1,width:r.width/unitPx(node),height:r.height/unitPx(node),angle:Math.atan2(e.clientY-cy,e.clientX-cx),rot:layer.rotation||0,moved:false,
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
  el.over.onpointerup=el.over.onpointercancel=ev=>{
   el.over.onpointermove=el.over.onpointerup=el.over.onpointercancel=null;
   cancelAnimationFrame(raf);raf=0;if(drag.pending)applyDrag();
   const moved=drag.start.moved,wasSel=sel&&sel.t==='element'&&!multi.length?{...sel}:null;drag=null;
   if(!moved){undo.pop();if(again&&ev?.type==='pointerup')setTimeout(startEdit,0);return}
   if(wasSel&&ev?.type==='pointerup')dropIntoTarget(wasSel,ev.clientX,ev.clientY);
   if(design.status==='approved')design.status='draft';
   markDirty();queueThumbs([page]);render();
  };
 }
 // Dropping a picture on a shape or a picture frame puts it inside that shape or frame.
 async function dropIntoTarget(src,x,y){
  const s=slide(),key=s.elements?.[src.i];if(!(isPhotoEl(key)||(typeof key==='string'&&/^gsn-\d+$/.test(key))))return;
  const root=el.host.shadowRoot;if(!root)return;
  // Shapes are outlines, so pointer hit-testing would miss their inside: test against their boxes instead (smallest box on top wins).
  let target=null,best=Infinity;
  for(const n of root.querySelectorAll('[data-canvas-element],[data-slot]')){
   const r=n.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)continue;
   const area=r.width*r.height;if(area>=best)continue;
   if(n.dataset.slot){target={t:'slot',k:n.dataset.slot};best=area;continue}
   const j=+n.dataset.canvasElement;if(j===src.i)continue;const k2=s.elements[j];
   if(typeof k2==='string'&&!isPhotoEl(k2)&&!/^gsn-\d+$/.test(k2)){target={t:'element',i:j};best=area}
  }
  // The template's own picture (the panda): drop a photo on it to replace it in the same place.
  if(!target||target.t!=='slot'){
   const v=root.querySelector('.campaign-visual');
   if(v){const r=v.getBoundingClientRect();if(r.width&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&r.width*r.height<best)target={t:'art'}}
  }
  if(!target)return;
  let url=key;
  if(!isPhotoEl(key)){const p=GSNKit.gsnLibraryPhoto(key);if(!p)return;try{url=await libraryCell(p)}catch{return}}
  commit(()=>{
   const sl=slide();
   if(target.t==='art'){sl.image=url;delete sl.hideArt;deleteOne(sl,{t:'element',i:src.i});sel={t:'art'}}
   else if(target.t==='element'){setFill(target.i,url);const at=target.i>src.i?target.i-1:target.i;deleteOne(sl,{t:'element',i:src.i});sel={t:'element',i:at}}
   else{setSlot(target.k,{src:url,x:0,y:0,z:100});deleteOne(sl,{t:'element',i:src.i});sel={t:'slot',k:target.k}}
  });
  toast('Picture placed inside. Undo (Ctrl+Z) moves it back out.');drawOverlay();
 }
 // Text box sizes are in the template's own container units (cqw), which are not always the page width. Measure what one unit is on screen.
 function unitPx(node){
  const par=node?.parentElement;if(!par)return pageBox().width/100;
  const t=document.createElement('div');t.style.cssText='position:absolute;visibility:hidden;pointer-events:none;height:0;width:100cqw';par.appendChild(t);
  const w=t.getBoundingClientRect().width;t.remove();return (w>1?w:pageBox().width)/100;
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
    else if(m.t==='element'){const c=st.centers[m.i];pos[m.i]={x:round(clamp(c.x+dx/st.W*100,-50,150)),y:round(clamp(c.y+dy/st.H*100,-50,150))};movedPos=true}
    else if(m.t==='slot'&&!slotPan){const b0=base.slots?.[m.k]||{};s.slots={...(s.slots||{}),[m.k]:{...b0,fx:round(clamp((b0.fx||0)+dx/st.W*100,-100,100)),fy:round(clamp((b0.fy||0)+dy/st.W*100,-100,100))}}}
    else if(m.t==='slot'){const b0=base.slots?.[m.k]||{},z0=(b0.z||100)/100,z=z0<1.05?1.3:z0,ws=st.r.width||1,hs=st.r.height||1;
     // The picture follows the pointer one to one. At 100% it exactly fills the frame and has no room to move, so it zooms in a little first.
     s.slots={...(s.slots||{}),[m.k]:{...b0,z:Math.round(z*100),x:round(clamp((b0.x||0)-dx/ws*200/(z-1),-100,100)),y:round(clamp((b0.y||0)-dy/hs*200/(z-1),-100,100))}}}
    else if(m.t==='page'){}
    else if(m.t==='shape'){const arr=(base.shapes||[]).map(x=>({...x})),b0=arr[m.i];
     if(slotPan&&b0.src&&members().length===1){const z=(b0.z||100)/100;b0.px=round(clamp((b0.px??50)-dx/(st.r.width||1)*100/Math.max(.35,z-.5),0,100));b0.py=round(clamp((b0.py??50)-dy/(st.r.height||1)*100/Math.max(.35,z-.5),0,100))}
     else{b0.x=round(clamp(b0.x+dx/st.W*100,-50,150));b0.y=round(clamp(b0.y+dy/st.H*100,-50,150))}
     s.shapes=arr}
    else if(m.t==='part'){const p0=base.parts?.[m.k]||{};s.parts={...(s.parts||{}),[m.k]:{...p0,x:round(clamp((p0.x||0)+dx/st.W*100,-100,100)),y:round(clamp((p0.y||0)+dy/st.W*100,-100,100))}}}
    else if(m.t==='panel'){const p0=base.panel||{};s.panel={...p0,x:round(clamp((p0.x||0)+dx/st.W*100,-100,100)),y:round(clamp((p0.y||0)+dy/st.W*100,-100,100))}}
    else if(m.t==='art'){const sc=(base.artScale||100)/100,f=st.frames.artwork||{w:st.frameW,h:st.frameH};s.artX=round(clamp((base.artX||0)+dx/f.w*100*sc,-300,300));s.artY=round(clamp((base.artY||0)+dy/f.h*100*sc,-300,300))}
   }
   if(movedPos){for(let i=0;i<(s.elements||[]).length;i++)if(!pos[i])pos[i]=st.centers[i];s.elementPositions=pos}
  }else if(st.mode==='scale'){
   const f=clamp(Math.hypot(ev.clientX-st.cx,ev.clientY-st.cy)/st.dist,.2,6);
   if(sel.t==='copy'){const p=base.textLayers?.[k]||{};s.textLayers={...s.textLayers,[k]:{...p,size:round(clamp(st.size*f,1,30))}}}
   else if(sel.t==='text'){s.texts[sel.i]={...s.texts[sel.i],size:round(clamp(st.size*f,1,30))}}
   else if(sel.t==='element'){const a=[...(s.elementSizes||[])];a[sel.i]=Math.round(clamp(st.elSize*f,25,500));s.elementSizes=a.map(v=>v??100)}
   else if(sel.t==='part'){const p0=base.parts?.[k]||{};s.parts={...(s.parts||{}),[k]:{...p0,scale:round(clamp((p0.scale||1)*f,.2,4))}}}
   else if(sel.t==='shape'){const arr=(base.shapes||[]).map(x=>({...x})),b0=arr[sel.i];b0.w=round(clamp(b0.w*f,1,200));b0.h=round(clamp(b0.h*f,1,200));s.shapes=arr}
   else if(sel.t==='art'){s.artScale=Math.round(clamp(st.art*f,35,180))}
   else if(sel.t==='slot'&&!slotPan){const b0=base.slots?.[sel.k]||{};s.slots={...(s.slots||{}),[sel.k]:{...b0,fs:Math.round(clamp((b0.fs||100)*f,30,300))}}}
   else if(sel.t==='slot'){const b0=base.slots?.[sel.k]||{};s.slots={...(s.slots||{}),[sel.k]:{...b0,z:Math.round(clamp((b0.z||100)*f,100,400))}}}
  }else if(st.mode==='sx'||st.mode==='sy'){
   // Reshape: stretch one side to change the width or height of a shape or image on its own.
   const f=clamp(st.mode==='sx'?(st.r.width+dx)/st.r.width:(st.r.height+dy)/st.r.height,.25,5);
   if(sel.t==='shape'){const arr=(base.shapes||[]).map(x=>({...x})),b0=arr[sel.i];if(st.mode==='sx')b0.w=round(clamp(b0.w*f,1,200));else b0.h=round(clamp(b0.h*f,1,200));s.shapes=arr}
   else if(sel.t==='element'){const n=s.elements.length,key=st.mode==='sx'?'elementStretchX':'elementStretchY',old=st.mode==='sx'?st.sx:st.sy,arr=Array.from({length:n},(_,i)=>base[key]?.[i]??100);arr[sel.i]=Math.round(clamp(old*f,25,400));s[key]=arr}
   else if(sel.t==='art'){const key=st.mode==='sx'?'artStretchX':'artStretchY';s[key]=Math.round(clamp((st.mode==='sx'?st.asx:st.asy)*f,35,300))}
  }else if(st.mode==='width'||st.mode==='widthW'||st.mode==='height'){
   // Text boxes: the right handle widens to the right, the left handle widens to the left (the right edge stays put), the bottom handle makes the box taller.
   const west=st.mode==='widthW',pct=dx/st.unit;
   const w=round(clamp(st.width+(west?-pct:pct),8,150));
   const h=round(clamp(st.height+dy/st.unit,1,180));
   const apply=(cur,base0)=>{
    if(st.mode==='height')return {...base0,boxHeight:h};
    const out={...base0,boxWidth:w};
    // The box grows from its left edge, so widening from the left also slides it left by the same amount.
    if(west){const grown=w-st.width;if(sel.t==='copy')out.x=round((base0.x||0)-grown);else out.left=round((base0.left||0)-grown*st.unit/st.W*100)}
    return out;
   };
   if(sel.t==='copy')s.textLayers={...s.textLayers,[k]:apply(null,base.textLayers?.[k]||{})};else s.texts[sel.i]=apply(null,base.texts[sel.i]);
  }else if(st.mode==='rotate'){
   let deg=(Math.atan2(ev.clientY-st.cy,ev.clientX-st.cx)-st.angle)*180/Math.PI+st.rot;
   deg=Math.round(clamp(((deg+540)%360)-180,-360,360));if(shift||Math.abs(deg%15)<3)deg=Math.round(deg/15)*15;
   if(sel.t==='shape'){const arr=(base.shapes||[]).map(x=>({...x}));arr[sel.i].rot=deg;s.shapes=arr}
   else if(sel.t==='copy')s.textLayers={...s.textLayers,[k]:{...(base.textLayers?.[k]||{}),rotation:deg}};else s.texts[sel.i]={...s.texts[sel.i],rotation:deg};
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
  select(h,true);if(['copy','text'].includes(h.t))startEdit();
 }
 /* ---------- rich text: colour or highlight single words inside a text box ---------- */
 // A word or phrase with its own colour is stored in the text as ⟦text colour|background|words⟧; the page draws it, and nothing else reads it.
 const FMT=/⟦(#[0-9a-f]{6})?\|(#[0-9a-f]{6})?\|([^⟦⟧]*)⟧/gi;
 const fmtStyle=(fg,bg)=>`${fg?'color:'+fg+';':''}${bg?'background:'+bg+';padding:.04em .28em;border-radius:.3em;box-decoration-break:clone;-webkit-box-decoration-break:clone;':''}`;
 function toHtml(raw){let out='',last=0,m;const s=String(raw??'');FMT.lastIndex=0;while((m=FMT.exec(s))){out+=esc(s.slice(last,m.index))+`<span class="fmt" data-fg="${m[1]||''}" data-bg="${m[2]||''}" style="${fmtStyle(m[1],m[2])}">${esc(m[3])}</span>`;last=m.index+m[0].length}return out+esc(s.slice(last))}
 // One record per character (UTF-16 unit) with its colour and background: easy to colour any range and to write back.
 function charsOf(root){
  const out=[],nl=()=>out.push({ch:'\n',fg:'',bg:''});
  const w=(n,fg,bg)=>{for(const c of n.childNodes){
   if(c.nodeType===3){const v=c.nodeValue.replace(/ /g,' ').replace(/[⟦⟧]/g,'');for(let k=0;k<v.length;k++)out.push({ch:v[k],fg,bg})}
   else if(c.nodeName==='BR')nl();
   else if(c.nodeType===1){if(/^(DIV|P)$/.test(c.nodeName)&&out.length&&out[out.length-1].ch!=='\n')nl();w(c,c.dataset?.fg||fg,c.dataset?.bg||bg)}}};
  w(root,'','');return out;
 }
 function charsToRaw(chars){
  let out='',i=0;
  while(i<chars.length){const {fg,bg}=chars[i];let j=i,t='';while(j<chars.length&&chars[j].fg===fg&&chars[j].bg===bg){t+=chars[j].ch;j++}
   out+=(!fg&&!bg)?t:t.split('\n').map(l=>l?`⟦${fg}|${bg}|${l}⟧`:'').join('\n');i=j}
  return out;
 }
 const rawOfRaw=raw=>{const chars=[];let last=0,m;const push=(t,fg,bg)=>{for(let k=0;k<t.length;k++)chars.push({ch:t[k],fg,bg})};FMT.lastIndex=0;while((m=FMT.exec(raw))){push(raw.slice(last,m.index),'','');push(m[3],m[1]||'',m[2]||'');last=m.index+m[0].length}push(raw.slice(last),'','');return chars};
 // Plain text of one raw string (no markers): what a person reads, used for searching and size checks.
 const plainOf=raw=>String(raw??'').replace(FMT,'$3');
 function pointAt(root,off){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n,left=off,last=null;
  while((n=w.nextNode())){last=n;if(left<=n.nodeValue.length)return {node:n,offset:left};left-=n.nodeValue.length}
  return last?{node:last,offset:last.nodeValue.length}:{node:root,offset:0};
 }
 function startEdit(){
  if(editing)return;
  const node=nodeFor();if(!node||!sel||!['copy','text'].includes(sel.t))return;
  const target={...sel},pg=page;
  const raw0=target.t==='copy'?design.pages[pg]?.[target.k]:design.pages[pg]?.texts?.[target.i]?.text;
  editing=true;el.over.innerHTML='';el.bar.hidden=true;el.over.style.pointerEvents='none';
  if(typeof raw0==='string'){node.innerHTML=toHtml(raw0);node.style.whiteSpace='pre-wrap';node.style.display='block'}
  node.contentEditable='true';
  document.activeElement?.blur?.();node.style.outline='2px solid #7c5cff';node.style.cursor='text';node.style.userSelect='text';node.style.webkitUserSelect='text';node.focus();
  const shadowSel=()=>el.host.shadowRoot.getSelection?.()||getSelection();
  const range=document.createRange();range.selectNodeContents(node);const sc=shadowSel();sc.removeAllRanges?.();sc.addRange?.(range);
  // The chosen words, as offsets into the text, remembered while the colour panel has the keyboard.
  let saved=null;
  const offsetIn=(container,off)=>{const r=document.createRange();r.selectNodeContents(node);r.setEnd(container,off);const d=document.createElement('div');d.appendChild(r.cloneContents());return charsOf(d).length};
  const saveSel=()=>{const s2=shadowSel();if(!s2||!s2.rangeCount)return;const r=s2.getRangeAt(0);if(!node.contains(r.startContainer)||!node.contains(r.endContainer))return;saved={start:offsetIn(r.startContainer,r.startOffset),end:offsetIn(r.endContainer,r.endOffset)};if(saved.start>saved.end)saved={start:saved.end,end:saved.start}};
  saveSel();
  const bar=document.createElement('div');bar.className='ed-bar ed-etb';
  bar.innerHTML=`<span class="hint-s">Select words, then:</span><button class="txt" data-e="fg" title="Colour of the selected words"><i class="dot" data-dot="fg"></i>Text colour</button><button class="txt" data-e="bg" title="Fill behind the selected words"><i class="dot" data-dot="bg"></i>Background</button><button class="txt" data-e="clear" title="Remove colour and background from the selected words">Clear</button><button class="txt main" data-e="done">Done</button>`;
  el.area.appendChild(bar);
  const place=()=>{const ar=el.area.getBoundingClientRect(),r=node.getBoundingClientRect(),bw=bar.offsetWidth,bh=bar.offsetHeight;let x=r.left+r.width/2-ar.left-bw/2,y=r.top-ar.top-bh-12;if(y<8)y=r.bottom-ar.top+12;x=clamp(x,8,Math.max(8,ar.width-bw-8));y=clamp(y,8,Math.max(8,ar.height-bh-8));bar.style.left=(x+el.area.scrollLeft)+'px';bar.style.top=(y+el.area.scrollTop)+'px'};
  place();
  const curAttr=k=>{const ch=charsOf(node);if(!saved)return '';const i=Math.min(saved.start,ch.length-1);return ch[i]?.[k]||''};
  const paintDots=()=>{for(const d of bar.querySelectorAll('[data-dot]')){const c=curAttr(d.dataset.dot);d.style.background=c||'transparent';d.style.outline=c?'':'1px dashed #999'}};paintDots();
  const restore=(a,b)=>{const s2=shadowSel(),r=document.createRange(),p1=pointAt(node,a),p2=pointAt(node,b);r.setStart(p1.node,p1.offset);r.setEnd(p2.node,p2.offset);s2.removeAllRanges?.();s2.addRange?.(r);saved={start:a,end:b}};
  const apply=patch=>{
   const chars=charsOf(node);let a=saved?.start??0,b=saved?.end??0;if(a===b){a=0;b=chars.length}
   for(let i=a;i<b&&i<chars.length;i++){const c=chars[i];if(c.ch==='\n')continue;if(patch.clear){c.fg='';c.bg=''}else{if('fg' in patch)c.fg=patch.fg||'';if('bg' in patch)c.bg=patch.bg||''}}
   node.innerHTML=toHtml(charsToRaw(chars));restore(a,b);paintDots();place();
  };
  const finish=cancel=>{
   document.removeEventListener('pointerdown',away,true);node.removeEventListener('keydown',onKeyEdit);node.removeEventListener('paste',onPaste);node.removeEventListener('blur',onBlur);node.removeEventListener('pointerup',saveSel);node.removeEventListener('keyup',saveSel);
   const text=charsToRaw(charsOf(node)).replace(/\n{3,}/g,'\n\n').trim();
   bar.remove();document.querySelector('.ed-cpanel')?.remove();
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
  const inside=t=>!!(t&&(bar.contains(t)||t.closest?.('.ed-cpanel')));
  const away=ev=>{if(ev.composedPath().includes(node)||inside(ev.target))return;finish(false)};
  const onBlur=ev=>{if(inside(ev.relatedTarget))return;setTimeout(()=>{if(editing&&!inside(document.activeElement)&&!node.matches(':focus'))finish(false)},0)};
  const onPaste=ev=>{ev.preventDefault();document.execCommand('insertText',false,(ev.clipboardData||window.clipboardData).getData('text/plain'))};
  const onKeyEdit=ev=>{
   if(ev.key==='Escape'){ev.preventDefault();finish(false)}
   else if(ev.key==='Enter'){ev.preventDefault();document.execCommand('insertText',false,'\n')}
   ev.stopPropagation();
  };
  bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault()});
  bar.addEventListener('click',e=>{
   const b=e.target.closest('[data-e]');if(!b)return;saveSel();const k=b.dataset.e;
   if(k==='done')return finish(false);
   if(k==='clear')return apply({clear:true});
   const cur=curAttr(k),keep=saved?{...saved}:null;
   colourPanel(b,cur,c=>{if(keep)saved=keep;apply({[k]:c||''});},{none:k==='fg'?'Back to the box colour':'No background'});
  });
  document.addEventListener('pointerdown',away,true);
  node.addEventListener('blur',onBlur);node.addEventListener('keydown',onKeyEdit);node.addEventListener('paste',onPaste);node.addEventListener('pointerup',saveSel);node.addEventListener('keyup',saveSel);
 }

 /* ---------- contextual toolbar (only exists while something is selected) ---------- */
 function layerOf(k){const m=multi.length>1?(multi.find(x=>x.t==='copy'||x.t==='text')||sel):sel;const a=m.t==='copy'?slide().textLayers?.[m.k]:m.t==='text'?slide().texts[m.i]:null;return a||{}}
 function patchLayer(patch,key){
  // With several text boxes selected (or grouped), a change goes to every one of them.
  const ms=multi.length>1?multi.filter(m=>m.t==='copy'||m.t==='text'):[sel];
  commit(()=>{const s=slide();for(const m of ms){if(m.t==='copy')s.textLayers={...s.textLayers,[m.k]:{...(s.textLayers?.[m.k]||{}),...patch}};else s.texts[m.i]={...s.texts[m.i],...patch}}},key);
 }
 function curSize(){
  const l=layerOf();if(Number.isFinite(l.size))return l.size;
  const n=nodeFor();return n?Math.round(parseFloat(getComputedStyle(n).fontSize)/unitPx(n)*10)/10:6;
 }
 function drawBar(){
  const bar=el.bar,s=slide();
  const ae=document.activeElement;if(ae&&bar.contains(ae)&&ae.matches?.('input[type=color],input[type=range]')&&!bar.hidden){const r0=nodeFor()?.getBoundingClientRect();if(r0)positionBar(r0,pageBox());return}
  const b=(act,ic,label,on)=>`<button class="${on?'on':''}" data-b="${act}" title="${label}" aria-label="${label}" aria-pressed="${!!on}">${icon(ic)}</button>`;
  const sep='<i class="sep"></i>';
  let html='';
  if(multi.length>1){
   const grouped=members().some(m=>groupFor(layerKey(m)));
   const oneGroup=grouped&&(()=>{const g=groupFor(layerKey(multi[0]));return g&&g.length===multi.length})();
   const nm=m=>{const k=layerKey(m);return k.startsWith('shape:')?'Shape '+(+k.slice(6)+1):k==='artwork'?'Picture':k.startsWith('slot:')?slotLabel(k.slice(5)):k.startsWith('text:')?'Text '+(+k.slice(5)+1):k.startsWith('element:')?'Shape '+(+k.slice(8)+1):({title:'Heading',sub:'Subtitle',kicker:'Label',brandText:'Brand',body:'Body'})[k]||k};
   bar.innerHTML=`<span class="count">${oneGroup?'Group':multi.length+' selected'}</span>${oneGroup?'<span class="hint-s">Edit one item:</span>'+multi.map((m,n)=>`<button class="txt" data-b="solo" data-n="${n}">${esc(nm(m))}</button>`).join(''):''}${sep}${multi.every(m=>m.t==='copy'||m.t==='text')?textBarHtml(layerOf(),s,false)+sep:''}<button class="txt" data-b="group">Group</button>${grouped?'<button class="txt" data-b="ungroup">Ungroup</button>':''}${sep}${b('forward','up','Bring forward')}${b('backward','down','Send backward')}${b('del','trash','Delete selected')}`;
   const u=members().map(m=>nodeFor(m)?.getBoundingClientRect()).filter(Boolean);
   if(u.length){const L=Math.min(...u.map(r=>r.left)),T=Math.min(...u.map(r=>r.top)),R=Math.max(...u.map(r=>r.right)),B=Math.max(...u.map(r=>r.bottom));positionBar({left:L,top:T,right:R,bottom:B,width:R-L,height:B-T},pageBox())}
   return;
  }
  if(sel.t==='copy'||sel.t==='text'){
   const l=layerOf();
   html=textBarHtml(l,s,true);
  }else if(sel.t==='page'){
   const sw=(a,t,v,lbl)=>`<span class="count">${lbl}</span><button class="swatch cp" data-b="${a}" title="${t}" aria-label="${t}" style="--sw:${/^#[0-9a-f]{6}$/i.test(v||'')?v:'transparent'}"></button>`;
   html=`<span class="count">Page</span>${sw('pgbg','Background colour (the cream behind everything)',s.background,'Background')}${sw('pgacc','Accent colour (frame, bars and badges)',s.accent,'Accent')}${sw('pgink','Text colour for the whole page',s.ink,'Text')}${sw('pgfill','Fill the whole page with one colour',s.pageFill,'Cover')}<button class="txt" data-b="pgreset" title="Back to the template's own colours">Reset colours</button>${sep}`;
  }else if(sel.t==='shape'){
   const p=s.shapes?.[sel.i]||{},sw=(a,t,v)=>`<button class="swatch cp" data-b="${a}" title="${t}" aria-label="${t}" style="--sw:${shapeColourCss(v)}"></button>`;
   html=`<span class="count">${p.src?'Picture frame':'Shape'}</span><select data-b="shapekind" aria-label="Shape">${Object.entries(GSNKit.SHAPE_KINDS).map(([v,n])=>`<option value="${v}" ${(p.kind||'rect')===v?'selected':''}>${esc(n)}</option>`).join('')}</select>${p.src?'':sw('shapefill','Fill colour',p.fill)}${sw('shapeline','Outline colour',p.line)}<label class="rng">Outline<input type="range" min="0" max="12" value="${p.lineW||0}" data-b="shapelw"></label>${(p.kind||'rect')==='round'?`<label class="rng">Corners<input type="range" min="0" max="25" value="${p.radius??4}" data-b="shaperad"></label>`:''}<label class="rng">See-through<input type="range" min="10" max="100" value="${p.opacity??100}" data-b="shapeop"></label><button class="txt ${p.shadow?'on':''}" data-b="shapeshadow">Shadow</button><button class="txt" data-b="shapepic">${p.src?'Replace picture':'Add picture'}</button>${p.src?`<label class="rng">Zoom<input type="range" min="100" max="400" value="${p.z||100}" data-b="shapez"></label><button class="txt ${slotPan?'on':''}" data-b="slotpan" title="When on, dragging moves the picture inside the frame.">${slotPan?'Moving picture':'Move picture inside'}</button><button class="txt" data-b="shapenopic">Remove picture</button>`:''}${sep}`;
  }else if(sel.t==='part'){
   const p=s.parts?.[sel.k]||{};
   html=`<span class="count">Template item</span><button class="swatch cp" data-b="partfill" title="Fill colour" aria-label="Fill colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(p.fill||'')?p.fill:'transparent'}"></button><button class="swatch cp hl" data-b="partcolor" title="Text or icon colour" aria-label="Text or icon colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color:'transparent'}"><b>A</b></button><label class="rng">Size<input type="range" min="20" max="400" value="${Math.round((p.scale||1)*100)}" data-b="partscale"></label><label class="rng">See-through<input type="range" min="0" max="100" value="${p.opacity??100}" data-b="partop"></label><button class="txt ${p.hide?'on':''}" data-b="parthide">${p.hide?'Show':'Hide'}</button><button class="txt" data-b="partreset" title="Put it back as the template had it">Reset</button>${sep}`;
  }else if(sel.t==='panel'){
   const p=s.panel||{};
   html=`<span class="count">Text card</span><button class="swatch cp" data-b="panelcol" title="Colour of the card behind the text" aria-label="Card colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(p.fill||'')?p.fill:'transparent'}"></button><label class="rng">See-through<input type="range" min="0" max="100" value="${p.opacity??100}" data-b="panelop"></label><label class="rng">Corners<input type="range" min="0" max="80" value="${p.radius??4}" data-b="panelrad"></label><button class="txt ${p.hide?'on':''}" data-b="panelhide" title="Hide or show the card look behind the text">${p.hide?'Show card':'Hide card'}</button><button class="txt" data-b="panelreset" title="Put the card back as the template had it">Reset</button>${sep}`;
  }else if(sel.t==='element'){
   html=`<label class="rng">Size<input type="range" min="25" max="500" value="${s.elementSizes?.[sel.i]||100}" data-b="elsize"></label><label class="rng">Width<input type="range" min="25" max="400" value="${s.elementStretchX?.[sel.i]||100}" data-b="elsx"></label><label class="rng">Height<input type="range" min="25" max="400" value="${s.elementStretchY?.[sel.i]||100}" data-b="elsy"></label>${isPicEl(s.elements[sel.i])?photoTools(s,sel.i):`<button class="swatch cp" data-b="elcolpop" title="Colour" aria-label="Shape colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(s.elementColors?.[sel.i]||'')?s.elementColors[sel.i]:'#25c8ff'}"></button><button class="txt ${s.elementSolid?.[sel.i]?'on':''}" data-b="elsolid" title="Switch between a solid colour shape and an outline">${s.elementSolid?.[sel.i]?'Solid':'Outline'}</button><button class="txt" data-b="elfillup" title="Fill this shape with your picture">Picture</button><button class="txt" data-b="elfilllib">Library</button>${s.elementFills?.[sel.i]?'<button class="txt" data-b="elfillclear">Remove picture</button>':''}`}<button class="txt" data-b="elcenter" title="Centre on the page">Centre</button>${sep}`;
  }else if(sel.t==='slot'){
   const st=s.slots?.[sel.k]||{};
   html=`<span class="count">${esc(slotLabel(sel.k))}</span><button data-b="slotreplace" class="txt">Replace picture</button><button data-b="slotlib" class="txt">From library</button><label class="rng">Zoom<input type="range" min="100" max="400" value="${st.z||100}" data-b="slotzoom"></label><button data-b="slotpan" class="txt ${slotPan?'on':''}" title="When on, dragging moves the picture inside its frame. When off, dragging moves the whole frame.">${slotPan?'Moving picture':'Move picture inside'}</button><button data-b="slotreset" class="txt" title="Centre the picture, reset zoom, and put the frame back">Reset position</button><button data-b="crop" class="txt" title="Crop this picture">Crop</button>${maskSelect(sel)}<button data-b="rmbg" class="txt" title="Remove the background">Remove background</button>${sep}`;
  }else{
   html=`<label class="rng">Size<input type="range" min="35" max="180" value="${s.artScale||100}" data-b="artsize"></label><label class="rng">Width<input type="range" min="35" max="300" value="${s.artStretchX||100}" data-b="artsx"></label><label class="rng">Height<input type="range" min="35" max="300" value="${s.artStretchY||100}" data-b="artsy"></label><select data-b="artlayer" aria-label="Image layer">${[['behind','Behind text'],['front','In front'],['background','Background']].map(([v,n])=>`<option value="${v}" ${(s.artLayer||'behind')===v?'selected':''}>${n}</option>`).join('')}</select><button data-b="replace" class="txt">Replace</button><button data-b="crop" class="txt" title="Crop this picture">Crop</button>${maskSelect(sel)}<button data-b="rmbg" class="txt" title="Remove the background">Remove background</button><select data-b="rmtol" aria-label="Background removal strength"><option value="28">Light</option><option value="48" selected>Medium</option><option value="72">Strong</option></select><button data-b="clearimg" class="txt">Reset</button>${sep}`;
  }
  if(sel.t!=='slot'&&sel.t!=='panel'&&sel.t!=='part'&&sel.t!=='page')html+=`${b('forward','up','Bring forward')}${b('backward','down','Send backward')}`;
  if(sel.t==='text'||sel.t==='element'||sel.t==='shape')html+=b('dup','copy','Duplicate (Ctrl+D)');
  const g=groupFor(layerKey());if(g)html+='<button class="txt" data-b="ungroup">Ungroup</button>';
  if(sel.t==='text'||sel.t==='element'||sel.t==='shape'||sel.t==='art'||sel.t==='slot'||(sel.t==='copy'&&sel.k!=='title'))html+=b('del','trash',sel.t==='art'?'Delete image':sel.t==='slot'?'Remove picture (shows the studio photo again)':'Delete');
  bar.innerHTML=html;
  const r=nodeFor()?.getBoundingClientRect();if(r)positionBar(r,pageBox());
 }
 function textBarHtml(l,s,single){
  const b=(act,ic,label,on)=>`<button class="${on?'on':''}" data-b="${act}" title="${label}" aria-label="${label}" aria-pressed="${!!on}">${icon(ic)}</button>`;
  const sep='<i class="sep"></i>';
  return `${single?`<button class="txt" data-b="edit" title="Type here (or press Enter)">Edit text</button>${sep}`:'<span class="hint-s">Applies to every selected text:</span>'}<select data-b="font" aria-label="Font">${GSNKit.gsnFonts.map(([v,n])=>`<option value="${v}" ${(l.font||'sans')===v?'selected':''}>${esc(n)}</option>`).join('')}</select>
   <button data-b="smaller" aria-label="Smaller">−</button><output>${curSize()}</output><button data-b="bigger" aria-label="Bigger">+</button>${sep}
   ${b('bold','bold','Bold',l.bold)}${b('italic','italic','Italic',l.italic)}${b('underline','underline','Underline',l.underline)}${b('uppercase','text','Uppercase',l.uppercase)}${sep}
   ${b('align','alignLeft','Alignment: '+(l.align||'left'),false)}<button class="txt" data-b="spacing" title="Letter and line spacing">Spacing</button>${sel.t==='copy'&&sel.k==='body'?`<button class="txt" data-b="numbering" title="Show or hide the numbers beside each line on this page">Numbers: ${s.numbering==='off'?'Off':s.numbering==='on'?'On':'Auto'}</button>`:''}${b('bullets','list','Bullets',l.bullets)}<button class="swatch cp" data-b="colorpop" title="Text colour" aria-label="Text colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(l.color||'')?l.color:s.ink||'#ffffff'}"></button><button class="swatch cp hl" data-b="hlpop" title="Background fill behind the text (padding and rounded corners inside)" aria-label="Text background fill" style="--sw:${/^#[0-9a-f]{6}$/i.test(l.bg||'')?l.bg:'transparent'}"><b>A</b></button><button class="swatch cp" data-b="boxpop" title="Box colour (the shape behind the text)" aria-label="Box colour" style="--sw:${/^#[0-9a-f]{6}$/i.test(l.boxFill||'')?l.boxFill:'transparent'}"><b style="font-size:10px">Box</b></button>
   <select data-b="effect" aria-label="Effect"><option value="">No effect</option>${['shadow','glow','outline'].map(v=>`<option ${l.effect===v?'selected':''}>${v}</option>`).join('')}</select>${sep}`;
 }
 function setFill(i,u){const s=slide(),n=s.elements.length,arr=Array.from({length:n},(_,j)=>s.elementFills?.[j]??null);arr[i]=u;if(arr.some(Boolean))s.elementFills=arr;else delete s.elementFills}
 const isPhotoEl=k=>typeof k==='string'&&/^data:image\//.test(k);
 const getList=(s,k,i,d)=>(s[k]&&s[k][i]!==undefined&&s[k][i]!==null)?s[k][i]:d;
 function setList(s,k,i,v,d){const n=s.elements.length,a=Array.from({length:n},(_,j)=>getList(s,k,j,d));a[i]=v;s[k]=a}

 const isPicEl=k=>isPhotoEl(k)||(typeof k==='string'&&/^gsn-\d+$/.test(k));
 const MASK_NAMES=[['','No shape'],['circle','Circle'],['rounded','Rounded square'],['heart','Heart'],['star','Star'],['diamond','Diamond'],['triangle','Triangle']];
 const maskOf=t=>t.t==='art'?slide().artMask||'':t.t==='slot'?slide().slots?.[t.k]?.mask||'':slide().elementMasks?.[t.i]||'';
 const maskSelect=t=>`<select data-b="mask" aria-label="Put the picture inside a shape" title="Put the picture inside a shape">${MASK_NAMES.map(([v,n])=>`<option value="${v}" ${maskOf(t)===v?'selected':''}>${v?n:'Shape: none'}</option>`).join('')}</select>`;
 // The picture as an editable image. The template's own pictures and library pictures are turned into a copy first, so crop, cutout and the rest work on them too.
 async function ownPicture(t){
  const u=photoOf(t);
  if(isPhotoEl(u))return u;
  if(t.t==='element'&&/^gsn-\d+$/.test(u||'')){const p=GSNKit.gsnLibraryPhoto(u);if(p)return libraryCell(p)}
  const root=el.host.shadowRoot,node=t.t==='art'?root.querySelector('.campaign-visual .campaign-photo'):root.querySelector(`[data-slot="${t.k}"]`);
  const cs=node&&getComputedStyle(node),src=cs?.getPropertyValue('--photo-source').match(/url\(['"]?(.+?)['"]?\)/)?.[1];
  if(src){const pos=cs.getPropertyValue('--photo-position').trim(),size=cs.getPropertyValue('--photo-size').trim();if(pos&&size)return libraryCell({file:src,position:pos,size});const img=await loadImg(src);const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/jpeg',.92)}
  const img=node?.querySelector?.('img');if(img?.src){const im=await loadImg(img.src);const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/jpeg',.92)}
  throw Error('This picture cannot be edited. Use Replace to put your own picture here.');
 }
 function putPicture(t,out){commit(()=>{const sl=slide();
  if(t.t==='art'){sl.image=out;delete sl.hideArt}
  else if(t.t==='slot')setSlot(t.k,{src:out,x:0,y:0,z:100});
  else sl.elements[t.i]=out;})}
 // Crop: drag the frame over the picture, pick a shape such as square or 9:16, and Apply. The cropped picture replaces the original on the page.
 async function cropPicture(t){
  let url,img;try{url=await ownPicture(t);img=await loadImg(url)}catch(e){return toast(e.message||'That picture could not be opened.')}
  const IW=img.naturalWidth,IH=img.naturalHeight,K=Math.min(1,640/IW,420/IH),W=Math.round(IW*K),H=Math.round(IH*K);
  const ratios=[['free','Free',null],['orig','Original',IW/IH],['sq','1:1',1],['p45','4:5',.8],['l54','5:4',1.25],['s916','9:16',9/16],['l169','16:9',16/9]];
  openModal(`<h2>Crop picture</h2><p class="hint">Drag inside the frame to move it. Drag a corner or edge to resize. Pick a shape for a fixed ratio.</p><div class="crop-ratios">${ratios.map(([k,n],i)=>`<button class="btn-light ${i?'':'on'}" data-ratio="${k}">${n}</button>`).join('')}</div><div class="crop-wrap"><canvas id="cropCv" width="${W}" height="${H}" style="width:${W}px;height:${H}px;touch-action:none"></canvas></div><div class="ed-actions"><button class="btn-light" data-act="closemodal">Cancel</button><button class="btn-maroon" id="cropGo">Apply crop</button></div>`);
  const cv=q1('#cropCv'),cx=cv.getContext('2d');
  let box={x:W*.08,y:H*.08,w:W*.84,h:H*.84},ratio=null,mode=null,start=null;
  const draw=()=>{cx.clearRect(0,0,W,H);cx.drawImage(img,0,0,W,H);cx.fillStyle='rgba(10,5,20,.55)';
   cx.beginPath();cx.rect(0,0,W,H);cx.rect(box.x,box.y,box.w,box.h);cx.fill('evenodd');
   cx.strokeStyle='#fff';cx.lineWidth=2;cx.strokeRect(box.x,box.y,box.w,box.h);cx.lineWidth=1;cx.strokeStyle='rgba(255,255,255,.5)';
   for(let i=1;i<3;i++){cx.beginPath();cx.moveTo(box.x+box.w*i/3,box.y);cx.lineTo(box.x+box.w*i/3,box.y+box.h);cx.moveTo(box.x,box.y+box.h*i/3);cx.lineTo(box.x+box.w,box.y+box.h*i/3);cx.stroke()}
   cx.fillStyle='#fff';for(const [hx,hy] of handles())cx.fillRect(hx-5,hy-5,10,10)};
  const handles=()=>[[box.x,box.y],[box.x+box.w/2,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h/2],[box.x+box.w,box.y+box.h/2],[box.x,box.y+box.h],[box.x+box.w/2,box.y+box.h],[box.x+box.w,box.y+box.h]];
  const names=['nw','n','ne','w','e','sw','s','se'];
  const clampBox=()=>{box.w=clamp(box.w,20,W);box.h=clamp(box.h,20,H);box.x=clamp(box.x,0,W-box.w);box.y=clamp(box.y,0,H-box.h)};
  const setRatio=r=>{ratio=r;if(!r)return;let w=box.w,h=w/r;if(h>H){h=H;w=h*r}if(w>W){w=W;h=w/r}const cxm=box.x+box.w/2,cym=box.y+box.h/2;box.w=w*.9;box.h=h*.9;box.x=cxm-box.w/2;box.y=cym-box.h/2;clampBox()};
  const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
  cv.onpointerdown=e=>{const p=pt(e);cv.setPointerCapture(e.pointerId);
   const hi=handles().findIndex(([hx,hy])=>Math.abs(hx-p.x)<12&&Math.abs(hy-p.y)<12);
   if(hi>=0)mode=names[hi];else if(p.x>box.x&&p.x<box.x+box.w&&p.y>box.y&&p.y<box.y+box.h)mode='move';else{mode='new';box={x:p.x,y:p.y,w:1,h:1}}
   start={p,box:{...box}};};
  cv.onpointermove=e=>{if(!mode)return;const p=pt(e),dx=p.x-start.p.x,dy=p.y-start.p.y,b0=start.box;
   if(mode==='move'){box.x=clamp(b0.x+dx,0,W-b0.w);box.y=clamp(b0.y+dy,0,H-b0.h);draw();return}
   let x1=b0.x,y1=b0.y,x2=b0.x+b0.w,y2=b0.y+b0.h;
   if(mode==='new'){x1=start.p.x;y1=start.p.y;x2=p.x;y2=p.y}
   else{if(mode.includes('w'))x1=b0.x+dx;if(mode.includes('e'))x2=b0.x+b0.w+dx;if(mode.includes('n'))y1=b0.y+dy;if(mode.includes('s'))y2=b0.y+b0.h+dy}
   let L=Math.min(x1,x2),R=Math.max(x1,x2),T=Math.min(y1,y2),B=Math.max(y1,y2);L=clamp(L,0,W);R=clamp(R,0,W);T=clamp(T,0,H);B=clamp(B,0,H);
   let w=Math.max(20,R-L),h=Math.max(20,B-T);
   if(ratio){if(mode==='n'||mode==='s')w=h*ratio;else h=w/ratio;if(L+w>W){w=W-L;h=w/ratio}if(T+h>H){h=H-T;w=h*ratio}}
   box={x:mode.includes('w')&&mode!=='new'?Math.min(R-w,W-w):L,y:mode.includes('n')&&mode!=='new'?Math.min(B-h,H-h):T,w,h};clampBox();draw()};
  cv.onpointerup=cv.onpointercancel=()=>{mode=null};
  el.modal.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{el.modal.querySelectorAll('[data-ratio]').forEach(x=>x.classList.toggle('on',x===b));setRatio(ratios.find(r=>r[0]===b.dataset.ratio)[2]);draw()});
  q1('#cropGo').onclick=()=>{
   const sw=Math.round(box.w/K),sh=Math.round(box.h/K),sx=Math.round(box.x/K),sy=Math.round(box.y/K);
   const k=Math.min(1,1600/Math.max(sw,sh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));
   c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
   let out;try{out=/^data:image\/png/.test(url)?fitPng(c):(()=>{let q=.92,u2=c.toDataURL('image/jpeg',q);while(u2.length>1_300_000&&q>.5){q-=.08;u2=c.toDataURL('image/jpeg',q)}if(u2.length>1_300_000)throw Error('The result is too large.');return u2})()}catch(e){return toast(e.message)}
   closeModal();putPicture(t,out);toast('Cropped. Undo (Ctrl+Z) brings the original back.');drawOverlay();
  };
  draw();
 }
 const q1=s=>el.modal.querySelector(s);
 function photoTools(s,i){
  return `<label class="rng">Turn<input type="range" min="-180" max="180" value="${getList(s,'elementRotations',i,0)}" data-b="elrot"></label><label class="rng">Corners<input type="range" min="0" max="50" value="${getList(s,'elementRadius',i,0)}" data-b="elradius"></label><label class="rng">Fade<input type="range" min="10" max="100" value="${getList(s,'elementOpacity',i,100)}" data-b="elopacity"></label><button class="txt" data-b="elflip" title="Flip left and right">Flip</button><button class="txt" data-b="crop" title="Crop this picture">Crop</button>${maskSelect({t:'element',i})}<button class="txt" data-b="rmbg" title="Remove the background">Remove background</button><select data-b="rmtol" aria-label="Background removal strength"><option value="28">Light</option><option value="48" selected>Medium</option><option value="72">Strong</option></select><button class="txt" data-b="elreplace">Replace</button>`;
 }
 // Removes a plain or near-plain background: pixels joined to the picture's edge that look like its corners become transparent.
 async function removeBackground(url,tol){
  const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('That image could not be read.'));im.src=url});
  const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const id=ctx.getImageData(0,0,w,h),d=id.data;
  const at=(x,y)=>{const o=(y*w+x)*4;return [d[o],d[o+1],d[o+2],d[o+3]]};
  const ref=[at(0,0),at(w-1,0),at(0,h-1),at(w-1,h-1),at(w>>1,0),at(w>>1,h-1),at(0,h>>1),at(w-1,h>>1)].filter(p=>p[3]>200);
  if(!ref.length)throw Error('This image already has a transparent background.');
  const near=o=>{if(d[o+3]<8)return true;for(const r of ref){if(Math.abs(d[o]-r[0])+Math.abs(d[o+1]-r[1])+Math.abs(d[o+2]-r[2])<=tol*3)return true}return false};
  const seen=new Uint8Array(w*h),stack=[];
  const push=(x,y)=>{const k=y*w+x;if(seen[k])return;if(near(k*4)){seen[k]=1;stack.push(k)}};
  for(let x=0;x<w;x++){push(x,0);push(x,h-1)}for(let y=0;y<h;y++){push(0,y);push(w-1,y)}
  while(stack.length){const k=stack.pop(),x=k%w,y=(k/w)|0;if(x>0)push(x-1,y);if(x<w-1)push(x+1,y);if(y>0)push(x,y-1);if(y<h-1)push(x,y+1)}
  let removed=0;for(let k=0;k<w*h;k++)if(seen[k]){d[k*4+3]=0;removed++}
  if(removed<w*h*.02)throw Error('No plain background was found. Try Strong, or use a picture with a plain background.');
  if(removed>w*h*.97)throw Error('That removed almost everything. Try Light.');
  // Soften the cut edge so the outline is not jagged.
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x;if(!seen[k]&&(seen[k-1]||seen[k+1]||seen[k-w]||seen[k+w]))d[k*4+3]=Math.min(d[k*4+3],150)}
  ctx.putImageData(id,0,0);
  return fitPng(c);
 }
 // Shrinks a canvas until its PNG fits the studio's per-picture limit.
 function fitPng(c){
  const w=c.width,h=c.height;let k=1;
  for(let i=0;i<10;i++){const t=document.createElement('canvas');t.width=Math.max(1,Math.round(w*k));t.height=Math.max(1,Math.round(h*k));t.getContext('2d').drawImage(c,0,0,t.width,t.height);const out=t.toDataURL('image/png');if(out.length<1_300_000)return out;k*=.8}
  throw Error('The result is too large. Use a smaller image.');
 }
 const loadImg=u=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('That image could not be read.'));im.src=u});
 function applyPhoto(target,out,cut){commit(()=>{
  if(target.t==='art'){slide().image=out;delete slide().hideArt}
  else if(target.t==='slot'){setSlot(target.k,{src:out});if(cut)slide().hideArt=true}
  else{slide().elements[target.i]=out;if(cut)slide().hideArt=true}})}
 const photoOf=t=>{const s=slide();return t.t==='art'?s.image:t.t==='slot'?(s.slots?.[t.k]?.src||(slotDefs()[0]?.[0]===t.k?s.image:'')):s.elements?.[t.i]}
 // AI cutout: the studio's private worker returns several models' results; the person picks the best, then can touch it up.
 async function runRemoveBackground(){
  const s=slide(),target={...sel};let url=photoOf(target);
  if(!url||!isPhotoEl(url)){
   // A template or library picture: make an editable copy first, then cut it out like an upload.
   try{url=await ownPicture(target);applyPhoto(target,url,false)}catch(e){return toast(e.message||'Select a picture first.')}
  }
  openModal(`<h2>Remove background</h2><p class="hint" id="cutMsg">Cutting the picture out with AI. This takes a few seconds…</p><div class="ed-actions"><button class="btn-light" data-act="closemodal">Cancel</button></div>`);
  const token=Symbol();cutToken=token;
  let src;try{const im=await loadImg(url),k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);src=c.toDataURL('image/png')}catch(e){return cutFallback(target,url,e.message)}
  let r;try{r=await api('/cutout',{method:'POST',body:{image:src,engine:'all'}})}catch(e){if(cutToken!==token)return;return cutFallback(target,url,e.message)}
  if(cutToken!==token||el.modal.hidden)return;
  const cands=r.candidates;
  openModal(`<h2>Pick the best cutout</h2><p class="hint">Each model sees the picture differently. Choose the one that kept what you want, then touch it up if needed.</p><div class="cut-grid">${cands.map((c,i)=>`<button class="cut-cell${c.suggested?' on':''}" data-cut="${i}" title="Use this cutout"><span class="cut-checker"><img alt="${esc(c.label)} cutout" src="data:image/png;base64,${c.png_base64}"></span><b>${esc(c.label)}</b>${c.suggested?'<i>Suggested</i>':''}</button>`).join('')}</div><div class="ed-actions"><button class="btn-light" data-cut="plain">Plain background tool</button><button class="btn-light" data-act="closemodal">Cancel</button></div>`);
  el.modal.onclick=async e=>{const b=e.target.closest('[data-cut]');if(!b)return;
   if(b.dataset.cut==='plain'){closeModal();try{const out=await removeBackground(url,48);applyPhoto(target,out,true);toast('Background removed. The template picture behind it is hidden so the removed area stays clear. Undo brings it back.')}catch(err){toast(err.message)}return}
   const c=cands[+b.dataset.cut];refineCutout(target,url,'data:image/png;base64,'+c.png_base64)};
 }
 let cutToken=null;
 // The plain-background tool only works on flat backgrounds, so it is offered, never applied without being asked.
 function cutFallback(target,url,why){
  openModal(`<h2>AI cutout isn’t available</h2><p class="hint">${esc(why)}</p><p class="hint">The plain-background tool still works, but only on pictures with a flat background. On a busy photo it will damage the subject.</p><div class="ed-actions"><button class="btn-light" data-cut="plain">Try the plain-background tool</button><button class="btn-light" data-act="closemodal">Cancel</button></div>`);
  el.modal.onclick=async e=>{if(!e.target.closest('[data-cut=plain]'))return;closeModal();try{const out=await removeBackground(url,48);applyPhoto(target,out,true);toast('Background removed. The template picture behind it is hidden so the removed area stays clear. Undo brings it back.')}catch(err){toast(err.message,6000)}};
 }
 // Touch-up: paint away leftovers or bring back parts the model removed.
 async function refineCutout(target,origUrl,cutUrl){
  const [cutImg,origImg]=await Promise.all([loadImg(cutUrl),loadImg(origUrl)]);
  const w=cutImg.naturalWidth,h=cutImg.naturalHeight;
  const work=document.createElement('canvas');work.width=w;work.height=h;work.getContext('2d').drawImage(cutImg,0,0);
  const orig=document.createElement('canvas');orig.width=w;orig.height=h;orig.getContext('2d').drawImage(origImg,0,0,w,h);
  const history=[];let mode='erase',size=Math.round(Math.max(w,h)*.04);
  openModal(`<h2>Touch up</h2><p class="hint">Erase leftovers or restore parts that were cut by mistake. Drag over the picture.</p>
  <div class="cut-tools"><button class="btn-maroon" data-t="erase">Erase</button><button class="btn-light" data-t="restore">Restore</button><label class="rng">Brush<input type="range" id="cutSize" min="1" max="15" value="4"></label><button class="btn-light" data-t="undo">Undo</button></div>
  <div class="cut-stage cut-checker"><canvas id="cutCv"></canvas></div>
  <div class="ed-actions"><button class="btn-light" data-t="cancel">Cancel</button><button class="btn-maroon" data-t="apply">Use this cutout</button></div>`);
  const cv=$('#cutCv');cv.width=w;cv.height=h;const cx=cv.getContext('2d'),draw=()=>{cx.clearRect(0,0,w,h);cx.drawImage(work,0,0)};draw();
  const wx=work.getContext('2d');let down=false,last=null;
  const pt=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height}};
  const dab=(a,b)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(size/4)));for(let i=0;i<=steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;
    if(mode==='erase'){wx.save();wx.globalCompositeOperation='destination-out';wx.beginPath();wx.arc(x,y,size/2,0,7);wx.fill();wx.restore()}
    else{wx.save();wx.beginPath();wx.arc(x,y,size/2,0,7);wx.clip();wx.drawImage(orig,0,0);wx.restore()}}draw()};
  cv.style.touchAction='none';
  cv.onpointerdown=e=>{down=true;cv.setPointerCapture(e.pointerId);if(history.length>=12)history.shift();const snap=document.createElement('canvas');snap.width=w;snap.height=h;snap.getContext('2d').drawImage(work,0,0);history.push(snap);last=pt(e);dab(last,last)};
  cv.onpointermove=e=>{if(!down)return;const p=pt(e);dab(last,p);last=p};
  cv.onpointerup=cv.onpointercancel=()=>{down=false};
  $('#cutSize').oninput=e=>{size=Math.round(Math.max(w,h)*(+e.target.value)/100)};
  el.modal.onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;const t=b.dataset.t;
   if(t==='erase'||t==='restore'){mode=t;el.modal.querySelectorAll('[data-t=erase],[data-t=restore]').forEach(x=>x.className=x.dataset.t===t?'btn-maroon':'btn-light')}
   else if(t==='undo'){const p=history.pop();if(p){wx.clearRect(0,0,w,h);wx.drawImage(p,0,0);draw()}}
   else if(t==='cancel')closeModal();
   else if(t==='apply'){try{const out=fitPng(work);closeModal();applyPhoto(target,out,true);toast('Background removed. The template picture behind it is hidden so the removed area stays clear. Undo brings it back.')}catch(err){toast(err.message,6000)}}};
 }
 function onBar(e){
  const t=e.target.closest('[data-b]');if(!t||!sel)return;
  const a=t.dataset.b,l=sel.t==='copy'||sel.t==='text'?layerOf():null;
  if(a==='smaller'||a==='bigger')return patchLayer({size:round(clamp(curSize()+(a==='bigger'?.5:-.5),1,30))},'size'),drawBar();
  if(['bold','italic','underline','uppercase','bullets'].includes(a))return patchLayer({[a]:!l[a]}),drawBar();
  if(a==='align'){const order=['left','center','right','justify'];return patchLayer({align:order[(order.indexOf(l.align||'left')+1)%4]}),drawBar()}
  if(a==='colorpop')return colourPanel(t,l.color||slide().ink||'#ffffff',c=>{patchLayer({color:c},'color');drawBar()});
  if(a==='boxpop')return colourPanel(t,l.boxFill||'',c=>{patchLayer({boxFill:c||undefined},'boxfill');drawBar()},{none:'Template colour'});
  if(a==='hlpop')return colourPanel(t,l.bg||'',c=>{patchLayer({bg:c||undefined},'hl');drawBar()},{none:'No background',
   auto:()=>{const acc=/^#[0-9a-f]{6}$/i.test(slide().accent||'')?slide().accent:'#ffd84d',n=parseInt(acc.slice(1),16),lum=(.299*(n>>16)+.587*((n>>8)&255)+.114*(n&255))/255;patchLayer({bg:acc,color:lum>.6?'#101323':'#ffffff'},'hlauto');drawBar()},
   sliders:[{key:'bgPad',label:'Padding',min:0,max:150,value:l.bgPad??100},{key:'bgRadius',label:'Rounded corners',min:0,max:100,value:l.bgRadius??35}],onSlide:(k,v)=>patchLayer({[k]:v},'hl'+k)});
  if(a==='elcolpop'){const i=sel.i;return colourPanel(t,slide().elementColors?.[i]||'#25c8ff',c=>{commit(()=>{const x=[...(slide().elementColors||[])];x[i]=c;slide().elementColors=Array.from({length:slide().elements.length},(_,k)=>x[k]||'#25c8ff')},'elcolor');drawBar()})}
  if(a==='elsolid'){const i=sel.i;commit(()=>setList(slide(),'elementSolid',i,!slide().elementSolid?.[i],false),'elsolid');return drawBar()}
  if(a==='solo'){const m=multi[+t.dataset.n];if(m){select(m,true)}return}
  if(a==='slotpan'){slotPan=!slotPan;return drawBar()}
  if(a==='spacing')return spacingPanel(t);
  if(a==='numbering'){const nx={undefined:'off',off:'on',on:undefined}[String(slide().numbering)];commit(()=>{if(nx)slide().numbering=nx;else delete slide().numbering},'numbering');return drawBar()}
  if(a==='edit'){return startEdit()}
  if(a==='group')return groupSel();
  if(a==='ungroup')return ungroupSel();
  if(a==='forward'||a==='backward')return reorder(a==='forward'?1:-1);
  if(a==='dup')return duplicateSel();
  if(a==='del')return deleteSel();
  if(a==='slotlib'){const t=sel;return libraryPick(url=>commit(()=>setSlot(t.k,{src:url,x:0,y:0,z:100})))}
  if(a==='slotreplace'){const t=sel;return pickPicture(url=>commit(()=>setSlot(t.k,{src:url,x:0,y:0,z:100})))}
  if(a==='slotreset'){const t=sel;return commit(()=>setSlot(t.k,{x:0,y:0,z:100,fx:0,fy:0,fs:100})),drawBar()}
  if(a==='replace')return pickPicture(url=>commit(()=>{slide().image=url;delete slide().hideArt}));
  if(a==='crop')return cropPicture({...sel});
  if(a==='panelcol'){return colourPanel(t,slide().panel?.fill||'',c=>{commit(()=>{slide().panel={...(slide().panel||{}),fill:c||undefined,...(c&&slide().panel?.opacity===undefined?{opacity:100}:{})};if(!c)delete slide().panel.fill},'panelcol');drawBar()},{none:'Template colour'})}
  if(['pgbg','pgacc','pgink','pgfill'].includes(a)){const f={pgbg:'background',pgacc:'accent',pgink:'ink',pgfill:'pageFill'}[a];return colourPanel(t,slide()[f]||'',c=>{commit(()=>{if(c)slide()[f]=c;else delete slide()[f]},'page'+f);drawBar()},{none:'Template colour'})}
  if(a==='pgreset')return commit(()=>{for(const f of ['background','accent','ink','pageFill'])delete slide()[f]},'pagereset'),drawBar();
  if(a==='shapefill'||a==='shapeline'){const i=sel.i,f=a==='shapefill'?'fill':'line';return colourPanel(t,slide().shapes?.[i]?.[f]||'',c=>{patchShape(i,{[f]:c||undefined},'shape'+f);drawBar()},{none:f==='fill'?'No fill':'No outline',...(f==='fill'?{auto:()=>{patchShape(i,{fill:'accent'},'shapefill');drawBar()}}:{})})}
  if(a==='shapeshadow'){const i=sel.i;patchShape(i,{shadow:!slide().shapes?.[i]?.shadow},'shapeshadow');return drawBar()}
  if(a==='shapepic'){const i=sel.i;return pickPicture(url=>{patchShape(i,{src:url,px:50,py:50,z:100},'shapepic');drawBar()})}
  if(a==='shapenopic'){const i=sel.i;patchShape(i,{src:undefined,px:undefined,py:undefined,z:undefined},'shapenopic');return drawBar()}
  if(a==='partfill'||a==='partcolor'){const k=sel.k,f=a==='partfill'?'fill':'color';return colourPanel(t,slide().parts?.[k]?.[f]||'',c=>{commit(()=>{const o={...(slide().parts?.[k]||{})};if(c)o[f]=c;else delete o[f];slide().parts={...(slide().parts||{}),[k]:o}},'part'+f);drawBar()},{none:'Template colour'})}
  if(a==='parthide'){const k=sel.k;return commit(()=>{slide().parts={...(slide().parts||{}),[k]:{...(slide().parts?.[k]||{}),hide:!slide().parts?.[k]?.hide}}}),drawBar()}
  if(a==='partreset'){const k=sel.k;return commit(()=>{const o={...(slide().parts||{})};delete o[k];slide().parts=Object.keys(o).length?o:undefined;if(!slide().parts)delete slide().parts}),drawOverlay()}
  if(a==='panelhide')return commit(()=>{slide().panel={...(slide().panel||{}),hide:!slide().panel?.hide}}),drawBar();
  if(a==='panelreset')return commit(()=>{delete slide().panel}),drawOverlay();
  if(a==='rmbg')return runRemoveBackground();
  if(a==='elreplace'){const t=sel;return pickPicture(url=>commit(()=>{slide().elements[t.i]=url}))}
  if(a==='elfillup'){const t=sel;return pickPicture(url=>commit(()=>setFill(t.i,url)))}
  if(a==='elfilllib'){const t=sel;return libraryPick(url=>commit(()=>setFill(t.i,url)))}
  if(a==='elfillclear'){const t=sel;return commit(()=>setFill(t.i,null))}
  if(a==='elflip'){const t=sel;return commit(()=>{setList(slide(),'elementFlip',t.i,getList(slide(),'elementFlip',t.i,0)?0:1,0)})}
  if(a==='elcenter'){const t=sel;return commit(()=>{const s=slide(),n=s.elements.length,pos=Array.from({length:n},(_,i)=>s.elementPositions?.[i]||elementCenter(i));pos[t.i]={x:50,y:50};s.elementPositions=pos})}
  if(a==='clearimg')return commit(()=>{delete slide().image;delete slide().artX;delete slide().artY;delete slide().artScale});
 }
 function onBarInput(e){
  const t=e.target.closest('[data-b]');if(!t||!sel)return;const a=t.dataset.b,v=t.value;
  if(a==='font')patchLayer({font:v});
  else if(a==='color')patchLayer({color:v},'color');
  else if(a==='effect')patchLayer({effect:v||undefined});
  else if(a==='slotzoom')commit(()=>setSlot(sel.k,{z:+v}),'slotzoom');
  else if(a==='elsize')commit(()=>{const x=[...(slide().elementSizes||[])];x[sel.i]=+v;slide().elementSizes=Array.from({length:slide().elements.length},(_,i)=>x[i]??100)},'elsize');
  else if(a==='elcolor')commit(()=>{const x=[...(slide().elementColors||[])];x[sel.i]=v;slide().elementColors=Array.from({length:slide().elements.length},(_,i)=>x[i]||'#25c8ff')},'elcolor');
  else if(a==='elrot')commit(()=>setList(slide(),'elementRotations',sel.i,+v,0),'elrot');
  else if(a==='elradius')commit(()=>setList(slide(),'elementRadius',sel.i,+v,0),'elradius');
  else if(a==='elopacity')commit(()=>setList(slide(),'elementOpacity',sel.i,+v,100),'elopacity');
  else if(a==='elsx'||a==='elsy'){const key=a==='elsx'?'elementStretchX':'elementStretchY';commit(()=>{const n=slide().elements.length,x=slide()[key]||[];const arr=Array.from({length:n},(_,i)=>x[i]??100);arr[sel.i]=+v;slide()[key]=arr},a)}
  else if(a==='artsx'||a==='artsy')commit(()=>{slide()[a==='artsx'?'artStretchX':'artStretchY']=+v},a);
  else if(a==='artsize')commit(()=>{slide().artScale=+v},'artsize');
  else if(a==='artlayer')commit(()=>{slide().artLayer=v});
  else if(a==='mask'){const t={...sel};commit(()=>{const sl=slide();if(t.t==='art'){if(v)sl.artMask=v;else delete sl.artMask}else if(t.t==='slot')setSlot(t.k,{mask:v||undefined});else{const n=sl.elements.length,arr=Array.from({length:n},(_,i)=>sl.elementMasks?.[i]||'');arr[t.i]=v;sl.elementMasks=arr.some(Boolean)?arr:undefined;if(!sl.elementMasks)delete sl.elementMasks}},'mask')}
  else if(a==='shapekind')patchShape(sel.i,{kind:v},'shapekind');
  else if(a==='shapelw')patchShape(sel.i,{lineW:+v,line:slide().shapes?.[sel.i]?.line||'#111111'},'shapelw');
  else if(a==='shaperad')patchShape(sel.i,{radius:+v},'shaperad');
  else if(a==='shapeop')patchShape(sel.i,{opacity:+v},'shapeop');
  else if(a==='shapez')patchShape(sel.i,{z:+v},'shapez');
  else if(a==='partscale'){const k=sel.k;commit(()=>{slide().parts={...(slide().parts||{}),[k]:{...(slide().parts?.[k]||{}),scale:+v/100}}},'partscale')}
  else if(a==='partop'){const k=sel.k;commit(()=>{slide().parts={...(slide().parts||{}),[k]:{...(slide().parts?.[k]||{}),opacity:+v}}},'partop')}
  else if(a==='panelop')commit(()=>{slide().panel={...(slide().panel||{}),opacity:+v}},'panelop');
  else if(a==='panelrad')commit(()=>{slide().panel={...(slide().panel||{}),radius:+v}},'panelrad');
  if(e.type==='change')drawOverlay();
 }
 // Photo layouts: a slot is one named picture frame. The first slot is also the page's main picture (slide.image).
 const slotDefs=()=>GSNKit.templates[design.template_id]?.slots||[];
 const slotLabel=k=>slotDefs().find(x=>x[0]===k)?.[1]||'Picture';
 let slotPan=false;
 function setSlot(k,patch){const s=slide();s.slots={...(s.slots||{}),[k]:{...(s.slots?.[k]||{}),...patch}}}
 function clearSlot(k){const s=slide();if(s.slots?.[k]){const {src,...rest}=s.slots[k];s.slots={...s.slots,[k]:rest}}if(slotDefs()[0]?.[0]===k)delete s.image}
 function layerKey(s=sel){return s.t==='slot'?'slot:'+s.k:s.t==='copy'?s.k:s.t==='text'?'text:'+s.i:s.t==='element'?'element:'+s.i:s.t==='panel'?'panel':s.t==='part'?'part:'+s.k:s.t==='page'?'page':s.t==='shape'?'shape:'+s.i:'artwork'}
 function fullOrder(){
  const s=slide(),keys=[...(s.shapes||[]).map((_,i)=>'shape:'+i),...DEFAULT_ORDER,...(s.elements||[]).map((_,i)=>'element:'+i),...(s.texts||[]).map((_,i)=>'text:'+i)];
  const own=(s.layerOrder||[]).filter(k=>keys.includes(k));return [...own,...keys.filter(k=>!own.includes(k))];
 }
 function reorder(dir){
  commit(()=>{const o=fullOrder(),k=layerKey(),i=o.indexOf(k),j=clamp(i+dir,0,o.length-1);o.splice(i,1);o.splice(j,0,k);slide().layerOrder=o});drawOverlay();
 }
 function duplicateSel(){
  if(!sel)return;
  commit(()=>{const s=slide();
   if(sel.t==='text'){s.texts=[...s.texts,{...s.texts[sel.i],left:clamp(s.texts[sel.i].left+3,-50,150),top:clamp(s.texts[sel.i].top+3,-50,150)}];sel={t:'text',i:s.texts.length-1}}
   else if(sel.t==='shape'){const a=s.shapes||[];if(a.length>=40)return toast('A page can hold 40 shapes.');const c={...a[sel.i],x:round(clamp(a[sel.i].x+3,-50,150)),y:round(clamp(a[sel.i].y+3,-50,150))};s.shapes=[...a,c];sel={t:'shape',i:a.length}}
   else if(sel.t==='element'){const n=s.elements.length;if(n>=24)return toast('A page can hold 24 elements.');const c=elementCenter(sel.i);
    s.elements=[...s.elements,s.elements[sel.i]];s.elementPositions=[...Array.from({length:n},(_,i)=>s.elementPositions?.[i]||elementCenter(i)),{x:clamp(c.x+3,0,100),y:clamp(c.y+3,0,100)}];
    s.elementSizes=[...Array.from({length:n},(_,i)=>s.elementSizes?.[i]??100),s.elementSizes?.[sel.i]??100];
    if(s.elementColors)s.elementColors=[...Array.from({length:n},(_,i)=>s.elementColors[i]||'#25c8ff'),s.elementColors[sel.i]||'#25c8ff'];
    for(const [k,d] of [['elementStretchX',100],['elementStretchY',100],['elementRotations',0],['elementRadius',0],['elementOpacity',100],['elementFlip',0],['elementFills',null],['elementSolid',false]])if(s[k])s[k]=[...Array.from({length:n},(_,i)=>s[k][i]??d),s[k][sel.i]??d];
    sel={t:'element',i:n}}
  });
  drawOverlay();
 }
 function deleteOne(s,m){
  if(m.t==='text'){s.texts=s.texts.filter((_,i)=>i!==m.i);s.layerOrder=remap(s.layerOrder,'text:',m.i);remapGroups(s,'text:',m.i)}
  else if(m.t==='element'){const i=m.i,f=a=>a?.filter((_,n)=>n!==i);s.elements=f(s.elements);for(const k of ['elementPositions','elementSizes','elementColors','elementSolid','elementStretchX','elementStretchY','elementRotations','elementRadius','elementOpacity','elementFlip','elementFills'])if(s[k])s[k]=f(s[k]);s.layerOrder=remap(s.layerOrder,'element:',i);remapGroups(s,'element:',i)}
  else if(m.t==='copy'&&m.k!=='title')s[m.k]='';
  else if(m.t==='art'){delete s.image;s.motif='none'}
  else if(m.t==='slot')clearSlot(m.k);
  else if(m.t==='shape'){s.shapes=(s.shapes||[]).filter((_,i)=>i!==m.i);if(!s.shapes.length)delete s.shapes;s.layerOrder=remap(s.layerOrder,'shape:',m.i);remapGroups(s,'shape:',m.i)}
  else if(m.t==='part')s.parts={...(s.parts||{}),[m.k]:{...(s.parts?.[m.k]||{}),hide:true}};
  else if(m.t==='panel')s.panel={...(s.panel||{}),hide:true};
 }

 /* ---------- free shapes and picture frames ---------- */
 // A shape colour is a hex or a page colour name (accent, ink...). The bar shows the colour the page really uses for the name.
 function shapeColourCss(v){
  if(/^#[0-9a-f]{6}$/i.test(v||''))return v;
  const map={accent:'--a',accent2:'--a2',onaccent:'--on-a',ink:'--fg',soft:'--card',line:'--line',paper:'--paper'};
  const art=el.host.shadowRoot?.querySelector('.art');
  return map[v]&&art?(getComputedStyle(art).getPropertyValue(map[v]).trim()||'transparent'):'transparent';
 }
 function patchShape(i,obj,key){
  commit(()=>{const a=(slide().shapes||[]).map(x=>({...x}));if(!a[i])return;a[i]={...a[i],...obj};for(const k of Object.keys(a[i]))if(a[i][k]===undefined)delete a[i][k];slide().shapes=a},key);
 }
 function addShape(kind,opts={}){
  const s=slide();if((s.shapes||[]).length>=40)return toast('A page can hold 40 shapes.');
  const acc=/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#b0f000';
  const at=(s.shapes||[]).length;
  const w=opts.w??(kind==='oval'||kind==='diamond'||kind==='star'||kind==='triangle'?28:44),h=opts.h??(kind==='pill'?14:kind==='oval'||kind==='diamond'||kind==='star'||kind==='triangle'?22:opts.frame?28:20);
  const shape={kind,x:round(clamp(50-w/2+at%4*2,-50,150)),y:round(clamp(46-h/2+at%4*2,-50,150)),w,h,...(opts.frame?{fill:'#d9d9de'}:{fill:acc,...(opts.outline?{line:'#111111',lineW:2.5}:{})}),...(kind==='round'?{radius:5}:{})};
  commit(()=>{s.shapes=[...(s.shapes||[]),shape];sel={t:'shape',i:at};multi=[]});
  drawOverlay();
  if(opts.frame)pickPicture(url=>{patchShape(at,{src:url,px:50,py:50,z:100},'shapepic');drawOverlay()});
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
  let keys=members().map(m=>layerKey(m));
  const g0=groupFor(keys[0]);if(g0)keys=[...new Set([...keys,...g0])];
  commit(()=>{const s=slide();s.groups=(s.groups||[]).filter(g=>!g.some(k=>keys.includes(k)));if(!s.groups.length)delete s.groups});
  const again=keys.map(selOf);multi=again.length>1?again:[];drawOverlay();toast('Ungrouped. Click each item to edit it. Press Group to join them again.');
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
   else if(sel.t==='slot'){const b0=s.slots?.[sel.k]||{};setSlot(sel.k,{x:round(clamp((b0.x||0)-dx*2,-100,100)),y:round(clamp((b0.y||0)-dy*2,-100,100))})}
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
  ({templates:toolTemplates,elements:toolElements,text:toolText,uploads:toolUploads,people:toolPeople,background:toolBackground,brand:toolBrand,pages:toolPages,resize:toolResize})[id](body);
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
 // Spacing panel: letter spacing and line spacing for the selected text.
 function spacingPanel(anchor){
  document.querySelector('.ed-cpanel')?.remove();
  const l=layerOf();
  const box=document.createElement('div');box.className='ed-cpanel ed-spacing';
  box.innerHTML=`<label class="sp-row">Letter spacing <output id="spLv">${l.spacing??0}</output><input type="range" id="spL" min="-10" max="40" step="1" value="${l.spacing??0}"></label>
  <label class="sp-row">Line spacing <output id="spHv">${l.lineHeight??100}</output><input type="range" id="spH" min="70" max="250" step="5" value="${l.lineHeight??100}"></label>
  <button class="btn-light" id="spReset">Reset spacing</button>`;
  document.body.appendChild(box);
  const r=anchor.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(innerWidth-bw-8,r.left))+'px';
  box.style.top=(r.bottom+8+bh<innerHeight?r.bottom+8:Math.max(8,r.top-bh-8))+'px';
  $('#spL',box).oninput=ev=>{$('#spLv',box).textContent=ev.target.value;patchLayer({spacing:+ev.target.value},'spacingL')};
  $('#spH',box).oninput=ev=>{$('#spHv',box).textContent=ev.target.value;patchLayer({lineHeight:+ev.target.value},'spacingH')};
  $('#spReset',box).onclick=()=>{patchLayer({spacing:undefined,lineHeight:undefined},'spacingR');box.remove()};
  const away=ev=>{if(!box.contains(ev.target)&&!anchor.contains(ev.target)){box.remove();document.removeEventListener('pointerdown',away,true)}};
  setTimeout(()=>document.addEventListener('pointerdown',away,true),0);
 }
 // Colour panel (like Canva's): hex box, eyedropper, colours already in this design, your saved brand colours, standard colours.
 function designColours(){
  const set=new Set(),add=c=>{if(/^#[0-9a-f]{6}$/i.test(c||''))set.add(c.toLowerCase())};
  for(const p of design.pages){add(p.background);add(p.ink);add(p.accent);add(p.pageFill);(p.elementColors||[]).forEach(add);for(const l of Object.values(p.textLayers||{})){add(l.color);add(l.bg)}for(const t of p.texts||[]){add(t.color);add(t.bg)}}
  return [...set].slice(0,14);
 }
 function colourPanel(anchor,current,done,opt={}){
  document.querySelector('.ed-cpanel')?.remove();
  const std=['#000000','#444444','#888888','#cccccc','#ffffff','#e53935','#fb48b5','#ff9b27','#ffd84d','#70eb8e','#00a86b','#25c8ff','#1e63e9','#7a3cff','#8a2236','#101323'];
  const sw=a=>a.map(c=>`<button class="sw" data-cp="${c}" title="${c}" aria-label="${c}" style="background:${c}"></button>`).join('');
  const box=document.createElement('div');box.className='ed-cpanel';
  const cur=/^#[0-9a-f]{6}$/i.test(current)?current:'#ac82f4';
  box.innerHTML=`<div class="cp-row"><input type="text" class="cp-hex" maxlength="7" value="${/^#[0-9a-f]{6}$/i.test(current)?current:''}" placeholder="Try #00c4cc" aria-label="Hex colour"><input type="color" class="cp-native" value="${cur}" aria-label="Pick any colour">${window.EyeDropper?'<button class="cp-eye" title="Pick a colour from the screen" aria-label="Eyedropper">⌖</button>':''}</div>
  ${opt.none?`<button class="cp-none" data-cp="">${esc(opt.none)}</button>`:''}
  ${opt.auto?'<button class="cp-none cp-auto" data-auto>Auto fill (uses the page accent colour)</button>':''}
  ${(opt.sliders||[]).map(x=>`<label class="cp-rng">${esc(x.label)}<input type="range" min="${x.min}" max="${x.max}" value="${x.value}" data-sl="${x.key}"></label>`).join('')}
  ${designColours().length?`<h4>Colours in this design</h4><div class="cp-grid">${sw(designColours())}</div>`:''}
  ${kit().length?`<h4>Brand colours</h4><div class="cp-grid">${sw(kit())}</div>`:''}
  <h4>Standard colours</h4><div class="cp-grid">${sw(std)}</div>`;
  document.body.appendChild(box);
  const r=anchor.getBoundingClientRect(),bw=box.offsetWidth,bh=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(innerWidth-bw-8,r.left))+'px';
  const below=r.bottom+8+bh<innerHeight;box.style.top=(below?r.bottom+8:Math.max(8,r.top-bh-8))+'px';
  const pick=c=>{done(c)};
  box.querySelectorAll('[data-sl]').forEach(r=>r.oninput=()=>opt.onSlide?.(r.dataset.sl,+r.value));
  box.querySelector('[data-auto]')?.addEventListener('click',()=>opt.auto?.());
  const hexIn=$('.cp-hex',box);
  hexIn.onchange=()=>{let v=hexIn.value.trim().toLowerCase();if(/^[0-9a-f]{6}$/.test(v))v='#'+v;if(/^#[0-9a-f]{6}$/.test(v))pick(v);else toast('Use a hex colour such as #00c4cc.')};
  $('.cp-native',box).oninput=ev=>{hexIn.value=ev.target.value;pick(ev.target.value)};
  $('.cp-eye',box)&&($('.cp-eye',box).onclick=async()=>{try{pick((await new EyeDropper().open()).sRGBHex)}catch{}});
  box.onclick=ev=>{const b=ev.target.closest('[data-cp]');if(b){pick(b.dataset.cp);if(!b.classList.contains('cp-none')||true){}}};
  const away=ev=>{if(!box.contains(ev.target)&&!anchor.contains(ev.target)){box.remove();document.removeEventListener('pointerdown',away,true)}};
  setTimeout(()=>document.addEventListener('pointerdown',away,true),0);
  hexIn.focus();hexIn.select();
 }
 function toolElements(body){
  const keys=Object.keys(GSNKit.slideElements);
  body.innerHTML=`<p class="hint">Click to add. Drag it into place; resize from the corner. Click the colour dot above the shape to change its colour.</p>
  <h3>Boxes, pills and picture frames</h3><p class="hint">Place them anywhere. Resize from the right, bottom or corner handle; set fill, outline, corners and shadow in the bar above. A frame holds a picture you can move inside it.</p><div class="ed-egrid">${Object.entries(GSNKit.SHAPE_KINDS).map(([k,n])=>`<button data-addshape="${k}" title="Add ${esc(n)}" aria-label="Add ${esc(n)}"><i class="shp-ic shp-${k}"></i><span>${esc(n)}</span></button>`).join('')}<button data-addshape="round" data-frame="1" title="Picture frame (rounded)"><i class="shp-ic shp-round pic"></i><span>Picture frame</span></button><button data-addshape="pill" data-frame="1" title="Picture pill"><i class="shp-ic shp-pill pic"></i><span>Picture pill</span></button><button data-addshape="oval" data-frame="1" title="Picture oval"><i class="shp-ic shp-oval pic"></i><span>Picture oval</span></button><button data-addshape="rect" data-outline="1" title="Outlined box"><i class="shp-ic shp-rect line"></i><span>Outlined box</span></button></div>
  <h3>Colour shapes</h3><div class="ed-egrid">${['rect','rounded','circle','triangle','diamond','star','heart','chat'].map(k=>`<button data-elsolid="${k}" title="Solid ${esc(GSNKit.slideElements[k][0])}" aria-label="Add solid ${esc(GSNKit.slideElements[k][0])}"><svg viewBox="0 0 24 24" class="solid-ic" fill="${slide().accent&&/^#[0-9a-f]{6}$/i.test(slide().accent)?slide().accent:'#ac82f4'}" stroke="none">${GSNKit.slideElements[k][1]}</svg><span>${esc(GSNKit.slideElements[k][0])}</span></button>`).join('')}</div>
  <h3>Lines, icons and illustrations</h3><div class="ed-egrid">${keys.map(k=>`<button data-el="${k}" title="${esc(GSNKit.slideElements[k][0])}" aria-label="Add ${esc(GSNKit.slideElements[k][0])}">${platformIcon(k)}<span>${esc(GSNKit.slideElements[k][0])}</span></button>`).join('')}</div>`;
 }
 function addElement(key,at){
  const s=slide();if((s.elements||[]).length>=24)return toast('A page can hold 24 elements.');
  commit(()=>{const n=(s.elements||[]).length;
   s.elementPositions=[...Array.from({length:n},(_,i)=>s.elementPositions?.[i]||(nodeFor({t:'element',i})?elementCenter(i):{x:50,y:50})),at||{x:50,y:50}];
   s.elements=[...(s.elements||[]),key];
   s.elementSizes=[...Array.from({length:n},(_,i)=>s.elementSizes?.[i]??100),/^data:/.test(key)?190:100];
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
 // Saved faces and mascots: one click puts the person into this page's picture, replacing whatever picture the template had.
 function toolPeople(body){
  body.innerHTML='<div class="pp-editor"></div>';
  People.mount(body.firstChild,{onUse:async p=>{commit(()=>{const s=slide();if(sel?.t==='slot')setSlot(sel.k,{src:p.image,x:0,y:0,z:100});else{s.image=p.image;if(slotDefs()[0])setSlot(slotDefs()[0][0],{src:p.image,x:0,y:0,z:100});delete s.artX;delete s.artY;delete s.artScale}});toast(`${p.name} is on this page. Undo brings the old picture back.`)}});
 }
 function toolUploads(body){
  body.innerHTML=`<p class="hint">Photos are saved with the design on the server.</p><label class="ed-drop"><input type="file" accept="image/*,.jfif,.avif,.webp,.svg" multiple hidden id="edFile">${icon('upload')}<b>Upload images</b><small>PNG, JPG, WebP, GIF, SVG or AVIF</small></label><button class="btn-light" id="edLib">Browse GSN pictures</button><div class="ed-ugrid" id="edUg"></div>`;
  const draw=()=>{$('#edUg').innerHTML=uploads.map((u,i)=>`<div class="ed-up"><img src="${u}" alt="Upload ${i+1}" draggable="true" data-dragup="${i}" title="Drag onto the page"><div><button data-up="el" data-i="${i}">Add to page</button><button data-up="bg" data-i="${i}">Set as image</button><button data-up="del" data-i="${i}">Delete</button></div></div>`).join('')+(uploads.length?'<button class="btn-light" data-up="clear" style="grid-column:1/3">Delete all uploads</button>':'')};
  $('#edFile').onchange=async e=>{for(const f of e.target.files){try{addUpload(await compress(f))}catch(err){toast(err.message)}}e.target.value='';draw()};
  $('#edLib').onclick=()=>libraryPick(u=>{uploads.unshift(u);draw()});
  draw();
 }
 // GSN picture library: every picture (photos, 3D agency, metaphors, comic characters) can be placed on a page or in a slot. A picked cell is cropped to its own
 // picture, so it behaves like any upload: replaceable, movable and zoomable.
 async function libraryCell(p){
  const img=new Image();img.src=p.file;await img.decode();const cell=img.naturalWidth*100/parseFloat(p.size);const [px,py]=p.position.split(' ').map(parseFloat);
  const sx=px/100*(img.naturalWidth-cell),sy=py/100*(img.naturalHeight-cell),c=document.createElement('canvas');c.width=c.height=900;
  c.getContext('2d').drawImage(img,sx,sy,cell,cell,0,0,900,900);return c.toDataURL('image/jpeg',.9);
 }
 function libraryPick(done){
  const all=[];for(let i=0;i<1400;i++){const p=GSNKit.gsnLibraryPhoto('gsn-'+i);if(!p)break;all.push({...p,i})}
  const d=document.createElement('dialog');d.className='ed-lib';
  d.innerHTML=`<header><h2>GSN pictures</h2><form method="dialog"><button aria-label="Close">×</button></form></header><input type="search" placeholder="Search, e.g. panda, comic, laptop" aria-label="Search pictures"><div class="ed-lib-grid"></div><footer><button class="btn-light" data-p>Previous</button><span></span><button class="btn-light" data-n>Next</button></footer>`;
  const q=d.querySelector('input'),grid=d.querySelector('.ed-lib-grid'),info=d.querySelector('span');let pg=0;const N=24;
  const draw=()=>{const f=all.filter(p=>(p.name+' '+(p.sector||'')).toLowerCase().includes(q.value.toLowerCase().trim()));
   const max=Math.max(1,Math.ceil(f.length/N));pg=Math.min(pg,max-1);info.textContent=`${f.length} pictures · page ${pg+1} of ${max}`;
   grid.innerHTML=f.slice(pg*N,pg*N+N).map(p=>`<button data-i="${p.i}" title="${esc(p.name)}"><span style="background-image:url('${p.file}');background-position:${p.position};background-size:${p.size}"></span><b>${esc(p.name)}</b></button>`).join('')||'No pictures match.';
   d.querySelector('[data-p]').disabled=pg===0;d.querySelector('[data-n]').disabled=pg>=max-1};
  q.oninput=()=>{pg=0;draw()};d.querySelector('[data-p]').onclick=()=>{pg--;draw()};d.querySelector('[data-n]').onclick=()=>{pg++;draw()};
  grid.onclick=async e=>{const b=e.target.closest('button[data-i]');if(!b)return;const p=all[+b.dataset.i];
   try{const url=await libraryCell(p);d.close();done(url)}catch(err){toast('That picture could not be loaded.')}};
  d.addEventListener('close',()=>d.remove());document.body.append(d);draw();d.showModal();
 }
 // Any picture the browser can open (PNG, JPG, WebP, AVIF, GIF, BMP, SVG, JFIF...) is turned into a PNG or JPG that fits the design.
 const IMG_OK=f=>!f.type||/^image\//.test(f.type)||/\.(png|jpe?g|jfif|webp|avif|gif|bmp|svg|heic|heif)$/i.test(f.name||'');
 async function decodeImage(file){
  try{return await createImageBitmap(file)}catch{}
  const url=URL.createObjectURL(file);
  try{const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('x'));i.src=url});
   const w=im.naturalWidth||1000,h=im.naturalHeight||1000;return {width:w,height:h,draw:(ctx,cw,ch)=>ctx.drawImage(im,0,0,cw,ch),el:im}}
  catch{throw Error(/\.(heic|heif)$/i.test(file.name||'')?'This browser cannot open HEIC photos. Save it as JPG or PNG first.':'This file could not be opened as a picture. Try a PNG, JPG or WebP.')}
  finally{setTimeout(()=>URL.revokeObjectURL(url),4000)}
 }
 async function compress(file){
  if(!IMG_OK(file))throw Error('Choose a picture file (PNG, JPG, WebP, GIF, AVIF or SVG).');
  const bitmap=await decodeImage(file);let max=1600,q=.86;
  const jpeg=/jpe?g|jfif/i.test(file.type+(file.name||''));
  for(let i=0;i<8;i++){
   const k=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*k));c.height=Math.max(1,Math.round(bitmap.height*k));
   const ctx=c.getContext('2d');if(jpeg){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)}
   if(bitmap.draw)bitmap.draw(ctx,c.width,c.height);else ctx.drawImage(bitmap,0,0,c.width,c.height);
   const url=c.toDataURL(!jpeg&&i<3?'image/png':'image/jpeg',q);
   if(url.length<1_300_000)return url;max*=.8;q=Math.max(.5,q-.06);
  }
  throw Error('That image is too large. Try a smaller one.');
 }

 // Replace a picture: from the GSN library, from pictures already uploaded, or from this computer.
 function pickPicture(done){
  const d=document.createElement('dialog');d.className='ed-lib ed-src';
  const mine=uploads.slice(0,60);
  d.innerHTML=`<header><h2>Replace picture</h2><form method="dialog"><button aria-label="Close">×</button></form></header>
  <div class="ed-src-row"><button class="btn-light" data-s="lib">From GSN library</button><button class="btn-light" data-s="up">From my uploads <i>${uploads.length}</i></button><button class="btn-maroon" data-s="pc">From my computer</button></div>
  <div class="ed-src-up" hidden><p class="hint">Click a picture to use it. Uploads stay here until you delete them.</p><div class="ed-lib-grid">${mine.map((u,i)=>`<button data-u="${i}"><span style="background-image:url('${u}');background-size:cover;background-position:center"></span></button>`).join('')||'<p class="hint">No uploads yet.</p>'}</div></div>`;
  d.onclick=e=>{
   const b=e.target.closest('[data-s]');
   if(b){const k=b.dataset.s;
    if(k==='pc'){d.close();return pickImage(done)}
    if(k==='lib'){d.close();return libraryPick(done)}
    d.querySelector('.ed-src-up').hidden=false;return}
   const u=e.target.closest('[data-u]');if(u){const url=mine[+u.dataset.u];d.close();done(url)}
  };
  d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
 }
 function pickImage(done){
  const input=document.createElement('input');input.type='file';input.accept='image/*,.jfif,.avif,.webp,.svg';
  input.onchange=async()=>{try{const u=await compress(input.files[0]);addUpload(u);done(u)}catch(e){toast(e.message)}};input.click();
 }

 // Page background: a colour, your own picture, or no template picture. Works on every template.
 let applyAll=true;
 function toolBackground(body){
  const s=slide(),hex=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
  body.innerHTML=`<label class="ed-check"><input type="checkbox" id="edBgAll" ${applyAll?'checked':''}> Apply to all pages <small>(untick to style only this page)</small></label>
  <h3>Page colour</h3>
  <label class="ed-colour">Fill the whole page<span><input type="color" id="edBgCol" value="${hex(s.pageFill,'#ffffff')}"><input type="text" id="edBgHex" value="${hex(s.pageFill,'#ffffff')}" maxlength="7" aria-label="Page colour hex"></span></label>
  <div class="ed-pal">${['#ffffff','#f8f1e7','#fbe3e8','#e4ecff','#e3f6ec','#101323','#1f2a44','#8a2236','#ffd84d','#00a86b','#25c8ff','#000000'].map(c=>`<button data-c="${c}" title="${c}" aria-label="${c}"><i style="background:${c};width:100%"></i></button>`).join('')}</div>
  <h3>Page picture</h3>
  <p class="hint">Use your own picture behind the page, or hide the template's own picture.</p>
  <div class="ed-row"><button class="btn-light" id="edBgUp">Upload picture</button><button class="btn-light" id="edBgLib">GSN pictures</button></div>
  ${uploads.length?`<div class="ed-ugrid">${uploads.slice(0,8).map((u,i)=>`<div class="ed-up"><img src="${u}" alt="Upload ${i+1}" data-bgup="${i}" title="Use as page background"></div>`).join('')}</div>`:''}
  <label class="ed-check"><input type="checkbox" id="edHide" ${s.hideArt?'checked':''}> Hide the template's picture</label>
  <button class="btn-light" id="edBgClear">Remove page colour and picture</button>`;
  $('#edBgAll').onchange=e=>{applyAll=e.target.checked};
  const targets=()=>applyAll?design.pages:[slide()];
  const set=(patch,key)=>commit(()=>{for(const t of targets())for(const [k,v] of Object.entries(patch)){if(v===undefined)delete t[k];else t[k]=v}},key||'bg');
  const colour=v=>{$('#edBgHex').value=v;$('#edBgCol').value=v;set({pageFill:v},'bgcol')};
  $('#edBgCol').oninput=e=>colour(e.target.value);
  $('#edBgHex').onchange=e=>{const v=e.target.value.trim().toLowerCase();if(/^#[0-9a-f]{6}$/.test(v))colour(v);else toast('Use a hex colour such as #ac82f4.')};
  $$('[data-c]',body).forEach(b=>b.onclick=()=>colour(b.dataset.c));
  $('#edBgUp').onclick=()=>pickImage(u=>{set({pageImage:u});toolBackground(body)});
  $('#edBgLib').onclick=()=>libraryPick(u=>{uploads.unshift(u);set({pageImage:u});toolBackground(body)});
  $$('[data-bgup]',body).forEach(i=>i.onclick=()=>{set({pageImage:uploads[+i.dataset.bgup]})});
  $('#edHide').onchange=e=>set({hideArt:e.target.checked||undefined});
  $('#edBgClear').onclick=()=>{set({pageFill:undefined,pageImage:undefined,hideArt:undefined});toolBackground(body)};
 }
 // The brand colours saved in Settings belong to the workspace, so every creator in it sees and uses the same ones. This browser's own list is kept as a fallback.
 let brandCfg=null;
 async function loadBrand(){try{brandCfg=await api('/config')}catch{brandCfg=null}}
 const kit=()=>{let own=[];try{own=JSON.parse(localStorage.getItem('gsn-brand-kit')||'[]').filter(c=>/^#[0-9a-f]{6}$/.test(c))}catch{}
  const cfg=brandCfg&&!brandCfg.is_default?[...(brandCfg.palette||[]),brandCfg.accent,brandCfg.background,brandCfg.ink].filter(c=>/^#[0-9a-f]{6}$/i.test(c||'')).map(c=>c.toLowerCase()):[];
  return [...new Set([...cfg,...own])].slice(0,16)};
 const saveKit=a=>{
  try{localStorage.setItem('gsn-brand-kit',JSON.stringify(a))}catch{}
  // A manager's saved colours go to the workspace, so every new design and every creator starts from them.
  api('/config',{method:'PUT',body:{palette:a.slice(0,12)}}).then(c=>{brandCfg=c}).catch(()=>{});
 };
 function toolBrand(body){
  const s=slide(),pal=GSNKit.palettes,hex=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v:f;
  body.innerHTML=`<p class="hint">Your brand colours. They apply to every page unless you untick the box.</p>
  <label class="ed-check"><input type="checkbox" id="edAll" ${applyAll?'checked':''}> Apply to all pages <small>(untick to style only this page)</small></label>
  ${[['accent','Accent','#ac82f4'],['background','Background','#101323'],['ink','Text','#f8faff']].map(([k,l,f])=>`<label class="ed-colour">${l}<span><input type="color" data-col="${k}" value="${hex(s[k],f)}"><input type="text" data-hex="${k}" value="${hex(s[k],f)}" maxlength="7" aria-label="${l} hex"></span></label>`).join('')}
  <h3>Palettes</h3><div class="ed-pal">${pal.map(p=>`<button data-pal="${p[0]}" title="${p[0]}" aria-label="${p[0]} palette"><i style="background:${p[1]}"></i><i style="background:${p[2]}"></i><i style="background:${p[3]}"></i></button>`).join('')}</div>
  <h3>My brand colours</h3><p class="hint">Save your exact brand colours once. Click one to use it as the accent; use the buttons to send it to the background or text.</p>
  <div class="ed-row"><input type="color" id="edKitNew" value="${hex(s.accent,'#ac82f4')}" aria-label="New brand colour"><input type="text" id="edKitHex" maxlength="7" placeholder="#ac82f4" aria-label="Brand colour hex"><button class="btn-light" id="edKitAdd">Save colour</button>${window.EyeDropper?'<button class="btn-light" id="edKitPick">Pick from screen</button>':''}</div>
  <div class="ed-kit">${kit().map((c,i)=>`<span class="ed-kitc"><button data-kit="${i}" title="${c}" aria-label="Use ${c}" style="background:${c}"></button><small>${c}</small><button data-kitrm="${i}" aria-label="Remove ${c}">×</button></span>`).join('')||'<small>No saved colours yet.</small>'}</div>
  <div class="ed-row"><button class="btn-light" id="edKitBg">Set as background</button><button class="btn-light" id="edKitInk">Set as text</button></div>
  ${brandCfg&&!brandCfg.is_default?'<button class="btn-maroon" id="edUseBrand" title="Set the accent, background and text colour saved in Settings">Use my brand colours</button>':'<p class="hint">Save your brand colours in Settings and every new design starts with them.</p>'}
  <button class="btn-light" id="edRecolour">Recolour all shapes with the accent</button>
  <h3>Brand</h3><label class="ed-colour">Brand name<input id="edBn" maxlength="80" value="${esc(design.brand.name)}"></label><label class="ed-colour">Handle<input id="edBh" maxlength="80" value="${esc(design.brand.handle)}"></label><button class="btn-light" id="edInkAll">Use the text colour on every text</button><button class="btn-light" data-act="resetcolors">Reset page colours</button>`;
  $('#edAll').onchange=e=>{applyAll=e.target.checked};
  const apply=(patch)=>commit(()=>{const targets=applyAll?design.pages:[slide()];for(const t of targets)Object.assign(t,patch)},'colour');
  $$('[data-col]',body).forEach(i=>i.oninput=()=>{apply({[i.dataset.col]:i.value});$(`[data-hex=${i.dataset.col}]`,body).value=i.value});
  $$('[data-hex]',body).forEach(i=>i.onchange=()=>{if(/^#[0-9a-f]{6}$/i.test(i.value))apply({[i.dataset.hex]:i.value.toLowerCase()});else toast('Use a hex colour such as #ac82f4.')});
  $$('[data-pal]',body).forEach(b=>b.onclick=()=>{const p=pal.find(x=>x[0]===b.dataset.pal);apply({background:p[1],ink:p[2],accent:p[3]});toolBrand(body)});
  let kitSel=kit()[0]||null;
  const kadd=v=>{v=(v||'').trim().toLowerCase();if(!/^#[0-9a-f]{6}$/.test(v)){toast('Use a hex colour such as #ac82f4.');return}saveKit([v,...kit().filter(c=>c!==v)].slice(0,12));toolBrand(body)};
  $('#edKitAdd').onclick=()=>kadd($('#edKitHex').value||$('#edKitNew').value);
  $('#edKitPick')&&($('#edKitPick').onclick=async()=>{try{kadd((await new EyeDropper().open()).sRGBHex)}catch{}});
  $$('[data-kit]',body).forEach(b=>b.onclick=()=>{kitSel=kit()[+b.dataset.kit];apply({accent:kitSel});toolBrand(body)});
  $$('[data-kitrm]',body).forEach(b=>b.onclick=()=>{saveKit(kit().filter((_,i)=>i!==+b.dataset.kitrm));toolBrand(body)});
  $('#edKitBg').onclick=()=>{kitSel=kitSel||kit()[0];if(kitSel){apply({background:kitSel});toolBrand(body)}else toast('Save a colour first.')};
  $('#edKitInk').onclick=()=>{kitSel=kitSel||kit()[0];if(kitSel){apply({ink:kitSel});toolBrand(body)}else toast('Save a colour first.')};
  $('#edUseBrand')&&($('#edUseBrand').onclick=()=>{const c=brandCfg,p={};if(c.accent)p.accent=c.accent;if(c.background)p.background=c.background;if(c.ink)p.ink=c.ink;apply(p);toolBrand(body)});
  $('#edRecolour').onclick=()=>commit(()=>{for(const t of (applyAll?design.pages:[slide()])){const a=hex(t.accent,'#ac82f4');t.elementColors=(t.elements||[]).map(()=>a)}},'recolour');
  const brand=()=>commit(()=>{design.brand={name:$('#edBn').value.trim()||design.brand.name,handle:$('#edBh').value.trim()||design.brand.handle}},'brand');
  $('#edBn').oninput=brand;$('#edBh').oninput=brand;
  $('#edInkAll').onclick=()=>commit(()=>{for(const t of (applyAll?design.pages:[slide()])){const ink=hex(t.ink,'#f8faff');for(const k of Object.keys(t.textLayers||{}))if(t.textLayers[k].color)t.textLayers[k].color=ink;for(const x of (t.texts||[]))if(x.color)x.color=ink}},'inkall');
 }
 // Adding a page: pick a designed layout (or copy this page). New pages inherit the pack's colours and photo.
 const LAYOUT_NAMES={agenda:'Agenda',feature:'Photo and points',steps:'Steps timeline',metric:'Big number',triptych:'Three cards',quote:'Quote',compare:'Before and after',checklist:'Checklist',principle:'Big statement',summary:'Recap',example:'Photo and text panel',cta:'Call to action'};
 function layoutPage(layout){
  const src=design.pages[Math.min(Math.max(page,1),design.pages.length-2)]||design.pages[0];
  const [p]=GSNKit.innerPages(design.template_id,'your topic','',[layout],design.pages.length);
  if(src&&src!==design.pages[0])for(const k of ['motif','background','ink','accent'])if(src[k]!==undefined)p[k]=src[k];
  p.kicker=`${String(page+2).padStart(2,'0')} / NEW PAGE`;
  return p;
 }

 /* ---------- Open page designs: every piece (text, boxes, pills, picture frames) is a normal layer the creator can move, resize, recolour or delete. ---------- */
 // Pictures are studio photos until the creator replaces them. Colours are page colour names, so the design follows the pack's colours.
 const OP_PIC={team:'gsn-1',team2:'gsn-21',lead:'gsn-3',lead2:'gsn-23',desk:'gsn-17',work:'gsn-15'};
 function openCtx(){
  const r=(design.size?.w||1080)/(design.size?.h||1350),Hh=100/r,g=clamp(1+(1.78-r)*.1,1,1.15);
  // Helpers: sq(u) gives the height in percent of a square that is u wide; mid centres a line of text of height hu (in widths) in a band.
  return {r,Hh,g,sq:u=>round(u/Hh*100),mid:(y,h,hu)=>round(y+(h-hu/Hh*100)/2)};
 }
 const OPEN_PAGES=[
  ['o-pills','Pill cover','Picture on the left, title in outlined and filled pills.',c=>{const {g,mid}=c;return {
   kicker:'BOLD DESIGN STUDIO',title:'Business',body:'Presented by: Your name',
   textLayers:{kicker:{x:46,y:11,size:1.5*g,uppercase:true},title:{x:46,y:mid(34,26,9.5*g*1.15),size:9.5*g,boxWidth:50,align:'center'},body:{x:46,y:86,size:1.5*g,bold:true,boxWidth:50}},
   texts:[{text:'Plan',left:46,top:mid(63,26,9.5*g*1.15),size:9.5*g,boxWidth:36,align:'center',color:'onaccent'},{text:'2030',left:84,top:11,size:1.5*g,boxWidth:12,align:'right'}],
   shapes:[{kind:'round',x:4,y:13,w:34,h:78,radius:4,src:OP_PIC.team,line:'ink',lineW:6},{kind:'pill',x:46,y:34,w:50,h:26,line:'ink',lineW:6},{kind:'pill',x:46,y:63,w:36,h:26,fill:'accent'}]}}],
  ['o-split','Title, text and picture','Words on the left, a large rounded picture on the right.',c=>{const {g}=c;return {
   kicker:'BOLD DESIGN STUDIO',title:'Executive\nSummary',body:'Write two or three short paragraphs here. Say what matters first, then the proof.',
   textLayers:{kicker:{x:6,y:12,size:1.5*g},title:{x:6,y:22,size:6.2*g,boxWidth:42,lineHeight:95},body:{x:6,y:56,size:1.35*g,boxWidth:40,lineHeight:140}},
   shapes:[{kind:'round',x:54,y:9,w:42,h:80,radius:4,src:OP_PIC.team2,line:'ink',lineW:6}]}}],
  ['o-stack','Stacked pill cards','Title and text left, three stacked pill cards on the right.',c=>{const {g,mid}=c;const cards=[['The Problem',8,0],['Target Audience',37,0],['Market Gap',66,1]];return {
   kicker:'BOLD DESIGN STUDIO',title:'Problem\nStatement',body:'Add a short paragraph that sets up the three points on the right.',
   textLayers:{kicker:{x:6,y:12,size:1.5*g},title:{x:6,y:24,size:6.2*g,boxWidth:42,lineHeight:95},body:{x:6,y:58,size:1.3*g,boxWidth:38,lineHeight:140}},
   texts:cards.flatMap(([h,y,f])=>[{text:h,left:57,top:y+7,size:2.3*g,boxWidth:34,bold:true,...(f?{color:'onaccent'}:{})},{text:'Write one or two lines about this point.',left:57,top:y+15,size:1.15*g,boxWidth:34,lineHeight:135,...(f?{color:'onaccent'}:{})}]),
   shapes:cards.map(([,y,f])=>({kind:'pill',x:52,y,w:44,h:26,line:'ink',lineW:2,...(f?{fill:'accent'}:{})}))}}],
  ['o-products','Pictures and pill cards','Two picture pills above two pill cards.',c=>{const {g}=c;return {
   kicker:'BOLD DESIGN STUDIO',title:'Product Offering',body:'One short paragraph that introduces the two products below.',
   textLayers:{kicker:{x:5,y:9,size:1.5*g},title:{x:5,y:17,size:6*g,boxWidth:55},body:{x:62,y:15,size:1.2*g,boxWidth:34,lineHeight:140}},
   texts:[{text:'Product 01',left:5,top:73,size:2.4*g,boxWidth:44,align:'center',bold:true},{text:'Say what it is and who it is for.',left:9,top:80,size:1.15*g,boxWidth:36,align:'center'},{text:'Product 02',left:51,top:73,size:2.4*g,boxWidth:44,align:'center',bold:true,color:'onaccent'},{text:'Say what it is and who it is for.',left:55,top:80,size:1.15*g,boxWidth:36,align:'center',color:'onaccent'}],
   shapes:[{kind:'pill',x:5,y:36,w:44,h:28,src:OP_PIC.desk,line:'ink',lineW:6},{kind:'pill',x:51,y:36,w:44,h:28,src:OP_PIC.team,line:'ink',lineW:6},{kind:'pill',x:5,y:68,w:44,h:26,line:'ink',lineW:6},{kind:'pill',x:51,y:68,w:44,h:26,fill:'accent',line:'ink',lineW:6}]}}],
  ['o-ovals','Three tall ovals','Centred title with three ovals for the three points.',c=>{const {g,sq}=c;const cols=[['Market Size',6,0],['Market Trends',36,0],['Target Audience',66,1]];return {
   kicker:'BOLD DESIGN STUDIO',title:'Market Opportunity',body:'One sentence that frames the three points below it.',
   textLayers:{kicker:{x:0,y:8,size:1.5*g,boxWidth:100,align:'center'},title:{x:0,y:14,size:6.5*g,boxWidth:100,align:'center'},body:{x:7,y:32,size:1.25*g,boxWidth:86,align:'center'}},
   texts:cols.flatMap(([h,x,f])=>[{text:h,left:x+2,top:58,size:2*g,boxWidth:26,align:'center',bold:true,...(f?{color:'onaccent'}:{})},{text:'Add two short lines of detail.',left:x+3,top:66,size:1.05*g,boxWidth:24,align:'center',lineHeight:135,...(f?{color:'onaccent'}:{})}]),
   shapes:cols.map(([,x,f])=>({kind:'oval',x,y:46,w:28,h:48,line:'ink',lineW:2,...(f?{fill:'accent'}:{})}))}}],
  ['o-script','Script and caps cover','A script word over big capitals, with a colour block.',c=>{const {g,sq}=c;return {
   kicker:'DIGITAL STRATEGY',title:'PROPOSAL',body:'',
   textLayers:{kicker:{x:52,y:36,size:1.7*g,uppercase:true},title:{x:30,y:44,size:9.5*g,uppercase:true,boxWidth:68}},
   texts:[{text:'project',left:18,top:20,size:12*g,font:'pacifico',boxWidth:60},{text:'PROJECT 2026',left:76,top:6,size:1.3*g,boxWidth:20,align:'center'},{text:'DIGITAL STRATEGIES',left:62,top:88,size:1.5*g,boxWidth:35,align:'right'}],
   shapes:[{kind:'rect',x:50,y:42,w:34,h:25,fill:'accent'},{kind:'rect',x:3,y:90,w:57,h:1,fill:'ink'}]}}],
  ['o-note','Title, note box and wide picture','Big title, a colour note box, and a picture across the bottom.',c=>{const {g}=c;return {
   kicker:'PROPOSAL',title:'PROPOSAL\nBACKGROUND',body:'Say in two lines why this matters now.',
   textLayers:{kicker:{x:5,y:10,size:1.4*g},title:{x:5,y:18,size:6.2*g,boxWidth:58,uppercase:true,lineHeight:92},body:{x:68,y:22,size:1.8*g,boxWidth:25,lineHeight:130,color:'onaccent'}},
   shapes:[{kind:'rect',x:66,y:16,w:30,h:26,fill:'accent'},{kind:'rect',x:0,y:52,w:100,h:48,src:OP_PIC.team}]}}],
  ['o-describe','Description with overview box','Title, picture, lead sentence and a call-out box.',c=>{const {g}=c;return {
   kicker:'PROJECT',title:'GENERAL PROJECT\nDESCRIPTION',body:'Write a short paragraph with the detail behind the lead sentence.',
   textLayers:{kicker:{x:5,y:9,size:1.4*g},title:{x:5,y:16,size:6*g,boxWidth:80,uppercase:true,lineHeight:92},body:{x:57,y:64,size:1.15*g,boxWidth:38,lineHeight:140}},
   texts:[{text:'A one-sentence summary of what you will do and the result you expect.',left:57,top:44,size:2.1*g,boxWidth:39,lineHeight:130},{text:'PROJECT OVERVIEW',left:58,top:82,size:2.3*g,boxWidth:36,align:'center',bold:true,uppercase:true,color:'onaccent'}],
   shapes:[{kind:'round',x:5,y:44,w:46,h:48,radius:3,src:OP_PIC.work},{kind:'rect',x:57,y:78,w:39,h:14,fill:'accent'}]}}],
  ['o-method','Picture and method card','A tall picture beside a card with two icon rows.',c=>{const {g,sq}=c;return {
   kicker:'PROJECT',title:'WORK METHODOLOGY',body:'',
   textLayers:{kicker:{x:5,y:9,size:1.4*g},title:{x:5,y:16,size:6*g,boxWidth:90,uppercase:true}},
   texts:[['Target market analysis',41],['Creative content development',64]].flatMap(([h,y])=>[{text:h,left:41,top:y,size:2.1*g,boxWidth:50,bold:true},{text:'Add one or two lines that explain this step.',left:41,top:y+9,size:1.2*g,boxWidth:50,lineHeight:135}]),
   shapes:[{kind:'round',x:4,y:32,w:17,h:60,radius:4,src:OP_PIC.lead},{kind:'round',x:25,y:32,w:71,h:60,radius:4,line:'ink',lineW:5},{kind:'oval',x:31,y:42,w:7,h:sq(7),fill:'accent'},{kind:'oval',x:31,y:65,w:7,h:sq(7),fill:'accent'}]}}],
  ['o-numbers','Three number columns','Three columns, each with a big figure, a label bar and text.',c=>{const {g}=c;const cols=[['$350','Content & design',7],['$700','Digital advertising',38],['$140','Tools & software',69]];return {
   kicker:'PROPOSAL',title:'ESTIMATED BUDGET',body:'',
   textLayers:{kicker:{x:5,y:9,size:1.4*g},title:{x:5,y:16,size:6*g,boxWidth:90,uppercase:true}},
   texts:cols.flatMap(([n,l,x])=>[{text:n,left:x,top:34,size:5*g,bold:true,boxWidth:26},{text:l,left:x+1,top:46.5,size:2*g,boxWidth:24,color:'onaccent'},{text:'One short line about this cost.',left:x,top:55,size:1.1*g,boxWidth:26,lineHeight:135}]),
   shapes:[...cols.map(([,,x])=>({kind:'rect',x:x-1,y:45.5,w:26,h:8,fill:'accent'})),{kind:'rect',x:0,y:68,w:100,h:32,src:OP_PIC.desk}]}}],
  ['o-recap','Recap with picture band','Title and script word, a picture band and a colour block.',c=>{const {g}=c;return {
   kicker:'PROPOSAL',title:'PROPOSAL RECAP',body:'Let’s start this project and make your business grow!',
   textLayers:{kicker:{x:5,y:8,size:1.4*g},title:{x:5,y:14,size:5*g,boxWidth:52,uppercase:true},body:{x:6,y:72,size:2.3*g,boxWidth:36,lineHeight:130}},
   texts:[{text:'thank you',left:60,top:12,size:7*g,font:'pacifico',boxWidth:38},{text:'With this plan we can reach more people, earn more trust and grow steadily.',left:50,top:68,size:2*g,boxWidth:44,lineHeight:130,color:'onaccent'}],
   shapes:[{kind:'rect',x:0,y:32,w:100,h:30,src:OP_PIC.team2},{kind:'rect',x:46,y:62,w:54,h:34,fill:'accent'}]}}],
  ['o-canvas','Open canvas','A clean page with a headline and a large soft panel to build on.',c=>{const {g}=c;return {
   kicker:'YOUR LABEL',title:'Your headline',body:'Add a short line that sets up the page.',
   textLayers:{kicker:{x:6,y:7,size:1.4*g},title:{x:6,y:12,size:5.5*g,boxWidth:88},body:{x:6,y:26,size:1.5*g,boxWidth:60,lineHeight:140}},
   shapes:[{kind:'round',x:5,y:38,w:90,h:56,radius:3,fill:'soft',line:'line',lineW:1}]}}],
  ['o-photo','Full picture with title pill','A picture across the whole page with the title on a colour pill.',c=>{const {g,mid}=c;return {
   kicker:'YOUR LABEL',title:'Your headline',body:'',
   textLayers:{kicker:{x:6,y:7,size:1.5*g},title:{x:9,y:mid(68,20,6.5*g*1.15),size:6.5*g,boxWidth:60,color:'onaccent'}},
   shapes:[{kind:'rect',x:0,y:0,w:100,h:100,src:OP_PIC.lead2},{kind:'pill',x:5,y:68,w:68,h:20,fill:'accent'}]}}],
 ];
 function openPage(key){
  const def=OPEN_PAGES.find(d=>d[0]===key);if(!def)return null;
  const [p]=GSNKit.innerPages(design.template_id,'your topic','',['principle'],design.pages.length);
  const src=design.pages[Math.min(Math.max(page,1),design.pages.length-2)]||design.pages[0];
  if(src&&src!==design.pages[0])for(const k of ['background','ink','accent'])if(src[k]!==undefined)p[k]=src[k];
  const spec=def[3](openCtx());
  const text=(o)=>{for(const k of Object.keys(o))if(typeof o[k]==='number')o[k]=Math.round(o[k]*100)/100;return o};
  const ctx=openCtx(),k=Math.max(1,ctx.Hh/56.25),sk=Math.sqrt(k);
  for(const l of Object.values(spec.textLayers||{}))text(l);
  for(const t of spec.texts||[]){if(!t.color)t.color='ink';text(t)}
  for(const sh of spec.shapes||[]){
   // Pills, ovals and cards keep their proportions on tall pages: they get a little taller, not as tall as the page.
   if(k>1.1&&sh.w<100&&Math.abs(sh.w-sh.h*ctx.Hh/100)>1.5&&(sh.kind==='pill'||sh.kind==='oval'||(sh.kind==='round'&&!sh.src&&sh.h<45))){const h=sh.h/sk;sh.y+=(sh.h-h)/2;sh.h=h}
   text(sh);
  }
  return {...p,...spec,deckLayout:'open',motif:p.motif,brandText:p.brandText};
 }
 function addLayoutPage(layout){
  const n=design.pages.length;if(n>=30)return toast('A pack can have up to 30 pages.');
  commit(()=>{const at=Math.min(page+1,n-1);design.pages.splice(at,0,layout==='copy'?JSON.parse(JSON.stringify(design.pages[page])):layout.startsWith('o-')?openPage(layout):layoutPage(layout));page=at;sel=null;multi=[]});
  thumbs();render();
 }
 function openLayoutPicker(){
  const guide=GSNKit.LAYOUT_GUIDE;
  openModal(`<h2>Add a page</h2><p class="hint">Choose a layout. It takes this pack's colours and photo, and you only write the words.</p><div class="ed-layouts">${Object.keys(LAYOUT_NAMES).map(k=>`<button class="ed-layout" data-layout="${k}"><b>${LAYOUT_NAMES[k]}</b><span>${esc(guide[k]||'')}</span></button>`).join('')}<button class="ed-layout" data-layout="copy"><b>Copy this page</b><span>An exact copy you can reword.</span></button></div><h3 class="ed-lay-h">Open designs: move, resize or recolour every piece</h3><div class="ed-layouts">${OPEN_PAGES.map(d=>`<button class="ed-layout" data-layout="${d[0]}"><b>${esc(d[1])}</b><span>${esc(d[2])}</span></button>`).join('')}</div><div class="ed-actions"><button class="btn-light" data-act="closemodal">Cancel</button></div>`);
  el.modal.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>{closeModal();addLayoutPage(b.dataset.layout)});
 }
 function toolPages(body){
  const s=slide(),n=design.pages.length;
  const field=(k,label,rows)=>`<label class="ed-field">${label}<textarea data-f="${k}" rows="${rows}" maxlength="${k==='title'?300:1200}">${esc(s[k]??'')}</textarea></label>`;
  body.innerHTML=`<p class="hint">${role(page)} · the words on this page. They update as you type.</p><div class="ed-actions"><button class="btn-light" data-pg="dup">Duplicate</button><button class="btn-light" data-pg="left">Move earlier</button><button class="btn-light" data-pg="right">Move later</button><button class="btn-light" data-pg="del">Delete page</button></div>${page>0&&page<n-1?`<label class="ed-field">Layout<select data-layoutsel>${Object.keys(LAYOUT_NAMES).map(k=>`<option value="${k}" ${s.deckLayout===k?'selected':''}>${LAYOUT_NAMES[k]}</option>`).join('')}</select></label>`:''}${field('title','Headline',2)}${field('body','Write-up',5)}${field('kicker','Label',1)}${field('footerText','Footer',1)}
  <h3>Layers on this page</h3><ol class="ed-layers" id="edLayers"></ol>`;
  const ls=$('[data-layoutsel]',body);if(ls)ls.onchange=()=>{commit(()=>{slide().deckLayout=ls.value},'layout');thumbs([page])};
  $$('[data-f]',body).forEach(t=>t.oninput=()=>{const k=t.dataset.f;if(k==='title'&&!t.value.trim())return;commit(()=>{slide()[k]=t.value},'f'+k)});
  const names=k=>k.startsWith('shape:')?(s.shapes?.[+k.slice(6)]?.src?'Picture frame ':(GSNKit.SHAPE_KINDS[s.shapes?.[+k.slice(6)]?.kind]||'Box')+' ')+(+k.slice(6)+1):k.startsWith('text:')?'Text: '+(s.texts[+k.slice(5)]?.text||'').slice(0,24):k.startsWith('element:')?GSNKit.canvasElementLabel(s.elements[+k.slice(8)])||'Element':k==='artwork'?'Image':COPY[k];
  $('#edLayers').innerHTML=fullOrder().slice().reverse().filter(k=>names(k)).map(k=>`<li class="${sel&&layerKey()===k?'on':''}" data-layer="${k}"><span>${esc(names(k))}</span></li>`).join('');
  $$('[data-layer]',body).forEach(li=>li.onclick=()=>{const k=li.dataset.layer;select(k.startsWith('shape:')?{t:'shape',i:+k.slice(6)}:k.startsWith('text:')?{t:'text',i:+k.slice(5)}:k.startsWith('element:')?{t:'element',i:+k.slice(8)}:k==='artwork'?{t:'art'}:{t:'copy',k})});
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
 function closeModal(){cutToken=null;el.modal.onclick=null;el.modal.hidden=true;el.modal.innerHTML=''}
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
   else if(act==='schedule')Schedule.openSchedule(design.id);else if(act==='download')openDownload();else if(act==='present')present();else if(act==='closemodal')closeModal();
   else if(act==='zoomin')setZoom(zoom*1.2);else if(act==='zoomout')setZoom(zoom/1.2);else if(act==='zoomfit')setZoom(1);
   else if(act==='addpage')openLayoutPicker();
   else if(act==='theirs')resolveConflict(false);else if(act==='mine')resolveConflict(true);
   else if(act==='resetcolors'){commit(()=>{const s=slide();delete s.accent;delete s.background;delete s.ink});toolBrand($('#edFlyBody'))}
   return;
  }
  if(e.target.closest('#edBar'))return onBar(e);
  const toolBtn=e.target.closest('[data-tool]');if(toolBtn){return tool===toolBtn.dataset.tool?closeTool():openTool(toolBtn.dataset.tool)}
  const tpl=e.target.closest('[data-tpl]');if(tpl){commit(()=>{design.template_id=+tpl.dataset.tpl});$$('.ed-tpl',el.fly).forEach(b=>b.classList.toggle('on',b===tpl));thumbs();return}
  const ash=e.target.closest('[data-addshape]');if(ash){addShape(ash.dataset.addshape,{frame:!!ash.dataset.frame,outline:!!ash.dataset.outline});return}
  const sob=e.target.closest('[data-elsolid]');if(sob){addElement(sob.dataset.elsolid);const i=sel.i,s=slide(),acc=/^#[0-9a-f]{6}$/i.test(s.accent||'')?s.accent:'#ac82f4';commit(()=>{setList(s,'elementSolid',i,true,false);const x=[...(s.elementColors||[])];x[i]=acc;s.elementColors=Array.from({length:s.elements.length},(_,k)=>x[k]||'#25c8ff');setList(s,'elementSizes',i,160,100)},'solid');drawOverlay();return}
  const elb=e.target.closest('[data-el]');if(elb)return addElement(elb.dataset.el);
  const at=e.target.closest('[data-addtext]');if(at)return addText(at.dataset.addtext);
  const up=e.target.closest('[data-up]');if(up){if(up.dataset.up==='del'){const [gone]=uploads.splice(+up.dataset.i,1);dropUpload(gone);return tool==='uploads'&&openTool('uploads')}if(up.dataset.up==='clear'){if(!confirm('Delete all your uploaded pictures?'))return;uploads.forEach(dropUpload);uploads.length=0;return tool==='uploads'&&openTool('uploads')}const u=uploads[+up.dataset.i];if(up.dataset.up==='el')addElement(u);else commit(()=>{slide().image=u});return}
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
 document.addEventListener('dragstart',e=>{const du=e.target.closest?.('[data-dragup]');if(du){e.dataTransfer.setData('application/x-gsn-upload',du.dataset.dragup);e.dataTransfer.effectAllowed='copy';return}
  const th=e.target.closest?.('.ed-thumb');if(th&&design)e.dataTransfer.setData('text/plain',th.dataset.page)});
 document.addEventListener('dragover',e=>{if(design&&el.page?.contains(e.target)&&(e.dataTransfer.types.includes('application/x-gsn-upload')||e.dataTransfer.types.includes('Files')))e.preventDefault();
  if(design&&e.target.closest?.('.ed-thumb'))e.preventDefault()});
 document.addEventListener('paste',async e=>{
  if(!design||editing||e.target.closest?.('input,textarea,[contenteditable]'))return;
  const f=[...(e.clipboardData?.files||[])].find(IMG_OK);if(!f)return;
  e.preventDefault();try{const u=await compress(f);addUpload(u);addElement(u);toast('Picture pasted onto the page.')}catch(err){toast(err.message)}
 });
 document.addEventListener('drop',async e=>{
  if(design&&el.page?.contains(e.target)){
   const pb=pageBox(),at={x:Math.round(Math.min(100,Math.max(0,(e.clientX-pb.left)/pb.width*100))),y:Math.round(Math.min(100,Math.max(0,(e.clientY-pb.top)/pb.height*100)))};
   const idx=e.dataTransfer.getData('application/x-gsn-upload');
   if(idx!==''&&uploads[+idx]){e.preventDefault();return addElement(uploads[+idx],at)}
   const f=[...(e.dataTransfer.files||[])].find(IMG_OK);
   if(f){e.preventDefault();try{const u=await compress(f);addUpload(u);addElement(u,at)}catch(err){toast(err.message)}return}
  }
  const th=e.target.closest?.('.ed-thumb');if(!th||!design)return;e.preventDefault();
  const from=+e.dataTransfer.getData('text/plain'),to=+th.dataset.page,n=design.pages.length;
  if(!(from>=0&&from<n&&to>=0&&to<n)||from===to)return;
  commit(()=>{const [m]=design.pages.splice(from,1);design.pages.splice(to,0,m);page=to;sel=null;multi=[]});thumbs();render()});
 return {open,close,get design(){return design}};
})();
