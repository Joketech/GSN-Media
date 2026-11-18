import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {generate,encode,decode,catalog,sizesFor,MagicError} from '../magic-stick.mjs';
import {sanitizeDesign} from '../designs-api.mjs';
import {templateCatalog} from '../template-engine.mjs';
import {createV1} from '../v1-api.mjs';

const count=templateCatalog().length;
const examples=kind=>Object.fromEntries(kind.fields.filter(f=>f.type!=='image'&&f.example).map(f=>[f.id,f.example]));

test('every in-house template generates a valid design at every allowed size',()=>{
 const cat=catalog();assert.ok(cat.templates.length>=14);
 for(const t of cat.templates){const kind=cat.kinds.find(k=>k.id===t.kind);
  for(const size of sizesFor(t)){
   const out=generate({template:t.id,size,fields:examples(kind)});
   const d=sanitizeDesign(out.design,{templateCount:count});
   assert.ok(d.pages.length>=1,t.id);
   for(const p of d.pages)for(const x of p.texts)assert.ok(x.text.length);
  }}
});

test('template code regenerates the same design from the same words',()=>{
 const cat=catalog(),t=cat.templates[0],kind=cat.kinds.find(k=>k.id===t.kind),fields=examples(kind);
 const a=generate({template:t.id,fields});
 assert.match(a.code,/^MS1\./);
 const dec=decode(a.code);
 const b=generate({...dec,fields});
 assert.deepEqual(b.design,a.design);
 assert.equal(encode(dec),a.code);
});

test('bad input is rejected with a MagicError',()=>{
 assert.throws(()=>generate({template:'nope',fields:{}}),MagicError);
 assert.throws(()=>decode('garbage'),MagicError);
});

test('long programs paginate instead of overflowing',()=>{
 const items=Array.from({length:40},(_,i)=>`${9+i%12}:00 am | Item ${i+1} | Person`).join('\n');
 const out=generate({template:'prog-clean',fields:{title:'Big Event',items}});
 assert.ok(out.design.pages.length>1);
 sanitizeDesign(out.design,{templateCount:count});
});

test('magic API routes work',async()=>{
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));const token='tok-magic-123';
 const api=createV1({dataDir:dir,token});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const h={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 try{
  assert.equal((await fetch(base+'/magic/catalog')).status,401);
  const cat=await (await fetch(base+'/magic/catalog',{headers:h})).json();assert.ok(cat.templates.length);
  const g=await fetch(base+'/magic/generate',{method:'POST',headers:h,body:JSON.stringify({template:cat.templates[0].id,fields:{title:'Hello'}})});
  assert.equal(g.status,200);const j=await g.json();assert.ok(j.code&&j.design.pages.length);
  const d=await fetch(base+'/magic/decode',{method:'POST',headers:h,body:JSON.stringify({code:j.code})});assert.equal(d.status,200);
  assert.equal((await fetch(base+'/magic/generate',{method:'POST',headers:h,body:JSON.stringify({template:'nope'})})).status,400);
 }finally{server.close();await rm(dir,{recursive:true,force:true})}
});
