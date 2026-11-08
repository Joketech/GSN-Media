import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';

async function setup(){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const api=createV1({dataDir:dir,token:'agent-token-abc',fetchImpl:async()=>new Response('{}',{status:404}),publishEnv:{}});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const human=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:d===undefined?undefined:JSON.stringify(d)});
 const agent=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer agent-token-abc'},body:d===undefined?undefined:JSON.stringify(d)});
 return {human,agent,base,close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('uploads stay until the creator deletes them',async()=>{
 const t=await setup();try{
  assert.equal((await (await t.human('/uploads')).json()).total,0);
  assert.equal((await t.human('/uploads','POST',{image:'data:text/html;base64,AAAA'})).status,400);
  assert.equal((await t.agent('/uploads','POST',{image:PNG})).status,403,'agents cannot add to a creator library');
  const a=await (await t.human('/uploads','POST',{image:PNG})).json();assert.ok(a.id);
  const again=await (await t.human('/uploads','POST',{image:PNG})).json();assert.equal(again.id,a.id,'the same picture is kept once');
  const list=await (await t.human('/uploads')).json();assert.equal(list.total,1);
  const img=await t.human(a.url.replace('/api/v1',''));assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/png');
  assert.equal((await t.agent('/uploads/'+a.id,'DELETE')).status,403);
  assert.equal((await t.human('/uploads/'+a.id,'DELETE')).status,200);
  assert.equal((await (await t.human('/uploads')).json()).total,0);
  assert.equal((await t.human(a.url.replace('/api/v1',''))).status,404);
 }finally{await t.close()}
});

test('saved brand colours start every new design, for people and agents',async()=>{
 const t=await setup();try{
  assert.equal((await t.human('/config','PUT',{background:'red'})).status,400);
  assert.equal((await t.human('/config','PUT',{palette:['#12345']})).status,400);
  const before=await (await t.agent('/designs','POST',{template_id:3,platform:'instagram-post',title:'Before'})).json();
  assert.notEqual(before.pages[0].accent,'#1e6bff','defaults are not forced onto designs');
  const c=await (await t.human('/config','PUT',{accent:'#1E6BFF',background:'#101010',ink:'#ffffff',palette:['#1e6bff','#101010','#1E6BFF']})).json();
  assert.deepEqual(c.palette,['#1e6bff','#101010']);assert.equal(c.background,'#101010');
  for(const who of [t.human,t.agent]){
   const d=await (await who('/designs','POST',{template_id:3,platform:'instagram-post',title:'Branded'})).json();
   assert.ok(d.pages.length>1);
   for(const pg of d.pages){assert.equal(pg.accent,'#1e6bff');assert.equal(pg.background,'#101010');assert.equal(pg.ink,'#ffffff')}
  }
  const own=await (await t.human('/designs','POST',{template_id:3,platform:'instagram-post',title:'Own',pages:[{title:'x',accent:'#ff0000'}]})).json();
  assert.equal(own.pages[0].accent,'#ff0000','a colour set on the page wins');assert.equal(own.pages[0].background,'#101010');
  await t.human('/config','PUT',{background:'',ink:''});
  const cleared=await (await t.human('/designs','POST',{template_id:3,platform:'instagram-post',title:'Cleared'})).json();
  assert.equal(cleared.pages[0].background,undefined,'empty means use the template colour');assert.equal(cleared.pages[0].accent,'#1e6bff');
 }finally{await t.close()}
});
