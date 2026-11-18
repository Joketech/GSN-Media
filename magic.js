'use strict';
/* Magic stick: pick an in-house template (or bring your own), type the facts once, get a finished editable design.
   Everything is built by plain code on the server, so it is free, instant and the same every time. */
const Magic=(()=>{
 const {esc,api,toast}=App;
 const S={cat:null,mode:'pick',kind:'flyer',tpl:'flyer-bold',size:'',palette:'brand',accent:'',fields:{},images:{},wash:72,code:'',codeMsg:'',mine:{list:null,id:'',texts:[],design:null,msg:''},last:null,busy:false};
 let host=null,timer=0,seq=0;
 const kindOf=id=>S.cat.kinds.find(k=>k.id===id),tplOf=id=>S.cat.templates.find(t=>t.id===id);
 const exampleFields=k=>Object.fromEntries(kindOf(k).fields.filter(f=>f.type!=='image'&&f.example).map(f=>[f.id,f.example]));
 // Preview shows your words where you typed them and the example words elsewhere; creating the design uses only your words.
 const previewFields=()=>({...exampleFields(S.kind),...Object.fromEntries(Object.entries(S.fields).filter(([,v])=>v&&v.trim())),...S.images.picture?{picture:S.images.picture}:{}});
 const body=(fields,extra={})=>({template:S.tpl,size:S.size,palette:S.palette,colours:S.accent?{accent:S.accent}:undefined,fields,...(S.images.background?{background:{image:S.images.background,wash:S.wash}}:{}),...extra});
 const sizeOk=()=>{const t=tplOf(S.tpl);if(!t.sizes.includes(S.size))S.size=t.sizes[0]};

 async function load(){if(!S.cat)S.cat=await api('/magic/catalog');sizeOk()}

 function html(){
  return `<section class="hello"><h1>Magic stick</h1><span class="mg-free">Free. Built with plain code, no AI charges.</span></section><ol class="mg-how"><li><b>1. Choose</b> what you are making (flyer, invitation, program, food schedule, certificate…) and pick a design.</li><li><b>2. Type your details</b> (names, dates, place). Add a picture, or a link if you want a scannable QR code on the card.</li><li><b>3. Press Create</b> and fine-tune it in the editor. <b>Copy template code</b> saves the design as a short code (starts with MS1.) that anyone can paste later to get the same design back.</li></ol><div id="mgHost" class="mg"><p class="hint">Loading…</p></div>`;
 }
 async function mount(el){host=el;try{await load()}catch(e){host.innerHTML=`<p class="empty">${esc(e.message)}</p>`;return}draw()}
 function stop(){clearTimeout(timer);host=null}

 // Renders one page of a design into a box, using the same renderer as the editor.
 async function paint(box,design,i){
  const pr=App.preset(design.platform);if(!pr)return;
  const d={...design,ratio:pr.ratio,size:{w:pr.w,h:pr.h},brand:{name:'GSN',handle:'GSN'},template_id:0};
  box.style.aspectRatio=pr.ratio;box.innerHTML='<div class="mg-inner"></div>';
  await KitHost.mount(box.firstChild,KitHost.pageHtml(d,i));
 }

 function draw(){
  if(!host)return;
  const modes=[['pick','Pick a template'],['code','Paste a template code'],['mine','Use one of my designs']];
  host.innerHTML=`<div class="mg-modes" role="tablist">${modes.map(([id,l])=>`<button role="tab" aria-selected="${S.mode===id}" data-mode="${id}">${l}</button>`).join('')}</div>${S.mode==='pick'?pickHtml():S.mode==='code'?codeHtml():mineHtml()}`;
  wire();
  if(S.mode==='pick'){refreshCards();refresh()}
  if(S.mode==='mine')mineLoad();
 }

 function fieldHtml(f){
  const v=S.fields[f.id]||'';
  if(f.type==='image')return `<div class="mg-f"><label>${esc(f.label)}</label><div class="mg-img"><input type="file" accept="image/*" data-img="picture"><button class="btn-light" data-clear="picture" ${S.images.picture?'':'hidden'}>Remove</button></div></div>`;
  if(['qrsize','qrx','qry'].includes(f.id)){const d={qrsize:16,qrx:50,qry:80}[f.id],[mn,mx]=f.id==='qrsize'?[8,40]:[0,100];return `<div class="mg-f mg-qrpos"><label for="mg-${f.id}">${esc(f.label)}: <b id="mgv-${f.id}">${v===''?'automatic':esc(v)+'%'}</b></label>${f.hint?`<p class="hint">${esc(f.hint)}</p>`:''}<input id="mg-${f.id}" data-f="${f.id}" type="range" min="${mn}" max="${mx}" value="${v||d}">${f.id==='qry'?'<button class="btn-light" data-qrauto="1">Back to automatic</button>':''}</div>`}
  if(f.type==='choice')return `<div class="mg-f"><label for="mg-${f.id}">${esc(f.label)}</label>${f.hint?`<p class="hint">${esc(f.hint)}</p>`:''}<select id="mg-${f.id}" data-f="${f.id}">${f.options.map(o=>`<option value="${o[0]}" ${(v||f.options[0][0])===o[0]?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  const ph=f.example?`e.g. ${f.example.split('\n')[0]}`:'';
  return `<div class="mg-f"><label for="mg-${f.id}">${esc(f.label)}</label>${f.hint?`<p class="hint">${esc(f.hint)}</p>`:''}${f.type==='text'?`<input id="mg-${f.id}" data-f="${f.id}" type="text" maxlength="160" value="${esc(v)}" placeholder="${esc(ph)}">`:`<textarea id="mg-${f.id}" data-f="${f.id}" rows="${f.type==='list'?6:3}" maxlength="${f.type==='list'?3000:700}" placeholder="${esc(ph)}">${esc(v)}</textarea>`}</div>`;
 }

 function pickHtml(){
  const k=kindOf(S.kind),t=tplOf(S.tpl),cards=S.cat.templates.filter(x=>x.kind===S.kind);
  return `<div class="mg-kinds">${S.cat.kinds.map(x=>`<button class="chip" data-kind="${x.id}" aria-pressed="${x.id===S.kind}"><span>${esc(x.name)}</span></button>`).join('')}</div>
  <p class="mg-blurb">${esc(k.blurb)}</p>
  <div class="mg-cards">${cards.map(c=>`<button class="mg-card" data-tpl="${c.id}" aria-pressed="${c.id===S.tpl}"><span class="mg-thumb" data-thumb="${c.id}"></span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></button>`).join('')}</div>
  <div class="mg-cols"><div class="mg-form">
   <div class="mg-row"><div class="mg-f"><label for="mgSize">Size</label><select id="mgSize">${t.sizes.map(id=>{const s=S.cat.sizes.find(z=>z.id===id);return `<option value="${id}" ${id===S.size?'selected':''}>${esc(s.name)} · ${esc(s.note)}</option>`}).join('')}</select></div></div>
   <div class="mg-f"><label>Colours</label><div class="mg-pal">${S.cat.palettes.map(p=>`<button class="mg-sw" data-pal="${p.id}" aria-pressed="${p.id===S.palette}" title="${esc(p.name)}" style="--c1:${p.bg};--c2:${p.accent};--c3:${p.accent2}"><i></i><i></i><i></i></button>`).join('')}<label class="mg-own">Your accent <input type="color" id="mgAccent" value="${S.accent||'#FA754E'}"></label>${S.accent?'<button class="btn-light" data-act-accent="off">Reset</button>':''}</div></div>
   ${k.fields.map(fieldHtml).join('')}
   <details class="mg-bg"><summary>Use my own artwork as the background</summary><div class="mg-f"><div class="mg-img"><input type="file" accept="image/*" data-img="background"><button class="btn-light" data-clear="background" ${S.images.background?'':'hidden'}>Remove</button></div></div><div class="mg-f"><label for="mgWash">How much of the page colour to lay over it (so words stay readable): <b id="mgWashV">${S.wash}</b>%</label><input id="mgWash" type="range" min="10" max="100" value="${S.wash}"></div></details>
   <p class="hint">The preview shows example words until you type yours. Only your own words go into the design.</p>
  </div>
  <div class="mg-side"><div class="mg-pages" id="mgPages"></div><p class="mg-msg" id="mgMsg" role="status"></p>
   <div class="mg-actions"><button class="btn-maroon" id="mgCreate">Create design</button><button class="btn-light" id="mgCopy">Copy template code</button></div></div></div>`;
 }

 function codeHtml(){
  return `<div class="mg-simple"><p>Paste a template code (it starts with <b>MS1.</b>) to rebuild the exact same design. Then change only the facts: names, dates, details, size and pictures.</p>
  <textarea id="mgCode" rows="3" placeholder="MS1.…">${esc(S.code)}</textarea><div class="mg-actions"><button class="btn-maroon" id="mgLoad">Load it</button></div><p class="mg-msg" id="mgCodeMsg" role="status">${esc(S.codeMsg)}</p></div>`;
 }

 function mineHtml(){
  const m=S.mine;
  return `<div class="mg-simple"><p>Pick one of your own designs as the template. Its layout, colours and pictures stay. You change the words.</p>
  <label for="mgMine">Design</label><select id="mgMine"><option value="">${m.list?'Choose a design…':'Loading…'}</option>${(m.list||[]).map(d=>`<option value="${d.id}" ${d.id===m.id?'selected':''}>${esc(d.title)} · ${d.pages} page${d.pages===1?'':'s'}</option>`).join('')}</select>
  <div id="mgMineForm">${m.texts.length?m.texts.map((t,i)=>`<div class="mg-f"><label>Page ${t.page+1} · ${esc(t.label)}</label>${t.text.length>60||t.text.includes('\n')?`<textarea data-mt="${i}" rows="2" maxlength="1200">${esc(t.text)}</textarea>`:`<input data-mt="${i}" type="text" maxlength="1200" value="${esc(t.text)}">`}</div>`).join('')+`<div class="mg-actions"><button class="btn-maroon" id="mgMineCreate">Create my copy</button></div>`:''}</div>
  <p class="mg-msg" id="mgMineMsg" role="status">${esc(m.msg)}</p></div>`;
 }

 // Downscale a chosen picture so it fits the design format (up to 1.4 MB).
 function shrink(file){
  return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);
   let max=1600,q=.85;for(;;){const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const out=c.toDataURL('image/jpeg',q);if(out.length<1_300_000)return res(out);if(q>.5)q-=.1;else max=Math.round(max*.8);if(max<300)return rej(Error('That picture is too large.'))}};
   img.onerror=()=>rej(Error('That file is not a picture.'));img.src=url});
 }

 function wire(){
  host.onclick=async e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.mode){S.mode=b.dataset.mode;draw();return}
   if(b.dataset.kind){S.kind=b.dataset.kind;S.tpl=S.cat.templates.find(t=>t.kind===S.kind).id;S.fields={};S.images={};sizeOk();draw();return}
   if(b.dataset.tpl){S.tpl=b.dataset.tpl;sizeOk();draw();return}
   if(b.dataset.pal){S.palette=b.dataset.pal;S.accent='';draw();return}
   if('actAccent' in b.dataset){S.accent='';draw();return}
   if(b.dataset.qrauto){for(const k of ['qrsize','qrx','qry'])delete S.fields[k];draw();return}
   if(b.dataset.clear){delete S.images[b.dataset.clear];draw();return}
   if(b.id==='mgCreate')return create();
   if(b.id==='mgCopy'){const out=S.last?.code;if(!out)return;try{await navigator.clipboard.writeText(out);toast('Template code copied.')}catch{prompt('Copy this template code:',out)}return}
   if(b.id==='mgLoad')return loadCode();
   if(b.id==='mgMineCreate')return mineCreate();
  };
  host.oninput=e=>{
   const t=e.target;
   if(t.dataset.f!==undefined){S.fields[t.dataset.f]=t.value;const lv=host.querySelector('#mgv-'+t.dataset.f);if(lv)lv.textContent=t.value+'%';soon();return}
   if(t.id==='mgAccent'){S.accent=t.value;soon();return}
   if(t.id==='mgWash'){S.wash=Number(t.value);$('#mgWashV').textContent=t.value;soon();return}
   if(t.dataset.mt!==undefined){S.mine.texts[Number(t.dataset.mt)].text=t.value}
  };
  host.onchange=async e=>{
   const t=e.target;
   if(t.id==='mgSize'){S.size=t.value;refresh();refreshCards();return}
   if(t.dataset.img){const f=t.files[0];if(!f)return;try{S.images[t.dataset.img]=await shrink(f);draw()}catch(err){toast(err.message)}return}
   if(t.id==='mgMine'){S.mine.id=t.value;mineChoose();return}
  };
 };
 const $=s=>host.querySelector(s);
 const soon=()=>{clearTimeout(timer);timer=setTimeout(()=>{refresh();refreshCards()},350)};

 async function refreshCards(){
  const my=++seq;
  for(const box of host.querySelectorAll('[data-thumb]')){
   try{const j=await api('/magic/generate',{method:'POST',body:body(previewFields(),{template:box.dataset.thumb})});if(my!==seq||!host)return;await paint(box,j.design,0)}catch{box.textContent=''}
  }
 }
 async function refresh(){
  if(!host||S.mode!=='pick')return;
  const msg=$('#mgMsg'),pages=$('#mgPages');if(!pages)return;
  try{
   const j=await api('/magic/generate',{method:'POST',body:body(previewFields())});
   const mine=await api('/magic/generate',{method:'POST',body:body(Object.fromEntries(Object.entries(S.fields).filter(([,v])=>v&&v.trim())))}).catch(()=>null);
   S.last={design:j.design,code:(mine||j).code,ready:!!mine};
   pages.innerHTML=j.design.pages.map(()=>'<div class="mg-page"></div>').join('');
   const boxes=[...pages.children];for(let i=0;i<boxes.length;i++)await paint(boxes[i],j.design,i);
   msg.textContent=j.design.pages.length>1?`${j.design.pages.length} pages. The editor lets you reorder them.`:'';
  }catch(e){msg.textContent=e.message}
 }

 async function create(){
  const msg=$('#mgMsg');
  const mine=Object.fromEntries(Object.entries(S.fields).filter(([,v])=>v&&v.trim()));
  if(S.images.picture)mine.picture=S.images.picture;
  try{
   const j=await api('/magic/generate',{method:'POST',body:body(mine)});
   const d=await api('/designs',{method:'POST',body:j.design});
   toast('Design created. Opening the editor.');location.hash='#editor/'+d.id;
  }catch(e){msg.textContent=e.message}
 }

 async function loadCode(){
  const m=$('#mgCodeMsg');S.code=$('#mgCode').value.trim();
  try{
   const o=await api('/magic/decode',{method:'POST',body:{code:S.code}});
   S.tpl=o.template;S.kind=tplOf(o.template).kind;S.size=o.size;S.palette=o.palette||'brand';S.accent=o.colours?.accent||'';S.fields=Object.fromEntries(Object.entries(o.fields||{}).filter(([k])=>k!=='picture'));S.images={};if(o.wash)S.wash=o.wash;
   S.mode='pick';sizeOk();draw();toast('Template loaded. Change the facts and create your design.');
  }catch(e){S.codeMsg=e.message;m.textContent=e.message}
 }

 // Use one of my designs: list its words, swap them, save a copy.
 async function mineLoad(){
  if(S.mine.list)return;
  try{await App.loadDesigns();S.mine.list=App.state.designs}catch(e){S.mine.msg=e.message;S.mine.list=[]}
  if(host&&S.mode==='mine')draw();
 }
 async function mineChoose(){
  const m=S.mine;m.texts=[];m.design=null;m.msg='';
  if(!m.id){draw();return}
  try{
   const d=await api('/designs/'+m.id);m.design=d;
   d.pages.forEach((p,i)=>{
    for(const [k,l] of [['kicker','Small line'],['title','Title'],['body','Text'],['footerText','Footer']])if(p[k]&&String(p[k]).trim()&&!p.textLayers?.[k]?.hide)m.texts.push({page:i,key:k,label:l,text:String(p[k])});
    (p.texts||[]).forEach((t,j)=>m.texts.push({page:i,box:j,label:'Text box '+(j+1),text:String(t.text)}));
   });
   if(!m.texts.length)m.msg='This design has no words to change.';
  }catch(e){m.msg=e.message}
  draw();
 }
 async function mineCreate(){
  const m=S.mine,d=structuredClone(m.design);
  for(const t of m.texts){const text=t.text.trim();if(!text)continue;const p=d.pages[t.page];if(t.key)p[t.key]=text;else p.texts[t.box].text=text}
  const copy={title:(d.title+' (copy)').slice(0,120),platform:d.platform,template_id:d.template_id,brand:d.brand,status:'draft',pages:d.pages};
  try{const out=await api('/designs',{method:'POST',body:copy});toast('Copy created. Opening the editor.');location.hash='#editor/'+out.id}catch(e){m.msg=e.message;$('#mgMineMsg').textContent=e.message}
 }

 return {html,mount,stop};
})();
