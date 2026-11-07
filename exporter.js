'use strict';
/* Export: PNG / JPEG / PDF / HTML / MP4. Rendering helpers are lifted from the classic studio so output matches it exactly. */
const Exporter=(()=>{
function download(content,name,type='text/plain'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function inlineGsnPhotos(cards,direct=false){
 const files=new Set([...cards.matchAll(/--photo-source:url\('(gsn-photo-\d+\.png)'\)/g)].map(match=>match[1]));
 const properties=[];
 for(const file of files){
  const response=await fetch(file);
  if(!response.ok)throw new Error(`Missing photo: ${file}`);
  const blob=await response.blob();
  // The photo sheets are opaque; re-encoding them as JPEG keeps the embedded export small enough for browsers to render reliably.
  const bitmap=await createImageBitmap(blob),sheet=document.createElement('canvas');sheet.width=bitmap.width;sheet.height=bitmap.height;
  sheet.getContext('2d').drawImage(bitmap,0,0);
  const transparentPortrait=Number(file.match(/\d+/)[0])>=52;
  const data=sheet.toDataURL(transparentPortrait?'image/png':'image/jpeg',.92);
  if(direct){cards=cards.replaceAll(`--photo-source:url('${file}')`,`--photo-source:url('${data}')`);continue}
  const variable=`--gsn-sheet-${properties.length}`;
  properties.push(`${variable}:url('${data}');`);
  cards=cards.replaceAll(`--photo-source:url('${file}')`,`--photo-source:var(${variable})`);
 }
 return `<style>:root{${properties.join('')}}</style>${cards}`;
}
async function campaignExportCss(cards){
 const files=[['campaign','campaign-atlas.png'],['automation','automation-atlas.png'],['automation-operations','automation-operations-atlas.png']];
 const read=async(path)=>{const response=await fetch(path);if(!response.ok)throw new Error(`Missing export asset: ${path}`);return response;};
 const [base, premium, ...images]=await Promise.all([
  read('studio.css').then(response=>response.text()), read('premium.css').then(response=>response.text()),
  ...files.map(async([sheet,path])=>{
   if(!cards.includes(`photo-${sheet}"`))return 'data:,';
   const blob=await read(path).then(response=>response.blob());
   return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
  }),
 ]);
 const seasonal=cards.includes('greeting-poster')?await read('greetings.css').then(response=>response.text()):'';
 return `${base}\n${files.reduce((css,[,name],index)=>css.replaceAll(name,images[index]),premium)}\n${seasonal}`;
}
function loadDesignImage(source){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(Error('Could not load design artwork.'));
  image.src=source;
 });
}
async function rasterDesignPage(card,css,width,height){
 const markup=await inlineGsnPhotos(card,true);
 const documentBody=document.createElement('div');
 documentBody.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 documentBody.innerHTML=`<style>${css} .art{width:${width}px!important;height:${height}px!important;border-radius:0!important;margin:0!important} *{animation:none!important}</style>${markup}`;
 // Foreign-object rendering requires well-formed XHTML and self-contained assets.
 documentBody.querySelectorAll('style').forEach(style=>style.textContent=style.textContent.replaceAll(':root','div[xmlns]'));
 const xhtml=new XMLSerializer().serializeToString(documentBody);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
 const image=await loadDesignImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 canvas.getContext('2d').drawImage(image,0,0);
 return canvas;
}

function canvasImage(canvas,type){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode this format.')),type,.92));
}

async function designPdf(canvases,width,height,scale){
 const encoder=new TextEncoder(),parts=[],offsets=[0];
 let length=0;
 const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
 const object=(id,content)=>{offsets[id]=length;append(`${id} 0 obj\n`);for(const part of content)append(part);append('\nendobj\n');};
 const pageWidth=width*.375/scale,pageHeight=height*.375/scale;
 append('%PDF-1.4\n');
 object(1,['<< /Type /Catalog /Pages 2 0 R >>']);
 object(2,[`<< /Type /Pages /Count ${canvases.length} /Kids [${canvases.map((_,i)=>3+i*3+' 0 R').join(' ')}] >>`]);
 for(let index=0;index<canvases.length;index++){
  const id=3+index*3, jpg=new Uint8Array(await (await canvasImage(canvases[index],'image/jpeg')).arrayBuffer());
  const paint=`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q\n`;
  object(id,[`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`]);
  object(id+1,[`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,jpg,'\nendstream']);
  object(id+2,[`<< /Length ${paint.length} >>\nstream\n${paint}endstream`]);
 }
 const xref=length;
 append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}

async function designVideoBlob(images){
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 canvas.width=images[0].width;canvas.height=images[0].height;
 const stream=canvas.captureStream(25);
 try{
  const recorder=new MediaRecorder(stream,{mimeType:'video/mp4'});
  const chunks=[];
  const complete=new Promise((resolve,reject)=>{
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/mp4'}));
   recorder.onerror=()=>reject(Error('MP4 recording failed.'));
  });
  context.drawImage(images[0],0,0);
  recorder.start();
  for(const image of images){
   const end=performance.now()+2000;
   while(performance.now()<end){context.drawImage(image,0,0);await new Promise(resolve=>setTimeout(resolve,40));}
  }
  recorder.stop();
  return await complete;
 }finally{stream.getTracks().forEach(track=>track.stop());}
}
async function downloadDesignVideo(images){download(await designVideoBlob(images),'gsn-design.mp4','video/mp4')}
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const safe=s=>String(s||'design').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'design';
 async function css(cards){return `${await campaignExportCss(cards)}\n${await fetch('free-layers.css').then(r=>r.text())}`}
 // opts: {pages:[indices], type:'png'|'jpeg'|'pdf'|'mp4'|'html', scale:1|2, onProgress}
 async function run(design,{pages,type,scale=1,onProgress=()=>{}}){
  const [rw,rh]=design.ratio.split(' / ').map(Number);
  const W=Math.round(design.size.w*scale),H=Math.round(design.size.h*scale);
  const cards=pages.map(i=>KitHost.pageHtml(design,i));
  const style=await css(cards.join(''));
  const name=safe(design.title);
  if(type==='html'){
   const body=cards.map(c=>`<section class="frame">${c}</section>`).join('');
   download(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${GSNKit.esc(design.title)}</title><style>${style}body{margin:0;background:#111;display:grid;gap:24px;justify-items:center;padding:24px}.frame{width:min(100%,${design.size.w/2}px)}</style>${await inlineGsnPhotos(body)}`,`${name}.html`,'text/html');return}
  const canvases=[];
  for(let i=0;i<cards.length;i++){onProgress(i,cards.length);canvases.push(await rasterDesignPage(cards[i],style,W,H));await sleep(0)}
  if(type==='pdf')download(await designPdf(canvases,W,H,scale),`${name}.pdf`,'application/pdf');
  else if(type==='mp4')await downloadDesignVideo(await Promise.all(canvases.map(c=>loadDesignImage(c.toDataURL('image/png')))));
  else{
   const mime=type==='jpeg'?'image/jpeg':'image/png',ext=type==='jpeg'?'jpg':'png';
   for(let i=0;i<canvases.length;i++){download(await canvasImage(canvases[i],mime),`${name}-${String(pages[i]+1).padStart(2,'0')}.${ext}`,mime);await sleep(250)}
  }
  onProgress(cards.length,cards.length);
 }
 // Pictures (or one slideshow video) as files in memory, for scheduling. Returns [{name,blob,type}].
 async function renderBlobs(design,{pages,scale=1,video=false,onProgress=()=>{}}){
  const W=Math.round(design.size.w*scale),H=Math.round(design.size.h*scale);
  const cards=pages.map(i=>KitHost.pageHtml(design,i));const style=await css(cards.join(''));
  const canvases=[];for(let i=0;i<cards.length;i++){onProgress(i,cards.length);canvases.push(await rasterDesignPage(cards[i],style,W,H));await sleep(0)}
  if(video)return [{name:'slideshow.mp4',type:'video',blob:await designVideoBlob(await Promise.all(canvases.map(c=>loadDesignImage(c.toDataURL('image/png')))))}];
  const out=[];for(let i=0;i<canvases.length;i++)out.push({name:`${String(i+1).padStart(2,'0')}.png`,type:'image',blob:await canvasImage(canvases[i],'image/png')});
  return out;
 }
 return {run,renderBlobs,inlineGsnPhotos,rasterDesignPage,css};
})();
