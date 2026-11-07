'use strict';
/* Entrance screen: a few drops fall one after another in different places. Each one lands, splashes and sends out ripples.
   Never more than four at a time. Pauses when the screen is hidden or Motion is switched off. */
const Ripples=(()=>{
 let canvas,ctx,w=0,h=0,dpr=1,ripples=[],drops=[],sparks=[],next=.4,running=false,last=0,recent=[];
 const rnd=(a,b)=>a+Math.random()*(b-a);
 const motionOn=()=>document.documentElement.dataset.motion!=='off';
 function size(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);
  w=canvas.clientWidth;h=canvas.clientHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
 }
 function spot(){
  // Pick a place away from the last few drops so they land in different parts of the screen.
  for(let i=0;i<12;i++){
   const x=rnd(w*.06,w*.94),y=rnd(h*.18,h*.9);
   if(recent.every(r=>Math.hypot(r.x-x,r.y-y)>Math.min(w,h)*.28)){recent.push({x,y});if(recent.length>3)recent.shift();return {x,y}}
  }
  const x=rnd(w*.06,w*.94),y=rnd(h*.18,h*.9);recent.push({x,y});if(recent.length>3)recent.shift();return {x,y};
 }
 function drop(){
  const {x,y}=spot();
  drops.push({x,y,top:y-rnd(140,230),t:0,dur:rnd(.34,.46),power:rnd(.85,1.2)});
 }
 function land(d){
  const max=rnd(120,200)*d.power;
  for(let i=0;i<3;i++)ripples.push({x:d.x,y:d.y,r:0,max:max*(1-i*.2),speed:rnd(46,60)*d.power,age:-i*.22,width:2.1-i*.5});
  const n=Math.round(rnd(7,11)*d.power);
  for(let i=0;i<n;i++){const a=rnd(-Math.PI*.85,-Math.PI*.15),v=rnd(40,100)*d.power;sparks.push({x:d.x,y:d.y,vx:Math.cos(a)*v*.7,vy:Math.sin(a)*v,life:0,max:rnd(.4,.75)})}
 }
 function step(dt){
  next-=dt;
  // At most four drops are in the air or still rippling at once.
  const live=drops.length+new Set(ripples.map(r=>r.x)).size;
  if(next<=0&&live<4){next=rnd(.9,1.7);drop()}else if(next<=0)next=.3;
  for(const d of drops)d.t+=dt;
  drops=drops.filter(d=>{if(d.t>=d.dur){land(d);return false}return true});
  for(const r of ripples){r.age+=dt;if(r.age>0)r.r=r.age*r.speed*(1-Math.min(.5,r.age*.16))}
  ripples=ripples.filter(r=>r.r<r.max);
  for(const s of sparks){s.life+=dt;s.vy+=320*dt;s.x+=s.vx*dt;s.y+=s.vy*dt}
  sparks=sparks.filter(s=>s.life<s.max);
 }
 function draw(){
  ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
  for(const d of drops){
   const p=d.t/d.dur,y=d.top+(d.y-d.top)*p*p;
   const g=ctx.createLinearGradient(d.x,y-30,d.x,y);g.addColorStop(0,'rgba(220,255,240,0)');g.addColorStop(1,'rgba(235,255,248,.9)');
   ctx.strokeStyle=g;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(d.x,y-30);ctx.lineTo(d.x,y);ctx.stroke();
   ctx.fillStyle='rgba(240,255,250,.95)';ctx.beginPath();ctx.arc(d.x,y,2.2,0,Math.PI*2);ctx.fill();
  }
  for(const r of ripples){
   if(r.age<=0||r.r<1)continue;
   const life=1-r.r/r.max,a=Math.pow(life,1.5),ry=r.r*.42;
   ctx.lineWidth=r.width*1.25;ctx.strokeStyle=`rgba(235,255,248,${.9*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.stroke();
   ctx.lineWidth=r.width*.7;ctx.strokeStyle=`rgba(130,215,198,${.55*a})`;ctx.beginPath();ctx.ellipse(r.x,r.y+2,r.r*.985,ry*.985,0,0,Math.PI*2);ctx.stroke();
   if(r.r<r.max*.5){const g=ctx.createRadialGradient(r.x,r.y,0,r.x,r.y,r.r);g.addColorStop(0,`rgba(210,255,240,${.26*a})`);g.addColorStop(1,'rgba(210,255,240,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,ry,0,0,Math.PI*2);ctx.fill()}
  }
  for(const s of sparks){const a=1-s.life/s.max;ctx.fillStyle=`rgba(235,255,248,${.8*a})`;ctx.beginPath();ctx.arc(s.x,s.y,1.4,0,Math.PI*2);ctx.fill()}
  ctx.globalCompositeOperation='source-over';
 }
 function frame(now){
  if(!running)return;
  if(!canvas.isConnected||canvas.offsetParent===null||document.hidden||!motionOn()){running=false;ctx.clearRect(0,0,w,h);return}
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(canvas.clientWidth!==w||canvas.clientHeight!==h)size();
  step(dt);draw();requestAnimationFrame(frame);
 }
 function resume(){if(running||!canvas||!motionOn())return;running=true;last=performance.now();requestAnimationFrame(frame)}
 function start(el){
  if(!el)return;
  canvas=el;ctx=canvas.getContext('2d');size();
  if(!canvas._wired){canvas._wired=true;document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()})}
  resume();
 }
 return {start,resume};
})();
