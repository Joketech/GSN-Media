import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const source=await readFile(new URL('./studio.js',import.meta.url),'utf8');
const photoSource=await readFile(new URL('./gsn-photo-data.js',import.meta.url),'utf8');
// Reuse the existing, trusted material layouts. No supplied code is evaluated.
const definitions=source.slice(source.indexOf('const palettes='),source.indexOf('const agents='));
const artSource=source.slice(source.indexOf('const slideElements='),source.indexOf('function card('));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sheets=await Promise.all([['campaign','campaign-atlas.png'],['automation','automation-atlas.png'],['automation-operations','automation-operations-atlas.png']].map(async([name,file])=>{
 const image=await readFile(new URL(file,import.meta.url));
 return {name,file,data:'data:image/png;base64,'+image.toString('base64')};
}));
const baseCss=(await Promise.all(['studio.css','premium.css','slot-layouts.css'].map(p=>readFile(new URL(p,import.meta.url),'utf8')))).join('\n').replace(/@import[^;]+;/g,'');
const starterSource=source.slice(source.indexOf('// How many pages a template carries'),source.indexOf('function ensureSlides('));
export function templateCatalog(){
 return vm.runInNewContext(photoSource+'\n'+definitions+starterSource+
  'templates.map(t=>{const s=templateStarter(t.id);return {id:t.id,name:t.name,format:t.format,pages:s.length,layouts:s.map(p=>p.deckLayout),...(t.slots?{slots:t.slots.map(x=>({key:x[0],label:x[1]}))}:{}),...(t.cartoon?{slides:s,ratio:"4 / 5"}:{})}})',{}, {timeout:3000});
}
// Layout names with what each one expects in its body text.
export function layoutGuide(){return vm.runInNewContext(starterSource+'LAYOUT_GUIDE',{},{timeout:1000});}
// Wording-only creation: the template supplies every design decision; the caller supplies the words.
export function composeSlides(id,copy){
 return JSON.parse(vm.runInNewContext(photoSource+'\n'+definitions+starterSource+'JSON.stringify(composePages(templateId,copy))',{templateId:id,copy},{timeout:2000}));
}
// Server-side starter pages (Hook, write-up pages, CTA) so agents can create a design without a browser.
export function starterSlides(id){
 return JSON.parse(vm.runInNewContext(photoSource+'\n'+definitions+starterSource+'JSON.stringify(templateStarter(templateId))',{templateId:id},{timeout:1000}));
}
export function renderDesign(p){
 const context={esc,state:{brand:{name:p.brand||'GSN Technology',handle:p.handle||'GSN Technology'}},input:p};
 let cards=vm.runInNewContext(photoSource+'\n'+definitions+artSource+'input.slides.map((s,i)=>art(templates[input.template_id],{...s,ratio:input.ratio,number:i+1,total:input.slides.length},input.kind==="animation"?"animate":"")).join("")',context,{timeout:1000});
 const usedPhotos=new Map();
 cards=cards.replace(/--photo-source:url\('(gsn-photo-\d+\.png)'\)/g,(_,file)=>{
  if(!usedPhotos.has(file))usedPhotos.set(file,{variable:`--gsn-sheet-${usedPhotos.size}`,data:'data:image/png;base64,'+readFileSync(new URL(file,import.meta.url)).toString('base64')});
  return `--photo-source:var(${usedPhotos.get(file).variable})`;
 });
 const photoCss=`:root{${[...usedPhotos.values()].map(({variable,data})=>`${variable}:url('${data}');`).join('')}}`;
 const css=sheets.reduce((style,{name,file,data})=>style.replaceAll(file,cards.includes(`photo-${name}"`)?data:'data:,'),baseCss)+photoCss;
 const animated=p.kind==='animation';
 const script=animated?`<script>const cards=[...document.querySelectorAll('.art')];let i=0;function show(){cards.forEach((c,n)=>{c.hidden=n!==i;c.classList.remove('animate')});void cards[i].offsetWidth;cards[i].classList.add('animate');i=(i+1)%cards.length}show();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(show,${p.scene_seconds*1000});</script>`:'';
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title||'GSN Media design')}</title><style>${css}\nbody{margin:0;min-height:100vh;padding:24px;display:grid;gap:24px;place-content:center;background:#e9eef0}.art{width:min(90vw,720px);break-after:page}.art[hidden]{display:none!important}@media print{body{display:block;padding:0}.art{width:100%;page-break-after:always}}@media(prefers-reduced-motion:reduce){.animate *{animation:none!important}}</style>${cards}${script}</html>`;
}
