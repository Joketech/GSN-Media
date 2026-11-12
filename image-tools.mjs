// Picture tools for the studio: write a prompt, get a picture back (used for backgrounds).
// Open to the owner and to agents (Bearer token) through the same /api/v1 door as everything else.

const SIZES={portrait:{w:1024,h:1536,ratio:'9:16',openai:'1024x1536'},square:{w:1024,h:1024,ratio:'1:1',openai:'1024x1024'},landscape:{w:1536,h:1024,ratio:'16:9',openai:'1536x1024'}};
const BACKGROUND_SUFFIX=' Background scenery only: no people, no text, no logos, no watermark. Leave calm open space for a product advert.';

export function createImageTools({dataDir,fetchImpl=fetch,env=process.env,visualUrl='',now=Date.now,InputError,json,body}){
 const hits=new Map();
 const limit=()=>Math.max(1,Number(env.IMAGE_GEN_HOURLY_LIMIT)||40);
 const QUALITIES=['low','medium','high'];
 const models=()=>[...new Set([env.IMAGE_GEN_MODEL,...String(env.IMAGE_GEN_MODELS||'gpt-image-2.5-sunburst,gpt-image-1.5').split(',')].map(x=>(x||'').trim()).filter(Boolean))];
 const defaultQuality=()=>QUALITIES.includes(env.IMAGE_GEN_QUALITY)?env.IMAGE_GEN_QUALITY:'low';
 const LABELS={openai:'OpenAI-style service (costs money)',worker:'Your own GPU picture worker (no per-picture charge)',pollinations:'Free hosted service (Pollinations)'};
 const workerUp=async()=>{if(!visualUrl)return false;try{const r=await fetchImpl(new URL('/health',visualUrl),{signal:AbortSignal.timeout(2500)});if(!r.ok)return false;const h=await r.json().catch(()=>({}));return h.ready!==false}catch{return false}};
 const configured=()=>({openai:!!env.IMAGE_GEN_KEY,worker:!!visualUrl,pollinations:(env.IMAGE_GEN_FREE||'on')!=='off'});
 function fallbackDefault(){
  const want=(env.IMAGE_GEN_PROVIDER||'auto').toLowerCase(),c=configured();
  if(want==='off')return 'off';
  if(c[want])return want;
  return c.openai?'openai':c.worker?'worker':c.pollinations&&want==='pollinations'?'pollinations':'off';
 }
 const provider=fallbackDefault;
 // What a picture costs, in plain words, shown next to the button. OpenAI figures are from its published price pages (checked Nov 2026).
 function cost(use=provider(),m=models()[0],q=defaultQuality()){
  if(env.IMAGE_GEN_COST_NOTE&&use===provider())return env.IMAGE_GEN_COST_NOTE;
  if(use==='worker')return 'No per-picture charge. It runs on your own GPU server, so you only pay for that server.';
  if(use==='pollinations')return 'Free. Quality and speed vary, and your description is sent to the Pollinations website.';
  if(use==='openai'){
   if(/gpt-image-1\.5/.test(m))return `Costs money: about $${{low:'0.013',medium:'0.05',high:'0.20'}[q]} per picture at ${q} quality (OpenAI list price for ${m}, portrait). Charged to your OpenAI account.`;
   if(/gpt-image-2\.5|sunburst|flare/.test(m))return `Costs money: roughly $0.005 per picture at low quality, up to about $0.17 at the highest quality (portrait; estimates, because OpenAI bills ${m} by tokens, $30 per million output tokens). You chose ${q} quality. Charged to your OpenAI account.`;
   return `Costs money: charged per picture by the service at ${env.IMAGE_GEN_URL||'api.openai.com'} for model ${m}. Check its price list before using it often. Set IMAGE_GEN_COST_NOTE to show the exact price here.`;
  }
  return 'Not set up yet, so nothing is charged.';
 }
 const aspect=p=>{const a=p.aspect??'portrait';if(!SIZES[a])throw new InputError('aspect must be portrait, square or landscape.');return SIZES[a]};
 const dataUrl=(bytes,type)=>`data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
 const sniff=b=>{const u=new Uint8Array(b.slice(0,12));if(u[0]===0x89&&u[1]===0x50)return 'image/png';if(u[0]===0xff&&u[1]===0xd8)return 'image/jpeg';if(u[0]===0x52&&u[1]===0x49&&u[8]===0x57)return 'image/webp';return null};
 async function viaOpenAi(prompt,size,choice){
  const base=(env.IMAGE_GEN_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  const r=await fetchImpl(`${base}/images/generations`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.IMAGE_GEN_KEY||''}`},body:JSON.stringify({model:choice.model,quality:choice.quality,prompt,size:size.openai,n:1}),signal:AbortSignal.timeout(180000)});
  const out=await r.json().catch(()=>({}));
  if(!r.ok)throw new InputError(`The image service refused the request${out.error?.message?': '+String(out.error.message).slice(0,200):''}.`,502);
  const item=out.data?.[0];
  if(item?.b64_json)return dataUrl(Buffer.from(item.b64_json,'base64'),'image/png');
  if(item?.url){const g=await fetchImpl(item.url,{signal:AbortSignal.timeout(60000)});const bytes=await g.arrayBuffer();const type=sniff(bytes);if(!g.ok||!type)throw new InputError('The image service returned something that is not a picture.',502);return dataUrl(bytes,type)}
  throw new InputError('The image service returned no picture.',502);
 }
 async function viaPollinations(prompt,size){
  const u=`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${size.w}&height=${size.h}&nologo=true&model=flux`;
  const g=await fetchImpl(u,{signal:AbortSignal.timeout(120000)});const bytes=await g.arrayBuffer();const type=sniff(bytes);
  if(!g.ok||!type)throw new InputError('The free image service did not return a picture. Try again in a minute.',502);
  return dataUrl(bytes,type);
 }
 async function viaWorker(prompt,size){
  const submit=await fetchImpl(new URL('/jobs',visualUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'image',text:prompt.slice(0,1200),ratio:size.ratio,request_id:'bg-'+now().toString(36)+Math.random().toString(36).slice(2,8)}),signal:AbortSignal.timeout(20000)}).catch(()=>null);
  if(!submit)throw new InputError('The studio picture worker is not reachable. It needs the GPU profile running.',503);
  const job=await submit.json().catch(()=>({}));if(!submit.ok||!job.id)throw new InputError(job.error||'The picture worker refused the request.',502);
  const deadline=now()+6*60*1000;
  while(now()<deadline){
   await new Promise(r=>setTimeout(r,env.IMAGE_GEN_POLL_MS?Number(env.IMAGE_GEN_POLL_MS):3000));
   const s=await fetchImpl(new URL(`/jobs/${job.id}`,visualUrl),{signal:AbortSignal.timeout(20000)}).then(r=>r.json()).catch(()=>null);
   if(!s)continue;
   if(s.state==='failed'||s.state==='interrupted')throw new InputError(s.message||'The picture worker could not make that picture.',502);
   if(s.state==='complete'){const a=await fetchImpl(new URL(`/assets/${job.id}/result.png`,visualUrl),{signal:AbortSignal.timeout(60000)});const bytes=await a.arrayBuffer();if(!a.ok||sniff(bytes)!=='image/png')throw new InputError('The picture worker output was not a picture.',502);return dataUrl(bytes,'image/png')}
  }
  throw new InputError('The picture worker took too long. Try a shorter prompt or try again.',504);
 }
 async function generate(p,ctx){
  const prompt=typeof p.prompt==='string'?p.prompt.trim():'';
  if(prompt.length<3||prompt.length>800)throw new InputError('Describe the picture in 3 to 800 characters.');
  const size=aspect(p),c=configured();
  const use=p.provider===undefined?provider():String(p.provider);
  if(!['openai','worker','pollinations'].includes(use)||!c[use]){
   if(provider()==='off'&&p.provider===undefined)throw new InputError('Picture generation is not set up on this server yet. In .env set IMAGE_GEN_KEY (OpenAI-style service), or start the GPU picture worker, or leave the free service switched on. See docs/IMAGE-GENERATION.md.',503);
   throw new InputError(`The ${p.provider} option is not set up on this server. Choose one of: ${Object.keys(c).filter(k=>c[k]).join(', ')||'none yet'}.`,400);
  }
  const model=p.model===undefined?models()[0]:String(p.model),quality=p.quality===undefined?defaultQuality():String(p.quality);
  if(use==='openai'&&!models().includes(model))throw new InputError(`model must be one of: ${models().join(', ')}.`);
  if(use==='openai'&&!QUALITIES.includes(quality))throw new InputError('quality must be low, medium or high.');
  const key=ctx.ws||'main',t=now(),recent=(hits.get(key)||[]).filter(x=>t-x<3600e3);
  if(recent.length>=limit())throw new InputError(`Picture limit reached: ${limit()} per hour. Try again later.`,429);
  recent.push(t);hits.set(key,recent);
  const full=p.purpose==='picture'?prompt:prompt+BACKGROUND_SUFFIX;
  const image=use==='openai'?await viaOpenAi(full,size,{model,quality}):use==='pollinations'?await viaPollinations(full,size):await viaWorker(full,size);
  return {image,provider:use,model:use==='openai'?model:undefined,quality:use==='openai'?quality:undefined,cost:cost(use,model,quality),aspect:p.aspect??'portrait',width:size.w,height:size.h,prompt:full};
 }
 async function handle(req,res,url,ctx){
  if(url.pathname==='/api/v1/images/status'&&req.method==='GET'){
   const c=configured(),up=c.worker?await workerUp():false;
   const providers=['openai','worker','pollinations'].map(id=>({id,label:LABELS[id],available:id==='worker'?up:c[id],reason:id==='openai'&&!c.openai?'Set IMAGE_GEN_KEY in .env to switch this on.':id==='worker'&&!up?'The GPU picture worker is not running on this server.':id==='pollinations'&&!c.pollinations?'Switched off by IMAGE_GEN_FREE=off.':'',cost:cost(id)}));
   const first=providers.find(x=>x.id===provider()&&x.available)||providers.find(x=>x.available);
   json(res,200,{provider:first?.id||'off',ready:!!first,default:first?.id||'off',providers,openai:{models:models(),qualities:QUALITIES,default_model:models()[0],default_quality:defaultQuality(),costs:Object.fromEntries(models().map(m=>[m,Object.fromEntries(QUALITIES.map(q=>[q,cost('openai',m,q)]))]))},description:first?LABELS[first.id]:'Not set up yet.',cost:first?cost(first.id):cost('off'),limit_per_hour:limit()});return true}
  if(url.pathname==='/api/v1/images/generate'&&req.method==='POST'){json(res,200,await generate(await body(req),ctx));return true}
  return false;
 }
 return {handle,generate,provider};
}
