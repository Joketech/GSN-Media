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
  // Groups and reshape values persist, and invalid ones are rejected.
  const cur=await (await call('/designs/'+d.id)).json();
  const shaped={...cur,pages:cur.pages.map((p,i)=>i===0?{...p,groups:[['title','body']],artStretchX:150,elementStretchX:[120],elementRotations:[30],elementRadius:[50],elementOpacity:[80],elementFlip:[1]}:p)};
  assert.equal((await call('/designs/'+d.id,'PUT',shaped,browser)).status,200);
  const kept=await (await call('/designs/'+d.id)).json();assert.deepEqual(kept.pages[0].groups,[['title','body']]);assert.equal(kept.pages[0].artStretchX,150);assert.deepEqual(kept.pages[0].elementRotations,[30]);
  const badGroup={...kept,pages:kept.pages.map((p,i)=>i===0?{...p,groups:[['<script>','body']]}:p)};
  assert.equal((await call('/designs/'+d.id,'PUT',badGroup,browser)).status,400);
  const bad=await call('/designs','POST',{template_id:0,platform:'not-a-size'},browser);assert.equal(bad.status,400);
  const badColor=await call('/designs','POST',{template_id:0,platform:'x-post',pages:[{title:'A',accent:'red'},{title:'B'}]},browser);assert.equal(badColor.status,400);
  const hugeImage=await call('/designs','POST',{template_id:0,platform:'x-post',pages:[{title:'A',image:'data:image/png;base64,'+'A'.repeat(1_500_000)},{title:'B'}]},browser);assert.equal(hugeImage.status,400);

  const list=await (await call('/designs')).json();assert.equal(list.designs.length,1);assert.equal(list.designs[0].pages,d.pages.length);
  assert.equal((await call('/designs/'+d.id,'DELETE',undefined,browser)).status,200);
  assert.equal((await call('/designs/'+d.id)).status,404);
 }finally{await s.close()}
});

test('agents pick a template and send only wording; the design stays',async()=>{
 const s=await serve({});
 try{
  const agent={Authorization:'Bearer agent-test-token','Content-Type':'application/json'};
  const call=(route,method='GET',data)=>fetch(s.base+route,{method,headers:agent,body:data===undefined?undefined:JSON.stringify(data)});
  const all=await (await call('/templates')).json();
  assert.equal(all.templates.length,601);
  assert.ok(all.templates.every(t=>t.pages>=5&&t.pages<=10&&t.layouts[0]==='hook'&&t.layouts.at(-1)==='cta'));
  const roomy=await (await call('/templates?pages=9')).json();
  assert.ok(roomy.templates.length>0&&roomy.templates.every(t=>t.pages>=9));
  const layouts=await (await call('/layouts')).json();assert.ok(layouts.layouts.steps);
  const t=roomy.templates[0];
  const copy=[{title:'Hook line',body:'Support line'},...Array.from({length:7},(_,i)=>({title:'Point '+(i+1),body:'Words '+(i+1)})),{title:'Act now',body:'Do it'}];
  const made=await call('/designs','POST',{template_id:t.id,platform:'instagram-post',copy});
  assert.equal(made.status,201);
  const d=await made.json();
  assert.equal(d.pages.length,9);assert.equal(d.pages[0].deckLayout,'hook');assert.equal(d.pages[8].deckLayout,'cta');
  assert.equal(d.pages[0].title,'Hook line');assert.equal(d.pages[4].title,'Point 4');
  // Fewer wordings than the template holds: surplus designed pages are dropped, never left blank.
  const short=await (await call('/designs','POST',{template_id:t.id,platform:'instagram-post',copy:[{title:'A'},{title:'B',body:'x'},{title:'C'}]})).json();
  assert.equal(short.pages.length,3);
  assert.equal((await call('/designs','POST',{template_id:t.id,platform:'instagram-post',copy:[{title:'only one'}]})).status,400);
 }finally{await s.close()}
});

test('the access-key gate can be restored for public servers',async()=>{
 const s=await serve({openUi:false});
 try{
  assert.equal((await fetch(s.base+'/designs',{headers:{'Sec-Fetch-Site':'same-origin'}})).status,401);
  assert.equal((await fetch(s.base+'/designs',{headers:{Authorization:'Bearer agent-test-token'}})).status,200);
 }finally{await s.close()}
});

test('the 12 photo layouts have starter pages and named picture slots',async()=>{
 const {templateCatalog,starterSlides}=await import('../template-engine.mjs');
 const all=templateCatalog();const layouts=all.filter(t=>t.id>=400&&t.id<412);
 assert.equal(layouts.length,12);assert.equal(all.length,601);
 for(const t of layouts){
  assert.ok(t.slots?.length>=1&&t.slots.every(x=>/^[a-z][a-z0-9]*$/.test(x.key)&&x.label),`${t.name} lists its slots`);
  assert.ok([5,7,10].includes(t.pages),`${t.name} has ${t.pages} pages`);
  assert.equal(t.layouts[0],'hook');assert.equal(t.layouts.at(-1),'cta');
  const pages=starterSlides(t.id);assert.equal(pages.length,t.pages);
  for(const p of pages){assert.match(p.accent,/^#[0-9a-f]{6}$/i);assert.ok(p.title&&p.title.length<=80,`${t.name}: ${p.deckLayout} title`)}
 }
});

test('a design stores, validates and rejects picture slots',async()=>{
 const s=await serve();
 try{
  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const call=(path,method,body)=>fetch(s.base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer agent-test-token'},body:body&&JSON.stringify(body)});
  const ok=await call('/designs','POST',{template_id:400,platform:'instagram-post',title:'Slots',pages:[{title:'A',slots:{main:{src:PNG,x:20,y:-10,z:150},screen1:{image:PNG}}},{title:'B'}]});
  assert.equal(ok.status,201);const d=await ok.json();
  assert.equal(d.pages[0].slots.main.z,150);assert.equal(d.pages[0].slots.screen1.src,PNG);
  for(const bad of [{Main:{src:PNG}},{main:{z:50}},{main:{x:500}},{main:{src:'data:text/html;base64,AAAA'}}])
   assert.equal((await call('/designs','POST',{template_id:400,platform:'instagram-post',title:'x',pages:[{title:'A',slots:bad},{title:'B'}]})).status,400);
 }finally{await s.close()}
});

test('January to December templates exist with their month names and slots',async()=>{
 const {templateCatalog,starterSlides}=await import('../template-engine.mjs');
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const all=templateCatalog();
 months.forEach((m,i)=>{const t=all[412+i];assert.equal(t.name,m);assert.ok(t.slots.some(x=>x.key==='main'));assert.equal(starterSlides(t.id)[0].deckLayout,'hook')});
});

test('100 comic templates have unique hooks, a main picture and a mascot slot',async()=>{
 const {templateCatalog,starterSlides}=await import('../template-engine.mjs');
 const c=templateCatalog().filter(t=>t.id>=424&&t.id<524);
 assert.equal(c.length,100);
 assert.equal(new Set(c.map(t=>starterSlides(t.id)[0].title)).size,100);
 for(const t of c){assert.equal(t.slots.map(x=>x.key).join(),'main,sticker');const p=starterSlides(t.id);assert.equal(p[0].deckLayout,'hook');assert.equal(p.at(-1).deckLayout,'cta')}
});

test('the two text-behind-person templates are at the end and have named slots',async()=>{
 const {templateCatalog,starterSlides}=await import('../template-engine.mjs');
 const all=templateCatalog();const mine=all.filter(t=>t.name==='Text behind person'||t.name==='Split word');
 assert.deepEqual(mine.map(t=>t.id),[599,600]);
 for(const t of mine){assert.ok(t.slots.some(x=>x.key==='main')&&t.slots.some(x=>x.key==='product'));assert.ok(starterSlides(t.id).length>=1)}
});
