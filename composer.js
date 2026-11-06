'use strict';
/* Turns an idea into a ready-to-edit pack: picks the best-fitting template and writes a Hook, write-up pages and a CTA.
   If the person has no idea, it proposes one. It writes first drafts offline; Hermes agents can refine them later,
   because the original idea is saved with the design as its brief. */
const Composer=(()=>{
 const STOP=new Set('the and for with that this from your you are our about into have has will can how what why when who not but all any more most just like make made get new need want create post posts social media pack idea ideas'.split(' '));
 const SEEDS=[
  ['Stop doing the same task every day','Find the task you repeat most. Write the steps once. Let an agent run it while you review the result.'],
  ['Why small teams win with AI','Small teams decide faster. AI removes the busywork. Together they ship more with less stress.'],
  ['Three habits for a calmer week','Plan the week on Monday. Batch your replies. End each day by writing tomorrow’s first task.'],
  ['How to turn one idea into ten posts','Start with one clear idea. Split it into small points. Give each point its own page and one next step.'],
  ['What your customers wish you would say','Answer the question they are afraid to ask. Show a real example. Make the next step easy.'],
  ['Make your brand sound like you','Write the way you speak. Cut the long words. Keep one voice in every post.'],
  ['The five minute content routine','Capture one thought. Shape it into a hook. Add three short points and a call to action.'],
  ['Behind the scenes of a great launch','Show the plan. Show the mistakes. Show the moment it went live and what you learned.'],
 ];
 const rnd=n=>Math.floor(Math.random()*n);
 const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const words=s=>clean(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(' ').filter(w=>w.length>3&&!STOP.has(w));
 const trim=(s,n)=>{s=clean(s);if(s.length<=n)return s;const cut=s.slice(0,n-1),i=cut.lastIndexOf(' ');return (i>n*.6?cut.slice(0,i):cut).replace(/[,;:.\-–]+$/,'')+'…'};
 const headline=s=>trim(cap(clean(s).replace(/[.!?]+$/,'')),70);

 // Template choice: the best word match; photographic templates first; a random pick when nothing matches.
 function match(idea,skip=[]){
  const kit=window.GSNKit,tokens=words(idea);
  const hay=t=>`${t.title} ${t.summary||''} ${t.topic||''} ${t.name||''} ${t.format||''}`.toLowerCase();
  const scored=kit.templates.map(t=>({t,score:tokens.reduce((n,w)=>n+(hay(t).includes(w)?1:0),0)+(t.cartoon?0:.25)})).filter(x=>!skip.includes(x.t.id));
  const best=Math.max(...scored.map(x=>x.score)),pool=scored.filter(x=>x.score>=best-(best>1?.6:1)).map(x=>x.t);
  const photo=pool.filter(t=>!t.cartoon);
  const pick=(photo.length?photo:pool);
  return pick[rnd(pick.length)].id;
 }
 const suggest=()=>SEEDS[rnd(SEEDS.length)];

 // Splits an idea into up to three short points (lines, sentences, or comma-separated parts).
 function points(text){
  let parts=String(text||'').split(/\n+/).map(clean).filter(Boolean);
  if(parts.length<2)parts=clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  if(parts.length<2)parts=clean(text).split(/\s*[;,]\s*|\s+and\s+then\s+/).map(clean).filter(w=>w.length>3);
  return parts.slice(0,4);
 }
 const BODY=[
  p=>`${cap(p.replace(/[.!?]+$/,''))}. Keep it simple, show one real example, and name the result people can expect.`,
  p=>`${cap(p.replace(/[.!?]+$/,''))}. Say it in plain words and keep each sentence short.`,
  p=>`${cap(p.replace(/[.!?]+$/,''))}. Add one example from your own work so it feels real.`,
 ];

 // Returns {templateId,title,idea,pages}. Missing pieces are generated.
 function compose(ideaText,templateId=null,{generated=false}={}){
  const kit=window.GSNKit;
  let idea=clean(ideaText),brief=idea,fromSeed=false;
  let seedBody='';
  if(!idea){const [h,b]=suggest();idea=h;seedBody=b;brief=`${h}. ${b}`;fromSeed=true}
  const id=templateId??match(idea);
  const starter=JSON.parse(JSON.stringify(kit.templateStarter(id)));
  const hook=starter[0],cta=starter[starter.length-1],content=starter.slice(1,-1);
  const parts=points(fromSeed?seedBody:idea).filter(p=>clean(p)!==clean(idea));
  const title=headline(parts.length&&!fromSeed&&idea.length>90?parts[0]:idea);
  const subject=trim(idea.replace(/[.!?]+$/,''),60);
  const pages=[{...hook,title,body:trim(fromSeed?seedBody.split('. ')[0]+'.':(parts.length>1?'Here is what matters, in a few quick pages.':'A short guide you can read in under a minute.'),160)}];
  const layouts=(content.length?content:[{deckLayout:'feature'}]);
  const want=Math.max(2,Math.min(4,parts.length||3));
  for(let i=0;i<want;i++){
   const base=layouts[i%layouts.length],p=parts[i]||['The problem','The shift','The next step'][i%3];
   const t=parts[i]?trim(cap(p.replace(/[.!?]+$/,'')).split(/[:—–-]\s/)[0],62):p;
   pages.push({...base,title:t,body:trim(parts[i]?BODY[i%BODY.length](parts[i]):`Explain ${subject.toLowerCase()} in one or two short sentences.`,260),kicker:`${String(i+1).padStart(2,'0')} / ${trim(subject,28).toUpperCase()}`});
  }
  pages.push({...cta,title:'Ready to start?',body:trim(`Save this post, share it with someone who needs it, and take the first step on ${subject.toLowerCase()} today.`,200)});
  return {templateId:id,title:trim(title,60),idea:brief,pages,generated:fromSeed||generated};
 }
 return {match,suggest,compose,points};
})();
