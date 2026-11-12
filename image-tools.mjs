// Picture tools for the studio: write a prompt, get a picture back (used for backgrounds).
// Open to the owner and to agents (Bearer token) through the same /api/v1 door as everything else.

const SIZES={portrait:{w:1024,h:1536,ratio:'9:16',openai:'1024x1536'},square:{w:1024,h:1024,ratio:'1:1',openai:'1024x1024'},landscape:{w:1536,h:1024,ratio:'16:9',openai:'1536x1024'}};
const BACKGROUND_SUFFIX=' Background scenery only: no people, no text, no logos, no watermark. Leave calm open space for a product advert.';

export function createImageTools({dataDir,fetchImpl=fetch,env=process.env,visualUrl='',now=Date.now,InputError,json,body}){
 const hits=new Map();
 const limit=()=>Math.max(1,Number(env.IMAGE_GEN_HOURLY_LIMIT)||40);
 function provider(){
  const wanted=(env.IMAGE_GEN_PROVIDER||'auto').toLowerCase();
  if(wanted==='off')return 'off';
  if(wanted!=='auto')return wanted;
  if(env.IMAGE_GEN_KEY)return 'openai';
  if(visualUrl)return 'worker';
  return 'off';
 }
 const model=()=>env.IMAGE_GEN_MODEL||'gpt-image-2.5-sunburst',quality=()=>['low','medium','high'].includes(env.IMAGE_GEN_QUALITY)?env.IMAGE_GEN_QUALITY:'low';

 // What a picture costs, in plain words, shown next to the button. Figures are from OpenAI's published price pages (checked Nov 2026).
 function cost(){
  const use=provider();
  if(env.IMAGE_GEN_COST_NOTE)return env.IMAGE_GEN_COST_NOTE;
  if(use==='worker')return 'No per-picture charge. It runs on your own GPU server, so you only pay for that server.';
  if(use==='pollinations')return 'Free. Quality and speed vary, and your description is sent to the Pollinations website.';
  if(use==='openai'){
   const m=model();
   if(/gpt-image-1\.5/.test(m))return `Costs money: about $${{low:'0.013',medium:'0.05',high:'0.20'}[quality()]} per picture at ${quality()} quality (OpenAI list price for ${m}, portrait). Charged to your OpenAI account.`;
   if(/gpt-image-2\.5|sunburst|flare/.test(m))return `Costs money: roughly $0.005 per picture at low quality, up to about $0.17 at the highest quality (portrait; estimates, because OpenAI bills ${m} by tokens, $30 per million output tokens). This server uses ${quality()} quality. Charged to your OpenAI account.`;
   return `Costs money: charged per picture by the service at ${env.IMAGE_GEN_URL||'api.openai.com'} for model ${m}. Check its price list before using it often. Set IMAGE_GEN_COST_NOTE to show the exact price here.`;
  }
  return 'Not set up yet, so nothing is charged.';
 }
 const how=()=>({
  openai:'An OpenAI-style image service (IMAGE_GEN_URL and IMAGE_GEN_KEY).',
  worker:"The studio's own picture worker (a GPU server running Stable Diffusion).",
  pollinations:'The free Pollinations service. The prompt is sent to that website.',
  off:'Not set up yet.'}[provider()]||'Unknown provider.');
 const aspect=p=>{const a=p.aspect??'portrait';if(!SIZES[a])throw new InputError('aspect must be portrait, square or landscape.');return SIZES[a]};
 const dataUrl=(bytes,type)=>`data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
 const sniff=b=>{const u=new Uint8Array(b.slice(0,12));if(u[0]===0x89&&u[1]===0x50)return 'image/png';if(u[0]===0xff&&u[1]===0xd8)return 'image/jpeg';if(u[0]===0x52&&u[1]===0x49&&u[8]===0x57)return 'image/webp';return null};
 async function viaOpenAi(prompt,size){
  const base=(env.IMAGE_GEN_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  const r=await fetchImpl(`${base}/images/generations`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.IMAGE_GEN_KEY||''}`},body:JSON.stringify({model:model(),quality:quality(),prompt,size:size.openai,n:1}),signal:AbortSignal.timeout(180000)});
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
  const size=aspect(p),use=provider();
  if(use==='off')throw new InputError('Picture generation is not set up on this server yet. In .env set IMAGE_GEN_KEY (and optionally IMAGE_GEN_URL, IMAGE_GEN_MODEL), or start the GPU picture worker, or set IMAGE_GEN_PROVIDER=pollinations for the free service. See docs/IMAGE-GENERATION.md.',503);
  const key=ctx.ws||'main',t=now(),recent=(hits.get(key)||[]).filter(x=>t-x<3600e3);
  if(recent.length>=limit())throw new InputError(`Picture limit reached: ${limit()} per hour. Try again later.`,429);
  recent.push(t);hits.set(key,recent);
  const full=p.purpose==='picture'?prompt:prompt+BACKGROUND_SUFFIX;
  const image=use==='openai'?await viaOpenAi(full,size):use==='pollinations'?await viaPollinations(full,size):use==='worker'?await viaWorker(full,size):(()=>{throw new InputError('Unknown IMAGE_GEN_PROVIDER.',503)})();
  return {image,provider:use,cost:cost(),aspect:p.aspect??'portrait',width:size.w,height:size.h,prompt:full};
 }
 async function handle(req,res,url,ctx){
  if(url.pathname==='/api/v1/images/status'&&req.method==='GET'){json(res,200,{provider:provider(),ready:provider()!=='off',description:how(),cost:cost(),limit_per_hour:limit()});return true}
  if(url.pathname==='/api/v1/images/generate'&&req.method==='POST'){json(res,200,await generate(await body(req),ctx));return true}
  return false;
 }
 return {handle,generate,provider};
}
