import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const PNG=Buffer.from('89504e470d0a1a0a','hex');
export function createImageGeneration({dataDir,workerUrl,fetchImpl=fetch}){
 const folder=path.join(dataDir,'generated-images'),ready=mkdir(folder,{recursive:true,mode:0o700});
 let mutations=Promise.resolve();const refreshing=new Map();
 const error=(message,status=400)=>Object.assign(new Error(message),{status});
 const serial=fn=>{const p=mutations.then(fn);mutations=p.catch(()=>{});return p;};
 const file=id=>path.join(folder,id+'.json');
 const load=async(id,ws)=>{if(!UUID.test(id))throw error('Image not found.',404);const j=await readFile(file(id),'utf8').then(JSON.parse).catch(()=>null);if(!j||j.workspace_id!==ws)throw error('Image not found.',404);return j;};
 const save=async j=>{const temp=file(j.id)+'.tmp';await writeFile(temp,JSON.stringify(j),{mode:0o600});await rename(temp,file(j.id));};
 const publicJob=({workspace_id,fingerprint,request_key,...j})=>j;
 async function all(ws){await ready;const rows=[];for(const f of await readdir(folder)){if(!UUID.test(f.replace(/\.json$/,''))||!f.endsWith('.json'))continue;try{const j=JSON.parse(await readFile(path.join(folder,f),'utf8'));if(j.workspace_id===ws)rows.push(j)}catch{}}return rows.sort((a,b)=>b.created_at.localeCompare(a.created_at));}
 async function worker(route,opts={}){if(!workerUrl)throw error('Local image worker is not configured. Start the images Docker profile.',503);try{return await fetchImpl(new URL(route,workerUrl),{...opts,signal:AbortSignal.timeout(15000)})}catch{throw error('The local image worker is not reachable. Check its Docker container.',503)}}
 function validate(p){
  const prompt=typeof p.prompt==='string'?p.prompt.trim():'';
  if(!prompt||prompt.length>1200)throw error('Describe the image in 1–1200 characters.');
  const negative_prompt=p.negative_prompt??'';if(typeof negative_prompt!=='string'||negative_prompt.length>600)throw error('Negative prompt must be under 600 characters.');
  const role=p.role??'image';if(!['person','product','background','image'].includes(role))throw error('Choose person, product, background or image.');
  const ratio=p.ratio??'1:1';if(!['1:1','4:5','16:9'].includes(ratio))throw error('Choose a supported aspect ratio.');
  const steps=p.steps??25,seed=p.seed??Math.floor(Math.random()*2147483647);
  if(!Number.isInteger(steps)||steps<10||steps>40||!Number.isInteger(seed)||seed<0||seed>2147483647)throw error('Use 10–40 steps and a seed from 0 to 2147483647.');
  return {prompt,negative_prompt,role,ratio,steps,seed};
 }
 async function refresh(j){
  if(['complete','failed'].includes(j.state))return j;
  if(refreshing.has(j.id))return refreshing.get(j.id);
  const task=(async()=>{try{
   const r=await worker('/jobs/'+j.id);if(r.status===404){j.state='interrupted';j.message='Worker has no record of this request. Your saved prompt is kept.';await save(j);return j;}
   const out=await r.json();if(!r.ok)throw error(out.error||'Worker status failed.',502);
   if(out.id!==j.id||!['queued','loading_model','running','complete','failed','interrupted'].includes(out.state))throw error('Invalid image worker response.',502);
   j.state=out.state;j.message=String(out.message||'').slice(0,500);j.updated_at=new Date().toISOString();
   if(j.state==='complete'){
    j.state='running'; // Do not mark complete until a valid local asset has been saved.
    const result=await worker('/jobs/'+j.id+'/result');const payload=await result.json();
    const raw=payload.image_base64;if(!result.ok||typeof raw!=='string'||raw.length>12e6||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))throw error('Invalid image output.',502);
    const bytes=Buffer.from(raw,'base64');if(!bytes.subarray(0,8).equals(PNG))throw error('Image worker did not return a PNG.',502);
    await writeFile(path.join(folder,j.id+'.png.tmp'),bytes,{mode:0o600});await rename(path.join(folder,j.id+'.png.tmp'),path.join(folder,j.id+'.png'));
    j.has_image=true;j.state='complete';j.asset_url='/api/v1/images/'+j.id+'/asset';
   }
   delete j.connection_error;await save(j);
  }catch(e){j.connection_error=e.message;await save(j);}return j;})();
  refreshing.set(j.id,task);try{return await task}finally{refreshing.delete(j.id)}
 }
 async function handle(req,res,url,{ws,json,body}){
  if(!url.pathname.startsWith('/api/v1/images'))return false;await ready;
  if(url.pathname==='/api/v1/images/health'&&req.method==='GET'){
   try{const r=await worker('/health');if(!r.ok)throw error('Image worker health check failed.',503);json(res,200,{...await r.json(),paid_api:false});}catch(e){json(res,200,{ready:false,message:e.message,paid_api:false})}return true;
  }
  if(url.pathname==='/api/v1/images'&&req.method==='GET'){json(res,200,{images:(await all(ws)).map(publicJob)});return true;}
  if(url.pathname==='/api/v1/images'&&req.method==='POST'){
   const p=await body(req);if(!UUID.test(p.request_key||''))throw error('Send a UUID request_key to protect against duplicate requests.');
   const result=await serial(async()=>{
    const rows=await all(ws),old=rows.find(j=>j.request_key===p.request_key);
    // Reuse the seed on retries so the same request never starts a second generation.
    const normalized=validate({...p,seed:p.seed??old?.seed});
    const fingerprint=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    if(old){if(old.fingerprint!==fingerprint)throw error('This request key already belongs to another prompt.',409);return old;}
    if(rows.length>=200)throw error('This workspace has reached its 200 saved-image limit.',409);
    if(rows.filter(j=>!['complete','failed','interrupted'].includes(j.state)).length>=4)throw error('Four image requests are already active. Wait for one to finish.',429);
    const health=await worker('/health');const cap=await health.json();if(!health.ok||!cap.ready)throw error(cap.message||'Image model dependencies are not ready.',503);
    const now=new Date().toISOString(),j={...normalized,id:randomUUID(),workspace_id:ws,request_key:p.request_key,fingerprint,state:'submitting',created_at:now,updated_at:now};await save(j);
    try{const r=await worker('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...normalized,id:j.id})});const out=await r.json();if(!r.ok){j.state='failed';j.message=String(out.error||'Worker rejected the request.').slice(0,500)}else if(out.id!==j.id){j.state='interrupted';j.message='Worker returned a mismatched ID. Inspect before trying again.'}else{j.state='queued';j.message='Queued on your local image worker.'}}
    catch(e){j.state='interrupted';j.message=e.message+' Refresh this request before starting another.';}
    await save(j);return j;
   });json(res,202,publicJob(result));return true;
  }
  const m=url.pathname.match(/^\/api\/v1\/images\/([a-f0-9-]{36})(\/asset)?$/);
  if(m&&req.method==='GET'){const j=await load(m[1],ws);
   if(m[2]){if(!j.has_image)throw error('This image is not ready.',409);const bytes=await readFile(path.join(folder,j.id+'.png'));json(res,200,{id:j.id,image_base64:bytes.toString('base64'),mime:'image/png'});}
   else json(res,200,publicJob(await refresh(j)));return true;
  }
  throw error('Unknown image endpoint.',404);
 }
 return {handle};
}
