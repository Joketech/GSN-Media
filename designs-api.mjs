// Validation for server-stored designs (editable social media packs). Humans (the browser editor) and Hermes agents
// share this one document format, so everything is checked here before it is saved.
import { findPreset, ratioOf } from './platforms.mjs';

export class DesignError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const STATUSES = ['draft', 'review', 'approved'];
export const MAX_DESIGN_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 30;
const MAX_LAYERS = 24;
const DECK_LAYOUTS = ['hook', 'cta', 'agenda', 'triptych', 'feature', 'principle', 'steps', 'compare', 'metric', 'checklist', 'quote', 'example', 'summary', 'blank', 'open'];
const TEXT_KEYS = ['title', 'body', 'kicker', 'brandText', 'footerText'];
const HEX = /^#[0-9a-f]{6}$/i;
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i;
const MOTIF = /^(?:hourglass|visor|orbit|portfolio|stack|lift|product|audio|terminal|rocket|none|business-(?:[0-9]|1[0-9]|2[0-3])|campaign-(?:[0-9]|1[01])|gsn-\d{1,4})$/;
export const MASKS = ['circle', 'rounded', 'heart', 'star', 'diamond', 'triangle'];
const SLOT_KEY = /^[a-z][a-z0-9]{0,23}$/;
const SHAPE = /^[a-z][a-z0-9-]{1,24}$/;
const SHAPE_KINDS = ['rect', 'round', 'pill', 'oval', 'diamond', 'triangle', 'star'];
const MAX_SHAPES = 40;
// A shape colour is a six-digit hex or a page colour name, so a design follows the pack's colours when they change.
const COLOUR_NAMES = ['accent', 'accent2', 'onaccent', 'ink', 'soft', 'line', 'paper'];
const shapeColour = (value, name) => (value === undefined || value === null || value === '' ? undefined : COLOUR_NAMES.includes(value) ? value : hex(value, name));
const LAYER_ORDER_KEY = /^(?:title|body|kicker|brandText|footerText|artwork|element:\d{1,2}|text:\d{1,2}|shape:\d{1,2})$/;

const range = (value, min, max, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new DesignError(`${name} must be a number from ${min} to ${max}.`);
  return value;
};
const text = (value, name, max, { required = false } = {}) => {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new DesignError(`${name} must be ${required ? '1' : '0'} to ${max} characters.`);
  return value;
};
const pick = (value, allowed, name) => {
  if (value === undefined) return undefined;
  if (!allowed.includes(value)) throw new DesignError(`${name} must be one of: ${allowed.join(', ')}.`);
  return value;
};
const hex = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !HEX.test(value)) throw new DesignError(`${name} must be a six-digit hex color such as #1a2b3c.`);
  return value;
};
const image = (value, name) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 1_400_000 || !IMAGE.test(value)) throw new DesignError(`${name} must be a PNG, JPEG or WebP image of up to 1.4 MB.`);
  return value;
};
const clean = object => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined));

// Formatting for one text layer, or for a free text box.
function textOptions(o, name) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new DesignError(`${name} must be an object.`);
  return clean({
    x: range(o.x, -100, 100, `${name}.x`), y: range(o.y, -100, 100, `${name}.y`),
    boxWidth: range(o.boxWidth, 8, 150, `${name}.boxWidth`), boxHeight: range(o.boxHeight, 1, 180, `${name}.boxHeight`),
    rotation: range(o.rotation, -360, 360, `${name}.rotation`), size: range(o.size, 1, 30, `${name}.size`),
    width: range(o.width, 50, 180, `${name}.width`), spacing: range(o.spacing, -10, 40, `${name}.spacing`), lineHeight: range(o.lineHeight, 70, 250, `${name}.lineHeight`),
    opacity: range(o.opacity, 10, 100, `${name}.opacity`),
    font: pick(o.font, ['sans', 'serif', 'mono', 'inter', 'poppins', 'montserrat', 'playfair', 'lora', 'oswald', 'bebas', 'dmserif', 'pacifico', 'greatvibes', 'dancing', 'anton', 'caveat', 'arabic', 'hebrew', 'devanagari', 'bengali', 'thai', 'chinese', 'japanese', 'korean'], `${name}.font`), align: pick(o.align, ['left', 'center', 'right', 'justify'], `${name}.align`),
    effect: pick(o.effect, ['shadow', 'glow', 'outline'], `${name}.effect`), motion: pick(o.motion, ['fade', 'pulse', 'rise'], `${name}.motion`),
    color: shapeColour(o.color, `${name}.color`), bg: hex(o.bg, `${name}.bg`), boxFill: hex(o.boxFill, `${name}.boxFill`), bgPad: range(o.bgPad, 0, 150, `${name}.bgPad`), bgRadius: range(o.bgRadius, 0, 100, `${name}.bgRadius`),
    ...Object.fromEntries(['bold', 'italic', 'underline', 'strike', 'uppercase', 'bullets'].map(flag => {
      if (o[flag] !== undefined && typeof o[flag] !== 'boolean') throw new DesignError(`${name}.${flag} must be true or false.`);
      return [flag, o[flag]];
    })),
  });
}

function numberList(value, name, min, max) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_LAYERS) throw new DesignError(`${name} must be a list of up to ${MAX_LAYERS} numbers.`);
  return value.map((v, i) => range(v, min, max, `${name}[${i}]`));
}

export function sanitizeSlide(s, index = 0) {
  const where = `Page ${index + 1}`;
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new DesignError(`${where} must be an object.`);
  const slide = clean({
    title: text(s.title, `${where} title`, 300, { required: true }),
    body: text(s.body, `${where} body`, 1200),
    kicker: text(s.kicker, `${where} kicker`, 120), brandText: text(s.brandText, `${where} brandText`, 120), footerText: text(s.footerText, `${where} footerText`, 120),
    deckLayout: pick(s.deckLayout, DECK_LAYOUTS, `${where} deckLayout`),
    artLayer: pick(s.artLayer, ['behind', 'front', 'background'], `${where} artLayer`),
    accent: hex(s.accent, `${where} accent`), background: hex(s.background, `${where} background`), ink: hex(s.ink, `${where} ink`),
    artX: range(s.artX, -300, 300, `${where} artX`), artY: range(s.artY, -300, 300, `${where} artY`), artScale: range(s.artScale, 35, 180, `${where} artScale`),
    x: range(s.x, -100, 100, `${where} x`), y: range(s.y, -100, 100, `${where} y`), size: range(s.size, 5, 18, `${where} size`),
    image: image(s.image, `${where} image`),
    pageFill: hex(s.pageFill, `${where} pageFill`), pageImage: image(s.pageImage, `${where} pageImage`),
    hideArt: s.hideArt === undefined ? undefined : (typeof s.hideArt === 'boolean' ? s.hideArt : (() => { throw new DesignError(`${where} hideArt must be true or false.`); })()),
    elementSizes: numberList(s.elementSizes, `${where} elementSizes`, 25, 500),
    elementStretchX: numberList(s.elementStretchX, `${where} elementStretchX`, 25, 400), elementStretchY: numberList(s.elementStretchY, `${where} elementStretchY`, 25, 400),
    elementRotations: numberList(s.elementRotations, `${where} elementRotations`, -360, 360), elementRadius: numberList(s.elementRadius, `${where} elementRadius`, 0, 50),
    elementOpacity: numberList(s.elementOpacity, `${where} elementOpacity`, 10, 100), elementFlip: numberList(s.elementFlip, `${where} elementFlip`, 0, 1),
    artMask: pick(s.artMask, MASKS, `${where} artMask`),
    numbering: pick(s.numbering, ['on', 'off'], `${where} numbering`),
    artFlip: pick(s.artFlip, ['on', 'off'], `${where} artFlip`), artStretchX: range(s.artStretchX, 35, 300, `${where} artStretchX`), artStretchY: range(s.artStretchY, 35, 300, `${where} artStretchY`),
  });
  if (s.parts !== undefined) {
    // Adjustments to the template's own decorations (badges, bars, icons, numbers), keyed by their place in the page, such as "3" or "3.1".
    if (!s.parts || typeof s.parts !== 'object' || Array.isArray(s.parts) || Object.keys(s.parts).length > 60) throw new DesignError(`${where} parts must be an object with up to 60 items.`);
    slide.parts = {};
    for (const [key, v] of Object.entries(s.parts)) {
      if (!/^\d{1,3}(?:\.\d{1,3}){0,6}$/.test(key)) throw new DesignError(`${where} has an invalid part "${key}".`);
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new DesignError(`${where} part ${key} must be an object.`);
      slide.parts[key] = clean({ x: range(v.x, -100, 100, `${where} part ${key} x`), y: range(v.y, -100, 100, `${where} part ${key} y`), scale: range(v.scale, 0.2, 4, `${where} part ${key} scale`), fill: hex(v.fill, `${where} part ${key} fill`), color: hex(v.color, `${where} part ${key} color`), opacity: range(v.opacity, 0, 100, `${where} part ${key} opacity`), hide: v.hide === undefined ? undefined : (typeof v.hide === 'boolean' ? v.hide : (() => { throw new DesignError(`${where} part ${key} hide must be true or false.`); })()) });
    }
  }
  if (s.elementMasks !== undefined) {
    if (!Array.isArray(s.elementMasks) || s.elementMasks.length > MAX_LAYERS || s.elementMasks.some(m => m !== '' && !MASKS.includes(m))) throw new DesignError(`${where} elementMasks must be a list of up to ${MAX_LAYERS} shape names.`);
    slide.elementMasks = s.elementMasks;
  }
  if (s.panel !== undefined) {
    // The template's own text card: where it sits, its colour, see-through amount and corner roundness, or hidden.
    const o = s.panel;
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new DesignError(`${where} panel must be an object.`);
    slide.panel = clean({ x: range(o.x, -100, 100, `${where} panel.x`), y: range(o.y, -100, 100, `${where} panel.y`), fill: hex(o.fill, `${where} panel.fill`), opacity: range(o.opacity, 0, 100, `${where} panel.opacity`), radius: range(o.radius, 0, 80, `${where} panel.radius`), hide: o.hide === undefined ? undefined : (typeof o.hide === 'boolean' ? o.hide : (() => { throw new DesignError(`${where} panel.hide must be true or false.`); })()) });
  }
  if (s.slots !== undefined) {
    // Named picture slots of a photo layout: an uploaded picture plus where it sits inside its frame (x, y) and how far it is zoomed (z, 100 to 400).
    if (!s.slots || typeof s.slots !== 'object' || Array.isArray(s.slots) || Object.keys(s.slots).length > 10) throw new DesignError(`${where} slots must be an object with up to 10 slots.`);
    slide.slots = {};
    for (const [key, v] of Object.entries(s.slots)) {
      if (!SLOT_KEY.test(key)) throw new DesignError(`${where} has an invalid slot name "${key}".`);
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new DesignError(`${where} slot ${key} must be an object.`);
      slide.slots[key] = clean({ src: image(v.src ?? v.image, `${where} slot ${key} picture`), x: range(v.x, -100, 100, `${where} slot ${key} x`), y: range(v.y, -100, 100, `${where} slot ${key} y`), z: range(v.z, 100, 400, `${where} slot ${key} z`), fx: range(v.fx, -100, 100, `${where} slot ${key} fx`), fy: range(v.fy, -100, 100, `${where} slot ${key} fy`), fs: range(v.fs, 30, 300, `${where} slot ${key} fs`), mask: pick(v.mask, MASKS, `${where} slot ${key} mask`), flip: range(v.flip, 0, 1, `${where} slot ${key} flip`) });
    }
  }
  if (s.motif !== undefined) {
    if (typeof s.motif !== 'string' || !MOTIF.test(s.motif)) throw new DesignError(`${where} has an unsupported artwork motif.`);
    slide.motif = s.motif;
  }
  if (s.layerOrder !== undefined) {
    if (!Array.isArray(s.layerOrder) || s.layerOrder.length > 60 || new Set(s.layerOrder).size !== s.layerOrder.length || s.layerOrder.some(k => typeof k !== 'string' || !LAYER_ORDER_KEY.test(k))) throw new DesignError(`${where} has an invalid layerOrder.`);
    slide.layerOrder = s.layerOrder;
  }
  if (s.groups !== undefined) {
    if (!Array.isArray(s.groups) || s.groups.length > 12) throw new DesignError(`${where} groups must be a list of up to 12 groups.`);
    slide.groups = s.groups.map((g, i) => {
      if (!Array.isArray(g) || g.length < 2 || g.length > 40 || new Set(g).size !== g.length || g.some(k => typeof k !== 'string' || !LAYER_ORDER_KEY.test(k))) throw new DesignError(`${where} group ${i + 1} is not valid.`);
      return g;
    });
  }
  if (s.textLayers !== undefined) {
    if (!s.textLayers || typeof s.textLayers !== 'object' || Array.isArray(s.textLayers)) throw new DesignError(`${where} textLayers must be an object.`);
    slide.textLayers = {};
    for (const [key, value] of Object.entries(s.textLayers)) {
      if (!TEXT_KEYS.includes(key)) throw new DesignError(`${where} textLayers has an unknown layer "${key}".`);
      slide.textLayers[key] = textOptions(value, `${where} ${key}`);
    }
  }
  if (s.texts !== undefined) {
    if (!Array.isArray(s.texts) || s.texts.length > MAX_LAYERS) throw new DesignError(`${where} texts must be a list of up to ${MAX_LAYERS} text boxes.`);
    slide.texts = s.texts.map((t, i) => ({
      text: text(t?.text, `${where} text box ${i + 1}`, 1200, { required: true }),
      left: range(t.left, -50, 150, `${where} text box ${i + 1} left`) ?? 10,
      top: range(t.top, -50, 150, `${where} text box ${i + 1} top`) ?? 10,
      ...textOptions({ ...t, text: undefined, left: undefined, top: undefined }, `${where} text box ${i + 1}`),
    }));
  }
  // Free shapes: boxes, pills, ovals and picture frames a creator places anywhere on the page.
  if (s.shapes !== undefined) {
    if (!Array.isArray(s.shapes) || s.shapes.length > MAX_SHAPES) throw new DesignError(`${where} shapes must be a list of up to ${MAX_SHAPES}.`);
    let pictures = 0;
    slide.shapes = s.shapes.map((sh, i) => {
      const n = `${where} shape ${i + 1}`;
      if (!sh || typeof sh !== 'object' || Array.isArray(sh)) throw new DesignError(`${n} must be an object.`);
      let src;
      if (sh.src !== undefined && sh.src !== null && sh.src !== '') {
        if (typeof sh.src === 'string' && /^gsn-\d{1,4}$/.test(sh.src)) src = sh.src;
        else { src = image(sh.src, `${n}.src`); if (++pictures > 6) throw new DesignError(`${where} can hold up to 6 uploaded pictures in shapes.`); }
      }
      return clean({
        kind: pick(sh.kind ?? 'rect', SHAPE_KINDS, `${n}.kind`),
        x: range(sh.x ?? 10, -50, 150, `${n}.x`), y: range(sh.y ?? 10, -50, 150, `${n}.y`),
        w: range(sh.w ?? 30, 1, 200, `${n}.w`), h: range(sh.h ?? 20, 1, 200, `${n}.h`),
        fill: shapeColour(sh.fill, `${n}.fill`), line: shapeColour(sh.line, `${n}.line`), lineW: range(sh.lineW, 0, 12, `${n}.lineW`),
        radius: range(sh.radius, 0, 25, `${n}.radius`), opacity: range(sh.opacity, 10, 100, `${n}.opacity`), rot: range(sh.rot, -360, 360, `${n}.rot`), flip: range(sh.flip, 0, 1, `${n}.flip`),
        shadow: sh.shadow === undefined ? undefined : !!sh.shadow,
        src, px: range(sh.px, 0, 100, `${n}.px`), py: range(sh.py, 0, 100, `${n}.py`), z: range(sh.z, 100, 400, `${n}.z`),
      });
    });
  }
  if (s.elements !== undefined) {
    if (!Array.isArray(s.elements) || s.elements.length > MAX_LAYERS) throw new DesignError(`${where} elements must be a list of up to ${MAX_LAYERS}.`);
    slide.elements = s.elements.map((e, i) => {
      if (typeof e !== 'string' || !(SHAPE.test(e) || /^gsn-\d{1,4}$/.test(e) || (e.length <= 1_400_000 && IMAGE.test(e)))) throw new DesignError(`${where} element ${i + 1} is not a supported shape, library photo or image.`);
      return e;
    });
    if (s.elementPositions !== undefined) {
      if (!Array.isArray(s.elementPositions) || s.elementPositions.length > MAX_LAYERS) throw new DesignError(`${where} elementPositions is invalid.`);
      slide.elementPositions = s.elementPositions.map((p, i) => (p == null ? null : { x: range(p.x, -50, 150, `${where} elementPositions[${i}].x`), y: range(p.y, -50, 150, `${where} elementPositions[${i}].y`) }));
    }
    if (s.elementFills !== undefined) {
      if (!Array.isArray(s.elementFills) || s.elementFills.length > MAX_LAYERS) throw new DesignError(`${where} elementFills is invalid.`);
      slide.elementFills = s.elementFills.map((f, i) => (f == null ? null : image(f, `${where} elementFills[${i}]`)));
    }
    if (s.elementSolid !== undefined) {
      if (!Array.isArray(s.elementSolid) || s.elementSolid.length > MAX_LAYERS) throw new DesignError(`${where} elementSolid is invalid.`);
      slide.elementSolid = s.elementSolid.map(v => !!v);
    }
    if (s.elementColors !== undefined) {
      if (!Array.isArray(s.elementColors) || s.elementColors.length > MAX_LAYERS) throw new DesignError(`${where} elementColors is invalid.`);
      slide.elementColors = s.elementColors.map((c, i) => (c == null ? null : hex(c, `${where} elementColors[${i}]`)));
    }
  }
  return slide;
}

// `templateCount` is the number of templates the studio ships (the design may only reference one of them).
export function sanitizeDesign(input, { templateCount }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DesignError('Send a design JSON object.');
  const preset = findPreset(input.platform);
  if (!preset) throw new DesignError('platform must be one of the preset ids from GET /api/v1/platforms.');
  if (!Number.isInteger(input.template_id) || input.template_id < 0 || input.template_id >= templateCount) throw new DesignError('template_id is outside the template catalog.');
  if (!Array.isArray(input.pages) || input.pages.length < 1 || input.pages.length > MAX_PAGES) throw new DesignError(`A design needs 1 to ${MAX_PAGES} pages.`);
  const brand = input.brand === undefined ? { name: 'GSN Technology', handle: 'GSN Technology' } : { name: text(input.brand?.name, 'brand.name', 80, { required: true }), handle: text(input.brand?.handle ?? input.brand?.name, 'brand.handle', 80, { required: true }) };
  const design = {
    title: text(input.title, 'title', 120, { required: true }).trim(),
    platform: preset.id, ratio: preset.ratio, size: { w: preset.w, h: preset.h },
    template_id: input.template_id, brand,
    status: pick(input.status ?? 'draft', STATUSES, 'status'),
    pages: input.pages.map(sanitizeSlide),
  };
  if (input.pack_id !== undefined) {
    if (typeof input.pack_id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.pack_id)) throw new DesignError('pack_id must be a UUID.');
    design.pack_id = input.pack_id;
  }
  if (input.notes !== undefined) design.notes = text(input.notes, 'notes', 2000);
  if (JSON.stringify(design).length > MAX_DESIGN_BYTES) throw new DesignError('This design is larger than 12 MB. Use smaller images.', 413);
  return design;
}

export const summary = d => ({
  id: d.id, title: d.title, platform: d.platform, ratio: d.ratio, size: d.size, template_id: d.template_id, status: d.status,
  pages: d.pages.length, pack_id: d.pack_id, revision: d.revision, updated_at: d.updated_at, created_at: d.created_at, updated_by: d.updated_by,
});

export { ratioOf };
