'use strict';
/* GSN Media Studio: app core (routing, API client, shared helpers). Views live in dashboard.js, library.js, editor.js. */
const App=(()=>{
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={presets:[],groups:[],designs:[],platform:'instagram',presetId:'instagram-post'};
 const paths={
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  templates:'<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  designs:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  agents:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c3 .2 5 2.2 5 5.3"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  chevronRight:'<path d="m9 6 6 6-6 6"/>',
  back:'<path d="m15 5-7 7 7 7"/>',
  forward:'<path d="m9 5 7 7-7 7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  reload:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  share:'<path d="M12 15V3m-4 4 4-4 4 4"/><path d="M5 11v8h14v-8"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  play:'<path d="m7 4 13 8-13 8Z"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 20h16"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  text:'<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  shapes:'<rect x="3" y="12" width="9" height="9" rx="2"/><circle cx="16.5" cy="7.5" r="4.5"/><path d="m4 9 4-6 4 6Z"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 15v5h16v-5"/>',
  brand:'<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21c-2 0-2-2-.6-3.2 1.2-1 .4-2.6-1.4-2.6"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  check:'<path d="m5 12 5 5 9-10"/>',
  more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  bold:'<path d="M7 4h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 9H7z"/>',
  italic:'<path d="M10 4h8M6 20h8M14 4 10 20"/>',
  underline:'<path d="M7 4v7a5 5 0 0 0 10 0V4M5 21h14"/>',
  strike:'<path d="M4 12h16M16.5 7a4.5 3 0 0 0-9 .5c0 3 9 2 9 5.5s-9 2.5-9 .5"/>',
  alignLeft:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  alignCenter:'<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  alignRight:'<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  alignJustify:'<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  up:'<path d="m6 15 6-6 6 6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  rotate:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  magic:'<path d="m5 19 9-9"/><path d="m14 4 .8 2.2L17 7l-2.2.8L14 10l-.8-2.2L11 7l2.2-.8ZM19 12l.5 1.5L21 14l-1.5.5L19 16l-.5-1.5L17 14l1.5-.5Z"/>',
  grid:'<path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
  filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 };
 const icon=(name,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
 // Social marks come from the template artwork set, so previews and UI use the same glyphs.
 const platformIcon=(id,cls='')=>{const e=window.GSNKit?.slideElements?.[id];return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e?e[1]:''}</svg>`};

 // The active workspace is remembered per browser; the server checks that the signed-in person belongs to it.
 let workspace='';try{workspace=localStorage.getItem('gsn_ws')||''}catch{}
 const setWorkspace=id=>{workspace=id||'';try{localStorage.setItem('gsn_ws',workspace)}catch{}};
 async function api(path,{method='GET',body}={}){
  const response=await fetch('/api/v1'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(workspace?{'X-GSN-Workspace':workspace}:{})},body:body?JSON.stringify(body):undefined});
  let data=null;try{data=await response.json()}catch{}
  if(!response.ok){if(response.status===401&&typeof Team!=='undefined')Team.needLogin();const error=Error(data?.error||`The studio could not complete that request (${response.status}).`);error.status=response.status;error.data=data;throw error}
  return data;
 }
 let toastTimer=0;
 function toast(message,ms=3600){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),ms)}
 const preset=id=>state.presets.find(p=>p.id===id);
 const groupOf=id=>state.groups.find(g=>g.id===id);
 const ago=iso=>{const s=Math.max(1,(Date.now()-new Date(iso))/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+' min ago';if(s<86400)return Math.floor(s/3600)+' h ago';return Math.floor(s/86400)+' d ago'};
 async function loadDesigns(){try{state.designs=(await api('/designs')).designs}catch(e){state.designs=[];throw e}return state.designs}

 // Create a design (or a whole pack of designs, one per platform size) from a template, then open the first one.
 async function createPack(templateId,presetIds,title,extra={}){
  const packId=presetIds.length>1?crypto.randomUUID():undefined;
  let first;
  for(const presetId of presetIds){
   const design=await api('/designs',{method:'POST',body:{template_id:templateId,platform:presetId,title:presetIds.length>1?`${title} · ${preset(presetId).name}`:title,...(packId?{pack_id:packId}:{}),...(extra.pages?{pages:extra.pages}:{}),...(extra.notes?{notes:extra.notes}:{})}});
   first??=design;
  }
  location.hash='#editor/'+first.id;
 }

 let current='';
 function show(which){
  $('#stage').hidden=which!=='stage';$('#editorRoot').hidden=which!=='editor';
  document.body.classList.toggle('in-editor',which==='editor');
 }
 async function route(){
  const hash=location.hash||'#home';
  if(current.startsWith('#editor')&&!hash.startsWith('#editor'))Editor.close();
  current=hash;
  if(hash==='#home'){show('portal');$('#stage').hidden=true;$('#editorRoot').hidden=true;if(typeof LandingPortal!=='undefined'&&$('#landingPortal').hidden)LandingPortal.show();requestAnimationFrame(()=>Water.start($('.portal-water')));return}
  if(typeof LandingPortal!=='undefined'&&!$('#landingPortal').hidden)LandingPortal.hide(true);
  document.body.classList.remove('portal-open');
  const editor=hash.match(/^#editor\/([a-f0-9-]{36})$/),fresh=hash.match(/^#new\/(\d+)\/([a-z0-9-]+)$/);
  try{
   if(editor){show('editor');await Editor.open(editor[1]);return}
   if(fresh){const t=Number(fresh[1]),p=fresh[2];if(!GSNKit.templates[t]||!preset(p)){location.replace('#templates');return}
    await createPack(t,[p],GSNKit.templates[t].cartoon?GSNKit.templates[t].name:GSNKit.gsnPhoto(t).name);return}
   const view=hash.slice(1);show('stage');await Dashboard.show(['dashboard','templates','designs','agents','schedule','team'].includes(view)?view:'dashboard');
  }catch(error){toast(error.message,6000);if(editor||fresh)location.replace('#designs')}
 }
 async function start(){
  window.addEventListener('hashchange',route);
  if(typeof Team!=='undefined'&&!await Team.boot())return;
  try{const {presets,groups}=await api('/platforms');state.presets=presets;state.groups=groups}
  catch(error){document.body.classList.remove('portal-open');show('stage');$('#stage').innerHTML=`<div class="boot-error"><h1>The studio can’t reach its server.</h1><p>${esc(error.message)}</p><p class="muted">Open this page through the studio server (for example <code>http://localhost:4188</code>), or through your SSH tunnel.</p></div>`;return}
  await route();
 }
 return {$,$$,esc,icon,platformIcon,api,toast,state,setWorkspace,preset,groupOf,ago,loadDesigns,createPack,start,route};
})();
