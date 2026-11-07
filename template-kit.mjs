// Builds the browser "template kit" from the existing studio sources, so the 400 templates, palettes and the art()
// renderer have ONE source of truth (studio.js + gsn-photo-data.js). Nothing here is duplicated or re-authored.
import { readFile } from 'node:fs/promises';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const between = (source, from, to, label) => {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error(`template kit: could not find ${label} in studio.js`);
  return source.slice(start, end);
};

export async function buildKit() {
  const [studio, photos] = await Promise.all([read('studio.js'), read('gsn-photo-data.js')]);
  const definitions = between(studio, 'const palettes=', 'const agents=', 'palettes and templates');
  const agents = between(studio, 'const agents=', '];', 'agents') + '];';
  const art = between(studio, 'const slideElements=', 'function card(', 'the art renderer');
  const starter = between(studio, '// How many pages a template carries', 'function ensureSlides(', 'template starters');
  const js = `(function(){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={brand:{name:'GSN Technology',handle:'GSN Technology'}};
${photos}
${definitions}
${agents}
${art}
${starter}
window.GSNKit={LAYOUT_GUIDE,composePages,innerPages,templatePageCount,templates,palettes,agents,art,templateStarter,slideElements,esc,state,gsnPhoto,gsnCampaign,gsnLibraryPhoto,gsnTopics,canvasElementLabel};
})();`;

  // CSS for the shadow roots that host each page. :root/body rules are retargeted to the shadow host.
  const parts = await Promise.all(['studio.css', 'premium.css', 'artwork-library.css', 'free-layers.css', 'inner-pages.css'].map(read));
  const css = parts.join('\n')
    .replace(/@import[^;]+;/g, '')
    .replace(/:root\s*\{/g, ':host{')
    .replace(/(^|\})\s*body\s*\{/g, '$1:host{')
    + '\n:host{display:block;background:transparent!important;color:inherit}';
  return { js, css };
}
