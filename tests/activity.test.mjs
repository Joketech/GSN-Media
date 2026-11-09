import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';

async function setup(){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const api=createV1({dataDir:dir,token:'agent-token-abc',fetchImpl:async()=>new Response('{}',{status:404}),publishEnv:{}});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const agent=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer agent-token-abc'},body:d===undefined?undefined:JSON.stringify(d)});
 const anon=(r)=>fetch(base+r);
 return {agent,anon,close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}

test('agents log their work and the summary only counts what was really logged',async()=>{
 const t=await setup();try{
  const empty=await (await t.agent('/activity')).json();
  assert.equal(empty.total,0);assert.equal(empty.summary.length,6);assert.ok(empty.summary.every(s=>s.done===0&&s.last_at===null),'no fake numbers before anything is logged');
  assert.deepEqual(empty.summary.map(s=>s.agent),['Mira','Lyra','Seline','Spectra','Flux','Relay']);
  assert.equal((await t.agent('/activity','POST',{agent:'Kite',task:'x'})).status,400,'only the six agents');
  assert.equal((await t.agent('/activity','POST',{agent:'lyra'})).status,400,'a task is required');
  assert.equal((await t.agent('/activity','POST',{agent:'lyra',task:'x',status:'maybe'})).status,400);
  const a=await t.agent('/activity','POST',{agent:'lyra',task:'Researched AI content routines',model:'qwen3-32b'});assert.equal(a.status,201);
  const made=await a.json();assert.equal(made.agent,'Lyra');assert.equal(made.status,'done');assert.equal(made.model,'qwen3-32b');assert.ok(made.created_at);
  await t.agent('/activity','POST',{agent:'Seline',task:'Wrote 6 slides',model:'qwen3-32b'});
  await t.agent('/activity','POST',{agent:'Seline',task:'Wrote captions',model:'llama-3.3',status:'failed',detail:'timeout'});
  const r=await (await t.agent('/activity')).json();
  assert.equal(r.total,3);assert.equal(r.activity[0].task,'Wrote captions','newest first');
  const seline=r.summary.find(s=>s.agent==='Seline');assert.equal(seline.done,1);assert.equal(seline.failed,1);assert.equal(seline.last_task,'Wrote captions');assert.deepEqual(seline.models,{'qwen3-32b':1,'llama-3.3':1});
  assert.equal(r.summary.find(s=>s.agent==='Flux').done,0);
  const only=await (await t.agent('/activity?agent=lyra&limit=5')).json();assert.equal(only.activity.length,1);
  assert.equal((await t.anon('/activity')).status,401,'needs the studio key or a sign-in');
 }finally{await t.close()}
});
