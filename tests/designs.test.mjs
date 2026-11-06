import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';
import {PRESETS,PLATFORM_GROUPS} from '../platforms.mjs';
import {starterSlides} from '../template-engine.mjs';

async function serve(options){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const api=createV1({dataDir:dir,token:'agent-test-token',fetchImpl:async()=>{throw Error('offline')},...options});
 const server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 return {base:`http://127.0.0.1:${port}/api/v1`,host:`127.0.0.1:${port}`,close:async()=>{server.close();await rm(dir,{recursive:true,force:true})}};
}

test('platform presets cover every requested platform with correct ratios',()=>{
 const ids=PLATFORM_GROUPS.map(g=>g.id);
 for(const id of ['instagram','tiktok','linkedin','x','youtube','facebook','trending'])assert.ok(ids.includes(id),id);
 for(const g of PLATFORM_GROUPS)assert.ok(PRESETS.find(p=>p.id===g.defaultPreset&&p.platform===g.id),`${g.id} default preset`);
 const story=PRESETS.find(p=>p.id==='instagram-story');assert.equal(story.ratio,'9 / 16');assert.equal(story.w,1080);assert.equal(story.h,1920);
});

test('every template starts with a Hook and ends with a call to action',()=>{
 for(const id of [0,1,57,250,399]){const pages=starterSlides(id);assert.ok(pages.length>=3,`template ${id}`);assert.equal(pages[0].deckLayout,'hook');assert.equal(pages.at(-1).deckLayout,'cta')}
});

test('designs are stored on the server, versioned, and protected from silent overwrites',async()=>{
 const s=await serve({});
 try{
  const agent={Authorization:'Bearer agent-test-token','Content-Type':'application/json'};
  const browser={'Sec-Fetch-Site':'same-origin','Content-Type':'application/json'};
  const call=(route,method='GET',data,headers=agent)=>fetch(s.base+route,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});

  assert.equal((await fetch(s.base+'/designs',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,401,'cross-site browsers are refused');
  assert.equal((await fetch(s.base+'/designs')).status,401,'anonymous requests are refused');
  assert.equal((await call('/designs','GET',undefined,browser)).status,200,'the studio page itself needs no key');

  const platforms=await (await call('/platforms')).json();assert.ok(platforms.presets.length>=13);
  const created=await call('/designs','POST',{template_id:0,platform:'tiktok',title:'Launch pack'},browser);
  assert.equal(created.status,201);const d=await created.json();
  assert.equal(d.revision,1);assert.equal(d.ratio,'9 / 16');assert.deepEqual(d.size,{w:1080,h:1920});
  assert.equal(d.pages[0].deckLayout,'hook');assert.equal(d.pages.at(-1).deckLayout,'cta');

  // An agent edits a page; the human's stale copy is then refused instead of being overwritten.
  const edited={...d,pages:d.pages.map((p,i)=>i===1?{...p,body:'Written by an agent.'}:p)};
  const agentSave=await call('/designs/'+d.id,'PUT',edited);assert.equal(agentSave.status,200);
  const saved=await agentSave.json();assert.equal(saved.revision,2);assert.equal(saved.updated_by,'agent');
  const stale=await call('/designs/'+d.id,'PUT',{...d,title:'My edit'},browser);assert.equal(stale.status,409);
  const fresh=await (await call('/designs/'+d.id)).json();assert.equal(fresh.pages[1].body,'Written by an agent.');
  const mine=await call('/designs/'+d.id,'PUT',{...fresh,status:'review'},browser);assert.equal(mine.status,200);
  const reviewed=await mine.json();assert.equal(reviewed.status,'review');assert.equal(reviewed.updated_by,'owner');

  // Free text boxes, uploaded-size limits and validation.
  const withText={...reviewed,pages:reviewed.pages.map((p,i)=>i===0?{...p,texts:[{text:'Hello',left:10,top:20,size:8,bold:true}]}:p)};
  assert.equal((await call('/designs/'+d.id,'PUT',withText,browser)).status,200);
  const bad=await call('/designs','POST',{template_id:0,platform:'not-a-size'},browser);assert.equal(bad.status,400);
  const badColor=await call('/designs','POST',{template_id:0,platform:'x-post',pages:[{title:'A',accent:'red'},{title:'B'}]},browser);assert.equal(badColor.status,400);
  const hugeImage=await call('/designs','POST',{template_id:0,platform:'x-post',pages:[{title:'A',image:'data:image/png;base64,'+'A'.repeat(1_500_000)},{title:'B'}]},browser);assert.equal(hugeImage.status,400);

  const list=await (await call('/designs')).json();assert.equal(list.designs.length,1);assert.equal(list.designs[0].pages,d.pages.length);
  assert.equal((await call('/designs/'+d.id,'DELETE',undefined,browser)).status,200);
  assert.equal((await call('/designs/'+d.id)).status,404);
 }finally{await s.close()}
});

test('the access-key gate can be restored for public servers',async()=>{
 const s=await serve({openUi:false});
 try{
  assert.equal((await fetch(s.base+'/designs',{headers:{'Sec-Fetch-Site':'same-origin'}})).status,401);
  assert.equal((await fetch(s.base+'/designs',{headers:{Authorization:'Bearer agent-test-token'}})).status,200);
 }finally{await s.close()}
});
