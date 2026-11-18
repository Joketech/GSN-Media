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

test('invitations can carry a scannable QR code, kept out of the template code',()=>{
 for(const tpl of ['inv-classic','inv-arch','inv-photo'])for(const size of ['print-invite','print-a5','instagram-post','instagram-story']){
  const out=generate({template:tpl,size,fields:{names:'Ada & Tunde',rsvp:'RSVP 0803',qr:'https://example.com/rsvp',qrlabel:'Scan to RSVP'}});
  const d=sanitizeDesign(out.design,{templateCount:count});
  const q=d.pages[0].shapes.filter(s=>/^data:image\/png/.test(s.src||''));
  assert.equal(q.length,1,tpl+size);assert.ok(d.pages[0].texts.some(t=>t.text==='Scan to RSVP'));
  assert.ok(out.code.length<600);assert.equal(decode(out.code).fields.qr,'https://example.com/rsvp');
 }
 const none=generate({template:'inv-classic',fields:{names:'A'}});
 assert.equal(none.design.pages[0].shapes.filter(s=>s.src).length,0);
 assert.throws(()=>generate({template:'inv-classic',fields:{names:'A',qr:'x'.repeat(161)}}),MagicError);
});

test('QR code can be placed exactly where the person wants it',()=>{
 const base={names:'Ada & Tunde',rsvp:'RSVP 0803',qr:'https://example.com/rsvp'};
 const out=generate({template:'inv-arch',fields:{...base,qrsize:'20',qrx:'85',qry:'10'}});
 const d=sanitizeDesign(out.design,{templateCount:count});
 const q=d.pages[0].shapes.find(s=>/^data:image\/png/.test(s.src||''));
 assert.ok(Math.abs(q.x+q.w/2-85)<1.5);assert.ok(Math.abs(q.w-20)<1.5);assert.ok(q.y<12);
 assert.equal(decode(out.code).fields.qrx,'85');
 const wild=generate({template:'inv-arch',fields:{...base,qrsize:'999',qrx:'-5',qry:'abc'}});
 sanitizeDesign(wild.design,{templateCount:count});
});

test('invitations can be front and back',()=>{
 for(const tpl of ['inv-classic','inv-arch','inv-photo'])for(const size of ['print-invite','print-a5','instagram-post']){
  const out=generate({template:tpl,size,fields:{names:'Ada & Tunde',date:'Sat 20 June',venue:'Grand Hall',rsvp:'RSVP 0803',qr:'https://example.com/rsvp',sides:'two'}});
  const d=sanitizeDesign(out.design,{templateCount:count});
  assert.equal(d.pages.length,2,tpl);
  assert.ok(d.pages[0].texts.some(t=>t.text==='Ada & Tunde'));
  assert.ok(d.pages[1].shapes.some(s=>/^data:image\/png/.test(s.src||'')),'QR on the back');
  assert.ok(!d.pages[0].shapes.some(s=>/^data:image\/png/.test(s.src||'')));
 }
 assert.equal(generate({template:'inv-classic',fields:{names:'A',sides:'one'}}).design.pages.length,1);
 assert.throws(()=>generate({template:'inv-classic',fields:{names:'A',sides:'three'}}),MagicError);
});
