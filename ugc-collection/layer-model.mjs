// Shared by the browser editor and the Hermes campaign-plan API.
export const ROLES = ['background', 'person', 'product', 'packaging', 'text'];
const IDS = /^[a-z][a-z0-9-]{0,63}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i;
const FILE = /^(?:layered-assets\/\d{3}-(?:background|person|product|packaging)|assets\/ad-\d{3})\.png$/;
const editable = new Set(['x','y','width','height','rotation','opacity','visible','locked','src','text','color','fill','font','fontSize','align','tint','tintStrength','bold','fit']);
const numeric = {x:[-100,200],y:[-100,200],width:[1,200],height:[1,200],rotation:[-360,360],opacity:[0,1],fontSize:[1,30],tintStrength:[0,1]};
export function cloneDocument(doc) { return {...doc, layers:doc.layers.map(l=>({...l}))}; }
export function validateSource(src) {
  if(typeof src!=='string'||src.length>2_800_000||(!IMAGE.test(src)&&!FILE.test(src))) throw Error('Use an uploaded PNG, JPEG or WebP, or a prepared local layer asset.');
  return src;
}
function checkValues(layer, values) {
  if(!values||typeof values!=='object'||Array.isArray(values)) throw Error('Layer changes must be an object.');
  for(const [key,value] of Object.entries(values)) {
    if(!editable.has(key)) throw Error(`Unsupported layer property: ${key}`);
    if(numeric[key]) {const [min,max]=numeric[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`${key} must be from ${min} to ${max}.`);}
    else if(['visible','locked','bold'].includes(key)) {if(typeof value!=='boolean')throw Error(`${key} must be true or false.`);}
    else if(['color','fill','tint'].includes(key)) {if(value!==null&&!HEX.test(value))throw Error(`${key} must be a hex colour or null.`);}
    else if(key==='src') {if(layer.kind!=='image')throw Error('Select an image layer to replace its image.');validateSource(value);}
    else if(key==='text') {if(layer.kind!=='text'||typeof value!=='string'||value.length>3000)throw Error('Text layers accept up to 3,000 characters.');}
    else if(key==='font') {if(!['Arial','Georgia','monospace'].includes(value))throw Error('Unsupported font.');}
    else if(key==='align') {if(!['left','center','right'].includes(value))throw Error('Unsupported text alignment.');}
    else if(key==='fit') {if(!['contain','cover'].includes(value))throw Error('Unsupported image fit.');}
  }
  return {...layer,...values};
}
export function validateDocument(doc) {
  if(!doc||doc.version!==1||!Number.isInteger(doc.templateId)||doc.templateId<0||doc.templateId>199||doc.width!==1080||doc.height!==1350)throw Error('Invalid UGC document.');
  if(!Array.isArray(doc.layers)||doc.layers.length<1||doc.layers.length>40)throw Error('Use 1–40 layers.');
  const ids=new Set();
  for(const layer of doc.layers) {
    if(!IDS.test(layer.id)||ids.has(layer.id)||!ROLES.includes(layer.role)||!['image','text'].includes(layer.kind))throw Error('Invalid or repeated layer ID.');
    ids.add(layer.id);
    const {id,role,kind,parent,...values}=layer;
    checkValues(layer,values);
    for(const key of ['x','y','width','height','rotation','opacity'])if(typeof layer[key]!=='number')throw Error(`Missing layer ${key}.`);
    if(kind==='image')validateSource(layer.src);
    if(kind==='text'&&typeof layer.text!=='string')throw Error('Missing layer text.');
    if(parent!==undefined&&parent!=='packaging')throw Error('Only package labels may follow a parent package.');
  }
  if(doc.layers.some(l=>l.parent)&&!ids.has('packaging'))throw Error('Package labels need a packaging layer.');
  return cloneDocument(doc);
}
export function applyCampaignPlan(doc, plan) {
  validateDocument(doc);
  if(!plan||plan.version!==1||plan.templateId!==doc.templateId||!Array.isArray(plan.changes)||plan.changes.length>80)throw Error('Plan does not match this template.');
  let next=cloneDocument(doc);
  const seen=new Set();
  for(const change of plan.changes) {
    if(!change||typeof change.layerId!=='string'||seen.has(change.layerId))throw Error('Plan layer IDs must be unique.');
    seen.add(change.layerId);
    const index=next.layers.findIndex(l=>l.id===change.layerId);
    if(index<0)throw Error(`Unknown layer: ${change.layerId}`);
    if(next.layers[index].locked)throw Error(`Unlock ${change.layerId} before changing it.`);
    next.layers[index]=checkValues(next.layers[index],change.values);
  }
  return validateDocument(next); // Return only after the entire plan passes; never partly apply it.
}
export function changeLayer(doc,id,values) { return applyCampaignPlan(doc,{version:1,templateId:doc.templateId,changes:[{layerId:id,values}]}); }
export function layerBox(doc,layer) {
  if(!layer.parent)return {x:layer.x,y:layer.y,width:layer.width,height:layer.height,rotation:layer.rotation};
  const p=doc.layers.find(l=>l.id===layer.parent),cx=p.x+p.width/2,cy=p.y+p.height/2;
  const x=p.x+layer.x/100*p.width,y=p.y+layer.y/100*p.height,w=layer.width/100*p.width,h=layer.height/100*p.height;
  const radians=p.rotation*Math.PI/180,dx=x+w/2-cx,dy=(y+h/2-cy)*doc.height/doc.width;
  const rx=dx*Math.cos(radians)-dy*Math.sin(radians),ry=(dx*Math.sin(radians)+dy*Math.cos(radians))*doc.width/doc.height;
  return {x:cx+rx-w/2,y:cy+ry-h/2,width:w,height:h,rotation:p.rotation+layer.rotation};
}
export function createDocument(campaign,images,layout={}) {
  for(const role of ['background','person','product','packaging'])validateSource(images[role]);
  const [paper,ink,accent]=campaign.palette;
  const base=(id,role,kind,x,y,width,height,extra={})=>({id,role,kind,x,y,width,height,rotation:0,opacity:1,visible:true,locked:false,...extra});
  const photo=(role,x,y,w,h)=>base(role,role,'image',x,y,w,h,{src:images[role],fit:role==='background'?'cover':'contain',...(role==='packaging'?{tint:accent,tintStrength:0}: {})});
  const text=(id,value,x,y,w,h,size,extra={})=>base(id,'text','text',x,y,w,h,{text:value,font:'Arial',fontSize:size,color:ink,fill:null,align:'left',bold:false,...extra});
  const positions=campaign.id===10?{person:[48,27,49,52],product:[0,45,95,53],packaging:[72,70,23,25]}:campaign.id===8?{person:[3,25,92,61],product:[0,64,100,29],packaging:[77,70,21,23]}:{person:[5,36,70,64],product:[13,75,24,17],packaging:[59,56,34,36]};
  const document=validateDocument({version:1,templateId:campaign.id,width:1080,height:1350,layers:[
    photo('background',0,0,100,100),photo('person',...positions.person),photo('product',...positions.product),photo('packaging',...positions.packaging),
    text('brand','YOUR BRAND',7,3.5,86,3,1.8,{bold:true}),text('category',campaign.category.toUpperCase(),7,7.7,86,3,1.6),
    text('hook',campaign.hook,7,12,86,16,7.2,{bold:campaign.id!==0,font:campaign.id===0?'Georgia':'Arial'}),text('description',campaign.description,7,campaign.id===8?82:campaign.id===0?29:34,campaign.id===10?28:86,campaign.id===10?12:6,2.5,{fill:paper}),
    text('cta',campaign.cta,7,90,86,6,2.7,{fill:accent,color:'#ffffff',align:'center',bold:true}),
    text('package-brand','YOUR BRAND',14,30,72,16,1.8,{parent:'packaging',bold:true,align:'center'}),
    text('package-name',campaign.product,14,48,72,22,1.7,{parent:'packaging',bold:true,align:'center'}),
  ]});
  if(!Object.keys(layout).length)return document;
  return applyCampaignPlan(document,{version:1,templateId:campaign.id,changes:Object.entries(layout).map(([layerId,values])=>({layerId,values}))});
}

// Designs without separate layers: the finished photograph becomes one background layer, with every piece of wording editable on top.
export function createPhotoDocument(campaign,photo) {
  validateSource(photo);
  const [paper,ink,accent]=campaign.palette;
  const base=(id,role,kind,x,y,width,height,extra={})=>({id,role,kind,x,y,width,height,rotation:0,opacity:1,visible:true,locked:false,...extra});
  const text=(id,value,x,y,w,h,size,extra={})=>base(id,'text','text',x,y,w,h,{text:value,font:'Arial',fontSize:size,color:ink,fill:null,align:'left',bold:false,...extra});
  return validateDocument({version:1,templateId:campaign.id,width:1080,height:1350,layers:[
    base('background','background','image',0,0,100,100,{src:photo,fit:'cover'}),
    text('brand','YOUR BRAND',7,3.5,86,3,1.8,{bold:true}),text('category',campaign.category.toUpperCase(),7,7.7,86,3,1.6),
    text('hook',campaign.hook,7,12,86,16,7.2,{bold:true}),text('description',campaign.description,7,34,86,6,2.5,{fill:paper}),
    text('cta',campaign.cta,7,90,86,6,2.7,{fill:accent,color:'#ffffff',align:'center',bold:true}),
  ]});
}

// Designs split automatically from their photograph: a clean background plus whatever person and product layers could be cut out.
export function createPartsDocument(campaign,parts) {
  const [paper,ink,accent]=campaign.palette;
  const base=(id,role,kind,x,y,width,height,extra={})=>({id,role,kind,x,y,width,height,rotation:0,opacity:1,visible:true,locked:false,...extra});
  const text=(id,value,x,y,w,h,size,extra={})=>base(id,'text','text',x,y,w,h,{text:value,font:'Arial',fontSize:size,color:ink,fill:null,align:'left',bold:false,...extra});
  const layers=[base('background','background','image',0,0,100,100,{src:parts.background,fit:'cover'})];
  for(const role of ['person','product']){const p=parts.layers?.[role];if(p)layers.push(base(role,role,'image',p.x,p.y,p.width,p.height,{src:p.src,fit:'contain'}))}
  layers.push(text('brand','YOUR BRAND',7,3.5,86,3,1.8,{bold:true}),text('category',campaign.category.toUpperCase(),7,7.7,86,3,1.6),
    text('hook',campaign.hook,7,12,86,16,7.2,{bold:true}),text('description',campaign.description,7,34,86,6,2.5,{fill:paper}),
    text('cta',campaign.cta,7,90,86,6,2.7,{fill:accent,color:'#ffffff',align:'center',bold:true}));
  return validateDocument({version:1,templateId:campaign.id,width:1080,height:1350,layers});
}
