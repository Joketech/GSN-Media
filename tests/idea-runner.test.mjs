import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {createV1} from '../v1-api.mjs';
import {createRunner,extractJson,toResult,buildMessages} from '../integrations/hermes/idea-runner.mjs';

const idea=(n,url)=>({title:'Idea '+n,angle:'Angle '+n,hook:'Hook '+n,why_it_works:'Because',format:'carousel',sources:url?[{title:'Source '+n,url}]:[]});
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(`http://127.0.0.1:${s.address().port}`)));

/** Real studio API + a fake Hermes API server that records what it was sent. */
async function setup(reply){
 const dir=await mkdtemp(path.join(process.cwd(),'.gsn-test-'));
 const api=createV1({dataDir:dir,token:'agent-token-abc',fetchImpl:async()=>new Response('{}',{status:404}),publishEnv:{}});
 const studio=http.createServer((q,s)=>api.handle(q,s,new URL(q.url,'http://localhost')));const gsnUrl=await listen(studio);
 const seen=[];
 const hermes=http.createServer(async(q,s)=>{let b='';for await(const c of q)b+=c;const body=JSON.parse(b);seen.push({auth:q.headers.authorization,body});
  const content=typeof reply==='function'?reply(body,seen.length):reply;s.writeHead(200,{'content-type':'application/json'});s.end(JSON.stringify({model:'gpt-6.1-sol',choices:[{message:{role:'assistant',content}}]}))});
 const hermesUrl=await listen(hermes);
 const human=(r,m='GET',d)=>fetch(gsnUrl+'/api/v1'+r,{method:m,headers:{'Content-Type':'application/json','Sec-Fetch-Site':'same-origin'},body:d===undefined?undefined:JSON.stringify(d)}).then(x=>x.json());
 const logs=[];
 const runner=createRunner({gsnUrl,gsnToken:'agent-token-abc',hermesUrl,hermesKey:'hermes-secret',agentName:'SAGE',log:o=>logs.push(o)});
 return {human,runner,seen,logs,close:async()=>{api.close();studio.close();hermes.close();await rm(dir,{recursive:true,force:true})}};
}

test('reads JSON even inside a code fence or with extra words',()=>{
 assert.deepEqual(extractJson('Here you go:\n```json\n{"a":1}\n```'),{a:1});
 assert.deepEqual(extractJson('Sure! {"ideas":[]} hope it helps'),{ideas:[]});
 assert.throws(()=>extractJson('no json here'),/did not reply with JSON/);
});

test('result is trimmed to the studio limits and keeps only real links',()=>{
 const long='x'.repeat(900);
 const r=toResult({searched:true,ideas:[{...idea(1),title:long,sources:[{title:'ok',url:'https://a.com'},{title:'bad',url:'javascript:alert(1)'}]},idea(2),idea(3),idea(4),idea(5),idea(6)]},{perplexity:true});
 assert.equal(r.ideas.length,5);assert.equal(r.ideas[0].title.length,120);assert.deepEqual(r.ideas[0].sources,[{title:'ok',url:'https://a.com'}]);assert.equal(r.searched,true);
 // research on but no sources: reported honestly as not searched
 assert.equal(toResult({ideas:[idea(1)]},{perplexity:true}).searched,false);
 // research off: sources dropped, never claimed
 const off=toResult({searched:true,ideas:[idea(1,'https://a.com')]},{perplexity:false});assert.equal(off.searched,false);assert.deepEqual(off.ideas[0].sources,[]);
 assert.deepEqual(toResult('{"status":"failed","error":"Search down"}',{}),{status:'failed',error:'Search down'});
 assert.throws(()=>toResult({ideas:[]},{}),/without any usable ideas/);
});

test('the brief sent to Hermes is the studio brief, with the agent name and the JSON contract',()=>{
 const [system,user]=buildMessages({instructions:'THE BRIEF'},'SAGE');
 assert.match(system.content,/You are SAGE/);assert.match(system.content,/web_search and web_extract/);assert.match(system.content,/ONLY one JSON object/);assert.equal(user.content,'THE BRIEF');
});

test('full loop: creator asks with deep research and steroid, Hermes answers, ideas land on the board',async()=>{
 const t=await setup(()=>'```json\n'+JSON.stringify({searched:true,ideas:[1,2,3,4,5].map(n=>idea(n,'https://example.com/'+n))})+'\n```');
 try{
  const req=await t.human('/ideas/requests','POST',{mode:'own',prompt:'AI agents for small agencies',perplexity:true,steroid:true});
  await Promise.all(await t.runner.tick());
  assert.equal(t.seen.length,1);assert.equal(t.seen[0].auth,'Bearer hermes-secret');assert.equal(t.seen[0].body.model,'hermes-agent');
  const brief=t.seen[0].body.messages[1].content;assert.match(brief,/AI agents for small agencies/);assert.match(brief,/DEEP WEB RESEARCH is ON/);assert.match(brief,/STEROID MODE is ON/);
  const done=await t.human(`/ideas/requests/${req.id}`);
  assert.equal(done.status,'done');assert.equal(done.ideas.length,5);assert.equal(done.searched,true);assert.equal(done.model,'gpt-6.1-sol');assert.equal(done.ideas[0].sources[0].url,'https://example.com/1');
  assert.ok(!JSON.stringify(t.logs).includes('hermes-secret')&&!JSON.stringify(t.logs).includes('agent-token-abc'),'no secrets in logs');
 }finally{await t.close()}
});

test('a reply that is not JSON gets one repair turn, then succeeds',async()=>{
 const t=await setup((body,n)=>n===1?'Here are some thoughts, no JSON, sorry.':JSON.stringify({ideas:[1,2,3,4,5].map(n=>idea(n))}));
 try{
  const req=await t.human('/ideas/requests','POST',{mode:'own',prompt:'Pricing tips'});
  await Promise.all(await t.runner.tick());
  assert.equal(t.seen.length,2);assert.equal(t.seen[1].body.messages.length,4);
  assert.equal((await t.human(`/ideas/requests/${req.id}`)).status,'done');
 }finally{await t.close()}
});

test('when Hermes cannot answer, the creator sees a clear failure and can try again',async()=>{
 const t=await setup('still not json');
 try{
  const req=await t.human('/ideas/requests','POST',{mode:'own',prompt:'Pricing tips'});
  await Promise.all(await t.runner.tick());
  const r=await t.human(`/ideas/requests/${req.id}`);assert.equal(r.status,'failed');assert.match(r.error,/Try again/);
 }finally{await t.close()}
});

test('runs one request at a time by default and needs both keys',async()=>{
 assert.throws(()=>createRunner({hermesKey:'x'}),/GSN_AGENT_TOKEN/);
 assert.throws(()=>createRunner({gsnToken:'x'}),/HERMES_API_KEY/);
 const t=await setup(()=>JSON.stringify({ideas:[1,2,3,4,5].map(n=>idea(n))}));
 try{
  await t.human('/ideas/requests','POST',{mode:'own',prompt:'One'});await t.human('/ideas/requests','POST',{mode:'own',prompt:'Two'});
  const first=await t.runner.tick();assert.equal(first.length,1);await Promise.all(first);
  await Promise.all(await t.runner.tick());
  const all=(await t.human('/ideas/requests')).requests;assert.equal(all.filter(r=>r.status==='done').length,2);
 }finally{await t.close()}
});
