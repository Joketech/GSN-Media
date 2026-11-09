'use strict';
/* Brand people: faces and mascots the brand owns or has permission to use. They are saved per workspace, so a person can
   drop one into any template and agents can pick one for a design. Saving records who confirmed permission. */
const People=(()=>{
 const {esc,api,toast}=App;
 const KINDS=[['team','Team member'],['mascot','Our own mascot or character'],['release','Client or model with a signed release']];
 const label=k=>(KINDS.find(x=>x[0]===k)||[])[1]||k;
 const loadImg=u=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error('That image could not be read.'));im.src=u});
 const readFile=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(Error('That file could not be read.'));r.readAsDataURL(f)});
 async function scaled(src,max){const im=await loadImg(src),k=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*k));c.height=Math.max(1,Math.round(im.naturalHeight*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c}
 // Does any visible part of this picture have transparency? (a cut-out does; a plain photo does not)
 function hasAlpha(c){const s=document.createElement('canvas');s.width=s.height=64;const x=s.getContext('2d');x.drawImage(c,0,0,64,64);const d=x.getImageData(0,0,64,64).data;for(let i=3;i<d.length;i+=4)if(d[i]<250)return true;return false}
 // The studio keeps each picture under 1.4 MB. Cut-outs stay PNG so they keep their edges; plain photos become JPEG.
 function fit(c){
  const alpha=hasAlpha(c);let k=1;
  for(let i=0;i<12;i++){
   const t=document.createElement('canvas');t.width=Math.max(1,Math.round(c.width*k));t.height=Math.max(1,Math.round(c.height*k));
   const x=t.getContext('2d');if(!alpha){x.fillStyle='#fff';x.fillRect(0,0,t.width,t.height)}x.drawImage(c,0,0,t.width,t.height);
   const out=alpha?t.toDataURL('image/png'):t.toDataURL('image/jpeg',.9);
   if(out.length<1_300_000)return out;k*=.82;
  }
  throw Error('That picture is too large. Use a smaller one.');
 }

 let people=[],host=null,opts={},draft=null;
 const fresh=()=>({src:null,out:null,cands:null,busy:false});

 function html(){return `<section class="people-view"><div class="people-head"><div><h1>Brand people</h1><p class="hint">Faces and mascots your brand owns or has permission to use. Save them once, drop them into any template, and let agents pick them for designs.</p></div></div><div class="pp-host" id="ppHost"></div></section>`}

 async function mount(root,options={}){
  host=root;opts=options;draft=fresh();
  host.innerHTML='<p class="hint">Loading…</p>';
  try{people=(await api('/people')).people}catch(e){host.innerHTML=`<p class="empty">${esc(e.message)}</p>`;return}
  draw();
 }

 function card(p){
  return `<article class="pp-card" data-person="${esc(p.id)}"><span class="pp-checker"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy"></span>
   <div class="pp-meta"><b title="${esc(p.name)}">${esc(p.name)}</b><small>${esc(p.role||label(p.kind))}</small></div>
   <div class="pp-actions">${opts.onUse?`<button class="btn-dark" data-pp="use">Use on this page</button>`:''}<button class="pp-del" data-pp="del" title="Remove from the library" aria-label="Remove ${esc(p.name)}">Remove</button></div></article>`;
 }

 function draw(){
  const keepOpen=host.querySelector('#ppAdd')?.open;
  host.innerHTML=`${people.length?`<div class="pp-grid">${people.map(card).join('')}</div>`:'<p class="empty">No one saved yet. Add the first person below.</p>'}
  <details class="pp-add" id="ppAdd" ${keepOpen||!people.length?'open':''}><summary>＋ Add a person</summary>
   <p class="hint">Only add people who agreed to appear in your brand's designs, and characters your brand owns.</p>
   <label class="ed-drop"><input type="file" accept="image/png,image/jpeg,image/webp" hidden id="ppFile"><b>Choose a photo</b><small>PNG, JPG or WebP. A cut-out PNG works best.</small></label>
   <div class="pp-stage" id="ppStage" hidden>
    <span class="pp-checker pp-big"><img id="ppPrev" alt="Preview"></span>
    <div class="pp-actions"><button class="btn-dark" id="ppCut">Remove background (AI)</button><button id="ppOrig" hidden>Keep the original</button></div>
    <p class="hint" id="ppMsg"></p><div class="pp-cands" id="ppCands"></div>
   </div>
   <div class="pp-form"><label class="field">Name<input id="ppName" maxlength="80" autocomplete="off"></label>
    <label class="field">Role or note (optional)<input id="ppRole" maxlength="80" autocomplete="off" placeholder="Founder, mascot, model…"></label>
    <label class="field">Who is this?<select id="ppKind">${KINDS.map(([k,n])=>`<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
    <label class="field">Permission note<input id="ppNote" maxlength="300" autocomplete="off" placeholder="Required for a release: where the signed release is kept"></label></div>
   <label class="pp-consent"><input type="checkbox" id="ppConsent"> I confirm this person agreed to appear in this brand's designs, or the brand owns this character.</label>
   <button class="btn-dark" id="ppSave" disabled>Save to library</button></details>`;
  wire();
  if(draft?.out)showDraft();
 }

 function ready(){
  const q=s=>host.querySelector(s);
  q('#ppSave').disabled=!(draft.out&&q('#ppName').value.trim()&&q('#ppConsent').checked&&!draft.busy&&(q('#ppKind').value!=='release'||q('#ppNote').value.trim()));
 }
 function showDraft(){
  const q=s=>host.querySelector(s);
  q('#ppStage').hidden=false;q('#ppPrev').src=draft.out;ready();
 }

 function wire(){
  const q=s=>host.querySelector(s);
  host.onclick=async e=>{
   const b=e.target.closest('[data-pp]');if(!b)return;
   const id=b.closest('[data-person]')?.dataset.person,p=people.find(x=>x.id===id);
   if(b.dataset.pp==='use'&&p){try{const full=await api('/people/'+id);await opts.onUse(full)}catch(err){toast(err.message)}}
   if(b.dataset.pp==='del'&&p){
    if(!confirm(`Remove ${p.name} from the library? Designs that already use the picture keep it.`))return;
    try{await api('/people/'+id,{method:'DELETE'});people=people.filter(x=>x.id!==id);draw();toast('Removed.')}catch(err){toast(err.message)}
   }
  };
  q('#ppFile').onchange=async e=>{
   const f=e.target.files[0];if(!f)return;
   if(!/^image\/(png|jpeg|webp)$/.test(f.type))return toast('Use a PNG, JPG or WebP image.');
   try{
    draft=fresh();const c=await scaled(await readFile(f),1600);
    draft.src=c.toDataURL('image/png');draft.out=fit(c);showDraft();
    q('#ppMsg').textContent='';q('#ppCands').innerHTML='';q('#ppOrig').hidden=true;
    const name=q('#ppName');if(!name.value)name.value=f.name.replace(/\.[a-z0-9]+$/i,'').replace(/[-_]+/g,' ').slice(0,80);ready();
   }catch(err){toast(err.message)}
  };
  q('#ppCut').onclick=cut;
  q('#ppOrig').onclick=()=>{q('#ppCands').innerHTML='';q('#ppOrig').hidden=true;q('#ppMsg').textContent='Using the original picture.';scaled(draft.src,1600).then(c=>{draft.out=fit(c);q('#ppPrev').src=draft.out;ready()})};
  for(const id of ['#ppName','#ppNote'])q(id).oninput=ready;
  q('#ppConsent').onchange=ready;q('#ppKind').onchange=ready;
  q('#ppSave').onclick=save;
 }

 // The studio's private cutout worker returns several models' results; the person picks the one that kept the most.
 async function cut(){
  const q=s=>host.querySelector(s);if(!draft?.src||draft.busy)return;
  draft.busy=true;q('#ppCut').disabled=true;q('#ppMsg').textContent='Cutting the picture out with AI. This takes a few seconds…';q('#ppCands').innerHTML='';ready();
  try{
   const r=await api('/cutout',{method:'POST',body:{image:draft.src,engine:'all'}});
   draft.cands=r.candidates;
   q('#ppMsg').textContent='Pick the cutout that kept the most of the person.';
   q('#ppCands').innerHTML=r.candidates.map((c,i)=>`<button class="pp-cand${c.suggested?' on':''}" data-cand="${i}" title="Use this cutout"><span class="pp-checker"><img alt="${esc(c.label)} cutout" src="data:image/png;base64,${c.png_base64}"></span><b>${esc(c.label)}</b></button>`).join('');
   q('#ppOrig').hidden=false;
   q('#ppCands').onclick=async e=>{const b=e.target.closest('[data-cand]');if(!b)return;
    try{const c=await scaled('data:image/png;base64,'+draft.cands[+b.dataset.cand].png_base64,1600);draft.out=fit(c);q('#ppPrev').src=draft.out;
     q('#ppCands').querySelectorAll('.pp-cand').forEach(x=>x.classList.toggle('on',x===b));ready()}catch(err){toast(err.message)}};
  }catch(err){q('#ppMsg').textContent=err.message}
  finally{draft.busy=false;q('#ppCut').disabled=false;ready()}
 }

 async function save(){
  const q=s=>host.querySelector(s);if(!draft?.out)return;
  q('#ppSave').disabled=true;
  try{
   const made=await api('/people',{method:'POST',body:{name:q('#ppName').value.trim(),role:q('#ppRole').value.trim(),kind:q('#ppKind').value,permission_note:q('#ppNote').value.trim(),consent:q('#ppConsent').checked,image:draft.out}});
   people.unshift(made);draft=fresh();draw();toast(`${made.name} is saved. Agents can use them now.`);
  }catch(err){toast(err.message);ready()}
 }

 return {html,mount};
})();
