// Scheduling and posting. Agents research and draft; the owner reviews and approves; only approved posts are sent.
// Posts go through the owner's Postiz instance (self-hosted), which holds the social-media logins. Nothing is sent
// live until the owner turns live mode on, and each platform can be switched on separately.
import {mkdir,readFile,writeFile,rename,rm,readdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const PLATFORMS=['instagram','facebook','linkedin','x','tiktok','youtube'];
const LIMITS={instagram:2200,facebook:5000,linkedin:3000,x:280,tiktok:2200,youtube:5000};
const MAX_AHEAD_DAYS=62,MAX_MEDIA=10,MAX_FILE=8*1024*1024;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const family=identifier=>{const i=String(identifier||'').toLowerCase();return i.startsWith('instagram')?'instagram':i.startsWith('linkedin')?'linkedin':i==='twitter'?'x':PLATFORMS.includes(i)?i:i};
class PublishError extends Error{constructor(message,status=400){super(message);this.status=status}}
const clean=(v,max,name,required=false)=>{if(v===undefined||v===null||v===''){if(required)throw new PublishError(`${name} is required.`);return ''}if(typeof v!=='string'||v.length>max)throw new PublishError(`${name} must be text of up to ${max} characters.`);return v.trim()};
const tags=v=>{if(v===undefined)return [];if(!Array.isArray(v)||v.length>30)throw new PublishError('hashtags must be a list of up to 30.');return v.map(t=>{if(typeof t!=='string'||!/^#?[\p{L}\p{N}_]{1,60}$/u.test(t.trim()))throw new PublishError('Each hashtag must be letters, numbers or underscores.');return t.trim().replace(/^#?/,'#')})};

export function createPublisher({dataDir,env=process.env,fetchImpl=fetch,now=()=>Date.now()}){
 const root=path.join(dataDir,'publish'),dbFile=path.join(root,'schedule.json'),mediaDir=path.join(root,'media');
 let db={settings:{live:false,paused:false,platforms:{}},batches:[],posts:[]},chain=Promise.resolve(),sent=[];
 const ready=mkdir(mediaDir,{recursive:true,mode:0o700}).then(async()=>{try{db={...db,...JSON.parse(await readFile(dbFile,'utf8'))}}catch{}
  // A post caught mid-send by a restart is not retried automatically: it may already be live.
  for(const p of db.posts)if(p.status==='posting'){p.status='failed';p.error='The app restarted while this was being sent. Check the account before retrying.'}});
 const persist=async()=>{const t=dbFile+'.tmp';await writeFile(t,JSON.stringify(db),{mode:0o600});await rename(t,dbFile)};
 const serial=fn=>{const p=chain.then(async()=>{await ready;return fn()});chain=p.catch(()=>{});return p};
 const configured=()=>!!(env.POSTIZ_API_URL&&env.POSTIZ_API_KEY);
 const iso=ms=>new Date(ms).toISOString();
 const log=(p,by,event)=>{p.history=[...(p.history||[]),{at:iso(now()),by,event}].slice(-30);p.updated_at=iso(now())};

 /* ---- Postiz client ---- */
 async function pz(route,{method='GET',json,form}={}){
  if(!configured())throw new PublishError('Postiz is not connected. Set POSTIZ_API_URL and POSTIZ_API_KEY on the server.',503);
  const res=await fetchImpl(env.POSTIZ_API_URL.replace(/\/$/,'')+route,{method,headers:{Authorization:env.POSTIZ_API_KEY,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(json):form,signal:AbortSignal.timeout(60000)});
  const text=await res.text();let data;try{data=text?JSON.parse(text):{}}catch{data={raw:text.slice(0,300)}}
  if(!res.ok)throw new PublishError(`Postiz answered ${res.status}: ${String(data.message||data.error||data.raw||'request refused').slice(0,300)}`,502);
  return data;
 }
 const channels=async()=>{const list=await pz('/integrations');return (Array.isArray(list)?list:[]).map(c=>({id:c.id,name:c.name||c.profile||c.identifier,identifier:c.identifier,platform:family(c.identifier),picture:c.picture||'',disabled:!!c.disabled}))};
 function settingsFor(identifier,post){
  const id=String(identifier||'');const f=family(id);const title=(post.title||post.caption||'').split('\n')[0].slice(0,90);
  if(f==='x')return {__type:id,who_can_reply_post:'everyone'};
  if(f==='instagram')return {__type:id,post_type:'post',collaborators:[]};
  if(f==='linkedin')return {__type:id,post_as_images_carousel:post.media.length>1};
  if(f==='tiktok')return {__type:id,title,privacy_level:'PUBLIC_TO_EVERYONE',duet:false,stitch:false,comment:true,autoAddMusic:'no',brand_content_toggle:false,brand_organic_toggle:false,video_made_with_ai:false,content_posting_method:'DIRECT_POST'};
  if(f==='youtube')return {__type:id,title:title||'Video',type:'public',tags:[]};
  return {__type:id};
 }
 const body=p=>[p.caption,(p.hashtags||[]).join(' ')].filter(Boolean).join('\n\n');

 /* ---- validation ---- */
 function check(p){
  const problems=[];const limit=LIMITS[p.platform];
  if(!body(p).trim())problems.push('Write a caption.');
  if(limit&&body(p).length>limit)problems.push(`${p.platform} allows ${limit} characters; this is ${body(p).length}.`);
  if(p.platform==='youtube'&&!p.media.some(m=>m.type==='video'))problems.push('YouTube needs a video (MP4).');
  if(p.platform==='tiktok'&&!p.media.length)problems.push('TikTok needs pictures or a video.');
  if(p.platform==='instagram'&&!p.media.length)problems.push('Instagram needs pictures or a video.');
  if(p.platform==='x'&&p.media.filter(m=>m.type==='image').length>4)problems.push('X allows up to 4 pictures per post.');
  return problems;
 }
 function sanitizeInput(i,existing={}){
  const out={};
  const scheduled=i.scheduled_at!==undefined?i.scheduled_at:existing.scheduled_at;
  if(i.scheduled_at!==undefined||!existing.id){
   const t=Date.parse(scheduled);if(!Number.isFinite(t))throw new PublishError('scheduled_at must be a date and time such as 2026-11-20T09:00:00Z.');
   if(t>now()+MAX_AHEAD_DAYS*86400000)throw new PublishError(`Posts can be scheduled up to ${MAX_AHEAD_DAYS} days ahead.`);
   if(t<now()-5*60000&&!existing.id)throw new PublishError('scheduled_at is in the past.');
   out.scheduled_at=iso(t);
  }
  if(i.caption!==undefined||!existing.id)out.caption=clean(i.caption,5000,'caption',!existing.id);
  if(i.hashtags!==undefined)out.hashtags=tags(i.hashtags);
  if(i.title!==undefined)out.title=clean(i.title,120,'title');
  if(i.notes!==undefined)out.notes=clean(i.notes,1000,'notes');
  if(i.design_id!==undefined){if(i.design_id&&!uuid.test(i.design_id))throw new PublishError('design_id is not valid.');out.design_id=i.design_id||''}
  if(i.channel_id!==undefined||!existing.id){out.channel_id=clean(i.channel_id,120,'channel_id',!existing.id);}
  if(i.identifier!==undefined)out.identifier=clean(i.identifier,60,'identifier');
  if(i.platform!==undefined||!existing.id){const pf=String(i.platform||'').toLowerCase();if(!PLATFORMS.includes(pf))throw new PublishError(`platform must be one of ${PLATFORMS.join(', ')}.`);out.platform=pf}
  return out;
 }
 const publicPost=p=>({...p,problems:check(p),media:p.media.map((m,n)=>({...m,url:`/api/v1/schedule/media/${p.id}/${n}`}))});

 /* ---- sending ---- */
 const isLive=p=>db.settings.live&&db.settings.platforms?.[p.platform]&&configured();
 async function send(p){
  const mode=isLive(p)?'live':'dry';
  if(mode==='dry'){log(p,'system',`Dry run: would post to ${p.platform} (live mode ${db.settings.live?'is on but this platform or Postiz is not ready':'is off'}).`);p.status='simulated';return}
  if(String(p.channel_id).startsWith('unassigned'))throw new PublishError('Choose a connected channel for this post.');
  const image=[];
  for(const m of p.media){
   const buf=await readFile(path.join(mediaDir,p.id,m.file));const form=new FormData();form.append('file',new Blob([buf],{type:m.mime}),m.file);
   const up=await pz('/upload',{method:'POST',form});if(!up?.id||!up?.path)throw new PublishError('Postiz did not return an uploaded file.',502);image.push({id:up.id,path:up.path});
  }
  const payload={type:'now',date:iso(now()),shortLink:false,tags:[],posts:[{integration:{id:p.channel_id},value:[{content:body(p),image}],settings:settingsFor(p.identifier||p.platform,{...p,media:p.media})}]};
  const res=await pz('/posts',{method:'POST',json:payload});
  p.status='posted';p.posted_at=iso(now());p.postiz=Array.isArray(res)?res.slice(0,3):res;log(p,'system','Sent to Postiz.');
 }
 async function tick(){
  return serial(async()=>{
   if(db.settings.paused)return {sent:0,paused:true};
   sent=sent.filter(t=>t>now()-3600000);let n=0;
   const due=db.posts.filter(p=>p.status==='approved'&&Date.parse(p.scheduled_at)<=now()&&(!p.retry_at||Date.parse(p.retry_at)<=now())).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
   for(const p of due){
    if(now()-Date.parse(p.scheduled_at)>24*3600000){p.status='failed';p.error='Missed its time by more than 24 hours. Reschedule it to send.';log(p,'system',p.error);continue}
    if(isLive(p)&&sent.length>=Number(env.POSTIZ_HOURLY_LIMIT||60))break;
    p.status='posting';p.attempts=(p.attempts||0)+1;await persist();
    try{await send(p);if(isLive(p)||p.status==='posted')sent.push(now());delete p.error;delete p.retry_at;n++}
    catch(e){p.error=String(e.message).slice(0,400);log(p,'system','Failed: '+p.error);
     if(p.attempts<3){p.status='approved';p.retry_at=iso(now()+p.attempts*10*60000)}else p.status='failed'}
    await persist();
   }
   return {sent:n};
  });
 }

 /* ---- http ---- */
 const owner=who=>{if(who!=='owner')throw new PublishError('Only the owner can do this, from the dashboard.',403)};
 function decodeFiles(files){
  if(!Array.isArray(files)||!files.length||files.length>MAX_MEDIA)throw new PublishError(`Send 1 to ${MAX_MEDIA} files.`);
  return files.map((f,n)=>{
   const b64=typeof f?.base64==='string'?f.base64.replace(/^data:[^,]+,/,''):'';
   if(!b64||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64))throw new PublishError('A file is not valid base64.');
   const buf=Buffer.from(b64,'base64');if(buf.length>MAX_FILE*(f.type==='video'?6:1))throw new PublishError('A file is too large.');
   const sig=buf.subarray(0,12);let ext,mime,type='image';
   if(sig[0]===0x89&&sig[1]===0x50)[ext,mime]=['png','image/png'];else if(sig[0]===0xff&&sig[1]===0xd8)[ext,mime]=['jpg','image/jpeg'];else if(sig.subarray(4,8).toString()==='ftyp'){[ext,mime,type]=['mp4','video/mp4','video']}else throw new PublishError('Files must be PNG, JPG or MP4.');
   return {buf,ext,mime,type,name:`${String(n+1).padStart(2,'0')}.${ext}`};
  });
 }
 async function writeMedia(p,decoded){
  await rm(path.join(mediaDir,p.id),{recursive:true,force:true});await mkdir(path.join(mediaDir,p.id),{recursive:true});
  for(const d of decoded)await writeFile(path.join(mediaDir,p.id,d.name),d.buf);
  p.media=decoded.map(d=>({file:d.name,mime:d.mime,type:d.type,bytes:d.buf.length}));
 }
 const saveMedia=async(p,files)=>writeMedia(p,decodeFiles(files));
 async function handle(req,res,url,who,{json,body:readBody,InputError}){
  const route=url.pathname.replace(/^\/api\/v1/,'');
  if(!route.startsWith('/schedule')&&!route.startsWith('/publish'))return false;
  const wrap=async fn=>{try{await fn()}catch(e){if(e instanceof PublishError)throw new InputError(e.message,e.status);throw e}};
  await wrap(async()=>{
   await ready;
   if(route==='/publish/status'&&req.method==='GET'){json(res,200,{postiz_configured:configured(),live:db.settings.live,paused:db.settings.paused,platforms:Object.fromEntries(PLATFORMS.map(p=>[p,!!db.settings.platforms?.[p]])),limits:LIMITS,max_days_ahead:MAX_AHEAD_DAYS});return}
   if(route==='/publish/settings'&&req.method==='POST'){owner(who);const b=await readBody(req);await serial(async()=>{if(typeof b.live==='boolean')db.settings.live=b.live;if(typeof b.paused==='boolean')db.settings.paused=b.paused;if(b.platforms&&typeof b.platforms==='object')for(const p of PLATFORMS)if(typeof b.platforms[p]==='boolean')db.settings.platforms[p]=b.platforms[p];await persist()});json(res,200,db.settings);return}
   if(route==='/publish/channels'&&req.method==='GET'){if(!configured()){json(res,200,{configured:false,channels:[]});return}json(res,200,{configured:true,channels:await channels()});return}
   if(route==='/publish/test'&&req.method==='POST'){
    owner(who);const b=await readBody(req);const list=await channels();
    if(!b.channel_id){json(res,200,{ok:true,message:`Connected. ${list.length} channel(s) found.`,channels:list});return}
    const c=list.find(x=>x.id===b.channel_id);if(!c)throw new PublishError('That channel is not in Postiz.',404);
    // A draft never goes live: it appears in Postiz for the owner to look at.
    await pz('/posts',{method:'POST',json:{type:'draft',date:iso(now()+3600000),shortLink:false,tags:[],posts:[{integration:{id:c.id},value:[{content:'GSN Media connection test. Safe to delete.',image:[]}],settings:settingsFor(c.identifier,{caption:'GSN Media connection test',media:[]})}]}});
    json(res,200,{ok:true,message:`A draft test post was created for ${c.name} in Postiz. Nothing was published.`});return}
   let m;
   if(route==='/schedule/batches'&&req.method==='GET'){json(res,200,{batches:db.batches.slice().reverse().map(b=>({...b,counts:db.posts.filter(p=>p.batch_id===b.id).reduce((a,p)=>(a[p.status]=(a[p.status]||0)+1,a),{})}))});return}
   if(route==='/schedule/batches'&&req.method==='POST'){
    const b=await readBody(req);if(!Array.isArray(b.items)||!b.items.length||b.items.length>200)throw new PublishError('Send 1 to 200 items.');
    const result=await serial(async()=>{
     const items=b.items.map((i,n)=>{try{return sanitizeInput(i)}catch(e){throw new PublishError(`Item ${n+1}: ${e.message}`)}});
     const batch={id:randomUUID(),title:clean(b.title||'Untitled batch',120,'title'),notes:clean(b.notes,2000,'notes'),created_by:who,created_at:iso(now())};
     const posts=items.map(i=>{const p={id:randomUUID(),batch_id:batch.id,title:'',notes:'',hashtags:[],design_id:'',media:[],status:'review',attempts:0,created_by:who,created_at:iso(now()),...i};log(p,who,'Created for review.');return p});
     db.batches.push(batch);db.posts.push(...posts);await persist();return {batch,posts};
    });
    json(res,201,{batch:result.batch,posts:result.posts.map(publicPost)});return}
   if((m=route.match(/^\/schedule\/batches\/([a-f0-9-]{36})$/))&&req.method==='GET'){const bt=db.batches.find(x=>x.id===m[1]);if(!bt)throw new PublishError('Batch not found.',404);json(res,200,{batch:bt,posts:db.posts.filter(p=>p.batch_id===bt.id).map(publicPost)});return}
   if((m=route.match(/^\/schedule\/batches\/([a-f0-9-]{36})\/approve$/))&&req.method==='POST'){
    owner(who);const b=await readBody(req).catch(()=>({}));
    const r=await serial(async()=>{const approved=[],blocked=[];
     for(const p of db.posts.filter(x=>x.batch_id===m[1]&&x.status==='review'&&(!Array.isArray(b.post_ids)||b.post_ids.includes(x.id)))){
      const problems=check(p);if(problems.length||!p.media.length&&!['facebook','linkedin','x'].includes(p.platform)){blocked.push({id:p.id,problems:problems.length?problems:['Render the pictures first.']});continue}
      p.status='approved';log(p,who,'Approved.');approved.push(p.id)}
     await persist();return {approved,blocked}});
    json(res,200,r);return}
   if(route==='/schedule/posts'&&req.method==='GET'){
    const from=Date.parse(url.searchParams.get('from')||'')||0,to=Date.parse(url.searchParams.get('to')||'')||Infinity,st=url.searchParams.get('status');
    json(res,200,{posts:db.posts.filter(p=>Date.parse(p.scheduled_at)>=from&&Date.parse(p.scheduled_at)<=to&&(!st||p.status===st)).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).map(publicPost)});return}
   if(route==='/schedule/media-set'&&req.method==='POST'){
    // One set of rendered files for every unsent post of a design that wants that kind of media.
    const b=await readBody(req);if(!uuid.test(b.design_id||''))throw new PublishError('design_id is not valid.');
    const want=b.variant==='video'?['youtube']:b.variant==='x'?['x']:PLATFORMS.filter(x=>!['youtube','x'].includes(x));
    const decoded=decodeFiles(b.files);
    const n=await serial(async()=>{let c=0;for(const p of db.posts.filter(x=>x.design_id===b.design_id&&want.includes(x.platform)&&['review','draft','rejected','approved'].includes(x.status)&&!(who==='agent'&&x.status==='approved'))){await writeMedia(p,decoded);log(p,who,`Pictures attached (${decoded.length}).`);c++}await persist();return c});
    json(res,200,{updated:n});return}
   if((m=route.match(/^\/schedule\/media\/([a-f0-9-]{36})\/(\d{1,2})$/))&&req.method==='GET'){
    const p=db.posts.find(x=>x.id===m[1]),f=p?.media[+m[2]];if(!f)throw new PublishError('Not found.',404);
    res.writeHead(200,{'Content-Type':f.mime,'Cache-Control':'private, max-age=60'});createReadStream(path.join(mediaDir,p.id,f.file)).pipe(res);return}
   if((m=route.match(/^\/schedule\/posts\/([a-f0-9-]{36})(?:\/(media|approve|reject|cancel|post-now|retry))?$/))){
    const find=()=>{const p=db.posts.find(x=>x.id===m[1]);if(!p)throw new PublishError('Post not found.',404);return p};
    const act=m[2];
    if(!act&&req.method==='GET'){json(res,200,publicPost(find()));return}
    if(!act&&req.method==='PATCH'){const b=await readBody(req);const p=await serial(async()=>{const p=find();
      if(who==='agent'&&!['draft','review','rejected'].includes(p.status))throw new PublishError('This post is already approved. Only the owner can change it.',409);
      if(['posting','posted','simulated'].includes(p.status))throw new PublishError('This post has already been sent.',409);
      Object.assign(p,sanitizeInput(b,p));if(who==='agent')p.status='review';log(p,who,'Edited.');await persist();return p});json(res,200,publicPost(p));return}
    if(!act&&req.method==='DELETE'){await serial(async()=>{const p=find();if(who==='agent'&&!['draft','review','rejected'].includes(p.status))throw new PublishError('Only the owner can remove an approved post.',403);if(p.status==='posting')throw new PublishError('This post is being sent.',409);db.posts=db.posts.filter(x=>x.id!==p.id);await rm(path.join(mediaDir,p.id),{recursive:true,force:true});await persist()});json(res,200,{ok:true});return}
    if(act==='media'&&req.method==='POST'){const b=await readBody(req);const p=await serial(async()=>{const p=find();if(['posting','posted','simulated'].includes(p.status))throw new PublishError('This post has already been sent.',409);await saveMedia(p,b.files);if(who==='agent'&&p.status==='approved')p.status='review';log(p,who,`Added ${p.media.length} file(s).`);await persist();return p});json(res,200,publicPost(p));return}
    if(req.method==='POST'&&['approve','reject','cancel','post-now','retry'].includes(act)){
     owner(who);const b=await readBody(req).catch(()=>({}));
     const p=await serial(async()=>{const p=find();
      if(act==='approve'){if(!['review','draft','rejected'].includes(p.status))throw new PublishError(`A ${p.status} post cannot be approved.`,409);const pr=check(p);if(pr.length)throw new PublishError(pr.join(' '));if(!p.media.length&&!['facebook','linkedin','x'].includes(p.platform))throw new PublishError('Render the pictures first.',409);p.status='approved';delete p.error;p.attempts=0}
      else if(act==='reject'){if(['posting','posted','simulated'].includes(p.status))throw new PublishError('Already sent.',409);p.status='rejected';p.notes=clean(b.note,1000,'note')||p.notes}
      else if(act==='cancel'){if(['posting','posted','simulated'].includes(p.status))throw new PublishError('Already sent.',409);p.status='cancelled'}
      else if(act==='post-now'){if(!['approved','failed'].includes(p.status))throw new PublishError('Approve the post first.',409);p.status='approved';p.scheduled_at=iso(now());p.attempts=0;delete p.retry_at}
      else if(act==='retry'){if(p.status!=='failed')throw new PublishError('Only failed posts can be retried.',409);p.status='approved';p.attempts=0;delete p.retry_at;if(Date.parse(p.scheduled_at)<now()-23*3600000)p.scheduled_at=iso(now())}
      log(p,who,{approve:'Approved.',reject:'Sent back.',cancel:'Cancelled.','post-now':'Post now requested.',retry:'Retry requested.'}[act]);await persist();return p});
     if(act==='post-now'||act==='retry')tick().catch(()=>{});
     json(res,200,publicPost(p));return}
   }
   throw new InputError('Unknown schedule endpoint.',404);
  });
  return true;
 }
 return {handle,tick,configured,get settings(){return db.settings},ready};
}
