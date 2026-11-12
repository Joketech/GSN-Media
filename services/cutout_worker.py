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
        if self.path != "/cut":
            return self.reply(404, {"error": "Not found."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > MAX_BODY:
                return self.reply(413, {"error": "Send an image of up to 24 MB."})
            body = json.loads(self.rfile.read(size))
            raw = base64.b64decode(body.get("image_base64", ""), validate=True)
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
