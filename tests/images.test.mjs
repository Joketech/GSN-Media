import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createV1} from '../v1-api.mjs';
import {renderDesign} from '../template-engine.mjs';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1cAAAAASUVORK5CYII=';
async function setup({configured=true}={}){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));const jobs=new Map();let submitted=0;
 const fake=async(url,options={})=>{const u=new URL(url),reply=(s,p)=>new Response(JSON.stringify(p),{status:s,headers:{'Content-Type':'application/json'}});
  if(u.pathname==='/health')return reply(200,{ready:true,device:'cpu',model:'test-only'});
  if(u.pathname==='/jobs'&&options.method==='POST'){const p=JSON.parse(options.body);jobs.set(p.id,p);submitted++;return reply(202,{id:p.id,state:'queued'});}
  const id=u.pathname.split('/')[2];if(!jobs.has(id))return reply(404,{});
  if(u.pathname.endsWith('/result'))return reply(200,{image_base64:png});return reply(200,{id,state:'complete',message:'Image ready.'});
 };
 let api=createV1({dataDir:dir,token:'image-test-agent',imageUrl:configured?'http://image-worker':'',fetchImpl:fake});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/api/v1';
 const call=(r,m='GET',data,headers={'Sec-Fetch-Site':'same-origin'})=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json',...headers},body:data?JSON.stringify(data):undefined});
 return {dir,jobs,call,submitted:()=>submitted,restart(){api.close();api=createV1({dataDir:dir,token:'image-test-agent',imageUrl:'http://image-worker',fetchImpl:fake})},async close(){api.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}};
}
test('images are queued once, collected, reusable after restart, and accessible to agents',async()=>{
 const t=await setup();try{
  const p={prompt:'A person in an orange jumper',role:'person',seed:42,request_key:randomUUID()};
  const made=await t.call('/images','POST',p);assert.equal(made.status,202);const j=await made.json();
  assert.equal(j.state,'queued');assert.equal(t.submitted(),1);
  assert.equal((await t.call('/images','POST',p)).status,202);assert.equal(t.submitted(),1);
  assert.equal((await t.call('/images','POST',{...p,prompt:'A different person'})).status,409);
  const done=await (await t.call('/images/'+j.id)).json();assert.equal(done.state,'complete');assert.equal(done.has_image,true);
  const asset=await (await t.call('/images/'+j.id+'/asset')).json();assert.equal(asset.image_base64,png);
  t.restart();assert.equal((await (await t.call('/images')).json()).images.length,1);
  assert.equal((await t.call('/images/'+j.id+'/asset','GET',undefined,{Authorization:'Bearer image-test-agent'})).status,200);
  assert.equal((await t.call('/images/'+j.id+'/asset','GET',undefined,{})).status,401);
 }finally{await t.close()}
});
test('image requests validate parameters and report an unconfigured worker honestly',async()=>{
 const t=await setup({configured:false});try{
  const health=await (await t.call('/images/health')).json();assert.equal(health.ready,false);assert.equal(health.paid_api,false);
  for(const patch of [{prompt:''},{role:'video'},{seed:-1},{steps:99},{ratio:'bad'}])assert.equal((await t.call('/images','POST',{prompt:'A bottle',request_key:randomUUID(),...patch})).status,400);
  assert.equal((await t.call('/images','POST',{prompt:'A bottle',request_key:randomUUID()})).status,503);
  assert.equal((await t.call('/images/not-a-uuid')).status,404);
 }finally{await t.close()}
});
test('generated images cannot be read from a different workspace',async()=>{
 const t=await setup();let cookie='';const owner=async(r,m='GET',p,ws)=>{const result=await t.call(r,m,p,{'Sec-Fetch-Site':'same-origin',...(cookie?{Cookie:cookie}:{}),...(ws?{'X-GSN-Workspace':ws}:{})});const c=result.headers.get('set-cookie');if(c)cookie=c.split(';')[0];return result;};
 try{
  await owner('/accounts/setup','POST',{username:'admin',password:'image testing passphrase'});
  const j=await (await owner('/images','POST',{prompt:'A travel bag',request_key:randomUUID()})).json();
  const ws=(await (await owner('/accounts/workspaces','POST',{name:'Other studio'})).json()).workspace.id;
  assert.equal((await owner('/images/'+j.id,'GET',undefined,ws)).status,404);
  assert.equal((await (await owner('/images','GET',undefined,ws)).json()).images.length,0);
 }finally{await t.close()}
});
test('a generated page background persists without replacing the product or person images',async()=>{
 const t=await setup();try{
  const image='data:image/png;base64,'+png;
  const p={title:'Independent layers',template_id:0,platform:'instagram-post',pages:[{deckLayout:'hook',title:'Hook',image,elements:[image],elementPositions:[{x:65,y:60}],backgroundImage:image},{deckLayout:'cta',title:'Shop now'}]};
  const response=await t.call('/designs','POST',p);assert.equal(response.status,201);const d=await response.json();
  assert.equal(d.pages[0].backgroundImage,image);assert.equal(d.pages[0].image,image);assert.deepEqual(d.pages[0].elements,[image]);
  const html=renderDesign({template_id:0,slides:d.pages,ratio:d.ratio,brand:'GSN',handle:'@gsn'});assert.ok(html.includes("background-image:url('"+image+"')!important"));
  assert.equal((await t.call('/designs','POST',{...p,pages:[{title:'Unsafe',backgroundImage:'https://untrusted.example/image.png'},{title:'CTA'}]})).status,400);
 }finally{await t.close()}
});
