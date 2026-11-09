/* Idea runner: connects the Ideas tab to the owner's Hermes agent.
   It picks up waiting idea requests from the studio, hands each one to Hermes (through Hermes's own API server),
   checks what comes back, and sends the five ideas to the studio. The brief itself (deep research, steroid mode,
   brand voice, refine feedback) is written by the studio in ideas-api.mjs, so behaviour stays fixed in code.

   Runs on the same server as Hermes. Uses only Node's built-in fetch, no packages.
   Settings (environment):
     GSN_URL               studio address               default http://127.0.0.1:4188
     GSN_AGENT_TOKEN       studio agent key             required
     HERMES_URL            Hermes API server            default http://127.0.0.1:8642
     HERMES_API_KEY        Hermes API_SERVER_KEY        required
     HERMES_MODEL          model name Hermes lists      default hermes-agent
     IDEA_AGENT_NAME       who the agent is             default Lyra
     IDEA_POLL_SECONDS     how often to look for work   default 5
     IDEA_TIMEOUT_SECONDS  longest one request may run  default 600
     IDEA_CONCURRENCY      requests at the same time    default 1
   Secrets are never logged. */
import {pathToFileURL} from 'node:url';

const LIMITS={title:120,angle:500,hook:240,why_it_works:500,format:60,review_note:300};
const cut=(v,n)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const goodUrl=u=>typeof u==='string'&&/^https?:\/\/[^\s]+$/i.test(u)&&u.length<=500;

/** Finds the JSON object in the agent's reply (it may wrap it in a code fence or add a sentence). */
export function extractJson(text){
 const s=String(text??'').trim();
 const fenced=s.match(/```(?:json)?\s*([\s\S]*?)```/i);
 const body=fenced?fenced[1]:s;
 const start=body.indexOf('{'),end=body.lastIndexOf('}');
 if(start<0||end<=start)throw new Error('The agent did not reply with JSON.');
 return JSON.parse(body.slice(start,end+1));
}

/** Turns the agent's reply into the exact result the studio accepts: 1 to 5 ideas, fields within limits, real links only. */
export function toResult(reply,request){
 const data=typeof reply==='string'?extractJson(reply):reply;
 if(data?.status==='failed')return {status:'failed',error:cut(data.error||'The agent could not finish.',500)};
 const list=Array.isArray(data?.ideas)?data.ideas:[];
 const ideas=list.filter(i=>i&&i.title&&i.angle&&i.hook).slice(0,5).map(i=>({
  title:cut(i.title,LIMITS.title),angle:cut(i.angle,LIMITS.angle),hook:cut(i.hook,LIMITS.hook),
  why_it_works:cut(i.why_it_works,LIMITS.why_it_works),format:cut(i.format,LIMITS.format),review_note:cut(i.review_note,LIMITS.review_note),
  sources:(Array.isArray(i.sources)?i.sources:[]).filter(x=>goodUrl(x?.url)).slice(0,6).map(x=>({title:cut(x.title||x.url,200),url:x.url}))
 }));
 if(!ideas.length)throw new Error('The agent replied without any usable ideas.');
 const hasSources=ideas.some(i=>i.sources.length);
 // Deep research on but no real sources came back: say so honestly instead of pretending it was researched.
 const searched=!!request?.perplexity&&hasSources&&data.searched!==false;
 if(!searched)for(const i of ideas)i.sources=[];
 return {ideas,searched};
}

/** The two messages sent to Hermes for one request. */
export function buildMessages(request,agentName='Lyra'){
 const system=[
  `You are ${agentName}, the research agent for the GSN Media studio. A creator is waiting on the Ideas tab for your answer.`,
  'Follow the brief exactly, including every research and review step it switches on. Use your web_search and web_extract tools whenever the brief asks for research.',
  'Never invent statistics, quotes, names or links. A source may only be a page you actually opened or found in a search result.',
  'Reply with ONLY one JSON object and nothing else, in this shape:',
  '{"searched": true or false, "ideas": [{"title": "", "angle": "", "hook": "", "why_it_works": "", "format": "carousel | reel | single image | thread | story", "sources": [{"title": "", "url": "https://..."}], "review_note": ""}]}',
  'Return exactly 5 ideas. If you cannot finish, reply {"status": "failed", "error": "the reason"}.'
 ].join('\n');
 return [{role:'system',content:system},{role:'user',content:request.instructions}];
}

export function createRunner({gsnUrl='http://127.0.0.1:4188',gsnToken,hermesUrl='http://127.0.0.1:8642',hermesKey,model='hermes-agent',agentName='Lyra',timeoutMs=600_000,concurrency=1,fetchImpl=fetch,log=()=>{},now=Date.now}={}){
 if(!gsnToken)throw new Error('GSN_AGENT_TOKEN is not set.');
 if(!hermesKey)throw new Error('HERMES_API_KEY is not set.');
 const active=new Set();
 async function gsn(path,method='GET',body){
  const r=await fetchImpl(new URL('/api/v1'+path,gsnUrl),{method,headers:{authorization:`Bearer ${gsnToken}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30_000)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(data.error||`Studio answered HTTP ${r.status}.`);e.status=r.status;throw e;}
  return data;
 }
 async function ask(messages){
  const r=await fetchImpl(new URL('/v1/chat/completions',hermesUrl),{method:'POST',headers:{authorization:`Bearer ${hermesKey}`,'content-type':'application/json'},body:JSON.stringify({model,messages,stream:false}),signal:AbortSignal.timeout(timeoutMs)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(`Hermes answered HTTP ${r.status}${data?.error?.message?': '+cut(data.error.message,200):''}.`);
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim())throw new Error('Hermes sent an empty reply.');
  return {content,model:cut(data.model||model,80)};
 }
 async function run(request){
  const id=request.id,t0=now();
  try{
   const claimed=await gsn(`/ideas/requests/${id}/claim`,'POST');
   log({event:'claimed',id,perplexity:claimed.perplexity,steroid:claimed.steroid});
   const messages=buildMessages(claimed,agentName);
   let reply=await ask(messages),result;
   try{result=toResult(reply.content,claimed)}
   catch(first){
    // One repair turn: the agent keeps its work and only re-sends it as valid JSON.
    log({event:'repair',id,reason:first.message});
    reply=await ask([...messages,{role:'assistant',content:reply.content},{role:'user',content:'That reply could not be read. Send the same ideas again as ONLY the JSON object described, with no other text.'}]);
    result=toResult(reply.content,claimed);
   }
   await gsn(`/ideas/requests/${id}/result`,'POST',{...result,model:reply.model});
   log({event:result.status==='failed'?'failed':'done',id,seconds:Math.round((now()-t0)/1000),ideas:result.ideas?.length||0,searched:!!result.searched});
  }catch(e){
   if(e.status===409){log({event:'skipped',id,reason:e.message});return;}
   log({event:'error',id,reason:e.message});
   await gsn(`/ideas/requests/${id}/result`,'POST',{status:'failed',error:cut(`The research agent could not finish: ${e.message} Press Try again.`,500)}).catch(()=>{});
  }
 }
 /** Requests left "working" by a runner that stopped part-way are closed so the creator can press Try again. */
 async function recover(){
  const {requests=[]}=await gsn('/ideas/requests?status=working');
  for(const r of requests){
   if(active.has(r.id)||!r.started_at||now()-Date.parse(r.started_at)<timeoutMs+60_000)continue;
   await gsn(`/ideas/requests/${r.id}/result`,'POST',{status:'failed',error:'The research agent stopped before finishing. Press Try again.'}).catch(()=>{});
   log({event:'recovered',id:r.id});
  }
 }
 /** One pass: start waiting requests up to the concurrency limit. Returns the promises it started. */
 async function tick(){
  if(active.size>=concurrency)return [];
  const {requests=[]}=await gsn('/ideas/requests?status=pending');
  const started=[];
  for(const r of requests.sort((a,b)=>a.created_at.localeCompare(b.created_at))){
   if(active.size>=concurrency)break;if(active.has(r.id))continue;
   active.add(r.id);started.push(run(r).finally(()=>active.delete(r.id)));
  }
  return started;
 }
 return {tick,recover,run,active};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const env=process.env,log=o=>console.log(JSON.stringify({at:new Date().toISOString(),...o}));
 const runner=createRunner({gsnUrl:env.GSN_URL||undefined,gsnToken:env.GSN_AGENT_TOKEN,hermesUrl:env.HERMES_URL||undefined,hermesKey:env.HERMES_API_KEY,model:env.HERMES_MODEL||undefined,agentName:env.IDEA_AGENT_NAME||'Lyra',timeoutMs:(Number(env.IDEA_TIMEOUT_SECONDS)||600)*1000,concurrency:Math.max(1,Math.min(4,Number(env.IDEA_CONCURRENCY)||1)),log});
 const every=Math.max(2,Number(env.IDEA_POLL_SECONDS)||5)*1000;let stopping=false,lastRecover=0;
 for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>{stopping=true;log({event:'stopping'});setTimeout(()=>process.exit(0),1000)});
 log({event:'started',gsn:env.GSN_URL||'http://127.0.0.1:4188',hermes:env.HERMES_URL||'http://127.0.0.1:8642'});
 while(!stopping){
  try{if(Date.now()-lastRecover>60_000){lastRecover=Date.now();await runner.recover()}await runner.tick()}
  catch(e){log({event:'poll_error',reason:e.message})}
  await new Promise(r=>setTimeout(r,every));
 }
}
