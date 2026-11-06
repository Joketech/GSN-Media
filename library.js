'use strict';
/* Template catalogue: filtering, cards, and the moving previews.
   Every preview is the real template rendered by the shared kit; it steps through Hook, write-up pages and CTA. */
const Library=(()=>{
 const {esc,icon}=App;
 const kit=()=>window.GSNKit;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const styleOf=t=>t.metaphor?'Business metaphors':t.cartoon?'3D agency':'Photo';
 const nameOf=t=>t.cartoon?t.name:kit().gsnPhoto(t.id).name;
 const subOf=t=>`${kit().palettes[t.palette][0]} · ${t.format}`;
 const roleLabel=(i,n)=>i===0?'Hook':i===n-1?'CTA':`Page ${i+1}`;

 // `tab` is the pill under the dashboard (Popular / Trending / Carousels / Stories).
 function filter({query='',format='All',style='All',tab='Popular'}={}){
  const q=query.trim().toLowerCase();
  let list=kit().templates.filter(t=>(format==='All'||t.format===format)&&(style==='All'||styleOf(t)===style)
   &&(!q||`${nameOf(t)} ${t.name} ${t.format} ${styleOf(t)} ${kit().palettes[t.palette][0]}`.toLowerCase().includes(q)));
  if(tab==='Carousels')list=list.filter(t=>t.format==='Carousel');
  else if(tab==='Stories')list=list.filter(t=>t.format==='Story');
  else if(tab==='Trending')list=list.filter(t=>t.format==='Social post'||t.format==='Quote');
  // Photographic templates lead; they are the realistic look of the dashboard.
  return list.slice().sort((a,b)=>Number(!!a.cartoon)-Number(!!b.cartoon)||a.id-b.id);
 }
 const formats=()=>['All',...new Set(kit().templates.map(t=>t.format))];
 const styles=()=>['All','Photo','3D agency','Business metaphors'];

 function cardHtml(t,preset){
  return `<article class="tcard" data-template="${t.id}"><div class="tcard-media"><div class="tpreview" data-preview="${t.id}" aria-label="${esc(nameOf(t))} preview"></div><span class="tcard-role" aria-hidden="true">Hook</span></div>
  <h3 title="${esc(nameOf(t))}">${esc(nameOf(t))}</h3><p class="tsub">${esc(subOf(t))}</p>
  <div class="tcard-foot"><span class="tfrom">${esc(preset.name)}<b>${preset.w}×${preset.h}</b></span><button class="btn-dark" data-use="${t.id}">Use</button></div></article>`;
 }

 // Steps one template through its pages, only while on screen.
 class Preview{
  constructor(host,templateId,ratio,roleEl){this.host=host;this.id=templateId;this.ratio=ratio;this.roleEl=roleEl;this.i=0;this.timer=0;this.design=null}
  async paint(){
   this.design??=KitHost.starterDesign(this.id,this.ratio);
   const n=this.design.pages.length;
   // Fit any platform ratio inside the card's fixed 4:5 window.
   const [w,h]=this.ratio.split(' / ').map(Number),fit=Math.min(100,(w/h)/.8*100);
   this.host.style.width=fit+'%';
   await KitHost.mount(this.host,KitHost.pageHtml(this.design,this.i,reduceMotion.matches?'':'animate'));
   if(this.roleEl)this.roleEl.textContent=roleLabel(this.i,n);
  }
  play(){if(this.timer||reduceMotion.matches)return;this.timer=setInterval(()=>{this.i=(this.i+1)%this.design.pages.length;this.paint()},2800)}
  stop(){clearInterval(this.timer);this.timer=0}
 }
 const previews=new WeakMap();
 let observer;
 function hydrate(container,ratio='4 / 5'){
  observer?.disconnect();
  observer=new IntersectionObserver(entries=>{for(const e of entries){
   const host=e.target.querySelector('.tpreview');if(!host)continue;
   let p=previews.get(host);
   if(e.isIntersecting){
    if(!p){p=new Preview(host,Number(host.dataset.preview),ratio,e.target.querySelector('.tcard-role'));previews.set(host,p);p.paint().then(()=>p.play())}
    else p.play();
   }else p?.stop();
  }},{rootMargin:'120px'});
  container.querySelectorAll('.tcard').forEach(card=>observer.observe(card));
  // Hovering a card restarts its sequence from the hook so a person can scan quickly.
  container.addEventListener('mouseover',e=>{const card=e.target.closest('.tcard');const host=card?.querySelector('.tpreview');const p=host&&previews.get(host);if(p&&!card._hov){card._hov=true;p.stop();p.i=0;p.paint().then(()=>p.play())}});
  container.addEventListener('mouseout',e=>{const card=e.target.closest('.tcard');if(card&&!card.contains(e.relatedTarget))card._hov=false});
 }
 function dispose(){observer?.disconnect();observer=null}
 return {filter,formats,styles,cardHtml,hydrate,dispose,nameOf,subOf,styleOf,roleLabel,Preview};
})();
