import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./studio.js',import.meta.url),'utf8');
// Reuse the existing, trusted material layouts. No supplied code is evaluated.
const definitions=source.slice(source.indexOf('const palettes='),source.indexOf('const agents='));
const artSource=source.slice(source.indexOf('function art('),source.indexOf('function card('));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=(await Promise.all(['studio.css','premium.css'].map(p=>readFile(new URL(p,import.meta.url),'utf8')))).join('\n').replace(/@import[^;]+;/g,'');
export function templateCatalog(){return vm.runInNewContext(definitions+'templates.map(t=>({id:t.id,name:t.name,format:t.format}))',{}, {timeout:1000});}
export function renderDesign(p){
 const context={esc,state:{brand:{name:p.brand||'GSN Media',handle:p.handle||'@gsnmedia'}},input:p};
 const cards=vm.runInNewContext(definitions+artSource+'input.slides.map((s,i)=>art(templates[input.template_id],{title:s.title,body:s.body,ratio:input.ratio,number:i+1},input.kind==="animation"?"animate":"")).join("")',context,{timeout:1000});
 const animated=p.kind==='animation';
 const script=animated?`<script>const cards=[...document.querySelectorAll('.art')];let i=0;function show(){cards.forEach((c,n)=>{c.hidden=n!==i;c.classList.remove('animate')});void cards[i].offsetWidth;cards[i].classList.add('animate');i=(i+1)%cards.length}show();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(show,${p.scene_seconds*1000});</script>`:'';
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title||'GSN Media design')}</title><style>${css}\nbody{margin:0;min-height:100vh;padding:24px;display:grid;gap:24px;place-content:center;background:#e9eef0}.art{width:min(90vw,720px);break-after:page}.art[hidden]{display:none!important}@media print{body{display:block;padding:0}.art{width:100%;page-break-after:always}}@media(prefers-reduced-motion:reduce){.animate *{animation:none!important}}</style>${cards}${script}</html>`;
}
