import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';

const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64').toString('base64');
async function setup(env={}){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const calls=[];let clock=Date.parse('2026-11-10T08:00:00Z');
 const fake=async(url,opts={})=>{
  const u=new URL(url);calls.push({path:u.pathname,method:opts.method||'GET',auth:opts.headers?.Authorization,body:typeof opts.body==='string'?JSON.parse(opts.body):opts.body});
  const reply=(code,data)=>new Response(JSON.stringify(data),{status:code,headers:{'content-type':'application/json'}});
  if(u.pathname.endsWith('/integrations'))return reply(200,[{id:'ch-ig',name:'GSN IG',identifier:'instagram'},{id:'ch-x',name:'GSN X',identifier:'x'},{id:'ch-yt',name:'GSN YT',identifier:'youtube'}]);
  if(u.pathname.endsWith('/upload'))return reply(200,{id:'up-1',path:'https://cdn.example/1.png'});
  if(u.pathname.endsWith('/posts'))return reply(200,[{postId:'p1',integration:'ch-x'}]);
  return reply(404,{});
 };
 const api=createV1({dataDir:dir,token:'agent-test-token',fetchImpl:fake,clock:()=>clock,publishEnv:{POSTIZ_API_URL:'https://postiz.test/api/public/v1',POSTIZ_API_KEY:'secret-key',...env}});
 const server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const agent={Authorization:'Bearer agent-test-token','Content-Type':'application/json'},owner={'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'};
 const call=(r,m='GET',d,h=agent)=>fetch(base+r,{method:m,headers:h,body:d===undefined?undefined:JSON.stringify(d)});
 return {call,agent,owner,calls,api,advance:ms=>{clock+=ms},close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}
const item=(o={})=>({channel_id:'ch-x',identifier:'x',platform:'x',caption:'Three habits for a calmer week',hashtags:['calm','#habits'],scheduled_at:'2026-11-10T09:00:00Z',...o});

test('agents draft a batch; only the owner approves; nothing is live until switched on',async()=>{
 const t=await setup();
 try{
  const made=await t.call('/schedule/batches','POST',{title:'Week 1',items:[item(),item({channel_id:'ch-yt',identifier:'youtube',platform:'youtube',scheduled_at:'2026-11-12T09:00:00Z'})]});
  assert.equal(made.status,201);const {batch,posts}=await made.json();assert.equal(posts.length,2);assert.ok(posts.every(p=>p.status==='review'));
  assert.deepEqual(posts[0].hashtags,['#calm','#habits']);
  // The agent cannot approve, change settings, or post now.
  assert.equal((await t.call(`/schedule/posts/${posts[0].id}/approve`,'POST',{})).status,403);
  assert.equal((await t.call('/publish/settings','POST',{live:true})).status,403);
  // YouTube cannot be approved without a video.
  const yt=await t.call(`/schedule/posts/${posts[1].id}/approve`,'POST',{},t.owner);assert.equal(yt.status,400);
  // The agent can attach pictures; the owner approves the batch.
  const media=await t.call(`/schedule/posts/${posts[0].id}/media`,'POST',{files:[{base64:PNG}]});assert.equal(media.status,200);
  const ap=await (await t.call(`/schedule/batches/${batch.id}/approve`,'POST',{},t.owner)).json();
  assert.deepEqual(ap.approved,[posts[0].id]);assert.equal(ap.blocked.length,1);
  // An agent edit to an approved post is refused.
  assert.equal((await t.call(`/schedule/posts/${posts[0].id}`,'PATCH',{caption:'changed'})).status,409);
  // Dry run by default: due posts are simulated and Postiz receives no post.
  t.advance(2*3600000);await t.api.publisher.tick();
  const after=await (await t.call(`/schedule/posts/${posts[0].id}`)).json();assert.equal(after.status,'simulated');
  assert.ok(!t.calls.some(c=>c.path.endsWith('/posts')));
 }finally{await t.close()}
});

test('live mode sends approved posts through Postiz, one platform at a time',async()=>{
 const t=await setup();
 try{
  const {posts}=await (await t.call('/schedule/batches','POST',{title:'Live',items:[item(),item({scheduled_at:'2026-11-10T09:30:00Z'})]})).json();
  for(const p of posts){await t.call(`/schedule/posts/${p.id}/media`,'POST',{files:[{base64:PNG}]});assert.equal((await t.call(`/schedule/posts/${p.id}/approve`,'POST',{},t.owner)).status,200)}
  await t.call('/publish/settings','POST',{live:true,platforms:{instagram:true}},t.owner);
  t.advance(3600000);await t.api.publisher.tick();
  assert.equal((await (await t.call(`/schedule/posts/${posts[0].id}`)).json()).status,'simulated','x is not switched on yet');
  const p2=(await (await t.call('/schedule/batches','POST',{title:'Live 2',items:[item({scheduled_at:'2026-11-10T10:00:00Z'})]})).json()).posts[0];
  await t.call(`/schedule/posts/${p2.id}/media`,'POST',{files:[{base64:PNG}]});await t.call(`/schedule/posts/${p2.id}/approve`,'POST',{},t.owner);
  await t.call('/publish/settings','POST',{platforms:{x:true}},t.owner);
  t.advance(3600000);await t.api.publisher.tick();
  assert.equal((await (await t.call(`/schedule/posts/${p2.id}`)).json()).status,'posted');
  const send=t.calls.find(c=>c.path.endsWith('/posts'));
  assert.equal(send.auth,'secret-key');assert.equal(send.body.type,'now');assert.equal(send.body.posts[0].integration.id,'ch-x');
  assert.equal(send.body.posts[0].settings.__type,'x');assert.match(send.body.posts[0].value[0].content,/#calm #habits/);
  assert.equal(send.body.posts[0].value[0].image[0].id,'up-1');
  // Pausing stops everything.
  const p3=(await (await t.call('/schedule/batches','POST',{title:'Paused',items:[item({scheduled_at:'2026-11-10T11:30:00Z'})]})).json()).posts[0];
  await t.call(`/schedule/posts/${p3.id}/media`,'POST',{files:[{base64:PNG}]});await t.call(`/schedule/posts/${p3.id}/approve`,'POST',{},t.owner);
  await t.call('/publish/settings','POST',{paused:true},t.owner);t.advance(3600000);await t.api.publisher.tick();
  assert.equal((await (await t.call(`/schedule/posts/${p3.id}`)).json()).status,'approved');
 }finally{await t.close()}
});

test('validation: dates, length, ownership and the test draft',async()=>{
 const t=await setup();
 try{
  assert.equal((await t.call('/schedule/batches','POST',{items:[item({scheduled_at:'2027-03-01T09:00:00Z'})]})).status,400);
  assert.equal((await t.call('/schedule/batches','POST',{items:[item({scheduled_at:'2026-01-01T09:00:00Z'})]})).status,400);
  const long=await (await t.call('/schedule/batches','POST',{items:[item({caption:'x'.repeat(300)})]})).json();
  assert.ok(long.posts[0].problems.some(p=>/280/.test(p)));
  assert.equal((await t.call(`/schedule/posts/${long.posts[0].id}/approve`,'POST',{},t.owner)).status,400);
  const ch=await (await t.call('/publish/channels')).json();assert.equal(ch.channels.length,3);assert.equal(ch.channels[0].platform,'instagram');
  const ok=await (await t.call('/publish/test','POST',{},t.owner)).json();assert.equal(ok.ok,true);
  await t.call('/publish/test','POST',{channel_id:'ch-x'},t.owner);
  const draft=t.calls.filter(c=>c.path.endsWith('/posts')).at(-1);assert.equal(draft.body.type,'draft');
 }finally{await t.close()}
});
