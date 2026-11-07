import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';

async function setup(){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));const calls=[];
 const fake=async(url,opts={})=>{const u=new URL(url);calls.push({host:u.host,path:u.pathname,auth:opts.headers?.Authorization,body:typeof opts.body==='string'?JSON.parse(opts.body):null});
  const r=(c,d)=>new Response(JSON.stringify(d),{status:c,headers:{'content-type':'application/json'}});
  if(u.pathname.endsWith('/integrations'))return r(200,[{id:'ch-'+u.host,name:'Channel of '+u.host,identifier:'x'}]);
  if(u.pathname.endsWith('/posts'))return r(200,[{postId:'p'}]);return r(404,{})};
 const api=createV1({dataDir:dir,token:'legacy-token-123',fetchImpl:fake,clock:()=>Date.parse('2026-11-10T08:00:00Z'),publishEnv:{}});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 // each person is a separate "browser" with its own cookie
 const person=()=>{let cookie='',ws='';return {async call(r,m='GET',d,extra={}){const res=await fetch(base+r,{method:m,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin',...(cookie?{Cookie:cookie}:{}),...(ws?{'X-GSN-Workspace':ws}:{}),...extra},body:d===undefined?undefined:JSON.stringify(d)});const sc=res.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];return res},use(w){ws=w}}};
 const key=(r,m,d,token)=>fetch(base+r,{method:m||'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:d===undefined?undefined:JSON.stringify(d)});
 return {person,key,calls,close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}
const item=(o={})=>({channel_id:'c1',identifier:'x',platform:'x',caption:'Hello',scheduled_at:'2026-11-10T09:00:00Z',...o});

test('first account becomes admin; after that, people must sign in',async()=>{
 const t=await setup();try{
  const admin=t.person();
  assert.equal((await (await admin.call('/accounts/status')).json()).enabled,false);
  // Without accounts, the open browser still works as before.
  assert.equal((await admin.call('/designs')).status,200);
  const made=await admin.call('/accounts/setup','POST',{username:'Admin',name:'Ada',password:'correct horse battery'});assert.equal(made.status,201);
  assert.equal((await admin.call('/accounts/setup','POST',{username:'x2',password:'another long password'})).status,409);
  const stranger=t.person();
  assert.equal((await stranger.call('/designs')).status,401);
  assert.equal((await stranger.call('/accounts/login','POST',{username:'admin',password:'wrong password!!'})).status,401);
  assert.equal((await stranger.call('/accounts/login','POST',{username:'admin',password:'correct horse battery'})).status,200);
  assert.equal((await stranger.call('/designs')).status,200);
  assert.equal((await admin.call('/session','POST',{token:'legacy-token-123'})).status,409);
 }finally{await t.close()}
});

test('workspaces are separate: designs, posts, Postiz accounts and switches',async()=>{
 const t=await setup();try{
  const admin=t.person();await admin.call('/accounts/setup','POST',{username:'admin',password:'correct horse battery'});
  const ws=await (await admin.call('/accounts/workspaces','POST',{name:'Acme Studio'})).json();const acme=ws.workspace.id;
  const bob=await (await admin.call('/accounts/users','POST',{username:'bob',name:'Bob',password:'bobs long password',workspace:acme,role:'manager'})).json();
  const eve=await (await admin.call('/accounts/users','POST',{username:'eve',name:'Eve',password:'eves long password',workspace:acme,role:'editor'})).json();
  const sue=await (await admin.call('/accounts/users','POST',{username:'sue',name:'Sue',password:'sues long password'})).json();
  const B=t.person(),E=t.person(),S=t.person();
  for(const [p,u,pw] of [[B,'bob','bobs long password'],[E,'eve','eves long password'],[S,'sue','sues long password']])assert.equal((await p.call('/accounts/login','POST',{username:u,password:pw})).status,200);
  // A person in no workspace sees nothing.
  assert.equal((await S.call('/designs')).status,403);
  // Bob's Postiz account is his own.
  assert.equal((await B.call(`/accounts/workspaces/${acme}/postiz`,'PUT',{url:'https://acme-postiz.test/api/public/v1',key:'acme-secret'})).status,200);
  assert.equal((await E.call(`/accounts/workspaces/${acme}/postiz`,'PUT',{url:'https://x.test',key:'k12345678'})).status,403);
  // Designs made in Acme are invisible in Main.
  const d=await (await B.call('/designs','POST',{template_id:3,platform:'instagram-post'})).json();
  assert.equal((await (await B.call('/designs')).json()).total,1);
  assert.equal((await (await admin.call('/designs')).json()).total,0);
  assert.equal((await admin.call('/designs/'+d.id)).status,404);
  // Eve (editor) prepares; only Bob approves; Eve cannot flip live mode.
  const batch=await (await E.call('/schedule/batches','POST',{title:'Acme week',items:[item()]})).json();const pid=batch.posts[0].id;
  assert.equal(batch.posts[0].created_by,'Eve');
  assert.equal((await E.call(`/schedule/posts/${pid}/approve`,'POST',{})).status,403);
  assert.equal((await E.call('/publish/settings','POST',{live:true})).status,403);
  assert.equal((await admin.call('/schedule/posts')).status,200);
  assert.equal((await (await admin.call('/schedule/posts')).json()).posts.length,0);
  assert.equal((await B.call(`/schedule/posts/${pid}/approve`,'POST',{})).status,200);
  // Switching live in Acme does not touch Main, and sends with Acme's own key.
  await B.call('/publish/settings','POST',{live:true,platforms:{x:true}});
  assert.equal((await (await admin.call('/publish/status')).json()).live,false);
  const ch=await (await B.call('/publish/channels')).json();assert.match(ch.channels[0].name,/acme-postiz\.test/);
  await t.api?.publisher;
 }finally{await t.close()}
});

test('agent keys belong to one workspace and are shown once',async()=>{
 const t=await setup();try{
  const admin=t.person();await admin.call('/accounts/setup','POST',{username:'admin',password:'correct horse battery'});
  const acme=(await (await admin.call('/accounts/workspaces','POST',{name:'Acme'})).json()).workspace.id;
  const k=await (await admin.call(`/accounts/workspaces/${acme}/tokens`,'POST',{name:'Hermes'})).json();assert.match(k.token,/^gsn_/);
  const made=await t.key('/schedule/batches','POST',{title:'x',items:[item()]},k.token);assert.equal(made.status,201);
  assert.equal((await (await admin.call('/schedule/posts')).json()).posts.length,0);
  assert.equal((await t.key('/schedule/posts','GET',undefined,k.token).then(r=>r.json())).posts.length,1);
  assert.equal((await t.key('/accounts/users','GET',undefined,k.token)).status,401);
  const list=await (await admin.call(`/accounts/workspaces`)).json();assert.ok(!JSON.stringify(list).includes(k.token));
  // The old shared agent key still reaches only the main workspace.
  assert.equal((await t.key('/schedule/posts','GET',undefined,'legacy-token-123').then(r=>r.json())).posts.length,0);
  assert.equal((await admin.call(`/accounts/workspaces/${acme}/tokens/${k.id}`,'DELETE')).status,200);
  assert.equal((await t.key('/schedule/posts','GET',undefined,k.token)).status,401);
 }finally{await t.close()}
});

test('Postiz keys are never returned by the API; sign-in is rate limited',async()=>{
 const t=await setup();try{
  const admin=t.person();await admin.call('/accounts/setup','POST',{username:'admin',password:'correct horse battery'});
  await admin.call('/accounts/workspaces/main/postiz','PUT',{url:'https://p.test/api/public/v1',key:'very-secret-key'});
  assert.ok(!(await (await admin.call('/accounts/workspaces')).text()).includes('very-secret-key'));
  const s=t.person();let last;for(let i=0;i<10;i++)last=(await s.call('/accounts/login','POST',{username:'admin',password:'nope nope nope'})).status;
  assert.equal(last,429);
 }finally{await t.close()}
});
