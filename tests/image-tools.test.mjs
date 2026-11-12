import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createImageTools} from '../image-tools.mjs';

class InputError extends Error{constructor(m,s=400){super(m);this.status=s}}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const make=async(env,fetchImpl,extra={})=>createImageTools({dataDir:await mkdtemp(path.join(tmpdir(),'img-')),fetchImpl,env,InputError,json:()=>{},body:async()=>({}),...extra});

test('generate uses the OpenAI-style service and adds the background suffix',async()=>{
  let seen;
  const t=await make({IMAGE_GEN_KEY:'k',IMAGE_GEN_URL:'http://x/v1'},async(url,o)=>{seen={url,body:JSON.parse(o.body),auth:o.headers.Authorization};return {ok:true,json:async()=>({data:[{b64_json:png.toString('base64')}]})}});
  const out=await t.generate({prompt:'warm wall'},{ws:'main'});
  assert.equal(seen.url,'http://x/v1/images/generations');assert.equal(seen.auth,'Bearer k');assert.equal(seen.body.size,'1024x1536');assert.equal(seen.body.model,'gpt-image-2.5-sunburst');assert.equal(seen.body.quality,'low');assert.match(out.cost,/Costs money/);
  assert.match(seen.body.prompt,/no people, no text/);assert.match(out.image,/^data:image\/png;base64,/);assert.equal(out.provider,'openai');
});
test('generate says how to set it up when no service is configured',async()=>{
  const t=await make({},async()=>{throw Error('no call')});
  await assert.rejects(()=>t.generate({prompt:'warm wall'},{ws:'main'}),e=>e.status===503&&/IMAGE_GEN_KEY/.test(e.message));
});
test('generate validates the prompt and the shape',async()=>{
  const t=await make({IMAGE_GEN_KEY:'k'},async()=>({ok:true,json:async()=>({data:[{b64_json:png.toString('base64')}]})}));
  await assert.rejects(()=>t.generate({prompt:'x'},{ws:'main'}),/3 to 800/);
  await assert.rejects(()=>t.generate({prompt:'a nice wall',aspect:'tall'},{ws:'main'}),/aspect must be/);
});
test('generate is limited per hour per workspace',async()=>{
  const t=await make({IMAGE_GEN_KEY:'k',IMAGE_GEN_HOURLY_LIMIT:'2'},async()=>({ok:true,json:async()=>({data:[{b64_json:png.toString('base64')}]})}));
  await t.generate({prompt:'wall one'},{ws:'a'});await t.generate({prompt:'wall two'},{ws:'a'});
  await assert.rejects(()=>t.generate({prompt:'wall three'},{ws:'a'}),e=>e.status===429);
  await t.generate({prompt:'wall three'},{ws:'b'});
});
test('the studio picture worker path submits, polls and fetches the result',async()=>{
  const calls=[];
  const t=await make({IMAGE_GEN_POLL_MS:'1'},async(url)=>{const u=String(url);calls.push(u);
    if(u.endsWith('/jobs'))return {ok:true,json:async()=>({id:'j1'})};
    if(u.endsWith('/jobs/j1'))return {ok:true,json:async()=>({state:'complete'})};
    return {ok:true,arrayBuffer:async()=>png}},{visualUrl:'http://visuals:8091'});
  const out=await t.generate({prompt:'sunset wall',aspect:'square'},{ws:'main'});
  assert.equal(out.provider,'worker');assert.equal(calls.length,3);assert.match(out.image,/^data:image\/png/);
});
test('the cost note is spelled out for every service',async()=>{
    const grab=async env=>{let out;const t=await make(env,async()=>{},{json:(r,c,v)=>{out=v}});await t.handle({method:'GET'},{},new URL('http://x/api/v1/images/status'),{});return out};
  assert.match((await grab({IMAGE_GEN_KEY:'k'})).cost,/Costs money: roughly \$0\.005/);
  assert.match((await grab({IMAGE_GEN_KEY:'k',IMAGE_GEN_MODEL:'gpt-image-1.5',IMAGE_GEN_QUALITY:'medium'})).cost,/\$0\.05 per picture/);
  assert.match((await grab({IMAGE_GEN_PROVIDER:'pollinations'})).cost,/Free/);
  assert.match((await grab({IMAGE_GEN_COST_NOTE:'$0.02 each'})).cost,/\$0\.02 each/);
  assert.match((await grab({})).cost,/nothing is charged/);
});
