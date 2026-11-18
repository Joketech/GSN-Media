// Small QR code encoder (byte mode, error correction M, versions 1-9) with a PNG writer. No dependencies.
import { deflateSync } from 'node:zlib';

const VERS = { // version: [data codewords, ec codewords per block, blocks as [count, dataPerBlock] list]
  1: [16, 10, [[1, 16]]], 2: [28, 16, [[1, 28]]], 3: [44, 26, [[1, 44]]], 4: [64, 18, [[2, 32]]], 5: [86, 24, [[2, 43]]],
  6: [108, 16, [[4, 27]]], 7: [124, 18, [[4, 31]]], 8: [154, 22, [[2, 38], [2, 39]]], 9: [182, 22, [[3, 36], [2, 37]]],
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46] };
const EXP = new Array(512), LOG = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rs(data, n) {
  let g = [1];
  for (let i = 0; i < n; i++) { const next = new Array(g.length + 1).fill(0); g.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); }); g = next; }
  const r = new Array(n).fill(0);
  for (const d of data) { const f = d ^ r.shift(); r.push(0); if (f) for (let j = 0; j < n; j++) r[j] ^= mul(g[j + 1], f); }
  return r;
}
const bch = (v, gen, bits, deg) => { let r = v << deg; for (let i = bits - 1; i >= deg; i--) if (r >> i & 1) r ^= gen << (i - deg); return (v << deg) | r; };

export function qrMatrix(text) {
  const bytes = [...Buffer.from(String(text), 'utf8')];
  let ver = 0;
  for (let v = 1; v <= 9; v++) if (bytes.length + (v < 10 ? 2 : 3) <= VERS[v][0]) { ver = v; break; }
  if (!ver) throw new Error('The QR text is too long (about 170 characters at most).');
  const [dataLen, ecLen, groups] = VERS[ver];
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push(v >> i & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, dataLen * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let p = 0; cw.length < dataLen; p++) cw.push(p % 2 ? 0x11 : 0xec);
  const blocks = []; let at = 0;
  for (const [n, len] of groups) for (let i = 0; i < n; i++) { const d = cw.slice(at, at + len); at += len; blocks.push({ d, e: rs(d, ecLen) }); }
  const out = [], maxD = Math.max(...blocks.map(b => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);
  const stream = []; out.forEach(c => { for (let i = 7; i >= 0; i--) stream.push(c >> i & 1); });
  const N = 17 + ver * 4;
  const mk = () => Array.from({ length: N }, () => new Array(N).fill(null));
  const base = mk(), fn = Array.from({ length: N }, () => new Array(N).fill(false));
  const set = (r, c, v) => { if (r < 0 || c < 0 || r >= N || c >= N) return; base[r][c] = v; fn[r][c] = true; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) set(r + i, c + j, i >= 0 && i <= 6 && j >= 0 && j <= 6 && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))); };
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALIGN[ver];
  for (const r of al) for (const c of al) { if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (c === 6 && r === al[al.length - 1])) continue; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1); }
  set(N - 8, 8, true);
  const res = (r, c) => { if (base[r][c] === null) set(r, c, false); };
  for (let i = 0; i < 9; i++) { res(8, i); res(i, 8); } for (let i = 0; i < 8; i++) { res(8, N - 1 - i); res(N - 1 - i, 8); }
  if (ver >= 7) { const v = bch(ver, 0x1f25, 18, 12); for (let i = 0; i < 18; i++) { const bit = !!(v >> i & 1), a = Math.floor(i / 3), b = i % 3 + N - 11; set(a, b, bit); set(b, a, bit); } }
  const mask = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
  const build = m => {
    const g = base.map(r => r.slice()); let k = 0, up = true;
    for (let c = N - 1; c > 0; c -= 2) { if (c === 6) c--; for (let i = 0; i < N; i++) { const r = up ? N - 1 - i : i; for (const cc of [c, c - 1]) if (!fn[r][cc]) { let v = k < stream.length ? stream[k++] === 1 : false; if (mask[m](r, cc)) v = !v; g[r][cc] = v; } } up = !up; }
    const f = bch(0 << 3 | m, 0x537, 15, 10) ^ 0x5412, bit = i => !!(f >> i & 1);
    for (let i = 0; i <= 5; i++) g[i][8] = bit(i); g[7][8] = bit(6); g[8][8] = bit(7); g[8][7] = bit(8); for (let i = 9; i < 15; i++) g[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) g[8][N - 1 - i] = bit(i); for (let i = 8; i < 15; i++) g[N - 15 + i][8] = bit(i);
    g[N - 8][8] = true; return g;
  };
  const penalty = g => {
    let p = 0;
    for (let t = 0; t < 2; t++) for (let i = 0; i < N; i++) { let run = 1; for (let j = 1; j < N; j++) { const a = t ? g[j][i] : g[i][j], b = t ? g[j - 1][i] : g[i][j - 1]; if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) if (g[i][j] === g[i][j + 1] && g[i][j] === g[i + 1][j] && g[i][j] === g[i + 1][j + 1]) p += 3;
    const pat = [true, false, true, true, true, false, true, false, false, false, false];
    for (let i = 0; i < N; i++) for (let j = 0; j <= N - 11; j++) for (const t of [0, 1]) for (const rev of [0, 1]) { let ok = true; for (let k = 0; k < 11 && ok; k++) { const v = pat[rev ? 10 - k : k]; if ((t ? g[j + k][i] : g[i][j + k]) !== v) ok = false; } if (ok) p += 40; }
    const dark = g.flat().filter(Boolean).length; p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    return p;
  };
  let best, bp = Infinity;
  for (let m = 0; m < 8; m++) { const g = build(m), p = penalty(g); if (p < bp) { bp = p; best = g; } }
  return best;
}

const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

// A PNG data URL: dark modules on white with a 4-module quiet zone. `fg` is a 6-digit hex colour (kept dark enough to scan).
export function qrPng(text, fg = '#000000', scale = 8) {
  const m = qrMatrix(text), q = 4, n = m.length + q * 2, px = n * scale;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(fg.slice(i, i + 2), 16));
  const raw = Buffer.alloc((px * 3 + 1) * px, 255);
  for (let y = 0; y < px; y++) {
    raw[y * (px * 3 + 1)] = 0;
    for (let x = 0; x < px; x++) { const row = Math.floor(y / scale) - q, col = Math.floor(x / scale) - q, on = row >= 0 && col >= 0 && row < m.length && col < m.length && m[row][col]; const o = y * (px * 3 + 1) + 1 + x * 3; if (on) { raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; } }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(px, 0); ihdr.writeUInt32BE(px, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}
