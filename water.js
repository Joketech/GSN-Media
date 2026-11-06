'use strict';
/* Rain on still water: falling drops, splash crowns and expanding ripples, drawn on a canvas behind the glass panel.
   It pauses whenever the dashboard is hidden, and stays still for people who prefer reduced motion. */
const Water=(()=>{
 let canvas,ctx,w=0,h=0,dpr=1,ripples=[],drops=[],sparks=[],next=0,running=false,last=0,moveAt=0,still=false;
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
  ctx.globalCompositeOperation='lighter';
  for(const d of drops){
   const p=d.t/d.dur,y=d.top+(d.y-d.top)*p*p;
   const g=ctx.createLinearGradient(d.x,y-26,d.x,y);g.addColorStop(0,'rgba(220,255,240,0)');g.addColorStop(1,'rgba(235,255,248,.85)');
   ctx.strokeStyle=g;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(d.x,y-26);ctx.lineTo(d.x,y);ctx.stroke();
  }
  for(const r of ripples){
   if(r.age<=0||r.r<1)continue;
   const life=1-r.r/r.max,a=Math.pow(life,1.6);
   // Rings are squashed vertically, as water seen at a low angle.
   const ry=r.r*.42;
   ctx.lineWidth=r.width*1.25;
   ctx.strokeStyle=`rgba(235,255,248,${.9*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.stroke();
   ctx.lineWidth=r.width*.7;ctx.strokeStyle=`rgba(130,215,198,${.55*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y+2,r.r*.985,ry*.985,0,0,Math.PI*2);ctx.stroke();
   if(r.r<r.max*.5){const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.r);g.addColorStop(0,`rgba(210,255,240,${.26*a})`);g.addColorStop(1,'rgba(210,255,240,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.fill()}
  }
  for(const s of sparks){const a=1-s.life/s.max;ctx.fillStyle=`rgba(235,255,248,${.8*a})`;ctx.beginPath();ctx.arc(s.x,s.y,1.4,0,Math.PI*2);ctx.fill()}
  ctx.globalCompositeOperation='source-over';
 }
 function frame(now){
  if(!running)return;
  // Stop quietly when the dashboard is not on screen.
  if(!canvas.isConnected||canvas.offsetParent===null||document.hidden){running=false;return}
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(canvas.clientWidth!==w||canvas.clientHeight!==h)size();
  step(dt);draw();requestAnimationFrame(frame);
 }
 function start(el){
  canvas=el;ctx=canvas.getContext('2d');still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  size();
  if(!canvas._wired){
   canvas._wired=true;
   const stage=canvas.parentElement;
   stage.addEventListener('pointermove',e=>{const now=performance.now();if(now-moveAt<140||still)return;moveAt=now;const r=canvas.getBoundingClientRect();if(Math.random()<.5)drop(e.clientX-r.left,e.clientY-r.top,.45,false)});
   stage.addEventListener('pointerdown',e=>{if(still||e.target.closest('button,a,input,select,textarea,.popover,.tcard'))return;const r=canvas.getBoundingClientRect();drop(e.clientX-r.left,e.clientY-r.top,1.2,true)});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()});
  }
  if(still){for(let i=0;i<7;i++)ripples.push({x:rnd(w*.1,w*.9),y:rnd(h*.2,h*.9),r:rnd(30,110),max:200,speed:0,age:1,width:1.6});draw();return}
  resume();
 }
 function resume(){if(running||still||!canvas)return;running=true;last=performance.now();requestAnimationFrame(frame)}
 return {start,resume};
})();
