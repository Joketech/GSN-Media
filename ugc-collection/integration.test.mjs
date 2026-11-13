import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {handleUGCStatic,pictureCatalog} from './integration.mjs';
import {createV1} from '../v1-api.mjs';
import {createDocument} from './layer-model.mjs';

test('200 covers have no repeated colour-independent composition and browser data matches',async()=>{
 const rows=JSON.parse(await readFile(new URL('cover-designs.json',import.meta.url),'utf8'));
 assert.equal(rows.length,200);assert.equal(new Set(rows.map(r=>r.id)).size,200);
 assert.equal(new Set(rows.map(r=>r.geometryKey)).size,200);
 for(const r of rows)for(const key of ['photo','hook','description','footer']){const [x,y,w,h]=r[key];assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=100&&y+h<=100,`${r.id} ${key} is outside the page`);}
 const js=await readFile(new URL('cover-designs.js',import.meta.url),'utf8');assert.ok(js.includes(JSON.stringify(rows)));
});

test('picture library includes every campaign plus separately selectable prepared cutouts',async()=>{
 const catalog=await pictureCatalog();assert.equal(catalog.ready.length,200);assert.equal(catalog.layered.length,69);
 assert.equal(catalog.pictures.length,476);assert.equal(new Set(catalog.pictures.map(p=>p.id)).size,476);assert.equal(catalog.pictures.filter(p=>p.role==='background').length,69);
 for(const p of catalog.pictures){assert.ok(p.url.startsWith('/ugc/'));if(p.role!=='campaign'&&p.role!=='background'){assert.equal(p.region.length,4);assert.equal(p.sheetSize.length,2);}}
});

test('main-server asset adapter serves the collection, rejects unlisted files, and supports HEAD',async()=>{
 const server=http.createServer(async(req,res)=>{if(!await handleUGCStatic(req,res,new URL(req.url,'http://localhost'))){res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/ugc/')).status,200);
  assert.equal((await fetch(base+'/ugc/cover-designs.js')).status,200);
  assert.equal((await fetch(base+'/ugc/assets/ad-199.png',{method:'HEAD'})).status,200);
  assert.equal((await fetch(base+'/ugc/layered-assets/068-kit.png',{method:'HEAD'})).status,200);
  assert.equal((await fetch(base+'/ugc/server.mjs')).status,404);
  assert.equal((await fetch(base+'/ugc/.env')).status,404);
  assert.equal((await (await fetch(base+'/api/ugc/catalog')).json()).pictures.length,476);
 }finally{await new Promise(r=>server.close(r))}
});

test('production campaign requests use the studio authentication and authenticated worker claims',async()=>{
 const directory=await mkdtemp(path.join(process.cwd(),'.gsn-test-ugc-')),token='only-used-in-this-test',api=createV1({dataDir:directory,token,openUi:false});
 const server=http.createServer(async(req,res)=>{if(!await api.handle(req,res,new URL(req.url,'http://localhost'))){res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const send=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 try{
  assert.equal((await send('/ugc/briefs',{})).status,401);
  const login=await send('/session',{token});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const rows=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8')),image='data:image/png;base64,AAAA';
  const document=createDocument(rows[0],{background:'layered-assets/000-background.png',person:image,product:image,packaging:image});
  const enqueue=await send('/ugc/briefs',{templateId:0,brief:'Change only the headline',document},{Cookie:cookie});assert.equal(enqueue.status,201);const job=await enqueue.json();
  assert.equal((await fetch(base+'/ugc/briefs/'+job.id)).status,401);
  assert.equal((await send('/ugc/briefs/claim',{agent:'Mira'},{Cookie:cookie})).status,401);
  const claim=await send('/ugc/briefs/claim',{agent:'Mira'},{Authorization:'Bearer '+token});assert.equal(claim.status,200);const claimed=(await claim.json()).job;assert.equal(claimed.id,job.id);
  const done=await send('/ugc/briefs/'+job.id+'/complete',{leaseKey:claimed.leaseKey,plan:{version:1,templateId:0,changes:[{layerId:'hook',values:{text:'A new coffee moment'}}]}},{Authorization:'Bearer '+token});assert.equal(done.status,200);
  assert.equal((await (await fetch(base+'/ugc/briefs/'+job.id,{headers:{Cookie:cookie}})).json()).state,'complete');
 }finally{api.close();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true})}
});

test('workspace-issued Hermes keys claim only their workspace campaign queue',async()=>{
 const directory=await mkdtemp(path.join(process.cwd(),'.gsn-test-ugc-')),api=createV1({dataDir:directory,token:'legacy-test-key',openUi:true});
 const server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/v1`;let cookie='';
 const call=async(route,data,extra={})=>{const r=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin',...(cookie?{Cookie:cookie}:{}),...extra},body:data===undefined?undefined:JSON.stringify(data)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return r};
 try{
  assert.equal((await call('/accounts/setup',{username:'testadmin',password:'only a temporary test password'})).status,201);
  const ws=(await (await call('/accounts/workspaces',{name:'UGC workspace'})).json()).workspace.id;
  const key=(await (await call(`/accounts/workspaces/${ws}/tokens`,{name:'Hermes UGC test'})).json()).token;
  const rows=JSON.parse(await readFile(new URL('manifest.json',import.meta.url),'utf8')),image='data:image/png;base64,AAAA';
  const document=createDocument(rows[0],{background:'layered-assets/000-background.png',person:image,product:image,packaging:image}),input={templateId:0,brief:'Change the headline only',document};
  const main=(await (await call('/ugc/briefs',input)).json()),other=(await (await call('/ugc/briefs',input,{'X-GSN-Workspace':ws})).json());
  assert.equal((await call('/ugc/briefs/'+other.id)).status,404);
  assert.equal((await call('/ugc/briefs/'+main.id,undefined,{'X-GSN-Workspace':ws})).status,404);
  assert.equal((await call('/ugc/briefs/claim',{agent:'Mira',trustedWorker:true},{'X-GSN-Workspace':ws})).status,401);
  const claimed=await call('/ugc/briefs/claim',{agent:'Mira'},{Authorization:'Bearer '+key});assert.equal(claimed.status,200);assert.equal((await claimed.json()).job.id,other.id);
 }finally{api.close();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true})}
});
