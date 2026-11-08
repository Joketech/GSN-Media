import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const root = new URL('./', import.meta.url);
const rows = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
assert.equal(rows.length, 200, 'Exactly 200 single-page campaigns are required');
for (const key of ['id', 'product', 'hook', 'description']) {
  assert.equal(new Set(rows.map(row => String(row[key]).toLowerCase().trim())).size, 200, `Duplicate ${key}`);
}
const browser = vm.createContext({});
vm.runInContext(await readFile(new URL('data.js', root), 'utf8') + ';this.rows=UGC_ADS', browser);
assert.equal(JSON.stringify(browser.rows), JSON.stringify(rows.map(({ prompt, ...row }) => row)), 'Browser and source catalogues differ');
const categories = Object.groupBy(rows, row => row.category);
assert.equal(Object.keys(categories).length, 20);
for (const category of Object.values(categories)) assert.equal(category.length, 10);
const hashes = new Map();
const missing = [];
const images = [];
for (const [id, row] of rows.entries()) {
  assert.equal(row.id, id);
  assert.ok(row.cta?.trim() && row.hook?.trim() && row.description?.trim());
  assert.ok(row.palette.length === 3 && row.palette.every(c => /^#[0-9a-f]{6}$/i.test(c)));
  const file = `assets/ad-${String(id).padStart(3, '0')}.png`;
  let bytes;
  try { bytes = await readFile(new URL(file, root)); } catch { missing.push(id); continue; }
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG ${file}`);
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.ok(width >= 1080 && height >= 1350, `Insufficient resolution: ${file}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.ok(!hashes.has(sha256), `Repeated image ${id} / ${hashes.get(sha256)}`);
  hashes.set(sha256, id);
  images.push({ id, product: row.product, file, width, height, sha256 });
}
const report = { templates: rows.length, distinctProducts: 200, distinctHooks: 200, distinctDescriptions: 200, images: images.length, missing, exactDuplicateImages: 0, assets: images };
if (process.argv.includes('--report')) await writeFile(new URL('asset-audit.json', root), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, assets: undefined }, null, 2));
if (missing.length) process.exitCode = 1;
