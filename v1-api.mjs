import {mkdir,readFile,writeFile,rename,readdir,stat,unlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {templateCatalog,renderDesign,starterSlides,composeSlides,layoutGuide} from './template-engine.mjs';
import {sanitizeDesign,summary as designSummary,DesignError} from './designs-api.mjs';
import {PRESETS,PLATFORM_GROUPS} from './platforms.mjs';
import {createAccounts} from './accounts.mjs';
import {createPublisher} from './publisher.mjs';

const designTemplateCount=templateCatalog().length;
const terminal=new Set(['complete','failed','interrupted']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash=x=>createHash('sha256').update(x).digest();
const same=(a,b)=>timingSafeEqual(hash(a),hash(b));
const json=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
class InputError extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw new InputError('Send application/json.',415);let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>30*1024*1024)throw new InputError('Request exceeds 30 MB.',413);chunks.push(c);}try{const value=JSON.parse(Buffer.concat(chunks));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new InputError('Send a valid JSON object.');}}
const text=(value,name,max,required=true)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new InputError(`${name} must contain ${required?'1':'0'}–${max} characters.`);return value.trim();};
const decode=(value,max)=>{if(typeof value!=='string'||!value||value.length>Math.ceil(max/3)*4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new InputError('Invalid or oversized base64 file.');const b=Buffer.from(value,'base64');if(b.length>max)throw new InputError('File is too large.',413);return b;};

export function createV1({publishEnv=process.env,clock=Date.now,dataDir=process.env.GSN_DATA_DIR||path.resolve('data/v1'),token=process.env.GSN_AGENT_TOKEN||'',voiceUrl=process.env.VOICE_WORKER_URL||'',visualUrl=process.env.VISUAL_WORKER_URL||'',cutoutUrl=process.env.CUTOUT_WORKER_URL||'http://cutout:8092',fetchImpl=fetch,openUi=process.env.GSN_REQUIRE_KEY!=='1'}={}){
 const accounts=createAccounts({dataDir,now:clock});
 const publisher=createPublisher({dataDir,fetchImpl,env:publishEnv,now:clock,credentials:ws=>accounts.credentials(ws)});
 const inWs=(r,ws)=>(r.workspace_id||'main')===ws;
 const sessions=new Map(),busy=new Set();let mutation=Promise.resolve(),reconciling=false;
 const ready=mkdir(dataDir,{recursive:true,mode:0o700}).then(async()=>{
  for(const name of await readdir(dataDir))if(name.endsWith('.json')){
   try{const j=JSON.parse(await readFile(path.join(dataDir,name),'utf8'));if(j.record_type==='job'&&j.state==='submitting'){j.state='interrupted';j.message='App restarted during submission. Inspect worker history before creating another request.';await save(j.id,j);}}catch{}
  }
 });
 const file=(id,suffix='json')=>path.join(dataDir,`${id}.${suffix}`);
 const load=async id=>JSON.parse(await readFile(file(id),'utf8'));
 const save=async(id,data)=>{const temp=file(id,'tmp');await writeFile(temp,JSON.stringify(data),{mode:0o600});await rename(temp,file(id));};
 const serial=fn=>{const p=mutation.then(fn);mutation=p.catch(()=>{});return p;};
 async function list(type){await ready;const values=[];for(const name of await readdir(dataDir)){if(!name.endsWith('.json'))continue;try{const value=await load(name.slice(0,-5));if(value.record_type===type)values.push(value);}catch{}}return values.sort((a,b)=>b.created_at.localeCompare(a.created_at));}
 const publicJob=j=>{const {fingerprint,...value}=j;return value;};
 const sameSite=req=>{const f=req.headers['sec-fetch-site'];if(f)return f==='same-origin';const o=req.headers.origin||req.headers.referer;try{return !!o&&new URL(o).host===req.headers.host}catch{return false}};
 const auth=req=>{const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(bearer&&token&&same(bearer,token))return 'agent';const sid=req.headers.cookie?.match(/(?:^|;\s*)gsn_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(sid&&sessions.get(sid)>Date.now())return 'owner';if(openUi&&sameSite(req))return 'owner';return false;};
 const workerUrl=j=>j.worker==='voice'?voiceUrl:visualUrl;
 async function workerFetch(j,route,options={}){const url=workerUrl(j);if(!url)throw new Error(`${j.worker} worker is not configured.`);return fetchImpl(new URL(route,url),{...options,signal:AbortSignal.timeout(20000)});}
 async function collect(j,upstream){
  if(upstream.id!==j.upstream_id)throw new Error('Worker returned a mismatched job ID.');
  if(!['queued','starting','loading_model','running','complete','failed','interrupted'].includes(upstream.state))throw new Error('Worker returned an unknown state.');
  j.state=upstream.state;j.message=String(upstream.message||'').slice(0,1200);j.updated_at=new Date().toISOString();
  if(j.state==='complete'){
   const expected=j.kind==='voice'?'result.wav':'result.mp4';if(upstream.filename!==expected)throw new Error('Worker returned an unexpected output.');
   const response=await workerFetch(j,`/assets/${j.upstream_id}/${expected}`);if(!response.ok||!response.body)throw new Error('Worker output is not yet available.');
   const suffix=j.kind==='voice'?'wav':'mp4';let size=0;const limit=new Transform({transform(chunk,encoding,cb){size+=chunk.length;cb(size>150*1024*1024?new Error('Output exceeds 150 MB.'):null,chunk);}});
   const temp=file(j.id,`${suffix}.part`);
   try{const {createWriteStream}=await import('node:fs');await pipeline(Readable.fromWeb(response.body),limit,createWriteStream(temp,{mode:0o600}));await rename(temp,file(j.id,suffix));}catch(e){await unlink(temp).catch(()=>{});throw e;}
   j.output=suffix;j.asset_url=`/api/v1/jobs/${j.id}/asset`;j.review='pending';
  }
  delete j.connection_error;await save(j.id,j);
 }
 async function refresh(j){if(terminal.has(j.state)||busy.has(j.id)||!j.upstream_id)return j;busy.add(j.id);try{const response=await workerFetch(j,`/jobs/${j.upstream_id}`);if(response.status===404){j.state='interrupted';j.message='Worker no longer has this job. Review before submitting a new request.';await save(j.id,j);}else{if(!response.ok)throw new Error(`Worker status HTTP ${response.status}.`);await collect(j,await response.json());}}catch(e){j.connection_error=e.message;await save(j.id,j);}finally{busy.delete(j.id);}return j;}
 async function reconcile(){if(reconciling)return;reconciling=true;try{for(const j of await list('job'))if(j.state!=='submitting'&&!terminal.has(j.state))await refresh(j);}finally{reconciling=false;}}
 function validateJob(p){
  if(!p||typeof p!=='object'||Array.isArray(p))throw new InputError('Send a job JSON object.');
  if(!['voice','post','animation'].includes(p.kind))throw new InputError('Choose voice, post or animation.');
  const result={kind:p.kind,title:text(p.title||p.kind.replaceAll('_',' '),'Title',120),agent:text(p.agent||'Owner','Agent',80),project:text(p.project||'Daily studio','Project',120)};
  if(['post','animation'].includes(p.kind)){
   if(!Number.isInteger(p.template_id)||p.template_id<0||p.template_id>=designTemplateCount)throw new InputError('template_id is outside the design catalog.');
   if(!Array.isArray(p.slides)||!p.slides.length||p.slides.length>20)throw new InputError('Supply 1–20 slides.');
   result.template_id=p.template_id;
   result.slides=p.slides.map(s=>{
    if(!s||typeof s!=='object'||Array.isArray(s))throw new InputError('Each slide must be an object.');
    const slide={title:text(s.title,'Slide title',160),body:text(s.body??'','Slide body',600,false)};
    if(['hook','cta','agenda','triptych','feature','principle','steps','compare','metric','checklist','quote','example','summary'].includes(s.deckLayout))slide.deckLayout=s.deckLayout;
    for(const key of ['kicker','brandText','footerText'])if(s[key]!==undefined)slide[key]=text(s[key],key,90,false);
    if(s.layerOrder!==undefined){
     const keys=['title','body','kicker','brandText','footerText','artwork'];
     if(!Array.isArray(s.layerOrder)||s.layerOrder.length>keys.length||new Set(s.layerOrder).size!==s.layerOrder.length||s.layerOrder.some(key=>!keys.includes(key)))throw new InputError('Unsupported layer order.');
     slide.layerOrder=s.layerOrder;
    }
    if(s.artLayer!==undefined){
     if(!['behind','front','background'].includes(s.artLayer))throw new InputError('Unsupported artwork layer.');
     slide.artLayer=s.artLayer;
    }
    if(s.motif!==undefined){
     if(typeof s.motif!=='string'||(!['hourglass','visor','orbit','portfolio','stack','lift','product','audio','terminal','rocket','none'].includes(s.motif)&&!/^(?:business-(?:[0-9]|1[0-9]|2[0-3])|campaign-(?:[0-9]|1[01])|gsn-(?:0|[1-9][0-9]{0,2}|1[01][0-9]{2}))$/.test(s.motif)))throw new InputError('Unsupported artwork.');
     slide.motif=s.motif;
    }
    for(const color of ['accent','background','ink'])if(s[color]!==undefined){
     if(typeof s[color]!=='string'||!/^#[0-9a-f]{6}$/i.test(s[color]))throw new InputError('Use six-digit hex colors.');
     slide[color]=s[color];
    }
    for(const [key,min,max] of [['artX',-50,50],['artY',-50,50],['artScale',35,180]])if(s[key]!==undefined){
     if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new InputError(`Slide ${key} must be between ${min} and ${max}.`);
     slide[key]=s[key];
    }
    if(s.image!==undefined){
     if(typeof s.image!=='string'||s.image.length>1400000||!/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/]+={0,2})$/i.test(s.image))throw new InputError('Slide image must be a PNG, JPEG or WebP data URL up to 1.4 MB.');
     slide.image=s.image;
    }
    return slide;
   });
   result.brand=text(p.brand||'GSN Technology','Brand',80);result.handle=text(p.handle||result.brand,'Handle',80);
   result.ratio=p.ratio||'1 / 1';if(!['1 / 1','4 / 5','9 / 16','16 / 9'].includes(result.ratio))throw new InputError('Unsupported design ratio.');
   result.scene_seconds=p.scene_seconds??3;if(!Number.isInteger(result.scene_seconds)||result.scene_seconds<1||result.scene_seconds>10)throw new InputError('scene_seconds must be 1–10.');
  }else{
   result.text=text(p.text,'Prompt / narration',1200);
   if(p.kind==='voice'){if(!uuid.test(p.voice_id||''))throw new InputError('Select a saved voice profile.');result.voice_id=p.voice_id;}
  }return result;
 }
 async function submit(p,key,ws){return serial(async()=>{
  const normalized=validateJob(p);const fingerprint=hash(JSON.stringify(normalized)).toString('hex');
  const existing=(await list('job')).find(j=>j.request_key===key&&inWs(j,ws));if(existing){if(existing.fingerprint!==fingerprint)throw new InputError('This Idempotency-Key was already used for different content.',409);return existing;}
  const active=(await list('job')).filter(j=>!terminal.has(j.state));if(active.length>=20)throw new InputError('Studio has 20 active jobs. Wait for completion.',429);
  const id=randomUUID(),now=new Date().toISOString();
  const stored={...normalized}; if(stored.slides)stored.slides=stored.slides.map(({image,...slide})=>slide);
  const j={...stored,id,record_type:'job',workspace_id:ws,request_key:key,fingerprint,state:'submitting',review:'pending',created_at:now,updated_at:now};
  if(['post','animation'].includes(p.kind)){await writeFile(file(id,'html'),renderDesign(normalized),{mode:0o600});Object.assign(j,{state:'complete',output:'html',asset_url:`/api/v1/jobs/${id}/asset`,message:'HTML composition ready for review.'});await save(id,j);return j;}
  j.worker='voice';const payload={kind:'voice',text:normalized.text,request_id:id};
  if(j.worker==='voice'){const profile=await load(normalized.voice_id).catch(()=>null);if(profile?.record_type!=='voice'||!inWs(profile,ws))throw new InputError('Voice profile not found.',404);payload.reference_text=profile.reference_text;payload.audio_base64=(await readFile(file(profile.id,'audio'))).toString('base64');}
  await save(id,j);
  try{const response=await workerFetch(j,'/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok){j.state='failed';j.message=String(data.error||`Worker HTTP ${response.status}.`).slice(0,1200);}else{if(!uuid.test(data.id||''))throw new Error('Invalid worker job ID.');j.upstream_id=data.id;j.state='queued';j.message='Queued on model worker.';}}catch(e){j.state='interrupted';j.message='Submission could not be confirmed. Inspect the worker before creating another request.';j.connection_error=e.message;}
  await save(id,j);return j;
 });}
 async function asset(req,res,j){if(j.state!=='complete'||!j.output)throw new InputError('Result is not ready.',409);const target=file(j.id,j.output),info=await stat(target);const mime={mp4:'video/mp4',wav:'audio/wav',html:'text/html; charset=utf-8'}[j.output];const headers={'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
  if(j.output==='html')headers['Content-Security-Policy']="sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:;";
  if(new URL(req.url,'http://localhost').searchParams.has('download'))headers['Content-Disposition']=`attachment; filename="GSN-${j.id}.${j.output}"`;
  let start=0,end=info.size-1,status=200;const range=req.headers.range;if(range){const m=range.match(/^bytes=(\d+)-(\d*)$/);if(!m||(start=Number(m[1]))>=info.size||(end=m[2]?Math.min(Number(m[2]),end):end)<start){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')res.end();else createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }

 // Brand people: faces and mascots the brand owns or has permission to use. A page may name one with person_id, and its picture is used as that page's image.
 async function attachPeople(p,ws){
  if(p.person_id!==undefined&&Array.isArray(p.pages)&&p.pages[0]&&typeof p.pages[0]==='object')p.pages[0].person_id??=p.person_id;
  delete p.person_id;
  if(!Array.isArray(p.pages))return;
  for(const page of p.pages){
   if(!page||typeof page!=='object'||page.person_id===undefined)continue;
   const id=page.person_id;delete page.person_id;
   if(typeof id!=='string'||!uuid.test(id))throw new InputError('person_id must be an id from GET /api/v1/people.');
   const person=await load(id).catch(()=>null);
   if(person?.record_type!=='person'||!inWs(person,ws))throw new InputError('That person is not in this workspace library.',404);
   page.image=person.image;
  }
 }
 async function handle(req,res,url){if(!url.pathname.startsWith('/api/v1/'))return false;try{await ready;
  if(url.pathname==='/api/v1/session'&&req.method==='POST'){if(accounts.enabled())throw new InputError('This studio uses accounts. Sign in with your username and password.',409);if(!token)throw new InputError('Run deploy/setup-v1.sh to configure the access key.',503);const p=await body(req);if(typeof p.token!=='string'||!same(p.token,token))throw new InputError('Incorrect access key.',401);const sid=randomBytes(32).toString('hex');for(const [k,v] of sessions)if(v<Date.now())sessions.delete(k);if(sessions.size>1000)sessions.clear();sessions.set(sid,Date.now()+12*3600000);res.setHeader('Set-Cookie',`gsn_session=${sid}; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=43200${process.env.SITE_DOMAIN?'; Secure':''}`);json(res,200,{ok:true});return true;}
  const legacy=auth(req),secure=!!process.env.SITE_DOMAIN;
  // With accounts switched on, people sign in; without them the studio keeps its original single-owner behaviour.
  let ctx=accounts.enabled()?await accounts.authenticate(req,{legacyToken:token,same}):(legacy?{who:legacy,ws:'main',actor:legacy,role:legacy==='owner'?'manager':'agent'}:null);
  if(await accounts.handle(req,res,url,ctx,{json:(r,c,v)=>json(r,c,v),body,secure,legacyOwner:legacy==='owner'}))return true;
  if(!ctx){if(accounts.enabled())throw new InputError('Sign in to continue.',401);if(!token&&!openUi)throw new InputError('V1 access key is not configured. Run deploy/setup-v1.sh.',503);throw new InputError(openUi?'Open the studio in your browser, or send the agent access key as a Bearer token.':'Studio access key required.',401);}
  if(!ctx.ws)throw new InputError('Your account is not in a workspace yet. Ask an administrator to add you to one.',403);
  const who=ctx.who,ws=ctx.ws;
  if(url.pathname==='/api/v1/session'&&req.method==='DELETE'){const sid=req.headers.cookie?.match(/gsn_session=([a-f0-9]{64})/)?.[1];sessions.delete(sid);res.setHeader('Set-Cookie','gsn_session=; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=0');json(res,200,{ok:true});return true;}
  if(await publisher.handle(req,res,url,who,{json:(r,c,v)=>json(r,c,v),body,InputError,ws,actor:ctx.actor}))return true;
  if(url.pathname==='/api/v1/health'&&req.method==='GET'){const workers={};await Promise.all([['voice',voiceUrl],['visuals',visualUrl],['cutout',cutoutUrl]].map(async([k,base])=>{try{if(!base)throw Error('Not configured.');const r=await fetchImpl(new URL('/health',base),{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error(`HTTP ${r.status}`);workers[k]=await r.json();}catch(e){workers[k]={ready:false,message:e.message};}}));json(res,200,{version:'1.0.0',workers,storage:'persistent',agent_api:true,designs:true,open_ui:openUi,scheduler:'Hermes manages schedules'});return true;}
  if(url.pathname==='/api/v1/templates'&&req.method==='GET'){
   // ?pages=N returns only templates that can carry N pages of wording (Hook + middle pages + call to action).
   const need=Number(url.searchParams.get('pages')||0);let list=templateCatalog();
   if(need){if(!Number.isInteger(need)||need<2||need>10)throw new InputError('pages must be a whole number from 2 to 10.');list=list.filter(t=>t.pages>=need);}
   json(res,200,{templates:list.map(({slides,...t})=>t),total:list.length});return true;}
  if(url.pathname==='/api/v1/layouts'&&req.method==='GET'){json(res,200,{layouts:layoutGuide()});return true;}
  const tm=url.pathname.match(/^\/api\/v1\/templates\/(\d{1,3})$/);
  if(tm&&req.method==='GET'){const id=Number(tm[1]);if(id>=designTemplateCount)throw new InputError('Template not found.',404);json(res,200,{id,pages:starterSlides(id),layouts:layoutGuide()});return true;}
  if(url.pathname==='/api/v1/cutout'&&req.method==='POST'){
   // Background removal: several models run privately and are returned side by side. Open to the owner and to agents.
   const p=await body(req);if(!cutoutUrl)throw new InputError('The cutout worker is not configured. Set CUTOUT_WORKER_URL.',503);
   const raw=String(p.image||p.image_base64||'').replace(/^data:image\/[a-z+.-]+;base64,/i,'');if(raw.length<100||raw.length>22*1024*1024)throw new InputError('Send image_base64 (a PNG, JPEG or WebP under about 16 MB).');
   const engine=p.engine===undefined?'all':p.engine;if(!['auto','all','detail','people','scene'].includes(engine))throw new InputError('engine must be auto, all, detail, people or scene.');
   let r;try{r=await fetchImpl(new URL('/cut',cutoutUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_base64:raw,engine}),signal:AbortSignal.timeout(180000)})}catch{throw new InputError('The cutout worker is not reachable. Check that its container is running.',503)}
   const out=await r.json().catch(()=>({}));if(!r.ok)throw new InputError(out.error||'The cutout worker could not process that image.',r.status===400||r.status===413?r.status:502);
   json(res,200,out);return true;}
  // ----- Brand people library (per workspace). Adding someone records who confirmed permission, so only a signed-in person may do it.
  const human=ctx.who==='owner'||!!ctx.user;
  const PERSON_KINDS=['team','mascot','release'];
  const personPublic=({image,...rest})=>({...rest,image_url:`/api/v1/people/${rest.id}/image`});
  if(url.pathname==='/api/v1/people'&&req.method==='GET'){json(res,200,{people:(await list('person')).filter(x=>inWs(x,ws)).map(personPublic)});return true;}
  if(url.pathname==='/api/v1/people'&&req.method==='POST'){
   if(!human)throw new InputError('Only a signed-in person can add someone to the library, because it records their permission. Agents can list and use the people already there.',403);
   const p=await body(req);
   const name=text(p.name,'Name',80),kind=p.kind===undefined?'team':p.kind;
   if(!PERSON_KINDS.includes(kind))throw new InputError('kind must be team, mascot or release.');
   if(p.consent!==true)throw new InputError('Confirm that this person agreed, or that the brand owns this character, before saving.');
   const note=text(p.permission_note??'','Permission note',300,kind==='release');
   if(typeof p.image!=='string'||p.image.length>1400000||!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(p.image))throw new InputError('image must be a PNG, JPEG or WebP data URL up to 1.4 MB.');
   const created=await serial(async()=>{
    if((await list('person')).filter(x=>inWs(x,ws)).length>=200)throw new InputError('Maximum 200 people per workspace. Remove some first.',409);
    const id=randomUUID(),now=new Date().toISOString();
    const record={id,record_type:'person',workspace_id:ws,name,kind,role:text(p.role??'','Role',80,false),permission_note:note,consent:{confirmed:true,by:ctx.actor,at:now},image:p.image,created_at:now,updated_at:now};
    await save(id,record);return record;
   });
   json(res,201,personPublic(created));return true;}
  const pm=url.pathname.match(/^\/api\/v1\/people\/([a-f0-9-]{36})(\/image)?$/);
  if(pm&&uuid.test(pm[1])){
   const read=async()=>{const x=await load(pm[1]).catch(()=>null);if(x?.record_type!=='person'||!inWs(x,ws))throw new InputError('Person not found.',404);return x;};
   if(req.method==='GET'&&pm[2]){const x=await read(),m=x.image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i);res.writeHead(200,{'Content-Type':m[1].toLowerCase(),'Cache-Control':'private, max-age=300'});res.end(Buffer.from(m[2],'base64'));return true;}
   if(req.method==='GET'&&!pm[2]){json(res,200,await read());return true;}
   if(req.method==='DELETE'&&!pm[2]){if(who!=='owner')throw new InputError('Only a manager can remove someone from the library.',403);await serial(async()=>{await read();await unlink(file(pm[1]));});json(res,200,{ok:true});return true;}
  }
  if(url.pathname==='/api/v1/voices'&&req.method==='GET'){json(res,200,{voices:(await list('voice')).filter(v=>inWs(v,ws)).map(({id,name,created_at})=>({id,name,created_at}))});return true;}
  if(url.pathname==='/api/v1/voices'&&req.method==='POST'){const p=await body(req),audio=decode(p.audio_base64,20*1024*1024),name=text(p.name,'Voice name',80),reference_text=text(p.reference_text,'Sample transcript',2000);const profile=await serial(async()=>{if((await list('voice')).filter(v=>inWs(v,ws)).length>=20)throw new InputError('Maximum 20 saved voice profiles.',409);const id=randomUUID(),v={id,name,reference_text,record_type:'voice',workspace_id:ws,created_at:new Date().toISOString()};await writeFile(file(id,'audio'),audio,{mode:0o600});await save(id,v);return v;});json(res,201,{id:profile.id,name:profile.name,created_at:profile.created_at});return true;}
  if(url.pathname==='/api/v1/jobs'&&req.method==='GET'){const all=(await list('job')).filter(j=>inWs(j,ws));json(res,200,{jobs:all.slice(0,200).map(publicJob),total:all.length});return true;}
  if(url.pathname==='/api/v1/jobs'&&req.method==='POST'){const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(key))throw new InputError('Supply an Idempotency-Key of 1–160 letters, digits, _, ., : or -.');const j=await submit(await body(req),key,ws);json(res,202,publicJob(j));return true;}
  if(url.pathname==='/api/v1/platforms'&&req.method==='GET'){json(res,200,{presets:PRESETS,groups:PLATFORM_GROUPS});return true;}
  if(url.pathname==='/api/v1/designs'&&req.method==='GET'){const all=(await list('design')).filter(d=>inWs(d,ws)).map(designSummary);json(res,200,{designs:all.slice(0,500),total:all.length});return true;}
  if(url.pathname==='/api/v1/designs'&&req.method==='POST'){const p=await body(req);if(p.pages===undefined){if(!Number.isInteger(p.template_id)||p.template_id<0||p.template_id>=designTemplateCount)throw new InputError('template_id is outside the template catalog.');if(p.copy!==undefined){try{p.pages=composeSlides(p.template_id,p.copy)}catch(e){throw new InputError(e.message)}if(Array.isArray(p.copy))p.copy.forEach((c,i)=>{if(typeof c?.person_id==='string'&&p.pages[i])p.pages[i].person_id=c.person_id});delete p.copy}else p.pages=starterSlides(p.template_id);}
   await attachPeople(p,ws);
   const created=await serial(async()=>{const design=sanitizeDesign({title:'Untitled pack',...p},{templateCount:designTemplateCount});if((await list('design')).length>=500)throw new InputError('Maximum 500 saved designs. Delete some first.',409);const id=randomUUID(),now=new Date().toISOString();const record={...design,id,record_type:'design',workspace_id:ws,revision:1,created_at:now,updated_at:now,updated_by:ctx.actor};await save(id,record);return record;});json(res,201,created);return true;}
  const dm=url.pathname.match(/^\/api\/v1\/designs\/([a-f0-9-]{36})$/);
  if(dm&&uuid.test(dm[1])){const read=async()=>{const d=await load(dm[1]).catch(()=>null);if(d?.record_type!=='design'||!inWs(d,ws))throw new InputError('Design not found.',404);return d;};
   if(req.method==='GET'){json(res,200,await read());return true;}
   if(req.method==='PUT'){const p=await body(req);await attachPeople(p,ws);const saved=await serial(async()=>{const current=await read();if(p.revision!==current.revision)throw new InputError(`This design changed since you opened it (now revision ${current.revision}). Reload it, then apply your edit again.`,409);const design=sanitizeDesign({pack_id:current.pack_id,...p},{templateCount:designTemplateCount});const record={...design,id:current.id,record_type:'design',workspace_id:current.workspace_id||'main',revision:current.revision+1,created_at:current.created_at,updated_at:new Date().toISOString(),updated_by:ctx.actor};await save(current.id,record);return record;});json(res,200,saved);return true;}
   if(req.method==='DELETE'){await serial(async()=>{await read();await unlink(file(dm[1]));});json(res,200,{ok:true});return true;}
  }
  const match=url.pathname.match(/^\/api\/v1\/jobs\/([a-f0-9-]{36})(\/asset|\/review)?$/);if(match&&uuid.test(match[1])){const j=await load(match[1]).catch(()=>null);if(j?.record_type!=='job'||!inWs(j,ws))throw new InputError('Job not found.',404);
   if(!match[2]&&req.method==='GET'){json(res,200,publicJob(await refresh(j)));return true;}
   if(match[2]==='/asset'&&['GET','HEAD'].includes(req.method)){await asset(req,res,j);return true;}
   if(match[2]==='/review'&&req.method==='POST'){const p=await body(req);if(j.state!=='complete'||!['approved','rejected'].includes(p.review))throw new InputError('Review a completed result as approved or rejected.');await serial(async()=>{const current=await load(j.id);current.review=p.review;current.reviewed_at=new Date().toISOString();await save(j.id,current);});json(res,200,{id:j.id,review:p.review});return true;}
  }
  throw new InputError('Unknown v1 endpoint.',404);
 }catch(e){if(!e.status)console.error('GSN v1 request error:',e.message);if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Studio storage or service error. Check the server logs.'});else res.destroy();}return true;}
 const timer=setInterval(()=>reconcile().catch(()=>{}),10000);timer.unref();
 const pubTimer=setInterval(()=>publisher.tick().catch(()=>{}),30000);pubTimer.unref();
 return {handle,reconcile,publisher,close:()=>{clearInterval(timer);clearInterval(pubTimer)}};
}
