'use strict';
/* Renders template pages (from the shared kit) inside isolated shadow roots, so the template styles can never leak
   into the studio UI and the studio styles can never break a template. One stylesheet is shared by every page. */
const KitHost=(()=>{
 let sheetPromise;
 const sheet=()=>sheetPromise||(sheetPromise=fetch('/template-kit.css',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Template styles are unavailable.');return r.text()}).then(css=>{const s=new CSSStyleSheet();s.replaceSync(css);return s}));
 let ready=null;
 // Synchronous once the stylesheet has loaded, so the editor can measure a page right after drawing it.
 function mount(host,html){
  const root=host.shadowRoot||host.attachShadow({mode:'open'});
  if(ready){root.adoptedStyleSheets=[ready];root.innerHTML=html;return root}
  return sheet().then(s=>{ready=s;root.adoptedStyleSheets=[s];root.innerHTML=html;return root});
 }
 // HTML for page `index` of a design (role Hook / write-up / CTA comes from the page's position).
 function pageHtml(design,index,extra=''){
  const kit=window.GSNKit,template=kit.templates[design.template_id]||kit.templates[0];
  kit.state.brand=design.brand||{name:'GSN Technology',handle:'GSN Technology'};
  return kit.art(template,{...design.pages[index],ratio:design.ratio,number:index+1,total:design.pages.length},extra);
 }
 // Page HTML for a template's own starter pages, used for catalogue previews before a design exists.
 function starterDesign(templateId,ratio='4 / 5'){
  const kit=window.GSNKit;
  return {template_id:templateId,ratio,brand:{name:'GSN Technology',handle:'GSN Technology'},pages:kit.templateStarter(templateId)};
 }
 sheet().then(s=>{ready=s}).catch(()=>{});
 return {mount,pageHtml,starterDesign,sheet};
})();
