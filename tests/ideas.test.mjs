import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';
import {ideaInstructions} from '../ideas-api.mjs';

async function setup(){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));let now=1700000000000;
 const api=createV1({dataDir:dir,token:'agent-token-abc',clock:()=>now,fetchImpl:async()=>new Response('{}',{status:404}),publishEnv:{}});
 const server=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}/api/v1`;
 const human=(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:d===undefined?undefined:JSON.stringify(d)});
 const call=(auth)=>(r,m='GET',d)=>fetch(base+r,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},body:d===undefined?undefined:JSON.stringify(d)});
 return {human,agent:call('agent-token-abc'),tick:s=>{now+=s*1000},close:async()=>{api.close();server.close();await rm(dir,{recursive:true,force:true})}};
}
// The legacy owner key is read from the same token with an owner header in this studio; if owner auth is not available the tests fall back to the agent role.
test('instructions fix what Perplexity and Steroid mean',()=>{
 const base={mode:'own',prompt:'AI in sales',brand:{brand_name:'GSN',handle:'@gsn',voice:'Clear',niche:'',style:''},previous:[],perplexity:false,steroid:false};
 const plain=ideaInstructions(base);assert.match(plain,/exactly 5/);assert.match(plain,/AI in sales/);assert.match(plain,/Do not claim any live research/);assert.doesNotMatch(plain,/STEROID/);
 const both=ideaInstructions({...base,perplexity:true,steroid:true});assert.match(both,/at least 3 live web searches with Perplexity/);assert.match(both,/8 candidate ideas/);assert.match(both,/sources/);
 const refine=ideaInstructions({...base,parent_id:'x',previous:['Old idea'],feedback:'more bold'});assert.match(refine,/"Old idea"/);assert.match(refine,/more bold/);
 const gen=ideaInstructions({...base,mode:'generate',prompt:'',brand:{...base.brand,niche:'B2B SaaS'}});assert.match(gen,/B2B SaaS/);
});
test('only people ask for ideas and only the agent answers',async()=>{
 const t=await setup();try{
  assert.equal((await t.agent('/ideas/requests','POST',{mode:'own',prompt:'x'})).status,403,'an agent cannot ask');
  assert.deepEqual(await (await t.agent('/ideas/options')).json(),{perplexity:{min:20,max:45,source:'estimate'},steroid:{min:25,max:50,source:'estimate'}});
 }finally{await t.close()}
});

const five=(n=5,withSources=false)=>Array.from({length:n},(_,i)=>({title:'Idea '+(i+1),angle:'Angle '+i,hook:'Hook '+i,why_it_works:'Because',format:'carousel',sources:withSources?[{title:'Page',url:'https://example.com/'+i}]:[]}));
test('full flow: own idea, agent claims and answers, pick/reject, refine, board persists',async()=>{
 const t=await setup();try{
  assert.equal((await t.human('/ideas/requests','POST',{mode:'own'})).status,400,'topic required');
  assert.equal((await t.human('/ideas/requests','POST',{mode:'generate'})).status,400,'brand niche required first');
  const made=await t.human('/ideas/requests','POST',{mode:'own',prompt:'Why AI agents need human review',perplexity:true,steroid:true});assert.equal(made.status,201);
  const req=await made.json();assert.equal(req.status,'pending');assert.equal(req.perplexity,true);
  const q=await (await t.agent('/ideas/requests?status=pending')).json();assert.equal(q.requests.length,1);assert.match(q.requests[0].instructions,/Perplexity/);assert.match(q.requests[0].instructions,/STEROID/);
  assert.equal((await t.human(`/ideas/requests/${req.id}/claim`,'POST',{})).status,403,'people cannot claim');
  assert.equal((await t.agent(`/ideas/requests/${req.id}/claim`,'POST',{})).status,200);
  assert.equal((await t.agent(`/ideas/requests/${req.id}/claim`,'POST',{})).status,409,'only once');
  t.tick(50);
  assert.equal((await t.agent(`/ideas/requests/${req.id}/result`,'POST',{ideas:five()})).status,400,'Perplexity on needs sources');
  assert.equal((await t.agent(`/ideas/requests/${req.id}/result`,'POST',{ideas:five(6,true)})).status,400,'max five');
  const bad=five(5,true);bad[0].sources=[{title:'x',url:'javascript:alert(1)'}];assert.equal((await t.agent(`/ideas/requests/${req.id}/result`,'POST',{ideas:bad})).status,400,'real links only');
  const done=await t.agent(`/ideas/requests/${req.id}/result`,'POST',{ideas:five(5,true),model:'qwen3-32b'});assert.equal(done.status,200);
  const r=await done.json();assert.equal(r.status,'done');assert.equal(r.ideas.length,5);assert.equal(r.searched,true);assert.equal(r.ideas[0].sources[0].url,'https://example.com/0');
  // pick one, reject another
  assert.equal((await t.human(`/ideas/requests/${req.id}/ideas/1`,'PATCH',{status:'picked'})).status,200);
  assert.equal((await t.human(`/ideas/requests/${req.id}/ideas/2`,'PATCH',{status:'rejected'})).status,200);
  assert.equal((await t.human(`/ideas/requests/${req.id}/ideas/2`,'PATCH',{status:'nope'})).status,400);
  assert.equal((await t.agent(`/ideas/requests/${req.id}/ideas/2`,'PATCH',{status:'new'})).status,403);
  // refine
  const ref=await (await t.human('/ideas/requests','POST',{parent_id:req.id,feedback:'More daring',steroid:true})).json();assert.equal(ref.parent_id,req.id);assert.equal(ref.mode,'own');
  const brief=(await (await t.agent('/ideas/requests?status=pending')).json()).requests[0];assert.deepEqual(brief.previous,['Idea 1','Idea 2','Idea 3','Idea 4','Idea 5']);assert.match(brief.instructions,/More daring/);
  // failure path
  await t.agent(`/ideas/requests/${ref.id}/claim`,'POST',{});
  const f=await (await t.agent(`/ideas/requests/${ref.id}/result`,'POST',{status:'failed',error:'Search timed out'})).json();assert.equal(f.status,'failed');assert.equal(f.error,'Search timed out');
  // the board keeps everything, rejected ideas included
  const board=await (await t.human('/ideas/requests')).json();assert.equal(board.total,2);
  const kept=board.requests.find(x=>x.id===req.id);assert.equal(kept.ideas[2].status,'rejected');assert.equal(kept.ideas[1].status,'picked');
  assert.equal(board.requests[0].instructions,undefined,'people do not see the agent brief');
  // the activity log recorded Lyra's real work
  const act=await (await t.agent('/activity')).json();const lyra=act.summary.find(s=>s.agent==='Lyra');assert.equal(lyra.done,1);assert.equal(lyra.failed,1);
  // delete
  assert.equal((await t.human(`/ideas/requests/${ref.id}`,'DELETE')).status,200);assert.equal((await (await t.human('/ideas/requests')).json()).total,1);
 }finally{await t.close()}
});
test('generate needs the brand niche, then works; timings are measured only from real runs',async()=>{
 const t=await setup();try{
  await t.human('/config','PUT',{niche:'AI automation for small business',style:'Short carousels, direct tone'});
  const g=await t.human('/ideas/requests','POST',{mode:'generate'});assert.equal(g.status,201);const gr=await g.json();
  const brief=(await (await t.agent('/ideas/requests?status=pending')).json()).requests[0];assert.match(brief.instructions,/AI automation for small business/);assert.match(brief.instructions,/Short carousels/);
  // 3 plain runs of 10s and 3 perplexity runs of 40s => Perplexity adds 30s measured
  const run=async(flags,secs)=>{const r=await (await t.human('/ideas/requests','POST',{mode:'own',prompt:'x',...flags})).json();await t.agent(`/ideas/requests/${r.id}/claim`,'POST',{});t.tick(secs);const d=await t.agent(`/ideas/requests/${r.id}/result`,'POST',{ideas:five(5,!!flags.perplexity)});assert.equal(d.status,200)};
  await t.agent(`/ideas/requests/${gr.id}/claim`,'POST',{});t.tick(10);await t.agent(`/ideas/requests/${gr.id}/result`,'POST',{ideas:five()});
  for(let i=0;i<3;i++){await run({},10)}
  for(let i=0;i<3;i++){await run({perplexity:true},40)}
  const o=await (await t.agent('/ideas/options')).json();assert.equal(o.perplexity.source,'measured');assert.equal(o.perplexity.seconds,30);assert.equal(o.steroid.source,'estimate');
 }finally{await t.close()}
});
