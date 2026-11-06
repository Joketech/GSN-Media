import {mkdir,readFile,writeFile,rename,readdir,stat,unlink} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {templateCatalog,renderDesign} from './template-engine.mjs';

const terminal=new Set(['complete','failed','interrupted']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const hash=x=>createHash('sha256').update(x).digest();
const same=(a,b)=>timingSafeEqual(hash(a),hash(b));
const json=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
class InputError extends Error{constructor(message,status=400){super(message);this.status=status;}}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw new InputError('Send application/json.',415);let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>30*1024*1024)throw new InputError('Request exceeds 30 MB.',413);chunks.push(c);}try{const value=JSON.parse(Buffer.concat(chunks));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new InputError('Send a valid JSON object.');}}
const text=(value,name,max,required=true)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new InputError(`${name} must contain ${required?'1':'0'}–${max} characters.`);return value.trim();};
const decode=(value,max)=>{if(typeof value!=='string'||!value||value.length>Math.ceil(max/3)*4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new InputError('Invalid or oversized base64 file.');const b=Buffer.from(value,'base64');if(b.length>max)throw new InputError('File is too large.',413);return b;};

export function createV1({dataDir=process.env.GSN_DATA_DIR||path.resolve('data/v1'),token=process.env.GSN_AGENT_TOKEN||'',voiceUrl=process.env.VOICE_WORKER_URL||'',visualUrl=process.env.VISUAL_WORKER_URL||'',fetchImpl=fetch}={}){
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
 const auth=req=>{const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(bearer&&token&&same(bearer,token))return true;const sid=req.headers.cookie?.match(/(?:^|;\s*)gsn_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(sid&&sessions.get(sid)>Date.now())return true;return false;};
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
   if(!Number.isInteger(p.template_id)||p.template_id<0||p.template_id>199)throw new InputError('template_id must be 0–199.');
   if(!Array.isArray(p.slides)||!p.slides.length||p.slides.length>20)throw new InputError('Supply 1–20 slides.');
   result.template_id=p.template_id;result.slides=p.slides.map(s=>({title:text(s.title,'Slide title',160),body:text(s.body??'','Slide body',600,false)}));
   result.brand=text(p.brand||'GSN Media','Brand',80);result.handle=text(p.handle||'@gsnmedia','Handle',80);
   result.ratio=p.ratio||'1 / 1';if(!['1 / 1','4 / 5','9 / 16','16 / 9'].includes(result.ratio))throw new InputError('Unsupported design ratio.');
   result.scene_seconds=p.scene_seconds??3;if(!Number.isInteger(result.scene_seconds)||result.scene_seconds<1||result.scene_seconds>10)throw new InputError('scene_seconds must be 1–10.');
  }else{
   result.text=text(p.text,'Prompt / narration',1200);
   if(p.kind==='voice'){if(!uuid.test(p.voice_id||''))throw new InputError('Select a saved voice profile.');result.voice_id=p.voice_id;}
  }return result;
 }
 async function submit(p,key){return serial(async()=>{
  const normalized=validateJob(p);const fingerprint=hash(JSON.stringify(normalized)).toString('hex');
  const existing=(await list('job')).find(j=>j.request_key===key);if(existing){if(existing.fingerprint!==fingerprint)throw new InputError('This Idempotency-Key was already used for different content.',409);return existing;}
  const active=(await list('job')).filter(j=>!terminal.has(j.state));if(active.length>=20)throw new InputError('Studio has 20 active jobs. Wait for completion.',429);
  const id=randomUUID(),now=new Date().toISOString();
  const j={...normalized,id,record_type:'job',request_key:key,fingerprint,state:'submitting',review:'pending',created_at:now,updated_at:now};
  if(['post','animation'].includes(p.kind)){await writeFile(file(id,'html'),renderDesign(normalized),{mode:0o600});Object.assign(j,{state:'complete',output:'html',asset_url:`/api/v1/jobs/${id}/asset`,message:'HTML composition ready for review.'});await save(id,j);return j;}
  j.worker='voice';const payload={kind:'voice',text:normalized.text,request_id:id};
  if(j.worker==='voice'){const profile=await load(normalized.voice_id).catch(()=>null);if(profile?.record_type!=='voice')throw new InputError('Voice profile not found.',404);payload.reference_text=profile.reference_text;payload.audio_base64=(await readFile(file(profile.id,'audio'))).toString('base64');}
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
 async function handle(req,res,url){if(!url.pathname.startsWith('/api/v1/'))return false;try{await ready;
  if(url.pathname==='/api/v1/session'&&req.method==='POST'){if(!token)throw new InputError('Run deploy/setup-v1.sh to configure the access key.',503);const p=await body(req);if(typeof p.token!=='string'||!same(p.token,token))throw new InputError('Incorrect access key.',401);const sid=randomBytes(32).toString('hex');for(const [k,v] of sessions)if(v<Date.now())sessions.delete(k);if(sessions.size>1000)sessions.clear();sessions.set(sid,Date.now()+12*3600000);res.setHeader('Set-Cookie',`gsn_session=${sid}; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=43200${process.env.SITE_DOMAIN?'; Secure':''}`);json(res,200,{ok:true});return true;}
  if(!token)throw new InputError('V1 access key is not configured. Run deploy/setup-v1.sh.',503);
  if(!auth(req))throw new InputError('Studio access key required.',401);
  if(url.pathname==='/api/v1/session'&&req.method==='DELETE'){const sid=req.headers.cookie?.match(/gsn_session=([a-f0-9]{64})/)?.[1];sessions.delete(sid);res.setHeader('Set-Cookie','gsn_session=; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=0');json(res,200,{ok:true});return true;}
  if(url.pathname==='/api/v1/health'&&req.method==='GET'){const workers={};await Promise.all([['voice',voiceUrl],['visuals',visualUrl]].map(async([k,base])=>{try{if(!base)throw Error('Not configured.');const r=await fetchImpl(new URL('/health',base),{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error(`HTTP ${r.status}`);workers[k]=await r.json();}catch(e){workers[k]={ready:false,message:e.message};}}));json(res,200,{version:'1.0.0',workers,storage:'persistent',agent_api:true,scheduler:'Hermes manages schedules'});return true;}
  if(url.pathname==='/api/v1/templates'&&req.method==='GET'){json(res,200,{templates:templateCatalog()});return true;}
  if(url.pathname==='/api/v1/voices'&&req.method==='GET'){json(res,200,{voices:(await list('voice')).map(({id,name,created_at})=>({id,name,created_at}))});return true;}
  if(url.pathname==='/api/v1/voices'&&req.method==='POST'){const p=await body(req),audio=decode(p.audio_base64,20*1024*1024),name=text(p.name,'Voice name',80),reference_text=text(p.reference_text,'Sample transcript',2000);const profile=await serial(async()=>{if((await list('voice')).length>=20)throw new InputError('Maximum 20 saved voice profiles.',409);const id=randomUUID(),v={id,name,reference_text,record_type:'voice',created_at:new Date().toISOString()};await writeFile(file(id,'audio'),audio,{mode:0o600});await save(id,v);return v;});json(res,201,{id:profile.id,name:profile.name,created_at:profile.created_at});return true;}
  if(url.pathname==='/api/v1/jobs'&&req.method==='GET'){const all=await list('job');json(res,200,{jobs:all.slice(0,200).map(publicJob),total:all.length});return true;}
  if(url.pathname==='/api/v1/jobs'&&req.method==='POST'){const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(key))throw new InputError('Supply an Idempotency-Key of 1–160 letters, digits, _, ., : or -.');const j=await submit(await body(req),key);json(res,202,publicJob(j));return true;}
  const match=url.pathname.match(/^\/api\/v1\/jobs\/([a-f0-9-]{36})(\/asset|\/review)?$/);if(match&&uuid.test(match[1])){const j=await load(match[1]).catch(()=>null);if(j?.record_type!=='job')throw new InputError('Job not found.',404);
   if(!match[2]&&req.method==='GET'){json(res,200,publicJob(await refresh(j)));return true;}
   if(match[2]==='/asset'&&['GET','HEAD'].includes(req.method)){await asset(req,res,j);return true;}
   if(match[2]==='/review'&&req.method==='POST'){const p=await body(req);if(j.state!=='complete'||!['approved','rejected'].includes(p.review))throw new InputError('Review a completed result as approved or rejected.');await serial(async()=>{const current=await load(j.id);current.review=p.review;current.reviewed_at=new Date().toISOString();await save(j.id,current);});json(res,200,{id:j.id,review:p.review});return true;}
  }
  throw new InputError('Unknown v1 endpoint.',404);
 }catch(e){if(!e.status)console.error('GSN v1 request error:',e.message);if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Studio storage or service error. Check the server logs.'});else res.destroy();}return true;}
 const timer=setInterval(()=>reconcile().catch(()=>{}),10000);timer.unref();
 return {handle,reconcile,close:()=>clearInterval(timer)};
}
