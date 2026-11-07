// Accounts, workspaces and roles. A workspace is one person's or team's own space: its designs, review queue,
// Postiz account, live switches and agent keys. Until the first account is created the studio behaves as before.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scryptAsync=promisify(scrypt);
export class AccountError extends Error{constructor(message,status=400){super(message);this.status=status}}
const sha=s=>createHash('sha256').update(s).digest('hex');
const eq=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const SESSION_MS=14*86400000,COOKIE='gsn_user';
export const ROLES={manager:'Can approve and post, manage the workspace',editor:'Can create and edit, sends work for approval'};
const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
const text=(v,name,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new AccountError(`${name} must be ${min}–${max} characters.`);return v.trim()};
const checkPassword=p=>{if(typeof p!=='string'||p.length<10||p.length>200)throw new AccountError('Password must be 10–200 characters.');return p};
async function hashPassword(pw){const salt=randomBytes(16);const h=await scryptAsync(pw,salt,64);return {salt:salt.toString('hex'),hash:h.toString('hex')}}
async function verifyPassword(pw,rec){const h=await scryptAsync(String(pw),Buffer.from(rec.salt,'hex'),64);return eq(h.toString('hex'),rec.hash)}

export function createAccounts({dataDir,now=()=>Date.now()}){
 const file=path.join(dataDir,'accounts.json');
 let db={users:[],workspaces:[{id:'main',name:'Main',created_at:new Date(0).toISOString(),postiz:{}}],members:[],tokens:[],sessions:[]};
 let chain=Promise.resolve();const failures=new Map();
 const ready=mkdir(dataDir,{recursive:true,mode:0o700}).then(async()=>{try{const j=JSON.parse(await readFile(file,'utf8'));db={...db,...j};if(!db.workspaces.some(w=>w.id==='main'))db.workspaces.unshift({id:'main',name:'Main',created_at:new Date(0).toISOString(),postiz:{}})}catch{}});
 const persist=async()=>{const t=file+'.tmp';await writeFile(t,JSON.stringify(db),{mode:0o600});await rename(t,file)};
 const serial=fn=>{const p=chain.then(async()=>{await ready;return fn()});chain=p.catch(()=>{});return p};
 const enabled=()=>db.users.length>0;
 const cookieOf=req=>req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})(?:;|$)`))?.[1];
 const pubUser=u=>({id:u.id,username:u.username,name:u.name,admin:!!u.admin,disabled:!!u.disabled});
 const roleIn=(u,ws)=>u.admin?'manager':db.members.find(m=>m.user_id===u.id&&m.ws===ws)?.role||null;
 const wsList=u=>db.workspaces.filter(w=>roleIn(u,w.id)).map(w=>({id:w.id,name:w.name,role:roleIn(u,w.id),postiz_configured:!!(w.postiz?.url&&w.postiz?.key)}));
 const setCookie=(res,sid,secure,maxAge)=>res.setHeader('Set-Cookie',`${COOKIE}=${sid}; HttpOnly; SameSite=Strict; Path=/api/v1; Max-Age=${maxAge}${secure?'; Secure':''}`);

 /* Who is calling? Returns null, or {who,ws,actor,user?,role}. who is 'owner' (may approve and post) or 'agent' (may prepare only). */
 async function authenticate(req,{legacyToken='',same}={}){
  await ready;
  const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if(bearer){
   if(legacyToken&&same(bearer,legacyToken))return {who:'agent',ws:'main',actor:'agent',role:'agent'};
   const h=sha(bearer),t=db.tokens.find(x=>eq(x.hash,h));
   if(t){t.last_used=new Date(now()).toISOString();return {who:'agent',ws:t.ws,actor:`agent ${t.name}`,role:'agent'}}
  }
  const sid=cookieOf(req);
  if(sid){
   const h=sha(sid),s=db.sessions.find(x=>eq(x.hash,h));
   if(s&&s.expires>now()){
    const u=db.users.find(x=>x.id===s.user_id&&!x.disabled);if(!u)return null;
    const mine=db.workspaces.filter(w=>roleIn(u,w.id));if(!mine.length)return {who:'agent',ws:null,actor:u.name,user:u,role:null};
    const asked=req.headers['x-gsn-workspace'];const w=mine.find(x=>x.id===asked)||mine.find(x=>x.id==='main')||mine[0];
    const role=roleIn(u,w.id);
    return {who:role==='manager'?'owner':'agent',ws:w.id,actor:u.name,user:u,role};
   }
  }
  return null;
 }
 const loginKey=(name,ip)=>`${String(name).toLowerCase()}|${ip}`;
 async function login(username,password,ip){
  const k=loginKey(username,ip),f=failures.get(k);if(f&&f.n>=8&&f.until>now())throw new AccountError('Too many attempts. Wait a few minutes and try again.',429);
  const u=db.users.find(x=>x.username===String(username).toLowerCase().trim());
  // Always do the hashing work so timing does not reveal whether the username exists.
  const ok=u?await verifyPassword(password,u.password):(await verifyPassword(password,{salt:'00'.repeat(16),hash:'00'.repeat(64)}),false);
  if(!ok||u.disabled){const n=(f&&f.until>now()?f.n:0)+1;failures.set(k,{n,until:now()+15*60000});throw new AccountError('Incorrect username or password.',401)}
  failures.delete(k);
  return serial(async()=>{const sid=randomBytes(32).toString('hex');db.sessions=db.sessions.filter(s=>s.expires>now()).slice(-500);db.sessions.push({hash:sha(sid),user_id:u.id,expires:now()+SESSION_MS});await persist();return {sid,user:u}});
 }
 const logout=async req=>{const sid=cookieOf(req);if(!sid)return;await serial(async()=>{db.sessions=db.sessions.filter(s=>!eq(s.hash,sha(sid)));await persist()})};
 const canManage=(ctx,ws)=>!!ctx.user&&(ctx.user.admin||roleIn(ctx.user,ws)==='manager');

 /* ---- http ---- */
 async function handle(req,res,url,ctx,{json,body,secure,legacyOwner}){
  const route=url.pathname.replace(/^\/api\/v1/,'');if(!route.startsWith('/accounts'))return false;
  await ready;let m;
  const need=()=>{if(!ctx||!ctx.user)throw new AccountError('Sign in first.',401);return ctx.user};
  const admin=()=>{if(!need().admin)throw new AccountError('Only an administrator can do this.',403)};
  if(route==='/accounts/status'&&req.method==='GET'){json(res,200,{enabled:enabled(),signed_in:!!ctx?.user,roles:ROLES});return true}
  if(route==='/accounts/setup'&&req.method==='POST'){
   // The first account becomes the administrator. It must come from someone already trusted by the existing access rules.
   if(enabled())throw new AccountError('Accounts are already set up.',409);if(!legacyOwner)throw new AccountError('Open the studio as its owner (or send the access key) to create the first account.',403);
   const b=await body(req);const out=await serial(async()=>{if(enabled())throw new AccountError('Accounts are already set up.',409);
    const u={id:randomUUID(),username:text(b.username,'Username',3,40).toLowerCase(),name:text(b.name||b.username,'Name',1,80),password:await hashPassword(checkPassword(b.password)),admin:true,created_at:new Date(now()).toISOString()};
    if(!/^[a-z0-9._-]+$/.test(u.username))throw new AccountError('Username may use letters, numbers, dots, dashes and underscores.');
    db.users.push(u);const sid=randomBytes(32).toString('hex');db.sessions.push({hash:sha(sid),user_id:u.id,expires:now()+SESSION_MS});await persist();return {sid,u}});
   setCookie(res,out.sid,secure,SESSION_MS/1000);json(res,201,{user:pubUser(out.u)});return true}
  if(route==='/accounts/login'&&req.method==='POST'){const b=await body(req);const {sid,user}=await login(b.username||'',b.password||'',req.socket?.remoteAddress||'');setCookie(res,sid,secure,SESSION_MS/1000);json(res,200,{user:pubUser(user),workspaces:wsList(user)});return true}
  if(route==='/accounts/logout'&&req.method==='POST'){await logout(req);setCookie(res,'',secure,0);json(res,200,{ok:true});return true}
  if(route==='/accounts/me'&&req.method==='GET'){const u=need();json(res,200,{user:pubUser(u),workspaces:wsList(u),active:ctx.ws,role:ctx.role});return true}
  if(route==='/accounts/password'&&req.method==='POST'){const u=need();const b=await body(req);if(!await verifyPassword(b.current||'',u.password))throw new AccountError('Your current password is not right.',403);const pw=await hashPassword(checkPassword(b.password));await serial(async()=>{u.password=pw;db.sessions=db.sessions.filter(s=>s.user_id!==u.id||eq(s.hash,sha(cookieOf(req)||'')));await persist()});json(res,200,{ok:true});return true}
  if(route==='/accounts/users'&&req.method==='GET'){admin();json(res,200,{users:db.users.map(u=>({...pubUser(u),memberships:db.members.filter(x=>x.user_id===u.id).map(x=>({ws:x.ws,role:x.role}))}))});return true}
  if(route==='/accounts/users'&&req.method==='POST'){admin();const b=await body(req);
   const u=await serial(async()=>{const username=text(b.username,'Username',3,40).toLowerCase();if(!/^[a-z0-9._-]+$/.test(username))throw new AccountError('Username may use letters, numbers, dots, dashes and underscores.');if(db.users.some(x=>x.username===username))throw new AccountError('That username is taken.',409);if(db.users.length>=200)throw new AccountError('Maximum 200 accounts.',409);
    const nu={id:randomUUID(),username,name:text(b.name||username,'Name',1,80),password:await hashPassword(checkPassword(b.password)),admin:false,created_at:new Date(now()).toISOString()};db.users.push(nu);
    if(b.workspace){const w=db.workspaces.find(x=>x.id===b.workspace);if(!w)throw new AccountError('Workspace not found.',404);const role=b.role||'editor';if(!ROLES[role])throw new AccountError('role must be manager or editor.');db.members.push({user_id:nu.id,ws:w.id,role})}
    await persist();return nu});json(res,201,{user:pubUser(u)});return true}
  if((m=route.match(/^\/accounts\/users\/([a-f0-9-]{36})$/))){admin();
   if(req.method==='PATCH'){const b=await body(req);const u=await serial(async()=>{const u=db.users.find(x=>x.id===m[1]);if(!u)throw new AccountError('User not found.',404);
     if(typeof b.name==='string')u.name=text(b.name,'Name',1,80);if(typeof b.disabled==='boolean'){if(b.disabled&&u.id===ctx.user.id)throw new AccountError('You cannot disable your own account.');u.disabled=b.disabled;if(b.disabled)db.sessions=db.sessions.filter(s=>s.user_id!==u.id)}
     if(typeof b.admin==='boolean'){if(!b.admin&&u.id===ctx.user.id)throw new AccountError('You cannot remove your own administrator access.');u.admin=b.admin}
     if(b.password!==undefined){u.password=await hashPassword(checkPassword(b.password));db.sessions=db.sessions.filter(s=>s.user_id!==u.id)}
     await persist();return u});json(res,200,{user:pubUser(u)});return true}
   if(req.method==='DELETE'){await serial(async()=>{if(m[1]===ctx.user.id)throw new AccountError('You cannot delete your own account.');if(!db.users.some(x=>x.id===m[1]))throw new AccountError('User not found.',404);db.users=db.users.filter(x=>x.id!==m[1]);db.members=db.members.filter(x=>x.user_id!==m[1]);db.sessions=db.sessions.filter(s=>s.user_id!==m[1]);await persist()});json(res,200,{ok:true});return true}
  }
  if(route==='/accounts/workspaces'&&req.method==='GET'){const u=need();json(res,200,{workspaces:db.workspaces.filter(w=>roleIn(u,w.id)).map(w=>({id:w.id,name:w.name,role:roleIn(u,w.id),postiz_configured:!!(w.postiz?.url&&w.postiz?.key),postiz_url:roleIn(u,w.id)==='manager'?(w.postiz?.url||''):undefined,members:roleIn(u,w.id)==='manager'?db.members.filter(x=>x.ws===w.id).map(x=>{const mu=db.users.find(y=>y.id===x.user_id);return {user_id:x.user_id,name:mu?.name,username:mu?.username,role:x.role}}):undefined,tokens:roleIn(u,w.id)==='manager'?db.tokens.filter(t=>t.ws===w.id).map(t=>({id:t.id,name:t.name,created_at:t.created_at,last_used:t.last_used||null})):undefined}))});return true}
  if(route==='/accounts/workspaces'&&req.method==='POST'){admin();const b=await body(req);
   const w=await serial(async()=>{const name=text(b.name,'Name',1,60);if(db.workspaces.length>=100)throw new AccountError('Maximum 100 workspaces.',409);let id=slug(name)||'space';if(db.workspaces.some(x=>x.id===id))id=`${id}-${randomBytes(2).toString('hex')}`;const nw={id,name,created_at:new Date(now()).toISOString(),postiz:{}};db.workspaces.push(nw);await persist();return nw});json(res,201,{workspace:{id:w.id,name:w.name}});return true}
  if((m=route.match(/^\/accounts\/workspaces\/([a-z0-9-]{1,50})(?:\/(postiz|members|tokens))?(?:\/([a-f0-9-]{36}))?$/))){
   const u=need();const w=db.workspaces.find(x=>x.id===m[1]);if(!w||!roleIn(u,w.id))throw new AccountError('Workspace not found.',404);
   const manage=()=>{if(!canManage(ctx,w.id))throw new AccountError('Only a manager of this workspace can do this.',403)};
   if(!m[2]&&req.method==='PATCH'){manage();const b=await body(req);await serial(async()=>{w.name=text(b.name,'Name',1,60);await persist()});json(res,200,{ok:true});return true}
   if(!m[2]&&req.method==='DELETE'){admin();await serial(async()=>{if(w.id==='main')throw new AccountError('The main workspace cannot be deleted.',409);db.workspaces=db.workspaces.filter(x=>x.id!==w.id);db.members=db.members.filter(x=>x.ws!==w.id);db.tokens=db.tokens.filter(x=>x.ws!==w.id);await persist()});json(res,200,{ok:true});return true}
   if(m[2]==='postiz'&&req.method==='PUT'){manage();const b=await body(req);
    await serial(async()=>{let addr=text(b.url||'',"Postiz address",8,300);try{const p=new URL(addr);if(!/^https?:$/.test(p.protocol))throw 0;addr=p.toString().replace(/\/$/,'')}catch{throw new AccountError('Postiz address must be a web address such as https://postiz.example.com/api/public/v1')}
     const prior=w.postiz?.key||'';const key=b.key===undefined||b.key===''?prior:text(b.key,'API key',8,500);if(!key)throw new AccountError('Enter the Postiz API key.');w.postiz={url:addr,key};await persist()});
    json(res,200,{ok:true,postiz_configured:true});return true}
   if(m[2]==='postiz'&&req.method==='DELETE'){manage();await serial(async()=>{w.postiz={};await persist()});json(res,200,{ok:true});return true}
   if(m[2]==='members'&&req.method==='POST'){manage();const b=await body(req);
    await serial(async()=>{const mu=db.users.find(x=>x.id===b.user_id||x.username===String(b.username||'').toLowerCase());if(!mu)throw new AccountError('No account with that username. An administrator creates accounts.',404);if(!ROLES[b.role])throw new AccountError('role must be manager or editor.');
     const ex=db.members.find(x=>x.user_id===mu.id&&x.ws===w.id);if(ex)ex.role=b.role;else db.members.push({user_id:mu.id,ws:w.id,role:b.role});await persist()});json(res,200,{ok:true});return true}
   if(m[2]==='members'&&m[3]&&req.method==='DELETE'){manage();await serial(async()=>{const managers=db.members.filter(x=>x.ws===w.id&&x.role==='manager');const t=db.members.find(x=>x.user_id===m[3]&&x.ws===w.id);if(!t)throw new AccountError('Not a member.',404);if(t.role==='manager'&&managers.length<2&&!ctx.user.admin)throw new AccountError('A workspace needs at least one manager.',409);db.members=db.members.filter(x=>x!==t);await persist()});json(res,200,{ok:true});return true}
   if(m[2]==='tokens'&&req.method==='POST'){manage();const b=await body(req);
    const out=await serial(async()=>{if(db.tokens.filter(t=>t.ws===w.id).length>=20)throw new AccountError('Maximum 20 agent keys per workspace.',409);const token='gsn_'+randomBytes(32).toString('base64url');const t={id:randomUUID(),ws:w.id,name:text(b.name||'agent',"Name",1,60),hash:sha(token),created_at:new Date(now()).toISOString()};db.tokens.push(t);await persist();return {id:t.id,name:t.name,token}});
    json(res,201,{...out,note:'Copy this key now. It is shown once and cannot be recovered.'});return true}
   if(m[2]==='tokens'&&m[3]&&req.method==='DELETE'){manage();await serial(async()=>{if(!db.tokens.some(t=>t.id===m[3]&&t.ws===w.id))throw new AccountError('Key not found.',404);db.tokens=db.tokens.filter(t=>t.id!==m[3]);await persist()});json(res,200,{ok:true});return true}
  }
  throw new AccountError('Unknown accounts endpoint.',404);
 }
 return {authenticate,handle,enabled,ready,credentials:ws=>{const w=db.workspaces.find(x=>x.id===ws);return w?.postiz||{}},workspaceExists:id=>db.workspaces.some(w=>w.id===id)};
}
