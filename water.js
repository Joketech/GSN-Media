'use strict';
/* Rain on still water: falling drops, splash crowns and expanding ripples, drawn on a canvas behind the glass panel.
   It pauses whenever the dashboard is hidden, and stays still for people who prefer reduced motion. */
const Water=(()=>{
 let glass=false,beads=[],trails=[],light=false,canvas,ctx,w=0,h=0,dpr=1,ripples=[],drops=[],sparks=[],next=0,running=false,last=0,moveAt=0,still=false;
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function size(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function ripple(x,y,power=1){
  const max=rnd(120,230)*power;
  for(let i=0;i<3;i++)ripples.push({x,y,r:0,max:max*(1-i*.22),speed:rnd(55,75)*power,delay:i*.16,age:-i*.16,width:2.2-i*.5});
 }
 function drop(x,y,power=1,fall=true){
  if(!fall){ripple(x,y,power);splash(x,y,power);return}
  drops.push({x,y,top:y-rnd(120,220),t:0,dur:rnd(.18,.28),power});
 }
 function splash(x,y,power){
  const n=Math.round(rnd(6,10)*power);
  for(let i=0;i<n;i++){const a=rnd(-Math.PI*.85,-Math.PI*.15);const v=rnd(40,110)*power;sparks.push({x,y,vx:Math.cos(a)*v*.7,vy:Math.sin(a)*v,life:0,max:rnd(.35,.7)})}
 }
 function step(dt){
  next-=dt;
  if(next<=0){next=rnd(.3,1.05);drop(rnd(w*.04,w*.96),rnd(h*.12,h*.92),rnd(.7,1.25))}
  for(const d of drops){d.t+=dt}
  drops=drops.filter(d=>{if(d.t>=d.dur){ripple(d.x,d.y,d.power);splash(d.x,d.y,d.power);return false}return true});
  for(const r of ripples){r.age+=dt;if(r.age>0)r.r=r.age*r.speed*(1-Math.min(.55,r.age*.18))}
  ripples=ripples.filter(r=>r.r<r.max);
  for(const s of sparks){s.life+=dt;s.vy+=320*dt;s.x+=s.vx*dt;s.y+=s.vy*dt}
  sparks=sparks.filter(s=>s.life<s.max);
 }
 function draw(){
  ctx.clearRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';
  for(const d of drops){
   const p=d.t/d.dur,y=d.top+(d.y-d.top)*p*p;
   const g=ctx.createLinearGradient(d.x,y-26,d.x,y);g.addColorStop(0,'rgba(220,255,240,0)');g.addColorStop(1,light?'rgba(255,255,255,.95)':'rgba(235,255,248,.85)');
   ctx.strokeStyle=g;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(d.x,y-26);ctx.lineTo(d.x,y);ctx.stroke();
  }
  for(const r of ripples){
   if(r.age<=0||r.r<1)continue;
   const life=1-r.r/r.max,a=Math.pow(life,1.6);
   // Rings are squashed vertically, as water seen at a low angle.
   const ry=r.r*.42;
   ctx.lineWidth=r.width*1.25;
   ctx.strokeStyle=`rgba(255,255,255,${.95*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.stroke();
   ctx.lineWidth=r.width*.7;ctx.strokeStyle=`rgba(70,125,165,${.75*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y+2,r.r*.985,ry*.985,0,0,Math.PI*2);ctx.stroke();
   if(r.r<r.max*.5){const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.r);g.addColorStop(0,`rgba(255,255,255,${.3*a})`);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.fill()}
  }
  for(const s of sparks){const a=1-s.life/s.max;ctx.fillStyle=light?`rgba(255,255,255,${1*a})`:`rgba(235,255,248,${.8*a})`;ctx.beginPath();ctx.arc(s.x,s.y,1.6,0,Math.PI*2);ctx.fill()}
  ctx.globalCompositeOperation='source-over';
 }

 /* Rain on a window: beads of water that cling, grow, then run down the glass leaving a trail. */
 function bead(y){
  const roll=Math.random(),r=roll<.74?rnd(1.4,4.2):roll<.95?rnd(4.5,9):rnd(9.5,15);
  return {x:rnd(0,w),y:y??rnd(0,h),r,vy:0,run:false,wait:rnd(2,14),trail:null,hue:rnd(0,1)};
 }
 function seedGlass(){beads=[];const n=Math.round(w*h/3200);for(let i=0;i<n;i++)beads.push(bead());trails=[]}
 function stepGlass(dt){
  for(const b of beads){
   if(!b.run){
    b.r+=dt*.05*(b.r<9?1:.4);b.wait-=dt;
    if(b.r>10.5&&b.wait<0&&Math.random()<dt*.5){b.run=true;b.vy=rnd(14,28);b.trail={pts:[[b.x,b.y]],age:0,r:b.r}}
   }else{
    b.vy=Math.min(b.vy+dt*(60+b.r*8),230);b.y+=b.vy*dt;b.x+=Math.sin(b.y*.05+b.hue*6)*dt*5;
    b.r=Math.max(4.5,b.r-dt*.35);
    const t=b.trail,last=t.pts[t.pts.length-1];if(Math.hypot(b.x-last[0],b.y-last[1])>3)t.pts.push([b.x,b.y]);
    // The running drop gathers the small beads it passes.
    for(const o of beads){if(o!==b&&!o.run&&Math.abs(o.y-b.y)<b.r+o.r&&Math.abs(o.x-b.x)<b.r*.8+o.r&&o.r<b.r){o.dead=true;b.r=Math.min(18,Math.sqrt(b.r*b.r+o.r*o.r*.35))}}
    if(b.vy>140&&Math.random()<dt*.55){b.run=false;b.wait=rnd(4,10);b.vy=0;trails.push(b.trail);b.trail=null}
    if(b.y>h+30){b.dead=true;if(b.trail)trails.push(b.trail)}
   }
  }
  const fresh=beads.filter(b=>b.dead).length;
  beads=beads.filter(b=>!b.dead);
  for(let i=0;i<fresh;i++)beads.push(bead(Math.random()<.5?rnd(-10,h*.3):undefined));
  for(const t of trails)t.age+=dt;
  trails=trails.filter(t=>t.age<16);
 }
 function drawBead(b){
  const {x,y,r}=b;
  // Soft contact shadow, then the lens: clear in the middle, darker rim below, bright rim above, tiny specular.
  ctx.fillStyle='rgba(60,60,110,.10)';ctx.beginPath();ctx.ellipse(x+r*.25,y+r*.5,r*1.02,r*.95,0,0,Math.PI*2);ctx.fill();
  const g=ctx.createRadialGradient(x-r*.25,y-r*.35,r*.1,x,y,r);
  g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(.55,'rgba(210,225,245,.16)');g.addColorStop(1,'rgba(70,90,150,.34)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  if(r>3){
   // Refraction: the scene appears upside-down and warmer in the lower half of the bead.
   const lg=ctx.createLinearGradient(x,y-r,x,y+r);lg.addColorStop(0,'rgba(120,150,215,.0)');lg.addColorStop(.55,'rgba(255,205,170,.18)');lg.addColorStop(1,'rgba(255,190,200,.36)');
   ctx.fillStyle=lg;ctx.beginPath();ctx.arc(x,y,r*.92,0,Math.PI*2);ctx.fill();
  }
  ctx.lineWidth=Math.max(.7,r*.12);ctx.strokeStyle='rgba(60,75,130,.42)';ctx.beginPath();ctx.arc(x,y,r-.4,Math.PI*.05,Math.PI*.95);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(x,y,r-.4,Math.PI*1.1,Math.PI*1.85);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.ellipse(x-r*.38,y-r*.42,Math.max(.6,r*.2),Math.max(.5,r*.13),-.6,0,Math.PI*2);ctx.fill();
 }
 function drawGlass(){
  ctx.clearRect(0,0,w,h);
  for(const t of [...trails,...beads.filter(b=>b.trail).map(b=>b.trail)]){
   if(t.pts.length<2)continue;
   const fade=Math.max(0,1-t.age/16);
   ctx.lineCap='round';ctx.lineJoin='round';
   const wd=Math.max(1.2,t.r*.34);
   ctx.beginPath();ctx.moveTo(t.pts[0][0],t.pts[0][1]);for(const p of t.pts)ctx.lineTo(p[0],p[1]);
   ctx.lineWidth=wd+1.6;ctx.strokeStyle=`rgba(70,85,140,${.16*fade})`;ctx.stroke();
   ctx.lineWidth=wd;ctx.strokeStyle=`rgba(235,242,255,${.38*fade})`;ctx.stroke();
   ctx.lineWidth=Math.max(.6,wd*.3);ctx.strokeStyle=`rgba(255,255,255,${.7*fade})`;ctx.beginPath();ctx.moveTo(t.pts[0][0]-wd*.2,t.pts[0][1]);for(const p of t.pts)ctx.lineTo(p[0]-wd*.2,p[1]);ctx.stroke();
  }
  for(const b of beads)drawBead(b);
 }
 function frame(now){
  if(!running)return;
  // Stop quietly when the dashboard is not on screen.
  if(!canvas.isConnected||canvas.offsetParent===null||document.hidden){running=false;return}
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(canvas.clientWidth!==w||canvas.clientHeight!==h){size();if(glass)seedGlass()}
  if(glass){stepGlass(dt);drawGlass()}else{step(dt);draw()}requestAnimationFrame(frame);
 }
 function start(el,opts={}){
  light=!!opts.light;glass=!!opts.glass;canvas=el;ctx=canvas.getContext('2d');still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  size();if(glass)seedGlass();
  if(!canvas._wired){
   canvas._wired=true;
   const stage=canvas.parentElement;
   stage.addEventListener('pointermove',e=>{const now=performance.now();if(now-moveAt<140||still||glass)return;moveAt=now;const r=canvas.getBoundingClientRect();if(Math.random()<.5)drop(e.clientX-r.left,e.clientY-r.top,.45,false)});
   stage.addEventListener('pointerdown',e=>{if(still||glass||e.target.closest('button,a,input,select,textarea,.popover,.tcard'))return;const r=canvas.getBoundingClientRect();drop(e.clientX-r.left,e.clientY-r.top,1.2,true)});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()});
  }
  if(still&&glass){drawGlass();return}
  if(still){for(let i=0;i<7;i++)ripples.push({x:rnd(w*.1,w*.9),y:rnd(h*.2,h*.9),r:rnd(30,110),max:200,speed:0,age:1,width:1.6});draw();return}
  resume();
 }
 function resume(){if(running||still||!canvas)return;running=true;last=performance.now();requestAnimationFrame(frame)}
 return {start,resume};
})();
