const fs=require('node:fs'),path=require('node:path');
const root=__dirname,p=path.join(root,'layer-assets.json'),registry=JSON.parse(fs.readFileSync(p));
const regions=JSON.parse(fs.readFileSync(path.join(root,'layer-region-review-batch-007.json'),'utf8').replace(/^\uFEFF/,''));
const overrides={33:{person:[16,184,468,701],product:[495,180,465,690],packaging:[985,140,530,710]},35:{person:[55,25,330,990],product:[450,195,445,630],packaging:[930,275,580,560]},39:{person:[15,111,478,863],product:[493,272,575,514],packaging:[1084,344,429,364]},40:{person:[60,54,330,944],product:[460,195,506,634],packaging:[1045,217,432,601]},44:{person:[5,130,557,818],product:[580,300,375,482],packaging:[960,338,558,440]}};
const boxes=[
 [[0,40,45,48],[37,40,46,48],[74,63,23,25]],
 [[0,38,48,51],[47,40,14,49],[73,49,20,39]],
 [[72,38,25,51],[4,41,60,47],[45,76,28,13]],
 [[0,38,55,51],[49,43,33,44],[79,56,18,32]],
 [[69,38,28,51],[3,42,65,42],[11,77,29,12]],
 [[0,39,52,50],[47,49,49,36],[72,76,25,13]],
 [[0,38,48,51],[42,50,55,37],[67,76,30,13]],
 [[69,38,28,51],[2,42,62,44],[3,76,28,13]],
 [[0,38,58,51],[45,60,52,29],[73,42,24,23]],
 [[0,40,43,47],[43,39,16,49],[66,42,30,46]],
 [[0,38,51,51],[47,43,32,43],[79,59,18,29]],
 [[0,38,54,51],[48,46,46,40],[70,76,27,13]]
];
for(const r of regions){const id=r.id,[person,product,packaging]=boxes[id-33];const box=a=>Object.fromEntries(['x','y','width','height'].map((k,i)=>[k,a[i]]));const light=[33,37,38,41,44].includes(id),color=light?'#ffffff':'#28241e';registry.campaigns=registry.campaigns.filter(x=>x.id!==id);registry.campaigns.push({id,kit:`layered-assets/${String(id).padStart(3,'0')}-kit${id===36?'-v2':''}.png`,background:`layered-assets/${String(id).padStart(3,'0')}-background.png`,regions:overrides[id]||r.regions,layout:{person:box(person),product:box(product),packaging:box(packaging),hook:{font:id%2?'Georgia':'Arial',fontSize:6.5,color},brand:{color},category:{color},description:{x:7,y:29,width:86,height:7,fontSize:2.4,color:'#28241e',fill:'#fff7e8'},'package-brand':{color:'#34251f',fontSize:1.3},'package-name':{color:'#34251f',fontSize:1.3}}});}
registry.campaigns.sort((a,b)=>a.id-b.id);fs.writeFileSync(p,JSON.stringify(registry,null,2)+'\n');
