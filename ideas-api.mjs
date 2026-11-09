/* Ideas: a creator asks for content ideas (their own topic, or generated from the brand), the research agent (Lyra) answers with five,
   and every request and every idea stays on the creator's board so rejected ideas can be picked up again later.
   The server never writes ideas itself: it stores requests, hands them to the agent with exact instructions, and keeps what the agent returns. */
import {randomUUID} from 'node:crypto';

export const IDEA_AGENT='Lyra';
const MODES=['own','generate'];
const IDEA_STATUS=['new','picked','rejected','used'];
// What each switch adds to the wait. Shown as an estimate until at least 3 real runs of each kind have been timed.
// Deep research runs 5+ searches on the studio's own SearXNG and reads 3+ full pages through its own Firecrawl, so it costs the most time.
const DEFAULT_EXTRA={perplexity:{min:60,max:120},steroid:{min:30,max:60}};
// A plain run (no switches): the agent thinks and writes five ideas.
const DEFAULT_BASE={min:20,max:45};
// The research agent counts as online if it looked for work within this window (the runner looks every few seconds).
const ONLINE_MS=90_000;
const MIN_SAMPLES=3;

/** "Research with Perplexity" switch: Perplexity-style deep research on the studio's own server (no paid search API).
 *  web_search goes to the self-hosted SearXNG, web_extract to the self-hosted Firecrawl; both are configured in Hermes. */
export const DEEP_RESEARCH=[
 'DEEP WEB RESEARCH is ON (Perplexity-style, using your own web_search and web_extract tools; never a paid search API). Before writing anything:',
 '1. Run at least 5 different web_search queries covering: the latest news and trends on this topic (this month first), real numbers and studies, the questions and complaints the audience is posting, what other creators and brands already publish on it, and expert or official sources.',
 '2. Open and read at least 3 of the most relevant full pages with web_extract. Do not rely on search snippets alone.',
 '3. Prefer sources from the last 12 months and note when each was published. Say so when something is older.',
 '4. Keep a fact or number only if at least 2 independent sources support it, or it comes straight from the original source (the study, the company, the official body). Drop anything else.',
 '5. Use the research to make each idea specific and current: a fresh angle, a real number, a trend that is happening now.',
 'Put the title and URL of every page you actually used in that idea\'s "sources" list, and set "searched": true. If the search or page reading fails, do not guess: either send the ideas with "searched": false and no sources, or report status "failed" with the reason.'
].join('\n');

/** The exact brief the agent receives with every request, so the behaviour is fixed in code and not left to chance. */
export function ideaInstructions(r){
 const lines=[
  `Write exactly 5 content ideas for ${r.brand.brand_name}${r.brand.handle?` (${r.brand.handle})`:''}.`,
  r.mode==='own'?`The creator wants ideas about: "${r.prompt}". Stay on that topic; give five different angles on it.`:`The creator has no topic in mind. Create five ideas inside their niche${r.brand.niche?` ("${r.brand.niche}")`:''} that fit their brand.`,
  r.brand.voice?`Write in this voice: ${r.brand.voice}`:'',
  r.brand.style?`Posting style the creator wants: ${r.brand.style}`:'',
  'Each idea needs: title, angle (what the post says), hook (the first line that stops the scroll), why_it_works, format (carousel, reel, single image, thread, story).',
  'Never invent statistics, quotes, names or links.'
 ];
 if(r.parent_id){
  lines.push(`This is a refinement. The creator was not happy with these earlier ideas: ${r.previous.map(t=>`"${t}"`).join(', ')||'(none listed)'}. Do not repeat them.`);
  if(r.feedback)lines.push(`What the creator wants changed: "${r.feedback}".`);
 }
 if(r.perplexity)lines.push(DEEP_RESEARCH);
 else lines.push('Do not claim any live research. Leave "sources" empty.');
 if(r.steroid)lines.push('STEROID MODE is ON. First draft 8 candidate ideas with the strongest, most attention-grabbing hooks you can write. Then review each one against: stops the scroll in one second, specific not generic, true to the brand voice, something only this brand could say. Rewrite the weak ones, then return the best 5. Put one line on what you changed in "review_note".');
 return lines.filter(Boolean).join('\n');
}

export function createIdeas({list,load,save,serial,inWs,InputError,text,json,body,clock,getConfig,file,unlink}){
 const iso=()=>new Date(clock()).toISOString();
 const publicIdea=({id,title,angle,hook,why_it_works,format,sources,review_note,status,design_id,updated_at})=>({id,title,angle,hook,why_it_works,format,sources:sources||[],review_note:review_note||'',status,design_id:design_id||null,updated_at:updated_at||null});
 const publicReq=r=>({id:r.id,mode:r.mode,prompt:r.prompt,parent_id:r.parent_id||null,feedback:r.feedback||'',perplexity:!!r.perplexity,steroid:!!r.steroid,status:r.status,agent:r.agent,model:r.model||'',searched:!!r.searched,error:r.error||'',brand:r.brand,created_at:r.created_at,started_at:r.started_at||null,completed_at:r.completed_at||null,ideas:(r.ideas||[]).map(publicIdea)});
 const forAgent=r=>({...publicReq(r),previous:r.previous||[],instructions:ideaInstructions(r)});
 const lastPoll=new Map();
 const readReq=async(id,ws)=>{const x=await load(id).catch(()=>null);if(x?.record_type!=='idea_request'||!inWs(x,ws))throw new InputError('Idea request not found.',404);return x;};

 /** Real timings from finished runs: what Perplexity and Steroid really add. Falls back to a labelled estimate. */
 async function options(ws){
  const done=(await list('idea_request')).filter(r=>inWs(r,ws)&&r.status==='done'&&r.started_at&&r.completed_at);
  const secs=r=>(Date.parse(r.completed_at)-Date.parse(r.started_at))/1000;
  const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
  const plain=done.filter(r=>!r.perplexity&&!r.steroid).map(secs);
  const measured=(key)=>{const only=done.filter(r=>r[key]&&!r[key==='perplexity'?'steroid':'perplexity']).map(secs);if(plain.length>=MIN_SAMPLES&&only.length>=MIN_SAMPLES)return Math.max(1,Math.round(avg(only)-avg(plain)));return null;};
  const out={};
  for(const k of ['perplexity','steroid']){const m=measured(k);out[k]=m!==null?{seconds:m,source:'measured',samples:done.filter(r=>r[k]).length}:{min:DEFAULT_EXTRA[k].min,max:DEFAULT_EXTRA[k].max,source:'estimate'};}
  out.base=plain.length>=MIN_SAMPLES?{seconds:Math.max(1,Math.round(avg(plain))),source:'measured',samples:plain.length}:{...DEFAULT_BASE,source:'estimate'};
  const seen=lastPoll.get(ws)||0;
  out.agent={name:IDEA_AGENT,online:!!seen&&clock()-seen<ONLINE_MS,last_seen:seen?new Date(seen).toISOString():null};
  return out;
 }
 const logActivity=(ws,task,status,model,detail,actor)=>{const id=randomUUID();return save(id,{record_type:'activity',id,workspace_id:ws,agent:IDEA_AGENT,task,model:model||'',status,detail:detail||'',by:actor,created_at:iso()}).catch(()=>{});};

 async function handle(req,res,url,ctx){
  const p=url.pathname;if(!p.startsWith('/api/v1/ideas'))return false;
  const ws=ctx.ws,human=ctx.who==='owner'||!!ctx.user;
  if(p==='/api/v1/ideas/options'&&req.method==='GET'){json(res,200,await options(ws));return true;}
  if(p==='/api/v1/ideas/requests'&&req.method==='GET'){
   if(!human)lastPoll.set(ws,clock());
   const status=url.searchParams.get('status'),all=(await list('idea_request')).filter(r=>inWs(r,ws)&&(!status||r.status===status)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
   json(res,200,{requests:all.slice(0,200).map(human?publicReq:forAgent),total:all.length});return true;}
  if(p==='/api/v1/ideas/requests'&&req.method==='POST'){
   if(!human)throw new InputError('Only a creator can ask for ideas.',403);
   const b=await body(req);let mode=b.mode,prompt='',parent=null,previous=[],feedback='';
   if(b.parent_id!==undefined){
    parent=await readReq(String(b.parent_id),ws);mode=parent.mode;prompt=parent.prompt;
    previous=(parent.ideas||[]).map(i=>i.title);feedback=text(b.feedback??'','feedback',600,false);
   }else{
    if(!MODES.includes(mode))throw new InputError('mode must be own or generate.');
    if(mode==='own')prompt=text(b.prompt,'Describe the content you want',2000);
   }
   const cfg=await getConfig(ws);
   if(mode==='generate'&&!cfg.niche)throw new InputError('Describe your brand and niche first (Ideas → Generate ideas asks for it), so the ideas fit you.');
   const brand={brand_name:cfg.brand_name,handle:cfg.handle,voice:cfg.voice,niche:cfg.niche||'',style:cfg.style||''};
   const rec=await serial(async()=>{
    const open=(await list('idea_request')).filter(r=>inWs(r,ws)&&(r.status==='pending'||r.status==='working')).length;
    if(open>=5)throw new InputError('Five requests are already waiting for the research agent. Wait for one to finish.',429);
    const r={record_type:'idea_request',id:randomUUID(),workspace_id:ws,mode,prompt,parent_id:parent?parent.id:null,feedback,previous,perplexity:b.perplexity===true,steroid:b.steroid===true,status:'pending',agent:IDEA_AGENT,brand,ideas:[],created_at:iso(),created_by:ctx.actor||ctx.who};
    await save(r.id,r);return r;});
   json(res,201,publicReq(rec));return true;}
  const m=p.match(/^\/api\/v1\/ideas\/requests\/([a-f0-9-]{36})(?:\/(claim|result|ideas\/(\d))?)?$/);
  if(m){
   const id=m[1],act=m[2]&&m[2].startsWith('ideas/')?'idea':m[2];
   if(!act&&req.method==='GET'){json(res,200,(human?publicReq:forAgent)(await readReq(id,ws)));return true;}
   if(!act&&req.method==='DELETE'){if(!human)throw new InputError('Only a creator can remove requests.',403);await serial(async()=>{const x=await readReq(id,ws);if(x.status==='working')throw new InputError('The research agent is already working on this one. Wait for it to finish, then reject the ideas you do not want.',409);await unlink(file(id));});json(res,200,{ok:true});return true;}
   if(act==='claim'&&req.method==='POST'){
    if(human)throw new InputError('Only the research agent claims requests.',403);
    const r=await serial(async()=>{const x=await readReq(id,ws);if(x.status!=='pending')throw new InputError('That request is already '+x.status+'.',409);x.status='working';x.started_at=iso();await save(id,x);return x;});
    await logActivity(ws,`Researching ideas: ${r.mode==='own'?r.prompt.slice(0,120):'brand ideas'}`,'started','',`${r.perplexity?'Perplexity on. ':''}${r.steroid?'Steroid mode on.':''}`.trim(),ctx.actor||ctx.who);
    json(res,200,forAgent(r));return true;}
   if(act==='result'&&req.method==='POST'){
    if(human)throw new InputError('Only the research agent sends results.',403);
    const b=await body(req);
    const r=await serial(async()=>{
     const x=await readReq(id,ws);if(x.status!=='working'&&x.status!=='pending')throw new InputError('That request is already '+x.status+'.',409);
     if(b.status==='failed'){x.status='failed';x.error=text(b.error??'The agent could not finish.','error',500);x.completed_at=iso();await save(id,x);return x;}
     if(!Array.isArray(b.ideas)||b.ideas.length<1||b.ideas.length>5)throw new InputError('Send 1 to 5 ideas.');
     if(x.perplexity&&b.searched!==false&&!b.ideas.some(i=>Array.isArray(i.sources)&&i.sources.length))throw new InputError('Research with Perplexity was on, so every run needs sources. Send the pages you used, or send searched:false if the search failed.');
     const now=iso();
     x.ideas=b.ideas.map((i,n)=>({id:String(n),title:text(i.title,'title',120),angle:text(i.angle,'angle',500),hook:text(i.hook,'hook',240),why_it_works:text(i.why_it_works??'','why_it_works',500,false),format:text(i.format??'','format',60,false),review_note:text(i.review_note??'','review_note',300,false),
      sources:(Array.isArray(i.sources)?i.sources:[]).slice(0,6).map(s=>{if(!/^https?:\/\/[^\s]+$/i.test(String(s?.url||'')))throw new InputError('Every source needs a real http(s) url.');return {title:text(s.title||s.url,'source title',200),url:String(s.url).slice(0,500)};}),status:'new',updated_at:now}));
     x.model=b.model===undefined?'':text(b.model,'model',80,false);x.searched=b.searched!==false&&!!x.perplexity&&x.ideas.some(i=>i.sources.length);x.status='done';x.completed_at=now;await save(id,x);return x;});
    if(r.status==='failed')await logActivity(ws,'Idea research failed','failed',r.model,r.error,ctx.actor||ctx.who);
    else await logActivity(ws,`Wrote ${r.ideas.length} ideas${r.perplexity?' with live research':''}${r.steroid?' in steroid mode':''}`,'done',r.model,'',ctx.actor||ctx.who);
    json(res,200,publicReq(r));return true;}
   if(act==='idea'&&req.method==='PATCH'){
    if(!human)throw new InputError('Only a creator can mark ideas.',403);
    const b=await body(req),n=Number(m[3]);if(!IDEA_STATUS.includes(b.status))throw new InputError('status must be new, picked, rejected or used.');
    const r=await serial(async()=>{const x=await readReq(id,ws),idea=x.ideas?.[n];if(!idea)throw new InputError('Idea not found.',404);idea.status=b.status;idea.updated_at=iso();if(b.design_id!==undefined)idea.design_id=/^[a-f0-9-]{36}$/.test(String(b.design_id))?b.design_id:null;await save(id,x);return x;});
    json(res,200,publicReq(r));return true;}
  }
  return false;
 }
 return {handle,options};
}
