'use strict';
// UI for the private local-model worker. Never sends prompts to an external paid service.
const ImageCreator=(()=>{
 const {api,esc,toast}=App;const cache=new Map();
 function open(host,{insert,replace}){
  let key=crypto.randomUUID(),pending=null,timer=0,working=false;
  host.innerHTML=`<p class="hint">Generate with your local model. CPU generation is slow; exact faces and product details are not guaranteed.</p><p class="hint">Create a person and product separately to control them independently. Existing combined photographs cannot be ungrouped here. After insertion, use Remove background on a person or product if needed.</p><p class="hint" data-image-health>Checking the image worker…</p>
  <form data-image-form><label class="ed-field">Create a separate layer<select name="role"><option value="person">Person only</option><option value="product">Product only</option><option value="background">Background only</option><option value="image">Complete image</option></select></label>
  <label class="ed-field">Describe your image<textarea name="prompt" rows="5" maxlength="1200" required placeholder="An adult woman in an orange jumper, seated, facing camera, full body, realistic studio photography"></textarea></label>
  <label class="ed-field">Avoid<textarea name="negative_prompt" rows="2" maxlength="600" placeholder="Blurry details, distorted hands, lettering"></textarea></label>
  <label class="ed-field">Shape<select name="ratio"><option value="1:1">Square</option><option value="4:5">Portrait</option><option value="16:9">Landscape</option></select></label>
  <details><summary>Generation controls</summary><label class="ed-field">Seed (optional)<input name="seed" type="number" min="0" max="2147483647" step="1" placeholder="Random"></label><label class="ed-field">Steps<input name="steps" type="number" min="10" max="40" step="1" value="25"></label></details>
  <button class="btn-maroon" type="submit" data-generate disabled>Generate image</button></form>
  <p class="hint" role="status" data-image-status></p><div data-image-result></div><h3>Saved generations</h3><button type="button" class="btn-light" data-image-refresh>Refresh saved images</button><div data-image-library></div>`;
  const $=s=>host.querySelector(s),status=$('[data-image-status]'),button=$('[data-generate]'),result=$('[data-image-result]');
  const alive=()=>host.isConnected;
  const say=m=>{if(alive())status.textContent=m};
  async function data(id){if(cache.has(id))return cache.get(id);const asset=await api('/images/'+id+'/asset');const url='data:image/png;base64,'+asset.image_base64;if(cache.size>=30)cache.delete(cache.keys().next().value);cache.set(id,url);return url;}
  async function show(j){
   if(!alive())return;const url=await data(j.id);if(!alive())return;
   result.innerHTML=`<img src="${url}" alt="Generated ${esc(j.role)}" style="display:block;width:100%;max-height:270px;object-fit:contain;background:#eee"><p class="hint">${esc(j.prompt)} · Seed ${j.seed}</p><div class="ed-actions"><button type="button" class="btn-maroon" data-insert>Add as a new ${esc(j.role)} layer</button><button type="button" class="btn-light" data-replace>Replace selected image only</button><button type="button" class="btn-light" data-save-image>Download PNG</button></div>`;
   $('[data-insert]').onclick=async()=>{try{await insert(url,j.role);toast('Added a separate '+j.role+' layer.')}catch(e){say(e.message)}};
   $('[data-replace]').onclick=async()=>{try{await replace(url);toast('Only the selected image was replaced.')}catch(e){say(e.message)}};
   $('[data-save-image]').onclick=()=>{const a=document.createElement('a');a.href=url;a.download='gsn-'+j.role+'-'+j.seed+'.png';a.click()};
  }
  async function poll(){if(!alive()||!pending)return;try{const j=await api('/images/'+pending);say(j.message||j.state);if(j.connection_error)say(j.connection_error);
   if(j.state==='complete'&&j.has_image){working=false;button.disabled=false;key=crypto.randomUUID();await show(j);await library();return;}
   if(j.state==='failed'||j.state==='interrupted'){working=false;button.disabled=false;key=crypto.randomUUID();await library();return;}
  }catch(e){say(e.message)}timer=setTimeout(poll,5000);}
  async function library(){try{const {images}=await api('/images');if(!alive())return;const rows=images.slice(0,40);$('[data-image-library]').innerHTML=rows.length?rows.map(j=>`<button type="button" class="btn-light" data-image-id="${j.id}" style="display:block;width:100%;margin:8px 0;text-align:left">${esc(j.prompt.slice(0,70))}<br><small>${esc(j.role)} · ${esc(j.state)}</small></button>`).join(''):'<p class="hint">Your generated images will be saved here.</p>';
   host.querySelectorAll('[data-image-id]').forEach(b=>b.onclick=async()=>{try{const j=await api('/images/'+b.dataset.imageId);say(j.message||j.state);if(j.has_image)await show(j);else if(!['failed','interrupted'].includes(j.state)){pending=j.id;working=true;button.disabled=true;clearTimeout(timer);poll()}}catch(e){say(e.message)}});
  }catch(e){say(e.message)}}
  async function health(){try{const h=await api('/images/health');if(!alive())return;$('[data-image-health]').textContent=h.message+(h.model?' Model: '+h.model:'');button.disabled=!h.ready||working;}catch(e){say(e.message)}}
  $('[data-image-refresh]').onclick=()=>{health();library()};
  $('[data-image-form]').onsubmit=async e=>{e.preventDefault();if(working)return;working=true;button.disabled=true;
   const f=new FormData(e.currentTarget),payload={prompt:f.get('prompt'),negative_prompt:f.get('negative_prompt'),role:f.get('role'),ratio:f.get('ratio'),steps:Number(f.get('steps')),request_key:key};if(f.get('seed')!=='')payload.seed=Number(f.get('seed'));
   try{say('Submitting to your local image worker…');const j=await api('/images',{method:'POST',body:payload});pending=j.id;clearTimeout(timer);poll();}
   catch(e){working=false;button.disabled=false;say(e.message)}
  };
  health();library();
 }
 return {open};
})();
