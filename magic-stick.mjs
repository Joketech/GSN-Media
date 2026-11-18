// Magic stick: turns a few facts (names, dates, menu lines, pictures) into a finished, editable design.
// Every layout is plain code, so it is free, instant and the same every time. The result is an ordinary design
// (blank pages made of text boxes and shapes) that opens in the normal editor.
// A "template code" (MS1.xxxx) holds the template, size, colours and wording, so pasting it rebuilds the exact same design.

export const SIZES = [
  { id: 'print-a4', name: 'A4 portrait', note: 'Flyer, program, schedule' },
  { id: 'print-a5', name: 'A5 portrait', note: 'Half-page flyer or card' },
  { id: 'print-letter', name: 'US Letter', note: 'US flyers and programs' },
  { id: 'print-invite', name: 'Invitation 5 x 7 in', note: 'Invitation card' },
  { id: 'print-a4-landscape', name: 'A4 landscape', note: 'Certificate, wide program' },
  { id: 'print-wide', name: 'Wide 16:9', note: 'Screen or projector' },
  { id: 'instagram-post', name: 'Instagram post 4:5', note: 'Feed post' },
  { id: 'instagram-square', name: 'Square 1:1', note: 'Feed post' },
  { id: 'instagram-story', name: 'Story 9:16', note: 'Story, status, Reel cover' },
];
const SIZE_PX = { 'print-a4': [1240, 1754], 'print-a5': [874, 1240], 'print-letter': [1275, 1650], 'print-invite': [1050, 1470], 'print-a4-landscape': [1754, 1240], 'print-wide': [1920, 1080], 'instagram-post': [1080, 1350], 'instagram-square': [1080, 1080], 'instagram-story': [1080, 1920] };

export const PALETTES = [
  { id: 'brand', name: 'GSN Apricot', bg: '#FFF6EF', ink: '#1F1A17', accent: '#FA754E', accent2: '#54B77D', onaccent: '#FFFFFF', soft: '#FFE3D4', muted: '#6B5A52' },
  { id: 'forest', name: 'GSN Forest', bg: '#F1FAF4', ink: '#12301F', accent: '#54B77D', accent2: '#FA754E', onaccent: '#FFFFFF', soft: '#D8F0E1', muted: '#4E6B5A' },
  { id: 'noir', name: 'GSN Black', bg: '#000000', ink: '#FFFFFF', accent: '#FA754E', accent2: '#54B77D', onaccent: '#000000', soft: '#1E1E1E', muted: '#B8B8B8' },
  { id: 'blush', name: 'Blush', bg: '#FFF0F3', ink: '#3A1F2B', accent: '#E86A92', accent2: '#F4A261', onaccent: '#FFFFFF', soft: '#FFD9E2', muted: '#7A5565' },
  { id: 'ocean', name: 'Ocean', bg: '#EEF6FB', ink: '#10304A', accent: '#2F7FC1', accent2: '#54B77D', onaccent: '#FFFFFF', soft: '#D3E6F4', muted: '#4A6A82' },
  { id: 'gold', name: 'Gold', bg: '#FBF6E9', ink: '#2B2410', accent: '#C99A2E', accent2: '#7A5C12', onaccent: '#FFFFFF', soft: '#F0E3BC', muted: '#6E6038' },
];

import { qrPng } from './qr.mjs';

const T = (id, label, type = 'text', extra = {}) => ({ id, label, type, ...extra });
const PIC = (label = 'Picture (optional)') => T('picture', label, 'image');

export const KINDS = [
  { id: 'flyer', name: 'Campaign flyer', blurb: 'Promote an event, a campaign or an offer.', fields: [
    T('eyebrow', 'Small line on top', 'text', { example: 'You are invited' }),
    T('title', 'Headline', 'text', { example: 'Community Health Fair' }),
    T('tagline', 'Tagline', 'text', { example: 'Free checks, food and fun for the whole family' }),
    T('date', 'Date', 'text', { example: 'Saturday 14 March 2026' }),
    T('time', 'Time', 'text', { example: '10am to 4pm' }),
    T('venue', 'Place', 'text', { example: 'Freedom Park, Lagos' }),
    T('details', 'Extra points (one per line)', 'list', { example: 'Free blood pressure checks\nKids games and prizes\nLive music all day' }),
    T('cta', 'Button text', 'text', { example: 'Come and join us' }),
    T('contact', 'Contact or website', 'text', { example: '0803 000 0000  |  @yourhandle' }),
    PIC(),
  ] },
  { id: 'invitation', name: 'Invitation', blurb: 'Birthday, wedding, party, dinner or launch.', fields: [
    T('occasion', 'Small line on top', 'text', { example: 'Together with their families' }),
    T('names', 'Names or event', 'text', { example: 'Ada & Tunde' }),
    T('headline', 'Line under the names', 'text', { example: 'invite you to celebrate their wedding' }),
    T('message', 'Short message', 'longtext', { example: 'Join us for an evening of love, laughter and good food.' }),
    T('date', 'Date', 'text', { example: 'Saturday 20 June 2026' }),
    T('time', 'Time', 'text', { example: '4:00 pm' }),
    T('venue', 'Place', 'text', { example: 'The Grand Hall, Victoria Island, Lagos' }),
    T('dress', 'Dress code', 'text', { example: 'Dress code: Gold and cream' }),
    T('rsvp', 'RSVP', 'text', { example: 'RSVP by 1 June: 0803 000 0000' }),
    T('qr', 'QR code link (optional)', 'text', { example: 'https://example.com/rsvp', hint: 'Paste a web link, phone number or any text. A scannable QR code is added to the card. Leave empty for no QR code.' }),
    T('qrlabel', 'Words under the QR code', 'text', { example: 'Scan to RSVP' }),
    T('qrsize', 'QR code size (% of the card width)', 'text', { hint: 'Optional. Move the three sliders to put the QR code exactly where you want it. Do nothing and the Magic stick places it at the bottom for you. You can also drag it anywhere later in the editor.' }),
    T('qrx', 'QR code: distance from the left (% of width, to its centre)', 'text'),
    T('qry', 'QR code: distance from the top (% of height)', 'text'),
    PIC(),
  ] },
  { id: 'program', name: 'Event program', blurb: 'Order of events with times. Adds pages when it is long.', fields: [
    T('title', 'Event name', 'text', { example: 'Annual Youth Conference' }),
    T('subtitle', 'Theme or subtitle', 'text', { example: 'Rise. Build. Lead.' }),
    T('date', 'Date', 'text', { example: 'Friday 5 June 2026' }),
    T('venue', 'Place', 'text', { example: 'Convention Centre, Abuja' }),
    T('items', 'Program (one per line: time | item | who)', 'list', { example: '9:00 am | Arrival and registration |\n10:00 am | Opening prayer | Pastor Ada\n10:15 am | Welcome address | Chair\n11:00 am | Keynote: Building with purpose | Dr. Tunde Bello\n12:30 pm | Lunch break |\n2:00 pm | Panel discussion | Guest speakers\n4:00 pm | Closing and photos |' }),
    T('footer', 'Note at the bottom', 'text', { example: 'Thank you to our sponsors and volunteers.' }),
    PIC('Logo or picture (optional)'),
  ] },
  { id: 'food', name: 'Food schedule', blurb: 'Meals by day or by time, for camps, events and weddings.', fields: [
    T('title', 'Title', 'text', { example: 'Camp Meal Schedule' }),
    T('subtitle', 'Dates or event', 'text', { example: '12 to 14 August 2026' }),
    T('headers', 'Column names (separate with |). Used by the grid layout', 'text', { example: 'Breakfast | Lunch | Dinner' }),
    T('rows', 'Rows (one per line: day or time | item | item | item)', 'list', { example: 'Day 1 | Pap and akara | Jollof rice and chicken | Vegetable soup and pounded yam\nDay 2 | Bread and eggs | Fried rice and fish | Ofada rice and stew\nDay 3 | Oats and fruit | Pasta and salad | Pepper soup and plantain' }),
    T('footer', 'Note at the bottom', 'text', { example: 'Tell the kitchen team about any allergies.' }),
    PIC('Logo or picture (optional)'),
  ] },
  { id: 'notice', name: 'Announcement', blurb: 'A notice, poster or public message.', fields: [
    T('label', 'Label', 'text', { example: 'Important notice' }),
    T('title', 'Headline', 'text', { example: 'Office closed for the public holiday' }),
    T('message', 'Message', 'longtext', { example: 'Our offices will be closed on Monday. Normal service resumes on Tuesday at 8am. For urgent matters, please call the number below.' }),
    T('date', 'Date or time', 'text', { example: 'Monday 1 June 2026' }),
    T('venue', 'Place', 'text', { example: '' }),
    T('contact', 'Contact', 'text', { example: '0803 000 0000' }),
    PIC(),
  ] },
  { id: 'certificate', name: 'Certificate', blurb: 'Awards, thanks and completion.', fields: [
    T('heading', 'Heading', 'text', { example: 'Certificate of Achievement' }),
    T('name', 'Presented to', 'text', { example: 'Chinedu Okafor' }),
    T('reason', 'For', 'longtext', { example: 'for outstanding leadership and service to the community during 2026' }),
    T('date', 'Date', 'text', { example: '30 November 2026' }),
    T('signer1', 'First signer', 'text', { example: 'Ada Obi, Chairperson' }),
    T('signer2', 'Second signer', 'text', { example: 'Tunde Bello, Secretary' }),
    T('org', 'Organisation', 'text', { example: 'GSN Community Foundation' }),
  ] },
  { id: 'menu', name: 'Menu card', blurb: 'Food and drinks with prices. Start a line with # for a heading.', fields: [
    T('title', 'Title', 'text', { example: 'Mama Put Kitchen' }),
    T('subtitle', 'Line under the title', 'text', { example: 'Fresh Nigerian food, every day' }),
    T('items', 'Menu (heading: # Starters, item: name | description | price)', 'list', { example: '# Mains\nJollof rice | with grilled chicken | 3,500\nEgusi soup | with pounded yam | 4,000\n# Sides\nFried plantain | sweet and golden | 1,000\n# Drinks\nChapman | house special | 1,500\nZobo | chilled | 800' }),
    T('footer', 'Note at the bottom', 'text', { example: 'Open daily 9am to 9pm  |  Delivery available' }),
    PIC('Logo or picture (optional)'),
  ] },
  { id: 'thanks', name: 'Thank-you card', blurb: 'A warm thank-you after an event or purchase.', fields: [
    T('title', 'Big words', 'text', { example: 'Thank you' }),
    T('message', 'Message', 'longtext', { example: 'Your support made this day possible. We are grateful for every smile, every gift and every prayer.' }),
    T('from', 'From', 'text', { example: 'With love, Ada and Tunde' }),
    PIC(),
  ] },
];

const PORTRAIT = ['print-a4', 'print-a5', 'print-letter', 'print-invite', 'instagram-post', 'instagram-story'];
const LANDSCAPE = ['print-a4-landscape', 'print-wide'];
export const TEMPLATES = [
  { id: 'flyer-bold', kind: 'flyer', name: 'Bold block', desc: 'Big colour block headline, clear details, strong button.' },
  { id: 'flyer-photo', kind: 'flyer', name: 'Photo hero', desc: 'Your picture on top, headline and details below.' },
  { id: 'flyer-stripe', kind: 'flyer', name: 'Side stripe', desc: 'Clean and modern with a colour stripe.' },
  { id: 'inv-classic', kind: 'invitation', name: 'Classic frame', desc: 'Framed card with elegant script names.' },
  { id: 'inv-arch', kind: 'invitation', name: 'Modern panel', desc: 'Colour card with a rounded paper panel.' },
  { id: 'inv-photo', kind: 'invitation', name: 'Photo circle', desc: 'A round picture on top, warm and personal.' },
  { id: 'prog-timeline', kind: 'program', name: 'Timeline', desc: 'Colour header and a tidy time column.' },
  { id: 'prog-clean', kind: 'program', name: 'Clean list', desc: 'Centered and simple, easy to read from far.' },
  { id: 'food-grid', kind: 'food', name: 'Weekly grid', desc: 'Days down the side, meals across the top.' },
  { id: 'food-timeline', kind: 'food', name: 'Meal timeline', desc: 'Each time or day with its menu underneath.' },
  { id: 'note-poster', kind: 'notice', name: 'Notice poster', desc: 'Loud headline, short message, contact bar.' },
  { id: 'cert-classic', kind: 'certificate', name: 'Classic certificate', desc: 'Double border, script name, two signatures.' },
  { id: 'menu-card', kind: 'menu', name: 'Menu card', desc: 'Sections, items and prices in neat columns.' },
  { id: 'thanks-card', kind: 'thanks', name: 'Thank-you card', desc: 'Big script thank-you with your message.' },
];

// Width of one character in "em", by kind of character, and a per-font scale (condensed and script fonts are narrower).
const FONT_W = { anton: 0.8, bebas: 0.7, oswald: 0.82, greatvibes: 0.85, dancing: 0.82, playfair: 1.0, dmserif: 0.98, lora: 0.98, montserrat: 1.12, poppins: 1.1, inter: 1, sans: 1, serif: 0.95 };
const charEm = ch => (/[A-Z]/.test(ch) ? 0.68 : /[a-z]/.test(ch) ? 0.52 : /[0-9]/.test(ch) ? 0.56 : ch === ' ' ? 0.28 : /[ilI|.,:;'!]/.test(ch) ? 0.3 : /[mwMW@]/.test(ch) ? 0.8 : 0.55);
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i;

export class MagicError extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

// A drawing board in "page widths": the page is 100 wide and 100 * ar high, so sizes of shapes and text are easy to reason about.
function board(W, H, P) {
  const ar = H / W, texts = [], shapes = [], Hu = 100 * ar;
  const wordEm = (word, font, upper, bold) => { let e = 0; for (const ch of upper ? word.toUpperCase() : word) e += charEm(ch); return e * (FONT_W[font] ?? 1) * (bold ? 1.07 : 1) * 1.05; };
  const lines = (t, s, w, font = 'inter', upper = false, bold = false) => {
    const max = w / s, space = 0.28 * (FONT_W[font] ?? 1);
    let n = 0;
    for (const raw of String(t).split('\n')) {
      let cur = 0, row = 1;
      for (const word of raw.split(/\s+/).filter(Boolean)) { const e = wordEm(word, font, upper, bold); if (e > max) { row += Math.ceil(e / max) - (cur ? 0 : 1); cur = e % max; } else if (cur && cur + space + e > max) { row++; cur = e; } else cur += (cur ? space : 0) + e; }
      n += raw.trim() ? row : 1;
    }
    return Math.max(1, n);
  };
  // Width a short label needs, in page widths.
  const widthOf = (t, s, font = 'inter', upper = false, bold = false) => wordEm(String(t), font, upper, bold) * s;
  // Draw a text box at (x, y) in page widths and return the y where it ends.
  const text = (t, o) => {
    if (t === undefined || t === null || String(t).trim() === '') return o.y;
    const s = o.s ?? 3.6, w = o.w ?? 84, font = o.f ?? 'inter', lh = o.lh ?? 118, n = lines(t, s, w, font, o.u, o.b);
    texts.push(clean({ text: String(t), left: +o.x.toFixed(2), top: +(o.y / ar).toFixed(2), boxWidth: +w.toFixed(2), size: +s.toFixed(2), color: o.c ?? P.ink, font, bold: !!o.b, italic: !!o.i, uppercase: o.u ? true : undefined, align: o.a ?? 'left', lineHeight: lh, spacing: o.sp, opacity: o.op }));
    return o.y + (s * lh / 100) * n;
  };
  const shape = (kind, x, y, w, h, fill, extra = {}) => shapes.push(clean({ kind, x: +x.toFixed(2), y: +(y / ar).toFixed(2), w: +Math.max(1, w).toFixed(2), h: +Math.max(1, h / ar).toFixed(2), fill, ...extra }));
  const rect = (x, y, w, h, fill, e) => shape('rect', x, y, w, h, fill, e);
  const pill = (x, y, w, h, fill, e) => shape('pill', x, y, w, h, fill, e);
  const fit = (t, w, max, min, maxLines, font, upper = true, bold = true) => { const longest = Math.max(...String(t).split(/\s+/).map(x => wordEm(x, font, upper, bold)), 0.1); for (let s = max; s >= min; s -= 0.5) if (lines(t, s, w, font, upper, bold) <= maxLines && longest * s <= w) return s; return min; };
  const picture = (src, kind, x, y, w, h, extra = {}) => {
    if (src) shape(kind, x, y, w, h, P.soft, { src, px: 50, py: 40, z: 100, ...extra });
    else shape(kind, x, y, w, h, P.soft, extra);
  };
  // A pill sized to its text, with the text centered inside it. `x` is the left edge, or the centre when `mid` is set.
  const chip = (t, x, y, s, fill, color, { mid = false, f = 'inter', b = true, u = false, pad = 6, h } = {}) => {
    if (!t) return y;
    const w = Math.min(92, widthOf(t, s, f, u, b) + pad * 2 * (s / 3.4) + 2), hh = h ?? s * 2.3, left = mid ? x - w / 2 : x;
    pill(left, y, w, hh, fill);
    text(t, { x: left, y: y + (hh - s * 1.18) / 2, w, s, c: color, a: 'center', b, f, u, lh: 100 });
    return y + hh;
  };
  // A scannable QR code (a picture with its own white quiet zone) centred on x, top at y; returns where it and its label end.
  const qr = (img, label, x, y, size, color) => {
    if (!img) return y;
    shape('rect', x - size / 2, y, size, size, '#ffffff', { src: img, px: 50, py: 50, z: 100 });
    if (!label) return y + size;
    text(label, { x: x - 30, y: y + size + 1, w: 60, s: 2.8, a: 'center', b: true, c: color ?? P.muted, lh: 100 });
    return y + size + 1 + 2.8 * 1.2;
  };
  // Place the QR code where the person asked: size, centre x and top y in percent of the card.
  const qrAt = F => {
    if (!F.qrImg) return;
    const num = (v, d) => (v === undefined || v === '' || !Number.isFinite(+v) ? d : +v);
    const q = Math.max(8, Math.min(40, num(F.qrsize, 16))), x = Math.max(q / 2, Math.min(100 - q / 2, num(F.qrx, 50)));
    const label = F.qrlabel ? 4.5 : 0, y = Math.max(0, Math.min(Hu - q - label, num(F.qry, 80) / 100 * Hu));
    qr(F.qrImg, F.qrlabel, x, y, q);
  };
  return { ar, Hu, texts, shapes, lines, text, rect, pill, shape, fit, picture, chip, widthOf, qr, qrAt };
}

const split = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const cols = (line, n = 0) => { const a = line.split('|').map(x => x.trim()); while (n && a.length < n) a.push(''); return a; };

function page(b, P, F, bg) {
  const shapes = [...b.shapes];
  const p = {
    title: String(F.title || F.names || F.heading || F.name || 'Design').slice(0, 120), deckLayout: 'blank', hideDeco: true, hideArt: true, numbering: 'off',
    background: P.bg, ink: P.ink, accent: P.accent, pageFill: P.bg,
    textLayers: Object.fromEntries(['title', 'body', 'kicker', 'brandText', 'footerText'].map(k => [k, { hide: true }])),
    texts: b.texts, shapes,
  };
  if (bg?.image) {
    p.pageImage = bg.image;
    p.shapes = [{ kind: 'rect', x: 0, y: 0, w: 100, h: 100, fill: P.bg, opacity: Math.max(10, Math.min(100, bg.wash)) }, ...shapes];
  }
  return p;
}

// ---- Layouts. Each returns a list of pages. ----
const L = {};

L['flyer-bold'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), m = 8;
  b.text(F.eyebrow, { x: m, y: 7, w: 84, s: 3, c: P.onaccent, u: true, b: true, sp: 6 });
  const ts = b.fit(F.title, 84, 15, 6, 3, 'anton');
  const hb = Math.max(b.text(F.title, { x: m, y: 14, w: 84, s: ts, c: P.onaccent, f: 'anton', u: true, lh: 104, sp: 1 }) + 9, b.Hu * 0.22);
  b.rect(0, 0, 100, hb, P.accent);
  let y = hb + 6;
  if (F.tagline) y = b.text(F.tagline, { x: m, y, w: 84, s: 4.2, f: 'playfair', i: true, c: P.ink }) + 4;
  for (const [lab, val] of [['DATE', F.date], ['TIME', F.time], ['PLACE', F.venue]]) {
    if (!val) continue;
    b.pill(m, y + 0.3, 15, 4.4, P.accent2);
    b.text(lab, { x: m, y: y + 1.1, w: 15, s: 2, c: P.onaccent, b: true, a: 'center', sp: 4 });
    y = b.text(val, { x: m + 18, y, w: 74, s: 4.4, b: true }) + 2.6;
  }
  y += 2;
  const by = b.Hu - 22;
  for (const d of split(F.details).slice(0, 6)) { if (y + 4 > by - 3) break; y = b.text('•  ' + d, { x: m, y, w: 84, s: 3.5, c: P.muted }) + 1.4; }
  b.chip(F.cta || 'Join us', m, by, 3.6, P.accent, P.onaccent, { h: 8 });
  b.text(F.contact, { x: 46, y: by + 2.6, w: 46, s: 3, c: P.muted, a: 'right' });
  b.rect(0, b.Hu - 5, 100, 5, P.ink);
  return [page(b, P, F, c.bg)];
};

L['flyer-photo'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), m = 8, ph = b.Hu * 0.46;
  b.picture(F.picture, 'rect', 0, 0, 100, ph);
  b.chip(F.date || F.eyebrow, m, ph - 5, 3.8, P.accent, P.onaccent, { h: 9 });
  let y = ph + 8;
  const ts = b.fit(F.title, 84, 10, 5.5, 3, 'dmserif', false, false);
  y = b.text(F.title, { x: m, y, w: 84, s: ts, f: 'dmserif', lh: 105 }) + 2.5;
  if (F.tagline) y = b.text(F.tagline, { x: m, y, w: 84, s: 3.8, c: P.muted }) + 4;
  for (const v of [F.time && 'Time: ' + F.time, F.venue && 'Place: ' + F.venue]) if (v) y = b.text(v, { x: m, y, w: 84, s: 3.8, b: true }) + 1.6;
  y += 2;
  for (const d of split(F.details).slice(0, 5)) { if (y + 4.5 > b.Hu - 19) break; y = b.text('✓  ' + d, { x: m, y, w: 84, s: 3.3, c: P.muted }) + 1.2; }
  b.rect(0, b.Hu - 15, 100, 15, P.accent);
  b.text(F.cta || 'Join us', { x: m, y: b.Hu - 11.2, w: 50, s: 4.4, b: true, c: P.onaccent });
  b.text(F.contact, { x: 46, y: b.Hu - 10.6, w: 46, s: 3, c: P.onaccent, a: 'right' });
  return [page(b, P, F, c.bg)];
};

L['flyer-stripe'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), x = 20, w = 72;
  b.rect(0, 0, 13, b.Hu, P.accent);
  b.rect(13, 0, 1.2, b.Hu, P.accent2);
  b.text(F.eyebrow, { x, y: 9, w, s: 3, c: P.accent, u: true, b: true, sp: 6 });
  const ts = b.fit(F.title, w, 11, 6, 4, 'montserrat');
  let y = b.text(F.title, { x, y: 15, w, s: ts, f: 'montserrat', b: true, u: true, lh: 100 }) + 4;
  if (F.tagline) y = b.text(F.tagline, { x, y, w, s: 4, i: true, f: 'lora', c: P.muted }) + 6;
  b.rect(x, y, 14, 0.9, P.accent2); y += 6;
  for (const [lab, val] of [['When', [F.date, F.time].filter(Boolean).join('  ·  ')], ['Where', F.venue]]) {
    if (!val) continue;
    b.text(lab.toUpperCase(), { x, y, w, s: 2.4, c: P.accent, b: true, sp: 5 });
    y = b.text(val, { x, y: y + 3.4, w, s: 4.4, b: true }) + 4;
  }
  const by = b.Hu - 20;
  for (const d of split(F.details).slice(0, 6)) { if (y + 4 > by - 3) break; y = b.text('—  ' + d, { x, y, w, s: 3.5, c: P.muted }) + 1.6; }
  b.chip(F.cta || 'Join us', x, by, 3.6, P.ink, P.bg, { h: 8 });
  b.text(F.contact, { x, y: by + 11, w, s: 3, c: P.muted });
  return [page(b, P, F, c.bg)];
};

const centre = (b, P, o) => (t, y, s, e = {}) => b.text(t, { x: o.x, y, w: o.w, s, a: 'center', ...e });

L['inv-classic'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), g = F.qrAuto ? (H / W <= 1.3 ? 0.4 : 0.72) : 1;
  b.rect(5, 5 / 1, 90, b.Hu - 10, P.accent);
  b.rect(6.2, 6.2, 87.6, b.Hu - 12.4, P.bg);
  const t = centre(b, P, { x: 12, w: 76 });
  let y = b.Hu * (F.qrAuto ? 0.075 : 0.13);
  y = t(F.occasion, y, 3, { c: P.accent, u: true, b: true, sp: 6 }) + 5 * g;
  const ns = b.fit(F.names, 76, 15, 7, 3, 'greatvibes', false, false);
  y = t(F.names, y, ns, { f: 'greatvibes', lh: 100 }) + 4 * g;
  y = t(F.headline, y, 4.4, { f: 'playfair', i: true }) + 5 * g;
  b.rect(38, y, 24, 0.7, P.accent); y += 6;
  y = (F.qrAuto && H / W <= 1.3 ? y : t(F.message, y, 3.6, { c: P.muted }) + 6 * g);
  y = t(F.date, y, 5, { b: true, f: 'playfair' }) + 1.5 * g;
  y = t(F.time, y, 4, {}) + 1.5 * g;
  y = t(F.venue, y, 3.8, { c: P.muted }) + 5 * g;
  y = F.qrAuto && H / W <= 1.3 ? y : t(F.dress, y, 3.2, { i: true, c: P.accent }) + 2 * g;
  if (F.qrAuto) { y = t(F.rsvp, y, 3.2, { b: true }) + 4 * g; const q = H / W <= 1.3 ? 13 : Math.min(18, b.Hu * 0.15); b.qr(F.qrImg, F.qrlabel, 50, Math.min(Math.max(y, b.Hu - q - 12), b.Hu - q - 8), q); }
  else { t(F.rsvp, Math.max(y, b.Hu - 15), 3.2, { b: true }); b.qrAt(F); }
  return [page(b, P, F, c.bg)];
};

L['inv-arch'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), g = F.qrAuto ? (H / W <= 1.3 ? 0.4 : 0.72) : 1;
  b.rect(0, 0, 100, b.Hu, P.accent);
  b.shape('round', 9, 8, 82, b.Hu - 16, P.bg, { radius: 12 });
  const t = centre(b, P, { x: 15, w: 70 });
  let y = b.Hu * (F.qrAuto ? 0.085 : 0.14);
  y = t(F.occasion, y, 3, { c: P.accent, u: true, b: true, sp: 6 }) + 5 * g;
  const ns = b.fit(F.names, 70, 12, 6, 3, 'dmserif', false, false);
  y = t(F.names, y, ns, { f: 'dmserif', lh: 100 }) + 4 * g;
  y = t(F.headline, y, 4, { c: P.muted }) + 6 * g;
  y = (F.qrAuto && H / W <= 1.3 ? y : t(F.message, y, 3.5, { c: P.muted }) + 7 * g);
  y = b.chip([F.date, F.time].filter(Boolean).join('  ·  '), 50, y, 3.4, P.accent2, P.onaccent, { mid: true }) + 8 * g;
  y = t(F.venue, y, 4, { b: true }) + 3 * g;
  y = F.qrAuto && H / W <= 1.3 ? y : t(F.dress, y, 3.2, { i: true, c: P.muted }) + 2 * g;
  if (F.qrAuto) { y = t(F.rsvp, y, 3.2, { c: P.accent, b: true }) + 4 * g; const q = H / W <= 1.3 ? 13 : Math.min(18, b.Hu * 0.15); b.qr(F.qrImg, F.qrlabel, 50, Math.min(Math.max(y, b.Hu - q - 12), b.Hu - q - 8), q); }
  else { t(F.rsvp, Math.max(y + 2, b.Hu - 20), 3.2, { c: P.accent, b: true }); b.qrAt(F); }
  return [page(b, P, F, c.bg)];
};

L['inv-photo'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), g = F.qrAuto ? (H / W <= 1.3 ? 0.4 : 0.72) : 1;
  b.rect(0, 0, 100, b.Hu, P.soft);
  const d = Math.min(46, b.Hu * (F.qrAuto ? (H / W <= 1.3 ? 0.16 : 0.22) : 0.3));
  b.picture(F.picture, 'oval', 50 - d / 2, 9, d, d, { line: P.accent, lineW: 3 });
  const t = centre(b, P, { x: 10, w: 80 });
  let y = 9 + d + 6 * g;
  y = t(F.occasion, y, 3, { c: P.accent, u: true, b: true, sp: 6 }) + 3 * g;
  const ns = b.fit(F.names, 80, 13, 7, 2, 'greatvibes', false, false);
  y = t(F.names, y, ns, { f: 'greatvibes', lh: 100 }) + 3 * g;
  y = t(F.headline, y, 4, { f: 'playfair', i: true }) + 4 * g;
  y = (F.qrAuto && H / W <= 1.3 ? y : t(F.message, y, 3.4, { c: P.muted }) + 5 * g);
  y = t([F.date, F.time].filter(Boolean).join('  ·  '), y, 4.4, { b: true }) + 2 * g;
  y = t(F.venue, y, 3.6, { c: P.muted }) + 4 * g;
  y = F.qrAuto && H / W <= 1.3 ? y : t(F.dress, y, 3.1, { i: true, c: P.accent }) + 1.5 * g;
  if (F.qrAuto) { y = t(F.rsvp, y, 3.1, { b: true }) + 3 * g; const q = H / W <= 1.3 ? 13 : Math.min(18, b.Hu * 0.15); b.qr(F.qrImg, F.qrlabel, 50, Math.min(Math.max(y, b.Hu - q - 12), b.Hu - q - 8), q); }
  else { t(F.rsvp, Math.max(y, b.Hu - 12), 3.1, { b: true }); b.qrAt(F); }
  return [page(b, P, F, c.bg)];
};

// Rows that continue onto more pages. `head(b, first)` draws a page header and returns where rows start; each row is drawn, and if it
// does not fit above the footer it moves to the next page.
function paged(c, rowsAll, _rowH, head, drawRow, foot) {
  const { P, F, W, H } = c, pages = [];
  let i = 0, first = true;
  while (i < rowsAll.length || first) {
    const b = board(W, H, P), top = head(b, first), bottom = b.Hu - 14;
    let y = top, drawn = 0;
    while (i < rowsAll.length) {
      const nt = b.texts.length, ns = b.shapes.length, ny = drawRow(b, rowsAll[i], y);
      if (ny > bottom && drawn > 0) { b.texts.length = nt; b.shapes.length = ns; break; }
      y = ny; i++; drawn++;
      if (ny > bottom) break;
    }
    foot(b, i >= rowsAll.length, pages.length + 1);
    pages.push(page(b, P, F, c.bg));
    first = false;
    if (pages.length >= 8) break;
  }
  return pages;
}

L['prog-timeline'] = (c) => {
  const { P, F } = c, m = 8, rows = split(F.items).map(r => cols(r, 3));
  return paged(c, rows, 9.2,
    (b, first) => {
      let hh = 14;
      if (first) {
        const ts = b.fit(F.title, 84, 9, 5, 2, 'montserrat');
        let y = b.text(F.title, { x: m, y: 7, w: 84, s: ts, f: 'montserrat', b: true, u: true, c: P.onaccent, lh: 100 }) + 1.6;
        y = b.text(F.subtitle, { x: m, y, w: 84, s: 3.6, i: true, c: P.onaccent, f: 'playfair' }) + 1.4;
        y = b.text([F.date, F.venue].filter(Boolean).join('  ·  '), { x: m, y, w: 84, s: 3, c: P.onaccent, b: true }) + 7;
        hh = y;
      } else b.text(F.title, { x: m, y: 5, w: 84, s: 4, b: true, c: P.onaccent });
      b.rect(0, 0, 100, hh, P.accent);
      return hh + 6;
    },
    (b, r, y) => {
      b.text(r[0], { x: m, y, w: 20, s: 3.4, b: true, c: P.accent });
      const e = b.text(r[1], { x: 30, y, w: r[2] ? 42 : 62, s: 3.5, b: true });
      let e2 = e;
      if (r[2]) e2 = b.text(r[2], { x: 73, y: y + 0.2, w: 19, s: 2.9, c: P.muted, a: 'right', i: true });
      const end = Math.max(e, e2, y + 4.4) + 1.6;
      b.rect(m, end, 84, 0.25, P.soft);
      return end + 3.2;
    },
    (b, last) => { if (last) b.text(F.footer, { x: m, y: b.Hu - 11, w: 84, s: 3, c: P.muted, a: 'center', i: true }); else b.text('Continued on the next page', { x: m, y: b.Hu - 11, w: 84, s: 2.8, c: P.muted, a: 'center' }); });
};

L['prog-clean'] = (c) => {
  const { P, F } = c, rows = split(F.items).map(r => cols(r, 3));
  return paged(c, rows, 10.4,
    (b, first) => {
      const t = centre(b, P, { x: 10, w: 80 });
      if (!first) return 14;
      const ts = b.fit(F.title, 80, 10, 5.5, 2, 'playfair', false, false);
      let y = t(F.title, 9, ts, { f: 'playfair', lh: 100 }) + 2;
      y = t(F.subtitle, y, 3.8, { i: true, c: P.accent, f: 'lora' }) + 2;
      y = t([F.date, F.venue].filter(Boolean).join('  ·  '), y, 3, { c: P.muted, b: true }) + 4;
      b.rect(44, y, 12, 0.7, P.accent);
      return y + 7;
    },
    (b, r, y) => {
      const t = centre(b, P, { x: 10, w: 80 });
      y = t(r[0], y, 3.2, { c: P.accent, b: true, u: true, sp: 3 }) + 0.8;
      y = t(r[1], y, 4.2, { f: 'playfair', b: true }) + 0.6;
      if (r[2]) y = t(r[2], y, 3, { c: P.muted, i: true }) + 0.6;
      return y + 3.6;
    },
    (b, last) => { if (last) b.text(F.footer, { x: 10, y: b.Hu - 11, w: 80, s: 3, c: P.muted, a: 'center', i: true }); });
};

L['food-grid'] = (c) => {
  const { P, F } = c, m = 6, heads = cols(F.headers || ''), n = Math.max(1, Math.min(5, heads.filter(Boolean).length || Math.max(...split(F.rows).map(r => cols(r).length - 1), 1)));
  const lw = 16, cw = (88 - lw) / n, rows = split(F.rows).map(r => cols(r, n + 1));
  return paged(c, rows, 16,
    (b, first) => {
      let hh = 12;
      if (first) {
        const ts = b.fit(F.title, 84, 9, 5, 2, 'montserrat');
        let y = b.text(F.title, { x: m + 2, y: 6, w: 84, s: ts, f: 'montserrat', b: true, u: true, c: P.onaccent, lh: 100 }) + 1.5;
        y = b.text(F.subtitle, { x: m + 2, y, w: 84, s: 3.6, c: P.onaccent, i: true, f: 'playfair' });
        hh = y + 6;
      } else b.text(F.title, { x: m + 2, y: 4, w: 84, s: 3.8, b: true, c: P.onaccent });
      b.rect(0, 0, 100, hh, P.accent2);
      const y0 = hh + 5;
      for (let i = 0; i < n; i++) { b.pill(m + lw + i * cw, y0, cw - 1.6, 6, P.accent); b.text(heads[i] || '', { x: m + lw + i * cw, y: y0 + 1.7, w: cw - 1.6, s: 2.6, b: true, c: P.onaccent, a: 'center', u: true, lh: 100 }); }
      return y0 + 9;
    },
    (b, r, y) => {
      let e = y;
      for (let i = 0; i < n; i++) e = Math.max(e, b.text(r[i + 1], { x: m + lw + i * cw + 0.6, y: y + 1.4, w: cw - 2.8, s: 2.9, a: 'center' }));
      const h = Math.max(14, e - y + 3);
      b.rect(m, y - 1, 88, h, P.soft);
      b.text(r[0], { x: m + 1.5, y: y + 1.4, w: lw - 2, s: 3.3, b: true, c: P.accent });
      return y + h + 1.6;
    },
    (b, last) => { if (last) b.text(F.footer, { x: m, y: b.Hu - 10, w: 88, s: 3, c: P.muted, a: 'center', i: true }); });
};

L['food-timeline'] = (c) => {
  const { P, F } = c, m = 8, rows = split(F.rows).map(r => cols(r, 4));
  return paged(c, rows, 17,
    (b, first) => {
      if (!first) return 12;
      const t = centre(b, P, { x: 10, w: 80 }), ts = b.fit(F.title, 80, 11, 6, 2, 'dmserif', false, false);
      let y = t(F.title, 9, ts, { f: 'dmserif', lh: 100, c: P.accent2 }) + 2;
      y = t(F.subtitle, y, 3.6, { c: P.muted, i: true }) + 5;
      b.rect(44, y, 12, 0.7, P.accent);
      return y + 8;
    },
    (b, r, y) => {
      b.pill(m, y, 22, 6.4, P.accent);
      b.text(r[0], { x: m, y: y + 1.7, w: 22, s: 3, b: true, c: P.onaccent, a: 'center' });
      const items = r.slice(1).filter(Boolean);
      let e = y + 0.4;
      items.forEach((it, i) => { e = b.text((i ? '' : '') + it, { x: m + 26, y: e, w: 62, s: i ? 3.2 : 3.8, b: !i, c: i ? P.muted : P.ink }) + 0.8; });
      return Math.max(e, y + 7) + 5;
    },
    (b, last) => { if (last) b.text(F.footer, { x: m, y: b.Hu - 11, w: 84, s: 3, c: P.muted, a: 'center', i: true }); });
};

L['note-poster'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), m = 9, w = 82, room = b.Hu - 18;
  b.chip(F.label, m, 14, 3, P.accent, P.onaccent, { u: true, h: 7.5 });
  const info = [['When', F.date], ['Where', F.venue]].filter(x => x[1]);
  let ts = 16;
  for (; ts > 7; ts -= 0.5) {
    const total = 28 + b.lines(F.title, ts, w, 'anton', true, false) * ts * 1.04 + 13 + b.lines(F.message || '', 4, w) * 4 * 1.3 * (F.message ? 1 : 0) + 8 + info.length * 12;
    if (total <= room && b.lines(F.title, ts, w, 'anton', true, false) <= 4) break;
  }
  let y = b.text(F.title, { x: m, y: 28, w, s: ts, f: 'anton', u: true, lh: 104, sp: 1 }) + 6;
  b.rect(m, y, 18, 1.1, P.accent2); y += 7;
  y = b.text(F.message, { x: m, y, w, s: 4, c: P.muted, lh: 130 }) + 8;
  for (const [lab, v] of info) { b.text(lab.toUpperCase(), { x: m, y, w, s: 2.4, c: P.accent, b: true, sp: 5 }); y = b.text(v, { x: m, y: y + 3.4, w, s: 4.4, b: true }) + 5; }
  if (F.picture && y < room - 30) b.picture(F.picture, 'rect', m, y, w, Math.min(26, room - y - 2));
  b.rect(0, b.Hu - 14, 100, 14, P.accent);
  b.text(F.contact, { x: m, y: b.Hu - 9.6, w, s: 4.4, b: true, c: P.onaccent, a: 'center' });
  return [page(b, P, F, c.bg)];
};

L['cert-classic'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P), Hu = b.Hu, k = Math.min(1, Hu / 80), f = v => v * k;
  b.rect(2, 2, 96, Hu - 4, P.accent);
  b.rect(2.8, 2.8, 94.4, Hu - 5.6, P.bg);
  b.rect(4.4, 4.4, 91.2, Hu - 8.8, P.accent2);
  b.rect(5, 5, 90, Hu - 10, P.bg);
  const t = centre(b, P, { x: 14, w: 72 });
  t(F.org, Hu * 0.095, f(3), { c: P.accent, u: true, b: true, sp: 8 });
  const hs = b.fit(F.heading, 72, f(8), f(4.5), 2, 'playfair', true, true);
  t(F.heading, Hu * 0.15, hs, { f: 'playfair', b: true, u: true, lh: 105 });
  t('This is proudly presented to', Hu * 0.405, f(3.2), { i: true, c: P.muted });
  const ns = b.fit(F.name, 72, f(13), f(6), 1, 'greatvibes', false, false);
  t(F.name, Hu * 0.455, ns, { f: 'greatvibes', lh: 105, c: P.accent });
  b.rect(30, Hu * 0.63, 40, 0.5, P.accent2);
  t(F.reason, Hu * 0.645, f(3.4), { c: P.ink, lh: 125 });
  t(F.date, Hu * 0.775, f(3.2), { b: true });
  const sy = Hu * 0.86;
  for (const [x, sg] of [[16, F.signer1], [58, F.signer2]]) { b.rect(x, sy, 26, 0.5, P.ink); b.text(sg, { x: x - 2, y: sy + 1.2, w: 30, s: f(2.8), a: 'center', c: P.muted }); }
  return [page(b, P, F, c.bg)];
};

L['menu-card'] = (c) => {
  const { P, F } = c, m = 12, rows = split(F.items);
  const items = [];
  for (const r of rows) { if (r.startsWith('#')) items.push({ h: r.replace(/^#+\s*/, ''), c: null }); else if (items.length && items[items.length - 1].h && !items[items.length - 1].c) items[items.length - 1].c = cols(r, 3); else items.push({ c: cols(r, 3) }); }
  return paged(c, items, 9.6,
    (b, first) => {
      if (!first) return 12;
      const t = centre(b, P, { x: 10, w: 80 }), ts = b.fit(F.title, 80, 15, 8, 2, 'greatvibes', false, false);
      let y = t(F.title, 9, ts, { f: 'greatvibes', lh: 100, c: P.accent }) + 2;
      y = t(F.subtitle, y, 3.4, { c: P.muted, i: true, f: 'lora' }) + 4;
      b.rect(40, y, 20, 0.6, P.accent2);
      return y + 8;
    },
    (b, r, y) => {
      if (r.h) { b.text(r.h, { x: m, y: y + 2, w: 76, s: 4.6, f: 'playfair', b: true, u: true, c: P.accent2, sp: 3 }); b.rect(m, y + 9, 76, 0.4, P.accent2); y += 12; if (!r.c) return y; }
      const [n, d, pr] = r.c;
      b.text(n, { x: m, y, w: 56, s: 3.8, b: true });
      b.text(pr, { x: 70, y, w: 18, s: 3.8, b: true, c: P.accent, a: 'right' });
      const e = b.text(d, { x: m, y: y + 4.6, w: 60, s: 2.9, c: P.muted, i: true });
      return Math.max(e, y + 8) + 3;
    },
    (b, last) => { if (last) b.text(F.footer, { x: m, y: b.Hu - 11, w: 76, s: 3, c: P.muted, a: 'center', i: true }); });
};

L['thanks-card'] = (c) => {
  const { P, F, W, H } = c, b = board(W, H, P);
  b.rect(0, 0, 100, b.Hu, P.soft);
  b.rect(0, b.Hu - 6, 100, 6, P.accent);
  const t = centre(b, P, { x: 10, w: 80 });
  let y = b.Hu * 0.1;
  if (F.picture) { const d = Math.min(36, b.Hu * 0.22); b.picture(F.picture, 'oval', 50 - d / 2, y, d, d, { line: P.accent, lineW: 3 }); y += d + 7; }
  const ts = b.fit(F.title, 80, 20, 9, 2, 'greatvibes', false, false);
  y = t(F.title, y, ts, { f: 'greatvibes', lh: 100, c: P.accent }) + 6;
  b.rect(44, y, 12, 0.7, P.accent2); y += 7;
  y = t(F.message, y, 4, { c: P.ink, lh: 135 }) + 8;
  t(F.from, y, 4.2, { f: 'playfair', i: true, b: true });
  return [page(b, P, F, c.bg)];
};

// ---- Public functions ----
const FIELD_LIMIT = { text: 160, longtext: 700, list: 3000 };

function resolve(input) {
  if (!input || typeof input !== 'object') throw new MagicError('Send a JSON object.');
  const tpl = TEMPLATES.find(t => t.id === input.template);
  if (!tpl) throw new MagicError(`template must be one of: ${TEMPLATES.map(t => t.id).join(', ')}.`);
  const kind = KINDS.find(k => k.id === tpl.kind);
  const size = input.size === undefined ? (tpl.kind === 'certificate' ? 'print-a4-landscape' : tpl.kind === 'invitation' ? 'print-invite' : 'print-a4') : input.size;
  if (!sizesFor(tpl).includes(size)) throw new MagicError(`size must be one of: ${sizesFor(tpl).join(', ')} for this template.`);
  let P = PALETTES.find(p => p.id === (input.palette ?? 'brand'));
  if (!P) throw new MagicError(`palette must be one of: ${PALETTES.map(p => p.id).join(', ')}.`);
  P = { ...P };
  const hexRe = /^#[0-9a-f]{6}$/i;
  for (const [k, kk] of [['accent', 'accent'], ['accent2', 'accent2'], ['background', 'bg'], ['ink', 'ink']]) {
    const v = input.colours?.[k];
    if (v !== undefined && v !== '') { if (!hexRe.test(v)) throw new MagicError(`colours.${k} must be a six-digit hex colour.`); P[kk] = v; }
  }
  const fields = input.fields && typeof input.fields === 'object' ? input.fields : {};
  const F = {};
  for (const f of kind.fields) {
    const v = fields[f.id];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'image') { if (typeof v !== 'string' || v.length > 1_400_000 || !IMAGE.test(v)) throw new MagicError(`${f.id} must be a PNG, JPEG or WebP picture of up to 1.4 MB.`); F[f.id] = v; continue; }
    if (typeof v !== 'string') throw new MagicError(`${f.id} must be text.`);
    if (v.length > FIELD_LIMIT[f.type]) throw new MagicError(`${f.label} is too long (${FIELD_LIMIT[f.type]} characters at most).`);
    F[f.id] = v;
  }
  if (F.qr) { try { F.qrImg = qrPng(F.qr, /^#[0-9a-f]{6}$/i.test(P.ink) && parseInt(P.ink.slice(1, 3), 16) + parseInt(P.ink.slice(3, 5), 16) + parseInt(P.ink.slice(5, 7), 16) < 330 ? P.ink : '#000000'); } catch (e) { throw new MagicError(e.message); } }
  F.qrAuto = !!F.qrImg && !F.qrsize && !F.qrx && !F.qry;
  const must = { flyer: 'title', invitation: 'names', program: 'title', food: 'title', notice: 'title', certificate: 'name', menu: 'title', thanks: 'title' }[tpl.kind];
  if (!F[must]) throw new MagicError(`${kind.fields.find(f => f.id === must).label} is needed.`);
  let bg;
  if (input.background?.image !== undefined) {
    const im = input.background.image;
    if (typeof im !== 'string' || im.length > 1_400_000 || !IMAGE.test(im)) throw new MagicError('background.image must be a PNG, JPEG or WebP picture of up to 1.4 MB.');
    const wash = input.background.wash === undefined ? 72 : Number(input.background.wash);
    if (!Number.isFinite(wash) || wash < 10 || wash > 100) throw new MagicError('background.wash must be a number from 10 to 100.');
    bg = { image: im, wash };
  }
  return { tpl, kind, size, palette: input.palette ?? 'brand', P, F, bg, colours: input.colours };
}

export function generate(input) {
  const r = resolve(input), [W, H] = SIZE_PX[r.size];
  const pages = L[r.tpl.id]({ P: r.P, F: r.F, W, H, bg: r.bg });
  // The first (hook) page has a 8% inset, so 1cqw there is 0.84% of the page; other blank pages use the full width.
  for (const t of pages[0]?.texts || []) { t.size = +Math.min(30, t.size / 0.84).toFixed(2); t.boxWidth = +(t.boxWidth / 0.84).toFixed(2); }
  const title = String(r.F.title || r.F.names || r.F.name || r.F.heading || r.kind.name).slice(0, 100);
  const design = { title: `${title} (${r.kind.name.toLowerCase()})`.slice(0, 120), platform: r.size, template_id: 0, status: 'draft', pages };
  return { design, code: encode(input), template: r.tpl.id, size: r.size };
}

// A template code carries everything except the pictures (they are too big), so pasting it rebuilds the same design.
export function encode(input) {
  const r = resolve(input), f = { ...r.F };
  delete f.picture; delete f.qrImg; delete f.qrAuto;
  const o = { t: r.tpl.id, z: r.size, p: r.palette, c: r.colours && Object.keys(r.colours).length ? r.colours : undefined, f, w: r.bg ? r.bg.wash : undefined };
  return 'MS1.' + Buffer.from(JSON.stringify(o)).toString('base64url');
}
export function decode(code) {
  const m = /^MS1\.([A-Za-z0-9_-]{4,20000})$/.exec(String(code || '').trim());
  if (!m) throw new MagicError('That is not a template code. It should start with MS1.');
  let o;
  try { o = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { throw new MagicError('That template code is damaged.'); }
  if (!o || typeof o !== 'object') throw new MagicError('That template code is damaged.');
  const input = { template: o.t, size: o.z, palette: o.p, colours: o.c, fields: o.f };
  resolve(input);
  return { ...input, wash: o.w };
}

export const sizesFor = t => (t.kind === 'certificate' ? LANDSCAPE : PORTRAIT);
export const catalog = () => ({ sizes: SIZES, palettes: PALETTES.map(({ id, name, bg, ink, accent, accent2 }) => ({ id, name, bg, ink, accent, accent2 })), kinds: KINDS, templates: TEMPLATES.map(t => ({ ...t, sizes: sizesFor(t) })) });
