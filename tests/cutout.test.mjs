import test from 'node:test';import assert from 'node:assert/strict';
import http from 'node:http';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createV1} from '../v1-api.mjs';
const TOKEN='t'.repeat(32);
async function serve(fetchImpl){
 const v1=createV1({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'cut-')),token:TOKEN,cutoutUrl:'http://cutout.test',fetchImpl,publishEnv:{}});
 const srv=http.createServer(async(q,r)=>{if(!await v1.handle(q,r,new URL(q.url,'http://x')))r.end('no')}).listen(0);
 await new Promise(r=>srv.once('listening',r));
 return {url:`http://127.0.0.1:${srv.address().port}/api/v1/cutout`,close:()=>{srv.close();v1.close()}};
}
const post=(u,body,auth=true)=>fetch(u,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+TOKEN}:{})},body:JSON.stringify(body)});
test('cutout forwards a picture to the worker and returns candidates',async()=>{
 let seen;const s=await serve(async(u,o)=>{seen=JSON.parse(o.body);return new Response(JSON.stringify({candidates:[{engine:'people',png_base64:'AAAA',suggested:true}]}),{status:200})});
 const r=await post(s.url,{image:'data:image/png;base64,'+'A'.repeat(200)});
 assert.equal(r.status,200);assert.equal(seen.engine,'all');assert.ok(!seen.image_base64.startsWith('data:'));
 assert.equal((await r.json()).candidates[0].engine,'people');s.close();
});
test('cutout refuses unknown engines, junk and anonymous callers',async()=>{
 const s=await serve(async()=>new Response('{}'));
 assert.equal((await post(s.url,{image:'A'.repeat(200),engine:'magic'})).status,400);
 assert.equal((await post(s.url,{image:'tiny'})).status,400);
 assert.equal((await post(s.url,{image:'A'.repeat(200)},false)).status,401);s.close();
});
test('cutout reports an unreachable worker as 503 and a bad image as 400',async()=>{
 let s=await serve(async()=>{throw new Error('down')});assert.equal((await post(s.url,{image:'A'.repeat(200)})).status,503);s.close();
 s=await serve(async()=>new Response(JSON.stringify({error:'That image could not be read.'}),{status:400}));assert.equal((await post(s.url,{image:'A'.repeat(200)})).status,400);s.close();
});
