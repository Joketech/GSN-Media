import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDocument} from './layer-model.mjs';
import {COMPOSITIONS,applyComposition} from './compositions.mjs';
const rows=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8'));
const assets=JSON.parse(await readFile(new URL('layer-assets.json',import.meta.url),'utf8')).campaigns;
const image='data:image/png;base64,AAAA';
test('product arrangements preserve source images, wording, package labels and accepted starters',()=>{
 const signatures=new Set();
 for(const composition of COMPOSITIONS){
  const asset=assets.find(a=>a.id===composition.id);
  const before=createDocument(rows[composition.id],{background:asset.background,person:image,product:image,packaging:image},asset.layout||{});
  const snapshot=JSON.stringify(before),after=applyComposition(before,composition);
  assert.equal(JSON.stringify(before),snapshot,'Accepted starter was mutated');
  for(const layer of before.layers){const changed=after.layers.find(l=>l.id===layer.id);assert.equal(changed.src,layer.src);assert.equal(changed.text,layer.text);if(layer.parent)assert.deepEqual(changed,layer);}
  const signature=JSON.stringify(['person','product','packaging','hook','description','cta'].map(id=>{const l=after.layers.find(x=>x.id===id);return [l.x,l.y,l.width,l.height,l.rotation]}));
  assert.ok(!signatures.has(signature),'A recolour does not constitute a distinct arrangement');signatures.add(signature);
  assert.throws(()=>applyComposition({...before,templateId:199},composition),/this product/);
 }
});
test('a locked object prevents an arrangement from partly applying',()=>{
 const c=COMPOSITIONS[0],asset=assets.find(a=>a.id===c.id),doc=createDocument(rows[c.id],{background:asset.background,person:image,product:image,packaging:image},asset.layout||{});
 doc.layers.find(l=>l.id==='hook').locked=true;const snapshot=JSON.stringify(doc);
 assert.throws(()=>applyComposition(doc,c),/Unlock/);assert.equal(JSON.stringify(doc),snapshot);
});
