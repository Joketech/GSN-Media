'use strict';
/* Rain on a window. Round beads of water cling to the glass, each one a small lens that shows the scene behind it upside down;
   now and then a bead grows heavy, runs down the glass in a wobbling line, gathers the beads it meets and leaves a thin wet trail.
   Two canvases, both behind the page: .water paints soft bokeh lights; .water-front paints the drops. Neither catches clicks.
   The beads sample an off-screen copy of the same scene, so what shows inside a drop is what is really behind it.
   Everything pauses when the dashboard is hidden and stops when motion is switched off. */
const Water=(()=>{
 let sparse=false;const DENSITY=()=>sparse?15000:2700;
 let mirror=null,mctx=null,back,front,bctx,fctx,w=0,h=0,dpr=1,scene,sceneCtx,layer,layerCtx,beads=[],trails=[],running=false,last=0,dirty=true,layerAt=0,still=false,seed=7;
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const rand=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const motionOn=()=>document.documentElement.dataset.motion!=='off';

 function mk(){const c=document.createElement('canvas');c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return [c,x]}
 function ell(x,cx,cy,rx,ry,colour,stop){x.save();x.translate(cx,cy);x.scale(1,ry/rx);const g=x.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,colour);g.addColorStop(stop,colour.slice(0,7)+'00');x.fillStyle=g;x.fillRect(-rx,-rx*(rx/ry),rx*2,rx*2*(rx/ry));x.restore()}

 // The scene the drops look at: the pastel backdrop plus soft out-of-focus lights.
 let bgImg=new Image(),sceneEl=null,sceneSrc='room-bg.jpg';bgImg.src=sceneSrc;bgImg.onload=()=>{if(w)size()};
 function setScene(src,elm){sceneEl=elm||null;if(src&&src!==sceneSrc){sceneSrc=src;bgImg=new Image();bgImg.onload=()=>{if(w)size()};bgImg.src=src}}
 function paintScene(x,lightsOnly){
  if(!lightsOnly){x.fillStyle='#e8e3f1';x.fillRect(0,0,w,h);
  if(bgImg.complete&&bgImg.naturalWidth){
   // A page whose backdrop is a positioned picture (the entrance screen) passes that element, so the drops show exactly what is behind them.
   const cs=sceneEl?getComputedStyle(sceneEl):null,sz=cs?.backgroundSize.match(/^([\d.]+)px\s+([\d.]+)px$/),ps=cs?.backgroundPosition.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px$/);
   if(sz&&ps)x.drawImage(bgImg,+ps[1],+ps[2],+sz[1],+sz[2]);
   else{const k=Math.max(w/bgImg.naturalWidth,h/bgImg.naturalHeight);x.drawImage(bgImg,(w-bgImg.naturalWidth*k)/2,(h-bgImg.naturalHeight*k)/2,bgImg.naturalWidth*k,bgImg.naturalHeight*k)}}else{
  ell(x,w*.12,h*.18,w*.6*.7,h*.55*.7,'#bcd9f7',1);ell(x,w*.88,h*.12,w*.5*.7,h*.5*.7,'#f6c9dc',1);
  ell(x,w*.8,h*.88,w*.55*.7,h*.6*.7,'#c4ead9',1);ell(x,w*.18,h*.9,w*.5*.7,h*.5*.7,'#fbd9bd',1);ell(x,w*.5,h*.5,w*.4*.75,h*.4*.75,'#ddd2f6',1)}}
  seed=11;
  const lights=['#ffd18a','#ff9fc0','#8fd3ff','#ffe9a8','#b9a6ff','#9ff0d0','#ffb3a0'];
  const n=Math.round(w*h/26000);
  for(let i=0;i<n;i++){
   const r=14+rand()*rand()*52,cx=rand()*w,cy=rand()*h,c=lights[Math.floor(rand()*lights.length)];
   const g=x.createRadialGradient(cx,cy,r*.1,cx,cy,r);g.addColorStop(0,c+'cc');g.addColorStop(.78,c+'88');g.addColorStop(.93,c+'bb');g.addColorStop(1,c+'00');
   x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();
  }
 }
 function size(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  w=front.clientWidth;h=front.clientHeight;
  for(const c of [front,back]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  fctx.setTransform(dpr,0,0,dpr,0,0);bctx.setTransform(dpr,0,0,dpr,0,0);
  [scene,sceneCtx]=mk();paintScene(sceneCtx);
  [layer,layerCtx]=mk();
  // Back canvas: only the lights, so the pastel backdrop under it keeps drifting.
  const [lc,lx]=mk();paintScene(lx,true);bctx.clearRect(0,0,w,h);bctx.save();bctx.globalAlpha=sparse?0:.55;bctx.drawImage(lc,0,0,w,h);bctx.restore();
 }

 // A bead is placed so it does not sit on top of another; small ones are many, large ones few.
 function newBead(y){
  const roll=Math.random(),r=sparse?(roll<.85?rnd(1.8,4):rnd(4.5,7.5)):roll<.5?rnd(1.2,2.6):roll<.8?rnd(2.6,5.5):roll<.95?rnd(5.5,9):rnd(9,14);
  return {x:rnd(0,w),y:y??rnd(0,h),r,vy:0,run:false,wait:rnd(3,16),trail:null,ph:rnd(0,6.3)};
 }
 function fits(b){for(const o of beads){const d=Math.hypot(o.x-b.x,o.y-b.y);if(d<(o.r+b.r)*.85)return false}return true}
 function place(y){for(let i=0;i<14;i++){const b=newBead(y);if(fits(b))return b}return null}
 function seed0(){beads=[];trails=[];const n=Math.round(w*h/DENSITY());for(let i=0;i<n*3&&beads.length<n;i++){const b=place();if(b)beads.push(b)}dirty=true}

 function step(dt){
  let changed=false,runners=beads.reduce((n,b)=>n+(b.run?1:0),0);
  for(const b of beads){
   if(!b.run){
    // Resting beads swell very slowly as more mist settles; the heavy ones begin to run.
    b.r+=dt*(b.r<9?.045:.02);b.wait-=dt;
    if(b.r>6.4&&b.wait<0&&runners<(sparse?1:5)&&Math.random()<dt*(sparse?.06:.25)){runners++;b.run=true;b.vy=rnd(10,22);b.trail={pts:[[b.x,b.y]],age:0,r:b.r,bits:[]};changed=true}
   }else{
    // A running drop stutters: it speeds up, catches on the glass, speeds up again.
    b.stick=(b.stick||0)-dt;
    if(b.stick<=0&&Math.random()<dt*1.1){b.stick=rnd(.12,.5);b.vy*=.25}
    b.vy=Math.min(b.vy+dt*(70+b.r*9),210);b.y+=b.vy*dt*(b.stick>0?.2:1);b.x+=Math.sin(b.y*.045+b.ph)*dt*4.5;
    b.r=Math.max(2.8,b.r-dt*.28);
    const t=b.trail,lastP=t.pts[t.pts.length-1];
    if(Math.hypot(b.x-lastP[0],b.y-lastP[1])>6)t.pts.push([b.x,b.y]);
    // It leaves a few tiny beads behind in its wake.
    if(Math.random()<dt*2){const nb={x:b.x+rnd(-b.r*.6,b.r*.6),y:b.y-b.r-rnd(2,14),r:rnd(.9,1.9),vy:0,run:false,wait:rnd(6,20),trail:null,ph:rnd(0,6)};beads.push(nb);lens(layerCtx,nb.x,nb.y,nb.r)}
    // ...and swallows the resting beads it touches.
    for(const o of beads){if(o!==b&&!o.run&&!o.dead&&o.r<b.r&&Math.abs(o.y-b.y)<b.r+o.r&&Math.abs(o.x-b.x)<b.r*.9+o.r){o.dead=true;b.r=Math.min(14,Math.sqrt(b.r*b.r+o.r*o.r*.5));changed=true}}
    if(b.vy>120&&Math.random()<dt*.5){b.run=false;b.wait=rnd(6,16);b.vy=0;trails.push(b.trail);b.trail=null;lens(layerCtx,b.x,b.y,b.r)}
    if(b.y>h+30){b.dead=true;if(b.trail)trails.push(b.trail);changed=true}
   }
  }
  if(beads.some(b=>b.dead)){beads=beads.filter(b=>!b.dead);const need=Math.round(w*h/DENSITY())-beads.length;for(let i=0;i<Math.min(need,4);i++){const b=place(Math.random()<.6?rnd(-10,h*.25):undefined);if(b)beads.push(b)}changed=true}
  for(const t of trails)t.age+=dt;
  trails=trails.filter(t=>t.age<12);if(trails.length>20)trails.splice(0,trails.length-20);
  if(changed)dirty=true;
 }

 // One bead as a lens. Big enough beads show the scene behind them turned upside down.
 function lens(c,x,y,r,tall=1){
  const crisp=c===layerCtx||c===mlCtx;
  const rx=r,ry=r*tall;
  // contact shadow
  c.fillStyle='rgba(40,40,90,.13)';c.beginPath();c.ellipse(x+r*.22,y+ry*.42,rx*1.04,ry*.98,0,0,Math.PI*2);c.fill();
  if(r>=2.2){
   c.save();c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.clip();
   const R=r*2.3;let sx=Math.max(0,Math.min(w-2*R,x-R)),sy=Math.max(0,Math.min(h-2*R,y-R*tall));
   c.translate(x,y);c.rotate(Math.PI);c.globalAlpha=.97;
   if(crisp)c.filter='saturate(1.7) contrast(1.25) brightness(.92)';c.drawImage(scene,sx*dpr,sy*dpr,2*R*dpr,2*R*tall*dpr,-rx,-ry,2*rx,2*ry);if(crisp)c.filter='none';c.globalAlpha=1;c.rotate(-Math.PI);c.translate(-x,-y);
   // the glass edge darkens, the lower edge catches light
   const g=c.createRadialGradient(x,y-ry*.15,Math.min(rx,ry)*.45,x,y,Math.max(rx,ry));
   g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.72,'rgba(60,70,120,.08)');g.addColorStop(1,'rgba(30,40,95,.55)');
   c.fillStyle=g;c.fillRect(x-rx,y-ry,2*rx,2*ry);
   // the upper half reads darker (it shows the dim lower scene), like a real bead
   const tg=c.createLinearGradient(x,y-ry,x,y+ry*.2);tg.addColorStop(0,'rgba(20,30,75,.34)');tg.addColorStop(1,'rgba(20,30,75,0)');c.fillStyle=tg;c.fillRect(x-rx,y-ry,2*rx,ry*1.2);
   const lg=c.createLinearGradient(x,y+ry*.25,x,y+ry);lg.addColorStop(0,'rgba(255,255,255,0)');lg.addColorStop(1,'rgba(255,255,255,.55)');
   c.fillStyle=lg;c.fillRect(x-rx,y+ry*.25,2*rx,ry*.75);
   c.restore();
  }else{
   c.fillStyle='rgba(205,220,245,.55)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  }
  // rim: dark below-right, bright above-left, then a sharp highlight
  c.lineWidth=Math.max(.6,r*.1);
  c.strokeStyle='rgba(40,55,110,.55)';c.beginPath();c.ellipse(x,y,rx-.3,ry-.3,0,Math.PI*.05,Math.PI*.95);c.stroke();
  c.strokeStyle='rgba(255,255,255,.95)';c.beginPath();c.ellipse(x,y,rx-.3,ry-.3,0,Math.PI*1.12,Math.PI*1.82);c.stroke();
  c.fillStyle='rgba(255,255,255,.97)';c.beginPath();c.ellipse(x-rx*.4,y-ry*.42,Math.max(.6,rx*.2),Math.max(.45,ry*.12),-.65,0,Math.PI*2);c.fill();
  if(r>5){c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.arc(x+rx*.42,y+ry*.5,Math.max(.7,r*.08),0,Math.PI*2);c.fill()}
 }
 function drawTrail(c,t){
  if(t.pts.length<2)return;
  const fade=Math.max(0,1-t.age/12),wd=Math.max(1,t.r*.2);
  c.lineCap='round';c.lineJoin='round';
  c.beginPath();c.moveTo(t.pts[0][0],t.pts[0][1]);for(const p of t.pts)c.lineTo(p[0],p[1]);
  c.lineWidth=wd+1.4;c.strokeStyle=`rgba(50,65,120,${.1*fade})`;c.stroke();
  c.lineWidth=wd;c.strokeStyle=`rgba(225,236,255,${.32*fade})`;c.stroke();
  c.beginPath();c.moveTo(t.pts[0][0]-wd*.22,t.pts[0][1]);for(const p of t.pts)c.lineTo(p[0]-wd*.22,p[1]);
  c.lineWidth=Math.max(.5,wd*.28);c.strokeStyle=`rgba(255,255,255,${.78*fade})`;c.stroke();
 }
 function paintLayer(){
  layerCtx.clearRect(0,0,w,h);
  for(const b of beads)if(!b.run)lens(layerCtx,b.x,b.y,b.r);
  dirty=false;layerAt=performance.now();mStale=true;
 }
 function draw(){
  if(dirty&&performance.now()-layerAt>700)paintLayer();
  fctx.clearRect(0,0,w,h);
  fctx.drawImage(layer,0,0,w,h);
  for(const t of trails)drawTrail(fctx,t);
  for(const b of beads){if(!b.run)continue;drawTrail(fctx,b.trail);lens(fctx,b.x,b.y,b.r,1.28)}
  copyMirror();
 }
 // Drops also run over the globe card. That card is opaque, so its drops are drawn here and show the card's own picture
 // (the globe and the hand) upside down, instead of the room behind the window.
 let heroImg=null,heroScene=null,mLayer=null,mlCtx=null,mKey='',mStale=true;
 function loadHero(){if(heroImg)return;heroImg=new Image();heroImg.src='hero-realistic.jpg';heroImg.onload=()=>{mKey=''}}
 function copyMirror(){
  if(!mirror||!mirror.isConnected||!front)return;
  loadHero();
  const fr=front.getBoundingClientRect(),hr=mirror.parentElement.getBoundingClientRect(),W=Math.round(hr.width),H=Math.round(hr.height);
  if(!W||!H||!heroImg.complete||!heroImg.naturalWidth)return;
  const ox=hr.left-fr.left,oy=hr.top-fr.top,key=[Math.round(ox),Math.round(oy),W,H,w,h,dpr].join();
  if(key!==mKey){
   mKey=key;mStale=true;
   mirror.width=Math.round(W*dpr);mirror.height=Math.round(H*dpr);mctx.setTransform(dpr,0,0,dpr,0,0);
   [heroScene]=mk();const sx=heroScene.getContext('2d');sx.setTransform(dpr,0,0,dpr,0,0);
   const k=Math.max(W/heroImg.naturalWidth,H/heroImg.naturalHeight),iw=heroImg.naturalWidth*k,ih=heroImg.naturalHeight*k;
   sx.save();sx.beginPath();sx.rect(ox,oy,W,H);sx.clip();sx.drawImage(heroImg,ox+(W-iw)/2,oy+(H-ih)*.55,iw,ih);sx.restore();
   mLayer=document.createElement('canvas');mLayer.width=Math.round(W*dpr);mLayer.height=Math.round(H*dpr);mlCtx=mLayer.getContext('2d');mlCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  const keep=scene;scene=heroScene;
  if(mStale){
   mlCtx.clearRect(0,0,W,H);mlCtx.save();mlCtx.translate(-ox,-oy);
   for(const b of beads)if(!b.run&&b.x>ox-20&&b.x<ox+W+20&&b.y>oy-20&&b.y<oy+H+20)lens(mlCtx,b.x,b.y,b.r);
   mlCtx.restore();mStale=false;
  }
  mctx.clearRect(0,0,W,H);mctx.drawImage(mLayer,0,0,W,H);
  mctx.save();mctx.translate(-ox,-oy);
  for(const t of trails)drawTrail(mctx,t);
  for(const b of beads){if(!b.run)continue;drawTrail(mctx,b.trail);lens(mctx,b.x,b.y,b.r,1.28)}
  mctx.restore();scene=keep;
 }
 function setMirror(c){mirror=c||null;mctx=c?c.getContext('2d'):null;if(c&&front)copyMirror()}
 function frame(now){
  if(!running)return;
  if(!front.isConnected||front.offsetParent===null||document.hidden||!motionOn()){running=false;return}
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(front.clientWidth!==w||front.clientHeight!==h){size();seed0()}
  step(dt);draw();requestAnimationFrame(frame);
 }
 function still1(){paintLayer();fctx.clearRect(0,0,w,h);fctx.drawImage(layer,0,0,w,h);copyMirror()}
 function start(el,opts){
  sparse=!!opts?.sparse;setScene(opts?.scene||'room-bg.jpg',opts?.sceneEl);
  back=el;front=el.parentElement.querySelector('.water-front');if(!front)return;
  bctx=back.getContext('2d');fctx=front.getContext('2d');
  size();seed0();
  if(!front._wired){front._wired=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()})}
  resume();
 }
 function resume(){
  if(!front)return;
  if(!motionOn()||matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.motion!=='on'){still1();return}
  if(running)return;running=true;last=performance.now();requestAnimationFrame(frame);
 }
 // Called by the motion switch.
 function setMotion(){if(!front)return;if(motionOn())resume();else{running=false;still1()}}
 // For pages that have no rain layer of their own (the studios): builds one behind everything and starts it.
 function attach(opts){
  const old=document.querySelector('.rain-layer');if(old){start(old.querySelector('.water'),{sparse:false});return}
  const L=document.createElement('div');L.className='rain-layer';L.setAttribute('aria-hidden','true');
  L.style.cssText='position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden';if(opts?.bg)L.style.background=opts.bg;
  const cv='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  L.innerHTML='<div style="position:absolute;inset:0;background:url(room-bg.jpg) center/cover no-repeat;opacity:'+(opts?.veil??.3)+'"></div><canvas class="water" style="'+cv+'"></canvas><canvas class="water-front" style="'+cv+'"></canvas>';
  document.body.prepend(L);start(L.querySelector('.water'),{sparse:false});
 }
 function detach(){document.querySelector('.rain-layer')?.remove()}
 return {start,resume,setMotion,setMirror,attach,detach};
})();
