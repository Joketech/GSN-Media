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
 return {human,agent,close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}

test('brand configuration: defaults, validation, manager-only writes, and new designs start from it',async()=>{
 const t=await setup();try{
  const d=await (await t.agent('/config')).json();assert.equal(d.is_default,true);assert.equal(d.brand_name,'GSN Technology');assert.ok(d.voice.length>5);
  const bad=await t.human('/config','PUT',{brand_name:''});assert.equal(bad.status,400);
  assert.equal((await t.human('/config','PUT',{accent:'red'})).status,400);
  assert.equal((await t.agent('/config','PUT',{brand_name:'Hacked'})).status,403,'agents can read but not change the brand');
  const ok=await t.human('/config','PUT',{brand_name:'Acme Studio',handle:'@acme',voice:'Warm, short sentences. No jargon.',accent:'#1E6BFF'});assert.equal(ok.status,200);
  const saved=await ok.json();assert.equal(saved.brand_name,'Acme Studio');assert.equal(saved.accent,'#1e6bff');assert.equal(saved.is_default,false);
  const read=await (await t.agent('/config')).json();assert.equal(read.voice,'Warm, short sentences. No jargon.');assert.equal(read.handle,'@acme');
  const part=await (await t.human('/config','PUT',{handle:'@acme_co'})).json();assert.equal(part.brand_name,'Acme Studio','a partial update keeps the rest');
  const design=await (await t.human('/designs','POST',{template_id:3,platform:'instagram-post',title:'T'})).json();
  assert.deepEqual(design.brand,{name:'Acme Studio',handle:'@acme_co'},'a new design starts from the configured brand');
  const explicit=await (await t.human('/designs','POST',{template_id:3,platform:'instagram-post',title:'T2',brand:{name:'Other',handle:'@other'}})).json();assert.equal(explicit.brand.name,'Other','an explicit brand still wins');
 }finally{await t.close()}
});
