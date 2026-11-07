'use strict';
/* Template catalogue: filtering, cards, and the moving previews.
   Every preview is the real template rendered by the shared kit; it steps through Hook, write-up pages and CTA. */
const Library=(()=>{
 const {esc,icon}=App;
 const kit=()=>window.GSNKit;
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const styleOf=t=>t.funny?'Comic':t.month?'Monthly':t.slotKey?'Photo layouts':t.metaphor?'Business metaphors':t.cartoon?'3D agency':'Photo';
 const nameOf=t=>t.cartoon||t.slotKey?t.name:kit().gsnPhoto(t.id).name;
 const subOf=t=>`${t.slotKey?t.look:kit().palettes[t.palette][0]} · ${t.format}`;
 const roleLabel=(i,n)=>i===0?'Hook':i===n-1?'CTA':`Page ${i+1}`;

 // `tab` is the pill under the dashboard (Popular / Trending / Carousels / Stories).
 // Templates a person has removed from their library are remembered in this browser and can be restored.
 const HIDE_KEY='gsn-hidden-templates';
 const hidden=()=>{try{return new Set(JSON.parse(localStorage.getItem(HIDE_KEY)||'[]'))}catch{return new Set()}};
 const saveHidden=s=>{try{localStorage.setItem(HIDE_KEY,JSON.stringify([...s]))}catch{}};
 const hide=id=>{const s=hidden();s.add(id);saveHidden(s)};
 const restoreAll=()=>saveHidden(new Set());
 function filter({query='',format='All',style='All',tab='Popular',showHidden=false}={}){
  const gone=showHidden?new Set():hidden();
  const q=query.trim().toLowerCase();
  let list=kit().templates.filter(t=>!gone.has(t.id)&&(format==='All'||t.format===format)&&(style==='All'||styleOf(t)===style)
   &&(!q||`${nameOf(t)} ${t.name} ${t.format} ${styleOf(t)} ${t.slotKey?t.look:kit().palettes[t.palette][0]}`.toLowerCase().includes(q)));
  if(tab==='Carousels')list=list.filter(t=>t.format==='Carousel');
  else if(tab==='Stories')list=list.filter(t=>t.format==='Story');
  else if(tab==='Trending')list=list.filter(t=>t.format==='Social post'||t.format==='Quote');
  // Photographic templates lead; they are the realistic look of the dashboard.
  return list.slice().sort((a,b)=>Number(!!a.cartoon)-Number(!!b.cartoon)||a.id-b.id);
 }
 // Takes templates in turn from each style so a short strip shows the whole range, not only the first style.
 const mix=(list,n)=>{const by=new Map();for(const t of list){const k=styleOf(t);(by.get(k)||by.set(k,[]).get(k)).push(t)}const q=[...by.values()],out=[];for(let i=0;out.length<n&&q.some(a=>i<a.length);i++)for(const a of q)if(i<a.length&&out.length<n)out.push(a[i]);return out};
 const formats=()=>['All',...new Set(kit().templates.map(t=>t.format))];
 const styles=()=>['All','Photo','3D agency','Business metaphors','Photo layouts','Monthly','Comic'];

 function cardHtml(t,preset,{removable=false}={}){
  return `<article class="tcard" data-template="${t.id}"><div class="tcard-media">${removable?`<button class="tcard-x" data-hide="${t.id}" title="Remove from my library" aria-label="Remove ${esc(nameOf(t))} from my library">×</button>`:''}<div class="tpreview" data-preview="${t.id}" aria-label="${esc(nameOf(t))} preview"></div><span class="tcard-role" aria-hidden="true">Hook</span></div>
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
   this.host.style.width=fit+'%';this.host.style.aspectRatio=this.ratio;
   await KitHost.mount(this.host,KitHost.pageHtml(this.design,this.i,reduceMotion.matches?'':'animate'));
   if(this.roleEl)this.roleEl.textContent=roleLabel(this.i,n);
  }
  play(){if(this.timer||reduceMotion.matches)return;this.timer=setInterval(()=>{this.i=(this.i+1)%this.design.pages.length;this.paint()},2800)}
  stop(){clearInterval(this.timer);this.timer=0}
 }
 const previews=new WeakMap();
 let observer,hoverBound=null;
 function makeObserver(ratio,root){
  return new IntersectionObserver(entries=>{for(const e of entries){
   const host=e.target.querySelector('.tpreview');if(!host)continue;
   let p=previews.get(host);
   if(e.isIntersecting){
    if(!p){p=new Preview(host,Number(host.dataset.preview),ratio,e.target.querySelector('.tcard-role'));previews.set(host,p);p.paint().then(()=>p.play())}
    else p.play();
   }else p?.stop();
  }},{root:root||null,rootMargin:'160px'});
 }
 function hydrate(container,ratio='4 / 5',root=null){
  observer?.disconnect();
  observer=makeObserver(ratio,root);
  container.querySelectorAll('.tcard').forEach(card=>observer.observe(card));
  if(hoverBound!==container){
   hoverBound=container;
   // Hovering a card restarts its sequence from the hook so a person can scan quickly.
   container.addEventListener('mouseover',e=>{const card=e.target.closest('.tcard');const host=card?.querySelector('.tpreview');const p=host&&previews.get(host);if(p&&!card._hov){card._hov=true;p.stop();p.i=0;p.paint().then(()=>p.play())}});
   container.addEventListener('mouseout',e=>{const card=e.target.closest('.tcard');if(card&&!card.contains(e.relatedTarget))card._hov=false});
  }
 }
 // Cards added later (infinite scroll) join the same observer.
 function observeMore(cards){if(observer)cards.forEach(c=>observer.observe(c))}
 function dispose(){observer?.disconnect();observer=null}
 return {filter,mix,formats,styles,cardHtml,hydrate,observeMore,dispose,nameOf,subOf,styleOf,roleLabel,hide,restoreAll,hiddenCount:()=>hidden().size,Preview};
})();
