"""Private background-removal worker. Several segmentation models run on CPU; the studio shows the results side by side."""
import base64
import io
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
from PIL import Image, ImageOps

MAX_BODY = 24 * 1024 * 1024
MAX_PIXELS = 16_000_000
MAX_SIDE = 2000
# label shown to people, rembg model name. Models disagree on hard photos, so each has a different strength.
ENGINES = {
    "detail": ("Detailed", "isnet-general-use"),
    "people": ("People", "u2net_human_seg"),
    "scene": ("Whole scene", "u2net"),
}
LOCK = threading.Lock()
SESSIONS = {}


def session(key):
    from rembg import new_session
    if key not in SESSIONS:
        SESSIONS[key] = new_session(ENGINES[key][1])
    return SESSIONS[key]


def load_image(raw):
    img = Image.open(io.BytesIO(raw))
    if img.width * img.height > MAX_PIXELS:
        raise ValueError("Image is larger than 16 megapixels.")
    img = ImageOps.exif_transpose(img).convert("RGBA")
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return img


def cut(img, key):
    from rembg import remove
    with LOCK:
        out = remove(img, session=session(key), post_process_mask=True)
    # Never hand back colour from fully transparent pixels: it bleeds into soft edges when scaled.
    return out


def coverage(out):
    a = np.asarray(out.getchannel("A"), dtype=np.uint8)
    h, w = a.shape
    centre = a[h // 4: h - h // 4, w // 4: w - w // 4]
    return float((a > 127).mean()), float((centre > 127).mean())


def _largest(mask, min_share):
    import cv2
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    keep = np.zeros(mask.shape, bool)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_share * mask.size:
            keep |= lab == i
    return keep


def _piece(img, alpha, mask, pad=2):
    """Crop one layer out of the photo: colours from the photo, transparency from the model, limited to mask."""
    import cv2
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    x0, x1 = max(0, xs.min() - pad), min(mask.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(mask.shape[0], ys.max() + 1 + pad)
    soft = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 0.8) * (alpha.astype(np.float32) / 255.0 * 0.5 + 0.5)
    rgba = np.dstack([np.asarray(img.convert("RGB")), (np.clip(soft, 0, 1) * 255).astype(np.uint8)])[y0:y1, x0:x1]
    buf = io.BytesIO()
    Image.fromarray(rgba, "RGBA").save(buf, "WEBP", quality=93, method=4)
    return {"webp_base64": base64.b64encode(buf.getvalue()).decode(), "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}


def _fill_smooth(rgb, hole):
    """Fill the gaps with a smooth blend of the colours around them (push-pull pyramid), which reads as a clean studio
    backdrop where classic inpainting smears blotches."""
    import cv2
    h, w = hole.shape
    wt = (hole == 0).astype(np.float32)
    col = rgb.astype(np.float32) * wt[:, :, None]
    levels = []
    c, k = col, wt
    while min(c.shape[:2]) > 4:
        levels.append((c, k))
        c = cv2.resize(c, (max(1, c.shape[1] // 2), max(1, c.shape[0] // 2)), interpolation=cv2.INTER_AREA)
        k = cv2.resize(k, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_AREA)
    mean = (col.sum((0, 1)) / max(wt.sum(), 1.0))
    cur = np.where(k[:, :, None] > 0.02, c / np.maximum(k[:, :, None], 1e-4), mean)
    for c, k in reversed(levels):
        up = cv2.resize(cur, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR)
        own = c / np.maximum(k[:, :, None], 1e-4)
        a = np.clip(k * 4, 0, 1)[:, :, None]
        cur = np.where(k[:, :, None] > 0.02, own, up) * a + up * (1 - a)
    cur = cv2.GaussianBlur(cur, (0, 0), 6)
    return np.clip(cur, 0, 255).astype(np.uint8)


def split_layers(raw):
    """Split a finished advert photograph into background, person and product layers.
    Person = people model. Product = everything else the general model keeps in front. Background = the photo with both
    removed and the gaps filled from their surroundings, so it can be replaced or moved away from without a ghost."""
    import cv2
    img = load_image(raw)
    w, h = img.size
    fg_alpha = np.asarray(cut(img, "detail").getchannel("A"))
    pp_alpha = np.asarray(cut(img, "people").getchannel("A"))
    person = _largest(pp_alpha >= 128, 0.015)
    person_d = cv2.dilate(person.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    rest = (fg_alpha >= 128) & ~person_d
    rest = cv2.morphologyEx(rest.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
    product = _largest(rest, 0.004)
    layers = {}
    if person.any():
        layers["person"] = _piece(img, pp_alpha, person)
    if product.any():
        layers["product"] = _piece(img, fg_alpha, product)
    hole = (person | product).astype(np.uint8)
    hole = cv2.dilate(hole, np.ones((25, 25), np.uint8))
    filled = _fill_smooth(np.asarray(img.convert("RGB")), hole)
    feather = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 3)[:, :, None]
    out = np.asarray(img.convert("RGB")).astype(np.float32) * (1 - feather) + filled.astype(np.float32) * feather
    buf = io.BytesIO()
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(buf, "JPEG", quality=90)
    return {"width": w, "height": h, "background_base64": base64.b64encode(buf.getvalue()).decode(), "layers": layers}


def encode(out):
    buf = io.BytesIO()
    out.save(buf, "PNG", optimize=False)
    return base64.b64encode(buf.getvalue()).decode()


def run(raw, wanted):
    img = load_image(raw)
    keys = list(ENGINES) if wanted in (None, "auto", "all") else [wanted]
    results = []
    for key in keys:
        out = cut(img, key)
        fg, mid = coverage(out)
        results.append({"engine": key, "label": ENGINES[key][0], "foreground": round(fg, 3),
                        "centre": round(mid, 3), "ok": 0.02 < fg < 0.97, "png_base64": encode(out)})
    # Heuristic for agents: keep the subject (most of the middle of the picture) without keeping the whole photo.
    usable = [r for r in results if r["ok"]] or results
    best = max(usable, key=lambda r: (r["centre"], -abs(r["foreground"] - 0.45)))
    for r in results:
        r["suggested"] = r is best
    return {"width": img.width, "height": img.height, "candidates": results}


class Handler(BaseHTTPRequestHandler):
    server_version = "gsn-cutout"

    def reply(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            try:
                import rembg  # noqa: F401
                self.reply(200, {"worker": "cutout", "ready": True, "engines": {k: v[0] for k, v in ENGINES.items()},
                                 "loaded": sorted(SESSIONS)})
            except Exception as e:  # pragma: no cover
                self.reply(503, {"worker": "cutout", "ready": False, "message": str(e)})
        else:
            self.reply(404, {"error": "Not found."})

    def do_POST(self):
        if self.path not in ("/cut", "/split"):
            return self.reply(404, {"error": "Not found."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > MAX_BODY:
                return self.reply(413, {"error": "Send an image of up to 24 MB."})
            body = json.loads(self.rfile.read(size))
            raw = base64.b64decode(body.get("image_base64", ""), validate=True)
            if self.path == "/split":
                return self.reply(200, split_layers(raw))
            engine = body.get("engine", "auto")
            if engine not in ("auto", "all", *ENGINES):
                return self.reply(400, {"error": "engine must be auto, all, detail, people or scene."})
            self.reply(200, run(raw, engine))
        except (ValueError, OSError) as e:
            self.reply(400, {"error": "That image could not be read. Use a PNG, JPEG or WebP."})
        except Exception as e:
            print("cutout error:", repr(e), flush=True)
            self.reply(500, {"error": "The cutout worker failed. Check its logs."})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8092"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
