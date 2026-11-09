// Product-specific arrangements. These do not replace accepted starters or images.
import {applyCampaignPlan} from './layer-model.mjs';
const box=(x,y,width,height,extra={})=>({x,y,width,height,...extra});
export const COMPOSITIONS=[
 {id:1,name:'The matcha preparation table',intent:'A wide preparation bowl anchors the bottom; the creator and upright pouch frame a narrow recipe-style copy column.',layout:{
  person:box(0,31,38,54),product:box(23,70,57,24),packaging:box(68,31,27,41),
  hook:box(7,11,85,16,{font:'Georgia',fontSize:6.5,align:'left'}),description:box(39,34,27,28,{fontSize:2.8,fill:'#eff6e9',color:'#17392a'}),cta:box(7,94,86,4,{fontSize:2.5})}},
 {id:2,name:'Coconut-water split poster',intent:'A tall creator column on the right balances a left-hand headline and a large coconut vessel; packaging sits between the two.',layout:{
  person:box(48,25,52,64),product:box(2,51,48,35),packaging:box(30,32,25,33),
  hook:box(5,12,52,28,{font:'Arial',fontSize:7.2,bold:true}),description:box(5,85,88,7,{fontSize:2.65,fill:'#f8e8e4'}),cta:box(5,94,88,4,{fontSize:2.4})}},
 {id:3,name:'The breakfast bowl feature',intent:'A centred breakfast bowl becomes the main foreground object beneath an editorial headline; creator and package are deliberately smaller.',layout:{
  person:box(61,30,36,43),product:box(1,57,81,34),packaging:box(71,68,25,25),
  hook:box(7,11,86,19,{font:'Georgia',fontSize:6.8,align:'center'}),description:box(7,33,43,17,{fontSize:2.9,fill:'#f4e9db'}),cta:box(7,94,86,4,{fontSize:2.5})}},
 {id:4,name:'Chocolate tasting diagonal',intent:'An angled chocolate hero crosses the lower half; creator portrait and package occupy opposing corners with a compact tasting note.',layout:{
  person:box(2,34,47,51),product:box(35,52,61,34,{rotation:-12}),packaging:box(68,29,27,32,{rotation:7}),
  hook:box(7,11,86,18,{font:'Georgia',fontSize:6.8}),description:box(49,35,44,12,{fontSize:2.6,fill:'#f6eadd',color:'#452c28'}),cta:box(7,91,86,6,{fontSize:2.5})}},
 {id:5,name:'Honey jar close-up',intent:'An oversized honey jar is the hero on the left; creator and editable label package occupy a slim right column with the copy above.',layout:{
  person:box(66,32,31,47),product:box(0,39,67,49),packaging:box(71,76,25,17),
  hook:box(7,11,86,18,{font:'Georgia',fontSize:6.6,align:'center'}),description:box(7,31,55,9,{fontSize:2.6,fill:'#fff1d4',color:'#533412'}),cta:box(7,94,86,4,{fontSize:2.5})}},
 {id:6,name:'Olive-oil vertical editorial',intent:'A full-height oil bottle forms the centre spine, with creator at lower left and package plus a short description to the right.',layout:{
  person:box(1,54,38,38),product:box(29,30,40,61),packaging:box(73,64,23,27),
  hook:box(7,11,86,17,{font:'Georgia',fontSize:6.5}),description:box(72,33,24,25,{fontSize:2.7,fill:'#f2efdf',color:'#353b20'}),cta:box(7,94,86,4,{fontSize:2.5})}},
];
export function applyComposition(doc,composition){
 if(!composition||composition.id!==doc.templateId)throw Error('Choose an arrangement for this product.');
 return applyCampaignPlan(doc,{version:1,templateId:doc.templateId,changes:Object.entries(composition.layout).map(([layerId,values])=>({layerId,values}))});
}
