import {handleCreation} from './ai-proxy.mjs';
import {createV1} from './v1-api.mjs';
import {buildKit} from './template-kit.mjs';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const allowed=new Map([['/','index.html'],...['index.html','studio.css','premium.css','studio.js','portal.css','portal.js','robot-hand.svg','realism.css','realism.js','landscape-bg.jpg','hero-realistic.png','aqua.css','ai-studio.js'].map(f=>['/'+f,f])]);
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
const v1=createV1();
allowed.set('/gsn-photo-data.js','gsn-photo-data.js');
for(let index=0;index<52;index++)allowed.set(`/gsn-photo-${index}.png`,`gsn-photo-${index}.png`);
allowed.set('/comic-campaigns.js','comic-campaigns.js');
allowed.set('/comic.css','comic.css');
allowed.set('/','app.html');allowed.set('/v1','v1.html');allowed.set('/classic','index.html');
for(const name of ['app.html','app.css','app.js','globe.js','kit-host.js','water.js','schedule.js','team.js','people.js','composer.js','dashboard.js','hero-globe.js','library.js','editor.js','editor.css','exporter.js','platforms.mjs','free-layers.css','inner-pages.css','slot-layouts.css','artwork-library.css'])allowed.set('/'+name,name);
const kit=await buildKit();
for(const name of ['v1.html','v1.css','v1.js','water-studio.css','workspace-edition.css','overview-wheel.js','slide-image.js','artwork-library.css','campaign-atlas.png','automation-atlas.png','automation-operations-atlas.png'])allowed.set('/'+name,name);
export async function synthesize(payload){const voiceProgram=await readFile(new URL('local-voice.ps1',import.meta.url),'utf8');return new Promise((resolve,reject)=>{
 if(process.platform!=='win32')return reject(Error('Offline speech synthesis currently requires Windows. Record or import narration instead.'));
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',voiceProgram],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,GSN_VOICE_REQUEST:JSON.stringify(payload)}});
 let out='',err='',settled=false;const timer=setTimeout(()=>{child.kill();reject(Error('Local speech rendering timed out. Try a shorter script.'))},120000);
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',d=>{out+=d;if(out.length>50e6)child.kill()});child.stderr.on('data',d=>{if(err.length<2000)err+=d});
 child.on('error',()=>{clearTimeout(timer);settled=true;reject(Error('Windows speech bridge could not start. Check Windows PowerShell and installed voices.'))});
 child.on('close',code=>{clearTimeout(timer);if(settled)return;if(code!==0)return reject(Error(err.trim()||'Local speech synthesis failed.'));try{resolve(JSON.parse(out))}catch{reject(Error('Invalid response from Windows speech engine.'))}});
})}
// Static files: validators (ETag) so a browser re-checks cheaply instead of re-downloading, a day of caching for the big pictures, and gzip for text.
const gzCache=new Map();
function serveStatic(req,res,type,data,etag,cache){
 const headers={'Content-Type':type,'Cache-Control':cache,ETag:etag,Vary:'Accept-Encoding'};
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);return res.end()}
 if(/^(text\/|application\/json|image\/svg)/.test(type)&&/\bgzip\b/.test(req.headers['accept-encoding']||'')&&data.length>1024){
  let zipped=gzCache.get(etag);if(!zipped){zipped=gzipSync(data);if(gzCache.size>200)gzCache.clear();gzCache.set(etag,zipped)}
  res.writeHead(200,{...headers,'Content-Encoding':'gzip','Content-Length':zipped.length});return res.end(zipped);
 }
 res.writeHead(200,{...headers,'Content-Length':data.length});res.end(data);
}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost:4187');
 const localPort=Number(process.env.PORT)||4187;
 const permittedHosts=['localhost:'+localPort,'127.0.0.1:'+localPort,'localhost:4187','127.0.0.1:4187','localhost:4188','127.0.0.1:4188',process.env.SITE_DOMAIN].filter(Boolean);if(!permittedHosts.includes(req.headers.host))return send(res,403,{error:'Invalid local host'});
 if(req.headers.origin&&!['http://localhost:'+localPort,'http://127.0.0.1:'+localPort,'http://localhost:4187','http://127.0.0.1:4187','http://localhost:4188','http://127.0.0.1:4188',process.env.SITE_DOMAIN?'https://'+process.env.SITE_DOMAIN:null].filter(Boolean).includes(req.headers.origin))return send(res,403,{error:'Cross-origin requests are not permitted'});
 if(url.pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,app:'gsn-studio'});
 if(await v1.handle(req,res,url))return;
 if(await handleCreation(req,res,url))return;
 if(url.pathname==='/api/voices'&&req.method==='GET'){try{return send(res,200,await synthesize({action:'voices'}))}catch(e){return send(res,503,{error:e.message})}}
 if(url.pathname==='/api/voice'&&req.method==='POST'){
  if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
  let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>50000)return send(res,413,{error:'Narration request too large'})}const data=JSON.parse(raw);if(typeof data.text!=='string'||!data.text.trim()||data.text.length>8000)return send(res,400,{error:'Write 1 to 8000 characters of narration.'});if(data.voice&&typeof data.voice!=='string')return send(res,400,{error:'Invalid voice'});const result=await synthesize({text:data.text,voice:data.voice||'',rate:Math.max(-5,Math.min(5,Number(data.rate)||0))});const wav=Buffer.from(result.audio,'base64');res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':wav.length,'Cache-Control':'no-store'});return res.end(wav)}catch(e){return send(res,503,{error:e.message})}
 }
 if(req.method==='GET'&&(url.pathname==='/template-kit.js'||url.pathname==='/template-kit.css')){const js=url.pathname.endsWith('.js'),body=Buffer.from(js?kit.js:kit.css);return serveStatic(req,res,js?'text/javascript; charset=utf-8':'text/css; charset=utf-8',body,'"'+createHash('sha1').update(body).digest('hex').slice(0,20)+'"','no-cache')}
 const file=allowed.get(url.pathname);if(!file||req.method!=='GET'){res.writeHead(404);return res.end('Not found')}
 try{const path=fileURLToPath(new URL(file,import.meta.url)),info=await stat(path),etag='"'+info.size.toString(16)+'-'+Math.round(info.mtimeMs).toString(16)+'"';
  const type=file.endsWith('.mp4')?'video/mp4':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.css')?'text/css; charset=utf-8':(file.endsWith('.js')||file.endsWith('.mjs'))?'text/javascript; charset=utf-8':'text/html; charset=utf-8';
  // Pictures change rarely: keep them a day. Code and styles are always re-checked (a 304 costs almost nothing) so a deploy shows up at once.
  const cache=/\.(png|jpg|mp4)$/.test(file)?'public, max-age=86400':'no-cache';
  if(req.headers['if-none-match']===etag)return serveStatic(req,res,type,Buffer.alloc(0),etag,cache);
  serveStatic(req,res,type,await readFile(path),etag,cache)}catch{res.writeHead(500);res.end('Unable to read application file')}
});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)server.listen(Number(process.env.PORT)||4187,process.env.BIND_HOST||'127.0.0.1',()=>console.log('GSN Media v1 listening on configured host/port.'));
server.on('close',()=>v1.close());
export {server};
