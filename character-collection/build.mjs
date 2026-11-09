import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {characterCatalog,animatedSVG,root} from './characters.mjs';
const rows=await characterCatalog();await writeFile(new URL('manifest.json',root),JSON.stringify(rows,null,2)+'\n');
// Portable copies are a local deliverable; the production adapter creates SVGs on demand.
await mkdir(new URL('animated/',root),{recursive:true});
for(const r of rows){const png=await readFile(new URL(`assets/${r.set}-${r.glyph}.png`,root));await writeFile(new URL(`animated/${r.set}-${r.glyph}.svg`,root),animatedSVG(r.set,r.glyph,png))}
console.log(JSON.stringify({graphics:rows.length,animatedSVGs:rows.length,sets:[...new Set(rows.map(r=>r.set))]}));
