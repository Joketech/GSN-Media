import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {createDocument,changeLayer,applyCampaignPlan,validateDocument,layerBox} from './layer-model.mjs';
import {createCampaignQueue} from './ugc-jobs.mjs';

const rows=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8'));
const image='data:image/png;base64,AAAA';
const images={person:image,product:image,packaging:image,background:'layered-assets/000-background.png'};
const starter=()=>createDocument(rows[0],images);

test('prepared campaign registry has real assets, unique IDs and valid independent layouts',async()=>{
  const registry=JSON.parse(await readFile(new URL('layer-assets.json',import.meta.url),'utf8'));
  const seen=new Set();
  for(const asset of registry.campaigns){
    assert.ok(!seen.has(asset.id),'Duplicate prepared campaign');seen.add(asset.id);
    assert.ok(rows.some(r=>r.id===asset.id));
    for(const path of [asset.kit,asset.background]){const bytes=await readFile(new URL(path,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');}
    assert.deepEqual(Object.keys(asset.regions).sort(),['packaging','person','product']);
    for(const region of Object.values(asset.regions))assert.ok(region.length===4&&region.every(Number.isFinite)&&region[2]>0&&region[3]>0);
    const doc=createDocument(rows.find(r=>r.id===asset.id),images,asset.layout||{});
    for(const role of ['person','product','packaging','background'])assert.equal(doc.layers.filter(l=>l.role===role).length,1);
  }
});

test('per-campaign layout changes do not modify the other campaigns or bake text into images',()=>{
  const original=starter(),custom=createDocument(rows[1],images,{person:{x:2,width:50},hook:{font:'Georgia',fontSize:6}});
  assert.equal(custom.layers.find(l=>l.id==='person').x,2);
  assert.equal(custom.layers.find(l=>l.id==='hook').text,rows[1].hook);
  assert.deepEqual(starter(),original);
  assert.throws(()=>createDocument(rows[1],images,{missing:{x:1}}));
});
test('replacing a person changes only its source; product, package and copy stay intact',()=>{
  const before=starter(),source='data:image/png;base64,AQID',after=changeLayer(before,'person',{src:source});
  assert.equal(after.layers.find(l=>l.id==='person').src,source);
  for(const l of before.layers.filter(l=>l.id!=='person'))assert.deepEqual(after.layers.find(x=>x.id===l.id),l);
  assert.equal(before.layers.find(l=>l.id==='person').src,image);
});
test('product replacement and package recolouring preserve person, label text and background',()=>{
  const before=starter();let after=changeLayer(before,'product',{src:'data:image/webp;base64,AQID'});
  after=changeLayer(after,'packaging',{tint:'#bb2244',tintStrength:.8});
  for(const id of ['person','background','package-brand','package-name'])assert.deepEqual(after.layers.find(l=>l.id===id),before.layers.find(l=>l.id===id));
});
test('package labels follow package move, resize and rotation without rewriting their content',()=>{
  const before=starter(),label=before.layers.find(l=>l.id==='package-brand'),box=layerBox(before,label);
  const packageLayer=before.layers.find(l=>l.id==='packaging');const after=changeLayer(before,'packaging',{x:68,y:64,width:packageLayer.width*2,height:packageLayer.height*2});const moved=layerBox(after,label);
  assert.equal(moved.width,box.width*2);assert.equal(moved.height,box.height*2);
  assert.ok(moved.x>box.x&&moved.y>box.y);assert.deepEqual(after.layers.find(l=>l.id===label.id),label);
  const rotated=changeLayer(after,'packaging',{rotation:25});assert.equal(layerBox(rotated,label).rotation,25);
});
test('agent plans validate atomically and cannot edit unknown, locked or mismatched layers',()=>{
  const before=starter(),saved=JSON.stringify(before);
  assert.throws(()=>applyCampaignPlan(before,{version:1,templateId:0,changes:[{layerId:'hook',values:{text:'New campaign'}},{layerId:'missing',values:{text:'Bad'}}]}),/Unknown layer/);
  assert.equal(JSON.stringify(before),saved);
  const locked=changeLayer(before,'person',{locked:true});
  assert.throws(()=>changeLayer(locked,'person',{src:'data:image/png;base64,AQID'}),/Unlock/);
  assert.throws(()=>applyCampaignPlan(before,{version:1,templateId:8,changes:[]}),/does not match/);
});
test('invalid geometry and executable or remote image URLs are rejected',()=>{
  for(const values of [{width:0},{height:NaN},{opacity:2},{src:'javascript:alert(1)'},{src:'https://example.com/image.png'},{src:'../secret.png'}])assert.throws(()=>changeLayer(starter(),'product',values));
  const broken=starter();broken.layers.push({...broken.layers[0]});assert.throws(()=>validateDocument(broken),/repeated/);
});
test('all three approved campaigns have independently addressable image and text layers',()=>{
  for(const id of [0,8,10]){const d=createDocument(rows[id],images);assert.equal(d.layers.filter(l=>l.kind==='image').length,4);for(const role of ['person','product','packaging','background'])assert.equal(d.layers.find(l=>l.id===role).role,role);assert.equal(d.layers.find(l=>l.id==='hook').text,rows[id].hook)}
});
async function queueFixture(t){const directory=await mkdtemp(join(process.cwd(),'.gsn-test-ugc-queue-'));assert.ok(resolve(directory).startsWith(resolve(process.cwd())+sep));t.after(()=>rm(directory,{recursive:true,force:true}));let now=1000;return {queue:createCampaignQueue({directory,token:'test-agent-token',clock:()=>now}),advance:()=>{now+=16*60*1000}}}
test('Hermes queue requires authentication, claims once, and stores a validated plan',async t=>{
  const {queue}=await queueFixture(t),job=await queue.enqueue({templateId:0,brief:'Change the hook only.',document:starter()});
  await assert.rejects(queue.claim(undefined),/authentication/);
  const [one,two]=await Promise.all([queue.claim('Bearer test-agent-token',{agent:'Mira'}),queue.claim('Bearer test-agent-token',{agent:'Mira'})]);
  assert.equal(one.id,job.id);assert.equal(two,null);assert.equal(one.roles.orchestrator,'Mira');
  const plan={version:1,templateId:0,changes:[{layerId:'hook',values:{text:'One clear new hook'}}]};
  await queue.complete('Bearer test-agent-token',job.id,{leaseKey:one.leaseKey,plan});
  const ready=await queue.status(job.id);assert.equal(ready.state,'complete');assert.deepEqual(ready.plan,plan);assert.ok(!ready.document&&!ready.leaseKey);
});
test('expired worker leases cannot overwrite a newly claimed campaign',async t=>{
  const {queue,advance}=await queueFixture(t),job=await queue.enqueue({templateId:0,brief:'Edit the CTA.',document:starter()}),first=await queue.claim('Bearer test-agent-token');
  advance();const second=await queue.claim('Bearer test-agent-token');assert.notEqual(first.leaseKey,second.leaseKey);
  await assert.rejects(queue.complete('Bearer test-agent-token',job.id,{leaseKey:first.leaseKey,plan:{version:1,templateId:0,changes:[]}}),/lease/);
});

