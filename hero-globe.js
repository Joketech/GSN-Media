'use strict';
/* A turning Earth on the Social Media Pack card.
   The picture already holds a glass globe in a robot hand. This lifts the globe's own pixels into a flat map, then redraws the sphere a little
   further round every frame, so the very same Earth (cloud, city lights, grid lines) appears to rotate in the hand. The fingers that cross the
   globe are masked out so they stay in front. The map shows a 100-degree strip and mirrors it, so the spin has no seam. */
const HeroGlobe=(()=>{
 const IMG={w:1672,h:941,cx:1165,cy:330,R:275,posY:.08,src:'hero-realistic.jpg'};
 const S=340,SHOW=.93,STRIP=100*Math.PI/180,TW=512,TH=256,SPEED=.2;
 const FINGERS=[
  [[1245,585],[1255,560],[1262,530],[1275,502],[1290,485],[1312,477],[1332,485],[1335,515],[1325,550],[1317,580],[1300,600],[1255,600]],
  [[1330,580],[1332,552],[1347,515],[1355,470],[1360,425],[1370,397],[1390,387],[1412,395],[1420,430],[1422,490],[1410,525],[1402,560],[1392,600],[1360,625],[1330,610]],
  [[1422,445],[1427,405],[1440,360],[1455,342],[1480,340],[1491,355],[1495,410],[1487,445],[1485,500],[1472,540],[1455,560],[1425,530]],
  [[860,370],[885,372],[902,410],[902,445],[885,485],[860,495]]];
 let tex=null,geo=null,loading=null,canvas=null,ctx=null,out=null,raf=0,theta=0,last=0,ro=null,hero=null;
 const inPoly=(x,y,p)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
 const PAD=[[0,0],[9,0],[-9,0],[0,9],[0,-9],[7,7],[-7,7],[7,-7],[-7,-7]];
 const masked=(x,y)=>PAD.some(([dx,dy])=>FINGERS.some(p=>inPoly(x+dx,y+dy,p)));

 // Flat map of the visible face: texel (u,v) is longitude -50..50 degrees, latitude -80..80.
 function buildTexture(img){
  const c=document.createElement('canvas');c.width=IMG.w;c.height=IMG.h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);
  const px=x.getImageData(0,0,IMG.w,IMG.h).data,t=new Uint8ClampedArray(TW*TH*4),ok=new Uint8Array(TW*TH);
  for(let v=0;v<TH;v++){const lat=(.5-v/(TH-1))*160*Math.PI/180;
   for(let u=0;u<TW;u++){const lon=(u/(TW-1)-.5)*STRIP;
    const sx=IMG.cx+IMG.R*Math.cos(lat)*Math.sin(lon),sy=IMG.cy-IMG.R*Math.sin(lat);
    if(Math.hypot(sx-IMG.cx,sy-IMG.cy)>IMG.R*.94||masked(sx,sy))continue;
    const ix=Math.round(sx),iy=Math.round(sy),k=(iy*IMG.w+ix)*4,o=(v*TW+u)*4;
    t[o]=px[k];t[o+1]=px[k+1];t[o+2]=px[k+2];t[o+3]=255;ok[v*TW+u]=1;
   }}
  // Fill the gaps (where fingers were) from their neighbours.
  for(let pass=0;pass<40;pass++){let left=0;const add=[];
   for(let v=0;v<TH;v++)for(let u=0;u<TW;u++){if(ok[v*TW+u])continue;left++;let r=0,g=0,b=0,n=0;
    for(const [du,dv] of [[1,0],[-1,0],[0,1],[0,-1]]){const uu=u+du,vv=v+dv;if(uu<0||vv<0||uu>=TW||vv>=TH||!ok[vv*TW+uu])continue;const o=(vv*TW+uu)*4;r+=t[o];g+=t[o+1];b+=t[o+2];n++}
    if(n)add.push([v,u,r/n,g/n,b/n])}
   for(const [v,u,r,g,b] of add){const o=(v*TW+u)*4;t[o]=r;t[o+1]=g;t[o+2]=b;t[o+3]=255;ok[v*TW+u]=1}
   if(!left||!add.length)break}
  return t;
 }
 // For every output pixel: its latitude row, its longitude on the sphere, and how opaque it is (soft edge, fingers cut out).
 function buildGeometry(){
  const n=S*S,row=new Float32Array(n),lon=new Float32Array(n),alpha=new Uint8ClampedArray(n);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
   const nx=(x+.5)/S*2-1,ny=(y+.5)/S*2-1,r=Math.hypot(nx,ny),i=y*S+x;
   if(r>=SHOW)continue;
   const nz=Math.sqrt(1-nx*nx-ny*ny),lat=Math.asin(-ny);
   row[i]=(.5-lat*180/Math.PI/160)*(TH-1);lon[i]=Math.atan2(nx,nz);
   let a=Math.min(1,(SHOW-r)/.035);
   if(masked(IMG.cx+IMG.R*nx,IMG.cy+IMG.R*ny))a=0;
   alpha[i]=a*255;
  }
  return {row,lon,alpha};
 }
 function render(){
  const {row,lon,alpha}=geo,d=out.data,period=2*STRIP;
  for(let i=0;i<S*S;i++){
   const a=alpha[i];if(!a){d[i*4+3]=0;continue}
   let s=(lon[i]+theta)%period;if(s<0)s+=period;
   const u=s<STRIP?s:period-s,tu=Math.min(TW-1,Math.max(0,Math.round(u/STRIP*(TW-1)))),tv=Math.min(TH-1,Math.max(0,Math.round(row[i]))),o=(tv*TW+tu)*4,k=i*4;
   d[k]=tex[o];d[k+1]=tex[o+1];d[k+2]=tex[o+2];d[k+3]=a;
  }
  ctx.putImageData(out,0,0);
 }
 function place(){
  if(!hero||!canvas)return;
  const W=hero.clientWidth,H=hero.clientHeight,s=Math.max(W/IMG.w,H/IMG.h),ox=(W-IMG.w*s)/2,oy=(H-IMG.h*s)*IMG.posY,size=2*IMG.R*s;
  Object.assign(canvas.style,{width:size+'px',height:size+'px',left:(IMG.cx*s+ox-size/2)+'px',top:(IMG.cy*s+oy-size/2)+'px'});
 }
 const motionOn=()=>document.documentElement.dataset.motion!=='off';
 function frame(now){
  raf=0;
  if(!canvas||!canvas.isConnected||document.hidden||!motionOn()){if(canvas)canvas.style.visibility='hidden';return}
  canvas.style.visibility='visible';
  if(now-last>=33){theta+=SPEED*Math.min(.1,(now-last)/1000);last=now;render()}
  raf=requestAnimationFrame(frame);
 }
 function run(){if(!raf&&tex&&canvas)raf=requestAnimationFrame(frame)}
 async function mount(el){
  if(!el)return;
  canvas=el;canvas.width=S;canvas.height=S;ctx=canvas.getContext('2d');out=ctx.createImageData(S,S);hero=el.parentElement;
  place();ro?.disconnect();ro=new ResizeObserver(place);ro.observe(hero);
  if(!tex){
   loading??=new Promise((ok,bad)=>{const img=new Image();img.onload=()=>{try{tex=buildTexture(img);geo=buildGeometry();ok()}catch(e){bad(e)}};img.onerror=bad;img.src=IMG.src});
   try{await loading}catch{return}
  }
  render();last=performance.now();run();
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)run()});
 // The motion switch calls this.
 function refresh(){if(motionOn())run();else if(canvas)canvas.style.visibility='hidden'}
 return {mount,refresh};
})();
