'use strict';
(()=>{
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const specialists=[['Mira','Orchestrator','Coordinates the daily brief, routes jobs, and tracks your review.'],['Lyra','Researcher','Gathers sources and develops grounded story directions.'],['Seline','Writer','Writes scripts, captions, and narration in your saved voice.'],['Spectra','Builder','Creates social posts and carousels from the material collection.'],['Flux','Animator','Brings typography, materials, and social compositions into motion.'],['Relay','Publisher','Prepares approved assets for publishing. Publishing connection required.']];
 let jobs=[],templates=[],voices=[],unlocked=false,polling=false,lastHealth=0,pending=null;
 const labels={home:'Overview',voice:'My voice studio',posts:'Social templates',animation:'Animation studio',jobs:'Jobs & results',agents:'The six specialists'};
 function notice(message){$('#notice').textContent=message;$('#notice').hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('#notice').hidden=true,6000);}
 function view(name){if(!labels[name])name='home';document.body.classList.toggle('overview-open',name==='home');$$('[data-page]').forEach(p=>p.hidden=p.dataset.page!==name);$$('nav [data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===name));$('#pageLabel').textContent=labels[name];if(location.hash!==`#${name}`)location.hash=name;window.scrollTo({top:0});}
 document.addEventListener('click',e=>{const nav=e.target.closest('[data-view]');if(nav)view(nav.dataset.view);});
 window.addEventListener('hashchange',()=>view(location.hash.slice(1)));
 async function api(route,options={}){const r=await fetch('/api/v1'+route,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const value=await r.json();if(!r.ok){if(r.status===401||r.status===503&&value.error?.includes('access key')){unlocked=false;$('#accessGate').hidden=false;}throw Error(value.error||`Request failed (${r.status}).`);}return value;}
 function formWork(form,action){return async e=>{e.preventDefault();const button=form.querySelector('button[type="submit"]')||form.querySelector('button.primary'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Working…';status.classList.remove('error');try{await action(status);}catch(err){status.textContent=err.message;status.classList.add('error');}finally{button.disabled=false;}};}
 function base64(file,max){if(!file||file.size>max)throw Error(`Choose a file under ${max/1024/1024} MB.`);return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Unable to read that file.'));reader.readAsDataURL(file);});}
 async function submit(payload,status){const signature=JSON.stringify(payload);if(!pending||pending.signature!==signature)pending={signature,key:crypto.randomUUID()};const result=await api('/jobs',{method:'POST',headers:{'Idempotency-Key':pending.key},body:signature});pending=null;status.textContent=result.state==='failed'||result.state==='interrupted'?result.message:'Job saved. Follow its progress in Jobs & results.';notice(result.state==='complete'?'Your composition is ready for review.':'Job recorded. Open Jobs & results for its status.');await refresh();}
 $('#profileForm').addEventListener('submit',formWork($('#profileForm'),async status=>{const result=await api('/voices',{method:'POST',body:JSON.stringify({name:$('#profileName').value,reference_text:$('#profileTranscript').value,audio_base64:await base64($('#voiceSample').files[0],20*1024*1024)})});await loadVoices();$('#voiceProfile').value=result.id;$('#profileForm').reset();status.textContent='Voice reference saved on your server. Generate a short narration to test it.';}));
 $('#voiceForm').addEventListener('submit',formWork($('#voiceForm'),status=>submit({kind:'voice',text:$('#voiceText').value,voice_id:$('#voiceProfile').value,project:$('#voiceProject').value,agent:'Seline',title:$('#voiceText').value.trim().slice(0,70)},status)));
 function composer(kind){const animation=kind==='animation';return `<div class="creation-grid"><form class="glass-panel design-form" data-kind="${kind}"><label>Material & palette<select class="template-select" required><option value="">Loading collection…</option></select></label><div class="form-row"><label>Format<select class="design-ratio"><option value="1 / 1">Square · 1:1</option><option value="4 / 5">Portrait · 4:5</option><option value="9 / 16">Story · 9:16</option><option value="16 / 9">Landscape · 16:9</option></select></label>${animation?'<label>Seconds per slide<select class="scene-seconds"><option>3</option><option>4</option><option>5</option><option>2</option></select></label>':'<label>Brand name<input class="brand-name" value="GSN Technology" maxlength="80" required></label>'}</div><label>Project name<input class="design-project" maxlength="120" value="Daily studio" required></label><div class="slides"></div><button type="button" class="add-slide">+ Add carousel slide</button><hr style="border:0;border-top:1px solid #d9e5e5;margin:25px 0"><button class="primary" type="submit">${animation?'Create animated HTML':'Create social design'} ↗</button><p class="form-status" role="status"></p></form><aside class="direction-card"><span class="eyebrow">THE MATERIAL COLLECTION</span><h2 style="margin-top:25px">Reflective by design.</h2><p class="design-note">Chrome apertures, liquid mirrors, prismatic glass, magnetic fields, and more. These are the same handcoded designs from your original studio.</p><div class="prompt-example">Choose one of 200 material-and-palette combinations. Add your words, build a carousel, and export a standalone ${animation?'animated':'social'} HTML composition.</div><p class="design-note">${animation?'Animation exports are silent HTML loops. Use the footage editor to assemble video with narration.':'HTML exports preserve the full design. Use the existing design studio for fine layout edits and SVG export.'}</p><a href="/classic#${animation?'motion':'templates'}">Open the full ${animation?'animation studio':'template collection'} ↗</a></aside></div>`;}
 $('#postComposer').innerHTML=composer('post');$('#animationComposer').innerHTML=composer('animation');
 function labelSlides(container){
  const slides=[...container.children];
  slides.forEach((slide,index)=>{
   const role=slides.length===1?'Single post':index===0?'Hook cover':index===slides.length-1?'Call to action':'Content';
   slide.querySelector('.slide-role').textContent=`${index+1} · ${role}`;
   slide.querySelector('.slide-title').placeholder=role==='Call to action'?'Book an automation consultation.':role==='Hook cover'?'Where does your team lose time?':'Make room for better ideas.';
  });
 }
 function addSlide(form,preset){
  const container=form.querySelector('.slides');
  if(container.children.length>=20)return notice('Maximum 20 slides per composition.');
  const el=document.createElement('div');
  el.className='slide-input';
  const motifs=['hourglass','visor','orbit','portfolio','stack','lift','product','audio','terminal','rocket','none'];
  el.innerHTML=`<p class="eyebrow slide-role"></p><label>Headline<input class="slide-title" maxlength="160" required></label><label>Supporting copy<textarea class="slide-body" rows="2" maxlength="600" placeholder="Your message, in your own words."></textarea></label><details class="campaign-controls"><summary>Artwork, image and colors</summary><label>Label<input data-appearance="kicker" maxlength="90" placeholder="Template default"></label><label>Artwork<select data-appearance="motif"><option value="">Template default</option>${motifs.map(motif=>`<option>${motif}</option>`).join('')}<optgroup label="AI automation photography">${businessArtworkOptions()}</optgroup><optgroup label="Campaign photography">${campaignArtworkOptions()}</optgroup></select></label><button type="button" class="pick-image">Browse picture library</button><label>Upload or replace image<input class="slide-image" type="file" accept="image/png,image/jpeg,image/webp"></label><img class="upload-preview slide-image-preview" alt="Uploaded slide artwork" hidden><button type="button" class="remove-image" disabled>Remove image</button>${[['accent','Accent','#ac82f4'],['background','Background','#101323'],['ink','Text color','#f8faff']].map(([key,label,value])=>`<label>${label}<input type="color" data-appearance="${key}" value="${value}"></label>`).join('')}${[['artX','Artwork horizontal position',-50,50,0],['artY','Artwork vertical position',-50,50,0],['artScale','Artwork size',35,180,100]].map(([key,label,min,max,value])=>`<label>${label}<input type="range" data-appearance="${key}" min="${min}" max="${max}" value="${value}"></label>`).join('')}</details><button type="button" class="remove-slide">Remove slide</button>`;
  const preview=el.querySelector('.slide-image-preview');
  const removeImage=el.querySelector('.remove-image');
  const imageInput=el.querySelector('.slide-image');
  let uploadVersion=0;
  imageInput.onchange=async()=>{
   const version=++uploadVersion;
   try{const image=await prepareSlideImage(imageInput.files[0]);if(version!==uploadVersion)return;el.slideImage=image;preview.src=image;preview.hidden=false;removeImage.disabled=false;}
   catch(error){if(version===uploadVersion)notice(error.message);}
   finally{if(version===uploadVersion)imageInput.value='';}
  };
  removeImage.onclick=()=>{uploadVersion++;delete el.slideImage;imageInput.value='';preview.removeAttribute('src');preview.hidden=true;removeImage.disabled=true;};
  el.querySelector('.pick-image').onclick=()=>openPictureLibrary(picture=>{
   removeImage.click();
   const select=el.querySelector('[data-appearance=motif]');
   setPictureChoice(select,picture);
   select.dataset.edited='true';
  });
  el.querySelectorAll('[data-appearance]').forEach(input=>input.addEventListener('input',()=>input.dataset.edited='true'));
  el.querySelector('.remove-slide').onclick=()=>{
   if(el===container.firstElementChild||el===container.lastElementChild)return notice('Keep the hook and CTA. You can edit both pages.');
   el.remove();
   labelSlides(container);
  };
  if(preset){
   el.querySelector('.slide-title').value=preset.title;
   el.querySelector('.slide-body').value=preset.body;
   el.deckLayout=preset.deckLayout;
   for(const input of el.querySelectorAll('[data-appearance]')){
    const key=input.dataset.appearance;
    if(preset[key]===undefined)continue;
    if(key==='motif'&&gsnPicturePattern.test(preset[key]))setPictureChoice(input,preset[key]);
    else input.value=preset[key];
    input.dataset.edited='true';
   }
  }
  container.insertBefore(el,!preset&&container.children.length>=2?container.lastElementChild:null);
  labelSlides(container);
 }
 function readSlide(element){
  const slide={title:element.querySelector('.slide-title').value,body:element.querySelector('.slide-body').value};
  if(element.deckLayout)slide.deckLayout=element.deckLayout;
  if(element.slideImage)slide.image=element.slideImage;
  for(const input of element.querySelectorAll('[data-appearance][data-edited]')){
   if(input.dataset.appearance==='motif'&&!input.value)continue;
   slide[input.dataset.appearance]=input.type==='range'?Number(input.value):input.value;
  }
  return slide;
 }
 $$('.design-form').forEach(form=>{addSlide(form);addSlide(form);form.querySelector('.add-slide').textContent='+ Add content page';form.querySelector('.add-slide').onclick=()=>addSlide(form);form.addEventListener('submit',formWork(form,status=>submit({kind:form.dataset.kind,template_id:Number(form.querySelector('.template-select').value),ratio:form.querySelector('.design-ratio').value,scene_seconds:Number(form.querySelector('.scene-seconds')?.value||3),brand:form.querySelector('.brand-name')?.value||'GSN Technology',project:form.querySelector('.design-project').value,agent:form.dataset.kind==='animation'?'Flux':'Spectra',title:form.querySelector('.slide-title').value,slides:[...form.querySelectorAll('.slide-input')].map(readSlide)},status)));});
 async function loadVoices(){const selected=$('#voiceProfile').value;voices=(await api('/voices')).voices;$('#voiceProfile').innerHTML='<option value="">Choose a saved voice</option>'+voices.map(v=>`<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');if(voices.some(v=>v.id===selected))$('#voiceProfile').value=selected;}
 async function loadTemplates(){
  templates=(await api('/templates')).templates;
  $$('.template-select').forEach(select=>{
   const previous=select.value;
   select.innerHTML=templates.map(t=>`<option value="${t.id}">${String(t.id+1).padStart(3,'0')} · ${esc(t.name)}${t.slides?' · 3D Agency · 5 pages':''}</option>`).join('');
   if(previous&&templates.some(t=>String(t.id)===previous))select.value=previous;
   select.onchange=()=>{
    const template=templates.find(t=>String(t.id)===select.value);
    if(!template?.slides)return;
    const form=select.closest('form');
    form.querySelector('.slides').replaceChildren();
    form.querySelector('.design-ratio').value=template.ratio;
    template.slides.forEach(slide=>addSlide(form,slide));
   };
  });
 }
 const kindName={text_to_video:'Text to video',image_to_video:'Image to video',voice:'Voice narration',post:'Social design',animation:'Animation'};
 function jobCard(j){let media='';if(j.state==='complete'&&j.asset_url){const src=esc(j.asset_url);media=j.output==='mp4'?`<video controls playsinline preload="metadata" src="${src}"></video>`:j.output==='wav'?`<audio controls preload="none" src="${src}"></audio>`:`<iframe sandbox="allow-scripts" loading="lazy" title="${esc(j.title)} preview" src="${src}"></iframe>`;}
  return `<article class="result"><div class="result-top"><span>${esc(kindName[j.kind]||j.kind)}</span><b class="badge ${esc(j.state)}">${esc(j.state.replaceAll('_',' '))}</b></div><h3>${esc(j.title)}</h3><div class="meta">${esc(j.agent)} · ${esc(j.project)}<br>${esc(new Date(j.created_at).toLocaleString())} · ${esc(j.id.slice(0,8))}</div><p class="message">${esc(j.message||'Waiting for the worker.')}${j.connection_error?'<br>Connection: '+esc(j.connection_error):''}</p>${media}${j.state==='complete'?`<div class="actions"><a class="button" href="${esc(j.asset_url)}?download=1">Download ↓</a><button data-review="approved" data-job="${j.id}">Approve</button><button data-review="rejected" data-job="${j.id}">Reject</button><span class="review-label">${esc(j.review||'pending')} review</span></div>`:''}</article>`;}
 function patchResults(container,list){const wanted=new Set(list.map(j=>j.id));[...container.children].forEach(el=>{if(!wanted.has(el.dataset.jobCard))el.remove();});if(!list.length){container.innerHTML='<div class="empty">Your next idea starts here.<br>New jobs from you and your Hermes agents will appear in this workspace.</div>';return;}list.forEach((j,index)=>{let el=[...container.children].find(c=>c.dataset.jobCard===j.id);const version=JSON.stringify(j);if(!el||el._jobVersion!==version){if(el&&[...el.querySelectorAll('video,audio')].some(m=>!m.paused&&!m.ended))return;const holder=document.createElement('div');holder.innerHTML=jobCard(j);const next=holder.firstElementChild;next.dataset.jobCard=j.id;next._jobVersion=version;if(el)el.replaceWith(next);else container.insertBefore(next,container.children[index]||null);el=next;}});}
 function renderJobs(){const filter=$('#jobFilter').value,list=jobs.filter(j=>filter==='all'||filter==='video'&&j.kind.endsWith('_video')||j.kind===filter);patchResults($('#allJobs'),list);patchResults($('#recentJobs'),jobs.slice(0,2));}
 $('#jobFilter').onchange=renderJobs;
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-review]');if(!b)return;b.disabled=true;try{await api(`/jobs/${b.dataset.job}/review`,{method:'POST',body:JSON.stringify({review:b.dataset.review})});await refresh();}catch(err){notice(err.message);}finally{b.disabled=false;}});
 function renderWorkers(health){
  for(const [key, selector] of [['voice','#voiceWorkerPanel'],['visuals','#visualWorkerPanel']]){
   const worker=health.workers[key];
   if($(selector))$(selector).innerHTML=`<b class="service-state ${worker.ready?'ready':''}">${worker.ready?'Available':'Offline'}</b><p>${esc(worker.gpu||worker.message||'Connected')}</p>`;
  }
  if($('#workerCards'))$('#workerCards').innerHTML=Object.entries(health.workers).map(([name,worker])=>'<article class="worker-card"><strong>'+esc(name==='voice'?'Voice':'Visuals')+'</strong><p>'+esc(worker.ready?'Available':'Offline')+'</p></article>').join('');
  $('#workerSummary').textContent=`Voice ${health.workers.voice.ready?'ready':'offline'} · GPU ${health.workers.visuals.ready?'ready':'offline'}`;
 }
 async function refresh(){if(!unlocked||polling)return;polling=true;try{const result=await api('/jobs');jobs=result.jobs;if($('#orbitJobSummary'))$('#orbitJobSummary').textContent=`${result.total} recorded · ${jobs.filter(job=>job.state==='complete'&&job.review==='pending').length} awaiting review in recent jobs`;renderJobs();if(Date.now()-lastHealth>30000){renderWorkers(await api('/health'));lastHealth=Date.now();}}catch(e){if(unlocked)notice(e.message);}finally{polling=false;}}
 async function start(){try{await api('/jobs');unlocked=true;$('#accessGate').hidden=true;await Promise.all([loadTemplates(),loadVoices()]);await refresh();}catch(e){$('#accessGate').hidden=false;$('#accessStatus').textContent=e.message;}}
 $('#accessForm').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{await api('/session',{method:'POST',body:JSON.stringify({token:$('#accessKey').value})});$('#accessKey').value='';location.assign('/classic#home');}catch(err){$('#accessStatus').textContent=err.message;}finally{button.disabled=false;}};
 $('#signOut').onclick=async()=>{await api('/session',{method:'DELETE'});unlocked=false;$('#accessGate').hidden=false;};
 $('#refresh').onclick=()=>{lastHealth=0;refresh();};
 $('#agentGrid').innerHTML=specialists.map(([name,role,description])=>`<article class="agent-card"><div class="initial">${name[0]}</div><h2>${name}</h2><span class="role">${role}</span><p>${description}</p></article>`).join('');
 view(location.hash.slice(1));start();setInterval(refresh,10000);
 window.addEventListener('beforeunload',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);});
})();
