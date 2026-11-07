import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';

// A 1x1 PNG: enough to be a valid picture without making the test slow.
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==';
async function setup(){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const api=createV1({dataDir:dir,token:'agent-token-abc',fetchImpl:async()=>new Response('{}',{status:404}),publishEnv:{}});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const human=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:d===undefined?undefined:JSON.stringify(d)});
 const agent=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer agent-token-abc'},body:d===undefined?undefined:JSON.stringify(d)});
 return {human,agent,close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}
const person=(o={})=>({name:'Ada Obi',kind:'team',role:'Founder',consent:true,image:PNG,...o});

test('a person is only saved with consent, and the list never carries the picture itself',async()=>{
 const t=await setup();try{
  assert.equal((await t.human('/people','POST',person({consent:false}))).status,400);
  assert.equal((await t.human('/people','POST',person({consent:undefined}))).status,400);
  assert.equal((await t.human('/people','POST',person({name:''}))).status,400);
  assert.equal((await t.human('/people','POST',person({image:'data:text/html;base64,AAAA'}))).status,400);
  assert.equal((await t.human('/people','POST',person({kind:'release'}))).status,400,'a release needs a permission note');
  const ok=await t.human('/people','POST',person({kind:'release',permission_note:'Signed release, 2026-11-01'}));assert.equal(ok.status,201);
  const made=await ok.json();assert.equal(made.consent.confirmed,true);assert.equal(made.image,undefined);
  const list=await (await t.human('/people')).json();assert.equal(list.people.length,1);assert.equal(list.people[0].image,undefined);assert.match(list.people[0].image_url,/\/people\/.+\/image$/);
 }finally{await t.close()}
});

test('agents can list and use people but cannot add or remove them',async()=>{
 const t=await setup();try{
  const made=await (await t.human('/people','POST',person())).json();
  assert.equal((await t.agent('/people','POST',person())).status,403);
  assert.equal((await t.agent('/people')).status,200);
  const one=await (await t.agent('/people/'+made.id)).json();assert.equal(one.image,PNG);
  const img=await t.agent('/people/'+made.id+'/image');assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/png');
  assert.equal((await t.agent('/people/'+made.id,'DELETE')).status,403);
  assert.equal((await t.human('/people/'+made.id,'DELETE')).status,200);
  assert.equal((await t.human('/people/'+made.id)).status,404);
 }finally{await t.close()}
});

test('a design page can name a person and receives that picture',async()=>{
 const t=await setup();try{
  const made=await (await t.human('/people','POST',person())).json();
  const d=await t.agent('/designs','POST',{template_id:400,platform:'instagram-post',title:'With a person',person_id:made.id});
  assert.equal(d.status,201);const design=await d.json();
  assert.equal(design.pages[0].image,PNG);assert.equal(design.pages[0].person_id,undefined);
  const slot=await (await t.agent('/designs','POST',{template_id:400,platform:'instagram-post',title:'Slot person',pages:[{title:'A',slots:{screen2:{person_id:made.id}}},{title:'B'}]})).json();
  assert.equal(slot.pages[0].slots.screen2.src,PNG);
  const bad=await t.agent('/designs','POST',{template_id:400,platform:'instagram-post',title:'x',person_id:'00000000-0000-4000-8000-000000000000'});
  assert.equal(bad.status,404);
 }finally{await t.close()}
});
