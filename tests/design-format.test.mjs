import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSlide,DesignError} from '../designs-api.mjs';

const base={title:'Hello ⟦#ffd84d||world⟧',body:'x'};
test('shapes, text card and text background settings are accepted and checked',()=>{
 const ok=sanitizeSlide({...base,artMask:'circle',elementMasks:['','heart'],slots:{hero:{mask:'star'}},panel:{x:4,y:-3,fill:'#7a3cff',opacity:60,radius:10,hide:false},textLayers:{title:{bg:'#25c8ff',bgPad:60,bgRadius:80}}},'Page 1');
 assert.equal(ok.artMask,'circle');assert.deepEqual(ok.elementMasks,['','heart']);assert.equal(ok.slots.hero.mask,'star');
 assert.deepEqual(ok.panel,{x:4,y:-3,fill:'#7a3cff',opacity:60,radius:10,hide:false});
 assert.equal(ok.textLayers.title.bgPad,60);assert.equal(ok.textLayers.title.bgRadius,80);
 assert.equal(ok.title,'Hello ⟦#ffd84d||world⟧','per-word formatting is kept in the text');
});
test('bad values are rejected',()=>{
 const bad=x=>assert.throws(()=>sanitizeSlide({...base,...x},'Page 1'),DesignError);
 bad({artMask:'banana'});bad({elementMasks:['circle','nope']});bad({elementMasks:'circle'});bad({panel:{fill:'red'}});bad({panel:{opacity:200}});bad({panel:{hide:'yes'}});bad({panel:[]});
 assert.throws(()=>sanitizeSlide({...base,textLayers:{title:{bgPad:999}}},'Page 1'),DesignError);
 assert.throws(()=>sanitizeSlide({...base,slots:{hero:{mask:'x'}}},'Page 1'),DesignError);
});
test('template items (parts) are accepted and checked',()=>{
 const ok=sanitizeSlide({...base,parts:{'3':{x:5,y:-2,scale:1.5,fill:'#ff0066',color:'#ffffff',opacity:80,hide:false},'3.1':{hide:true}}},'Page 1');
 assert.equal(ok.parts['3'].scale,1.5);assert.equal(ok.parts['3.1'].hide,true);
 const bad=x=>assert.throws(()=>sanitizeSlide({...base,parts:x},'Page 1'),DesignError);
 bad({'abc':{x:1}});bad({'3':{scale:99}});bad({'3':{fill:'red'}});bad({'3':{x:900}});bad([]);
});
test('box colour on a text layer is accepted and checked',()=>{
 const ok=sanitizeSlide({...base,textLayers:{title:{boxFill:'#ff5a36',bg:'#2563eb'}}},'Page 1');
 assert.equal(ok.textLayers.title.boxFill,'#ff5a36');
 assert.throws(()=>sanitizeSlide({...base,textLayers:{title:{boxFill:'orange'}}},'Page 1'),DesignError);
});

test('page numbering switch is accepted and checked',()=>{
 assert.equal(sanitizeSlide({...base,numbering:'off'},'Page 1').numbering,'off');
 assert.throws(()=>sanitizeSlide({...base,numbering:'maybe'},'Page 1'),DesignError);
});
