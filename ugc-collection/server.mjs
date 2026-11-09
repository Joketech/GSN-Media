import http from 'node:http';import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createCampaignQueue,handleCampaignRequest} from './ugc-jobs.mjs';
const queue=createCampaignQueue({directory:fileURLToPath(new URL('data/ugc-briefs/',import.meta.url))});
const simple=new Set(['index.html','styles.css','data.js','gallery.js','layer-editor.html','layer-editor.css','layer-editor.mjs','layer-model.mjs','compositions.mjs','layer-assets.json','cover-designs.js']);
const send=(res,n,body,type)=>{res.writeHead(n,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body)};
http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
 if((pathname==='/api/catalog'||pathname==='/api/ugc/catalog')){const ready=[];await Promise.all(Array.from({length:200},async(_,id)=>{try{await access(new URL('assets/ad-'+String(id).padStart(3,'0')+'.png',import.meta.url));ready.push(id)}catch{}}));return send(res,200,JSON.stringify({total:200,ready:ready.sort((a,b)=>a-b)}),'application/json');}
 if(await handleCampaignRequest(req,res,queue))return;
 const file=pathname==='/'?'index.html':pathname.slice(1);if(!simple.has(file)&&!/^assets\/ad-(?:0\d{2}|1\d{2})\.png$/.test(file)&&!/^layered-assets\/(?:0\d{2}|1\d{2})-(?:kit(?:-v[2-9])?|background)\.png$/.test(file))return send(res,404,'Not found','text/plain');
 try{const bytes=await readFile(new URL(file,import.meta.url));send(res,200,bytes,file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':/\.m?js$/.test(file)?'text/javascript':file.endsWith('.json')?'application/json':'text/html; charset=utf-8')}catch{send(res,404,'Image in preparation.','text/plain')}
}).listen(4246,'127.0.0.1',()=>console.log('Item 1 preview: http://localhost:4246/'));
