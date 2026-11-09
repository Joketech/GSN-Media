import {readFile,access} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const files=new Set(['index.html','styles.css','data.js','cover-designs.js','gallery.js','layer-editor.html','layer-editor.css','layer-editor.mjs','layer-model.mjs','compositions.mjs','layer-assets.json']);
export async function pictureCatalog(){
 const [rows,assets,audit]=await Promise.all(['manifest.json','layer-assets.json','layer-asset-audit.json'].map(f=>readFile(new URL(f,root),'utf8').then(JSON.parse)));
 const ready=[];await Promise.all(rows.map(async row=>{try{await access(new URL(`assets/ad-${String(row.id).padStart(3,'0')}.png`,root));ready.push(row.id)}catch{}}));ready.sort((a,b)=>a-b);
 const prepared=new Map(assets.campaigns.map(a=>[a.id,a]));
 const pictures=rows.filter(r=>ready.includes(r.id)).flatMap(({id,product,category})=>{
  const list=[{id:`ugc-${id}-campaign`,templateId:id,name:product,category,role:'campaign',url:`/ugc/assets/ad-${String(id).padStart(3,'0')}.png`}];
  const a=prepared.get(id);if(a)for(const role of ['person','product','packaging'])list.push({id:`ugc-${id}-${role}`,templateId:id,name:`${product} / ${role}`,category,role,url:'/ugc/'+a.kit,region:a.regions[role],sheetSize:audit.campaigns.find(c=>c.id===id).size});
  return list;
 });
 return {total:rows.length,ready,layered:assets.campaigns.map(a=>a.id),pictures};
}
export async function handleUGCStatic(req,res,url){
 if(req.method!=='GET'&&req.method!=='HEAD')return false;
 if(url.pathname==='/api/ugc/catalog'){
  const data=await pictureCatalog();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify(data));return true;
 }
 if(!url.pathname.startsWith('/ugc/'))return false;
 const file=url.pathname.slice(5)||'index.html';
 if(!files.has(file)&&!/^assets\/ad-(?:0\d{2}|1\d{2})\.png$/.test(file)&&!/^layered-assets\/(?:0\d{2}|1\d{2})-(?:kit(?:-v[2-9])?|background)\.png$/.test(file)){res.writeHead(404);res.end('Not found');return true;}
 try{const data=await readFile(new URL(file,root)),type=file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css; charset=utf-8':/\.m?js$/.test(file)?'text/javascript; charset=utf-8':file.endsWith('.json')?'application/json':'text/html; charset=utf-8';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404);res.end('Not found');}
 return true;
}
