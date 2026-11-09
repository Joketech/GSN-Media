const fs=require('node:fs'),path=require('node:path');
const root=__dirname,p=path.join(root,'layer-assets.json'),registry=JSON.parse(fs.readFileSync(p));
const regions=JSON.parse(fs.readFileSync(path.join(root,'layer-region-review-batch-006.json'),'utf8').replace(/^\uFEFF/,''));
const overrides={22:{person:[30,40,340,930],product:[410,210,820,710],packaging:[1250,145,220,805]},26:{person:[25,110,540,820],product:[600,275,360,550],packaging:[970,340,566,440]},28:{person:[20,45,325,950],product:[375,200,600,615],packaging:[1020,205,490,600]}};
const boxes=[
 [[0,38,56,51],[49,53,44,29],[66,76,28,13]],
 [[63,38,30,51],[0,48,68,40],[4,42,17,41]],
 [[0,38,48,51],[43,42,52,42],[68,76,28,13]],
 [[0,40,43,46],[40,48,33,35],[75,55,22,29]],
 [[0,37,55,52],[51,40,28,48],[79,55,18,33]],
 [[0,38,55,50],[51,44,43,43],[65,77,31,12]],
 [[43,38,54,51],[0,42,42,46],[5,72,30,17]],
 [[72,38,26,51],[3,42,68,44],[62,74,33,15]],
 [[0,52,43,37],[43,38,53,49],[3,78,33,11]],
 [[0,38,56,51],[53,43,27,45],[80,57,18,31]],
 [[57,38,40,51],[2,48,54,37],[4,76,29,13]],
 [[0,38,51,51],[49,45,46,40],[72,76,24,13]]
];
for(const r of regions){const id=r.id,[person,product,packaging]=boxes[id-21];const box=a=>Object.fromEntries(['x','y','width','height'].map((k,i)=>[k,a[i]]));registry.campaigns=registry.campaigns.filter(x=>x.id!==id);registry.campaigns.push({id,kit:`layered-assets/${String(id).padStart(3,'0')}-kit.png`,background:`layered-assets/${String(id).padStart(3,'0')}-background.png`,regions:overrides[id]||r.regions,layout:{person:box(person),product:box(product),packaging:box(packaging),hook:{font:id%2?'Georgia':'Arial',fontSize:6.5,color:id===21||id===25?'#ffffff':'#28241e'},brand:{color:id===21||id===25?'#ffffff':'#28241e'},category:{color:id===21||id===25?'#ffffff':'#28241e'},description:{x:7,y:29,width:86,height:7,fontSize:2.4,color:'#28241e',fill:'#fff7e8'},'package-brand':{color:'#34251f',fontSize:1.4},'package-name':{color:'#34251f',fontSize:1.4}}});}
const dryer=registry.campaigns.find(x=>x.id===19);for(const key of ['hook','brand','category'])dryer.layout[key]={...dryer.layout[key],color:'#ffffff'};
registry.campaigns.sort((a,b)=>a.id-b.id);fs.writeFileSync(p,JSON.stringify(registry,null,2)+'\n');
