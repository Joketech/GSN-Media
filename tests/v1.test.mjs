import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createV1} from '../v1-api.mjs';

test('persistent agent jobs, saved voices, model forwarding, collection, review and duplicate protection',async()=>{
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const token='test-only-access-token';let submissions=[],offline=false;
 const upstream=new Map();
 const fakeFetch=async(url,options={})=>{
  if(offline)throw Error('Deliberately offline worker');
  const route=new URL(url).pathname;
  if(route==='/health')return Response.json({ready:true,message:'Test worker; no inference'});
  if(route==='/jobs'&&options.method==='POST'){
   const p=JSON.parse(options.body);submissions.push(p);const id=randomUUID();upstream.set(id,p);
   return Response.json({id,state:'queued',kind:p.kind},{status:202});
  }
  const id=route.split('/')[2],p=upstream.get(id);
  if(!p)return Response.json({error:'Not found'},{status:404});
  if(route.startsWith('/assets/'))return new Response(Buffer.from(p.kind==='voice'?'RIFF-test-audio':'fake-video-bytes'));
  return Response.json({id,state:'complete',filename:p.kind==='voice'?'result.wav':'result.mp4',message:'Test result; no real generation'});
 };
 let api=createV1({dataDir:dir,token,voiceUrl:'http://test-voice',visualUrl:'http://test-gpu',fetchImpl:fakeFetch});
 const server=http.createServer((req,res)=>api.handle(req,res,new URL(req.url,'http://localhost')));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const request=(route,method='GET',data,key,extra={})=>fetch(base+route,{method,headers:{Authorization:'Bearer '+token,...(data!==undefined?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{}),...extra},body:data!==undefined?JSON.stringify(data):undefined});
 try{
  assert.equal((await fetch(base+'/jobs')).status,401);
  assert.equal((await request('/jobs','POST',{},'invalid')).status,400);
  assert.equal((await request('/session','POST',{token:'wrong'})).status,401);
  const login=await request('/session','POST',{token});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);
  assert.equal((await fetch(base+'/jobs',{headers:{Cookie:cookie}})).status,200);
  assert.equal((await request('/templates').then(r=>r.json())).templates.length,624);
  const post={kind:'post',template_id:24,slides:[{title:'<script>danger</script>',body:'GSN daily design'}],agent:'Spectra'};
  const [r1,r2]=await Promise.all([request('/jobs','POST',post,'daily-post'),request('/jobs','POST',post,'daily-post')]);
  const first=await r1.json(),second=await r2.json();assert.equal(first.id,second.id);assert.equal(first.state,'complete');
  assert.equal((await request('/jobs','POST',{...post,title:'Changed'},'daily-post')).status,409);
  const html=await request('/jobs/'+first.id+'/asset').then(r=>r.text());assert.match(html,/&lt;script&gt;danger/);assert.doesNotMatch(html,/<script>danger/);assert.match(html,/premium p4/);
  const animation=await request('/jobs','POST',{...post,kind:'animation',scene_seconds:4,agent:'Flux'},'daily-animation').then(r=>r.json());
  assert.match(await request('/jobs/'+animation.id+'/asset').then(r=>r.text()),/setInterval\(show,4000\)/);
  const profile=await request('/voices','POST',{name:'Test reference',reference_text:'My clean voice sample.',audio_base64:Buffer.from('sample audio').toString('base64')}).then(r=>r.json());assert.ok(profile.id);
  const profiles=await request('/voices').then(r=>r.json());assert.equal(profiles.voices.length,1);assert.equal(profiles.voices[0].reference_text,undefined);
  const voice=await request('/jobs','POST',{kind:'voice',voice_id:profile.id,text:'New words.',agent:'Seline'},'daily-voice').then(r=>r.json());
  assert.equal(submissions[0].reference_text,'My clean voice sample.');assert.equal(submissions[0].audio_base64,Buffer.from('sample audio').toString('base64'));assert.equal(submissions[0].request_id,voice.id);
  assert.equal((await request('/jobs/'+voice.id).then(r=>r.json())).state,'complete');
  for(const kind of ['text_to_video','image_to_video'])assert.equal((await request('/jobs','POST',{kind,text:'A road.'},kind)).status,400);
  assert.equal(submissions.length,1);
  api.close();api=createV1({dataDir:dir,token,voiceUrl:'http://test-voice',visualUrl:'http://test-gpu',fetchImpl:fakeFetch});
  assert.equal((await request('/voices').then(r=>r.json())).voices[0].id,profile.id);
  assert.equal(await request('/jobs/'+voice.id+'/asset').then(r=>r.text()),'RIFF-test-audio');
  const stored=await readFile(path.join(dir,voice.id+'.json'),'utf8');assert.doesNotMatch(stored,/audio_base64|reference_text/);
  console.log('Verified mocked workers only. Actual voice/GPU inference is a separate deployment smoke test.');
 }finally{api.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
