// Inventory structural repetition separately from exact image duplication.
// A unique hash, caption, palette or product is not proof of a unique design.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url);
const campaigns=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
const prepared=JSON.parse(await readFile(new URL('layer-assets.json',root),'utf8')).campaigns;
const groups=new Map(),hashes=new Map(),entries=[];
for(const d of campaigns){
 const image=`assets/ad-${String(d.id).padStart(3,'0')}.png`;
 const hash=createHash('sha256').update(await readFile(new URL(image,root))).digest('hex');
 const family=(d.id*7+Math.floor(d.id/10))%20,layout=(d.id*13+Math.floor(d.id/10))%8;
 const approvedReference=[0,8,10].includes(d.id);
 const compositionGroup=approvedReference?`approved-reference-${d.id}`:`layout-${layout}`;
 if(!groups.has(compositionGroup))groups.set(compositionGroup,[]);
 groups.get(compositionGroup).push(d.id);
 if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(d.id);
 entries.push({id:d.id,product:d.product,image,sha256:hash,typographyFamily:family,compositionGroup,hasIndependentLayers:prepared.some(p=>p.id===d.id),reviewStatus:approvedReference?'approved-reference':'requires-composition-review'});
}
const report={version:1,rule:'Different colours, product names, captions and image hashes do not establish a new composition.',originals:entries.length,distinctProducts:new Set(campaigns.map(x=>x.product.toLowerCase())).size,exactDuplicateGroups:[...hashes.values()].filter(x=>x.length>1),independentLayerStarters:prepared.length,approvedReferenceCount:3,unreviewedCompositionCount:entries.filter(x=>x.reviewStatus==='requires-composition-review').length,repeatedCompositionSystems:[...groups.entries()].filter(([,ids])=>ids.length>1).map(([system,ids])=>({system,count:ids.length,ids})),entries};
await writeFile(new URL('originality-audit.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({originals:report.originals,distinctProducts:report.distinctProducts,exactDuplicateGroups:report.exactDuplicateGroups,independentLayerStarters:report.independentLayerStarters,approvedReferences:3,requiresCompositionReview:report.unreviewedCompositionCount,repeatedSystems:report.repeatedCompositionSystems.map(({system,count})=>({system,count}))},null,2));
