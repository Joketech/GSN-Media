"""Private queued AI worker. Model weights download on the first submitted job."""
import base64
import concurrent.futures
import importlib.util
import json
import io
import mimetypes
import os
from pathlib import Path
import re
import subprocess
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KIND = os.environ.get("WORKER_KIND", "voice")
DATA = Path(os.environ.get("DATA_DIR", "./data")).resolve()
JOBS = DATA / "jobs"
JOBS.mkdir(parents=True, exist_ok=True)
EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=1)
LOCK = threading.RLock()
MODEL = None
MODEL_KIND = None
MAX_BODY = 30 * 1024 * 1024

def job_dir(job_id):
    if not re.fullmatch(r"[a-f0-9-]{36}", job_id) or str(uuid.UUID(job_id)) != job_id:
        raise ValueError("Invalid job ID")
    return JOBS / job_id

def read_job(job_id):
    return json.loads((job_dir(job_id) / "status.json").read_text())

def update(job_id, **changes):
    with LOCK:
        status_file = job_dir(job_id) / "status.json"
        current = json.loads(status_file.read_text()) if status_file.exists() else {}
        current.update(changes, id=job_id, updated_at=time.time())
        temporary = status_file.with_suffix(".tmp")
        temporary.write_text(json.dumps(current))
        temporary.replace(status_file)
        return current

def capability():
    torch_installed = importlib.util.find_spec("torch") is not None
    result = {"worker": KIND, "model_loaded": MODEL is not None,
              "ready": False, "cuda": False, "gpu_vram_gib": None}
    if not torch_installed:
        result["message"] = "PyTorch is not installed in this worker."
        return result
    import torch
    if KIND == "voice":
        result["ready"] = importlib.util.find_spec("qwen_tts") is not None
        result["message"] = "CPU voice worker; first job downloads model weights. Generation may be slow."
    else:
        result["cuda"] = torch.cuda.is_available()
        if result["cuda"]:
            result["gpu"] = torch.cuda.get_device_name(0)
            result["gpu_vram_gib"] = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1)
        result["ready"] = result["cuda"] and result["gpu_vram_gib"] >= 23
        result["message"] = "GPU worker needs a CUDA GPU with about 24 GB VRAM or more. Model inference is not yet benchmarked on your server."
    return result

def validate(payload):
    if not isinstance(payload, dict):
        raise ValueError("Send a JSON object.")
    request_id = payload.get("request_id")
    if request_id is not None:
        job_dir(request_id)
    kind = payload.get("kind")
    if kind not in (("voice",) if KIND == "voice" else ("image", "video")):
        raise ValueError("This worker cannot handle that job type.")
    text = payload.get("text", "")
    if not isinstance(text, str) or not text.strip() or len(text) > 1200:
        raise ValueError("Enter between 1 and 1200 characters.")
    if kind == "voice":
        if not isinstance(payload.get("reference_text"), str) or not payload["reference_text"].strip():
            raise ValueError("Add the exact transcript of your voice sample.")
        if len(payload["reference_text"]) > 2000:
            raise ValueError("Keep the reference transcript under 2000 characters.")
        audio = payload.get("audio_base64", "")
        if not isinstance(audio, str) or not audio or len(audio) > 28_000_000:
            raise ValueError("Upload a voice sample under 20 MB.")
        try:
            base64.b64decode(audio, validate=True)
        except ValueError:
            raise ValueError("The reference audio is not valid base64.")
    if payload.get("ratio", "16:9") not in ("16:9", "9:16", "1:1"):
        raise ValueError("Unsupported aspect ratio.")
    if kind == "video":
        if payload.get("video_mode", "text") not in ("text", "image"):
            raise ValueError("Choose text-to-video or image-to-video.")
        if payload.get("ratio", "16:9") == "1:1":
            raise ValueError("Video supports landscape or portrait, not square.")
        if payload.get("seconds", 2) not in (2, 4):
            raise ValueError("Choose a two- or four-second video.")
        if payload.get("video_mode", "text") == "image":
            reference_image(payload.get("image_base64")).close()
        elif payload.get("image_base64"):
            raise ValueError("Choose image-to-video to supply a starting image.")
    elif payload.get("image_base64"):
        raise ValueError("Starting images are supported only for image-to-video.")
    return payload

def reference_image(encoded):
    """Decode bounded raster data only; never accept a remote URL or server path."""
    from PIL import Image, ImageOps, UnidentifiedImageError
    if not isinstance(encoded, str) or not encoded or len(encoded) > 14_000_000:
        raise ValueError("Upload a PNG, JPEG or WebP image under 10 MB.")
    try:
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 10 * 1024 * 1024:
            raise ValueError("Starting image must be under 10 MB.")
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in ("PNG", "JPEG", "WEBP"):
                raise ValueError("Starting image must be PNG, JPEG or WebP.")
            w, h = image.size
            if min(w, h) < 64 or w * h > 16_000_000:
                raise ValueError("Use an image at least 64 pixels per side and at most 16 megapixels.")
            if getattr(image, "is_animated", False):
                raise ValueError("Use a still image, not an animated image.")
            image.load()
            return ImageOps.exif_transpose(image).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("The starting image cannot be decoded. Use a valid PNG, JPEG or WebP.") from exc

def voice(job_id, p):
    global MODEL, MODEL_KIND
    import numpy as np
    import soundfile as sf
    import torch
    from qwen_tts import Qwen3TTSModel
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    folder = job_dir(job_id)
    raw = base64.b64decode(p["audio_base64"], validate=True)
    process = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
                              "-ac", "1", "-ar", "24000", "-t", "30", "-f", "wav", "pipe:1"],
                             input=raw, capture_output=True, timeout=60, check=True)
    sample = folder / "reference.wav"
    sample.write_bytes(process.stdout)
    info = sf.info(sample)
    if info.duration < 3:
        raise ValueError("Use at least three seconds of clean speech; 10–20 seconds is preferable.")
    model_id = os.environ.get("VOICE_MODEL", "Qwen/Qwen3-TTS-12Hz-0.6B-Base")
    if MODEL is None:
        update(job_id, state="loading_model", model=model_id, message="Downloading/loading voice weights. This can take several minutes.")
        MODEL = Qwen3TTSModel.from_pretrained(model_id, device_map="cpu", dtype=torch.float32,
                                              attn_implementation="sdpa")
        MODEL_KIND = "voice"
    update(job_id, state="running", model=model_id, message="Synthesizing new narration from your reference voice on CPU.")
    with torch.inference_mode():
        prompt = MODEL.create_voice_clone_prompt(ref_audio=str(sample), ref_text=p["reference_text"],
                                                x_vector_only_mode=False)
        chunks = []
        words = p["text"].split()
        sections, section = [], ""
        for word in words:
            if len(section) + len(word) > 280:
                sections.append(section)
                section = word
            else:
                section = (section + " " + word).strip()
        if section:
            sections.append(section)
        for section in sections:
            audio, rate = MODEL.generate_voice_clone(text=section, language="English",
                                                     voice_clone_prompt=prompt, max_new_tokens=2048)
            if chunks:
                chunks.append(np.zeros(int(rate * .15), dtype=np.float32))
            chunks.append(np.asarray(audio[0], dtype=np.float32))
        sf.write(folder / "result.wav", np.concatenate(chunks), rate)
    sample.unlink(missing_ok=True)
    return "result.wav", model_id

def visuals(job_id, p):
    global MODEL, MODEL_KIND
    import gc
    import torch
    from diffusers import AutoencoderKLWan, StableDiffusionXLPipeline, WanPipeline, WanImageToVideoPipeline
    from diffusers.utils import export_to_video
    if not torch.cuda.is_available():
        raise ValueError("CUDA is unavailable. A CPU-only VPS cannot run this visual worker configuration.")
    kind = p["kind"]
    image_video = kind == "video" and p.get("video_mode", "text") == "image"
    pipeline_kind = "video_image" if image_video else kind
    if MODEL_KIND != pipeline_kind:
        MODEL = None
        gc.collect()
        torch.cuda.empty_cache()
        model_id = os.environ.get("VIDEO_MODEL", "Wan-AI/Wan2.2-TI2V-5B-Diffusers") if kind == "video" else os.environ.get("IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
        update(job_id, state="loading_model", model=model_id, message="Downloading/loading visual weights. First run may take many minutes.")
        if kind == "video":
            vae = AutoencoderKLWan.from_pretrained(model_id, subfolder="vae", torch_dtype=torch.float32)
            pipeline = WanImageToVideoPipeline if image_video else WanPipeline
            options = {"image_encoder": None, "image_processor": None, "expand_timesteps": True} if image_video else {}
            MODEL = pipeline.from_pretrained(model_id, vae=vae, torch_dtype=torch.bfloat16, **options)
            MODEL.enable_model_cpu_offload()
        else:
            MODEL = StableDiffusionXLPipeline.from_pretrained(model_id, torch_dtype=torch.float16,
                                                             use_safetensors=True, variant="fp16")
            MODEL.to("cuda")
        MODEL_KIND = pipeline_kind
    model_id = os.environ.get("VIDEO_MODEL", "Wan-AI/Wan2.2-TI2V-5B-Diffusers") if kind == "video" else os.environ.get("IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
    seed = int(p.get("seed", 42)) % (2**32)
    generator = torch.Generator(device="cuda").manual_seed(seed)
    ratio = p.get("ratio", "16:9")
    update(job_id, state="running", model=model_id, message="Generating original visual media on the GPU.", seed=seed)
    with torch.inference_mode():
        if kind == "image":
            w, h = {"16:9": (1216, 832), "9:16": (832, 1216), "1:1": (1024, 1024)}[ratio]
            image = MODEL(prompt=p["text"], negative_prompt="watermark, text, low quality, deformed anatomy",
                          width=w, height=h, num_inference_steps=30, generator=generator).images[0]
            image.save(job_dir(job_id) / "result.png")
            return "result.png", model_id
        if ratio == "1:1":
            raise ValueError("The initial Wan video preset supports landscape and portrait, not square.")
        w, h = (1280, 704) if ratio == "16:9" else (704, 1280)
        seconds = min(4, max(2, int(p.get("seconds", 2))))
        frames = seconds * 24 + 1
        conditioning = {}
        if image_video:
            from PIL import Image, ImageOps
            with reference_image(p["image_base64"]) as image:
                conditioning["image"] = ImageOps.fit(image, (w, h), method=Image.Resampling.LANCZOS)
        output = MODEL(**conditioning, prompt=p["text"], negative_prompt="watermark, subtitles, low quality, jitter, deformed anatomy",
                       width=w, height=h, num_frames=frames, num_inference_steps=30,
                       guidance_scale=5.0, generator=generator).frames[0]
        export_to_video(output, str(job_dir(job_id) / "result.mp4"), fps=24)
        return "result.mp4", model_id

def run(job_id, payload):
    try:
        update(job_id, state="starting", message="Preparing the model worker.")
        filename, model_id = voice(job_id, payload) if payload["kind"] == "voice" else visuals(job_id, payload)
        update(job_id, state="complete", filename=filename, model=model_id,
               message="Generation completed. Review the result before using it.")
    except Exception as exc:
        update(job_id, state="failed", message=str(exc)[:1200])
    finally:
        (job_dir(job_id) / "reference.wav").unlink(missing_ok=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def json_response(self, status, value):
        content = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        path = self.path.split("?")[0].strip("/").split("/")
        try:
            if path == ["health"]:
                return self.json_response(200, capability())
            if len(path) == 2 and path[0] == "jobs":
                return self.json_response(200, read_job(path[1]))
            if len(path) == 3 and path[0] == "assets" and path[2] in ("result.wav", "result.png", "result.mp4"):
                state = read_job(path[1])
                if state.get("state") != "complete" or state.get("filename") != path[2]:
                    return self.json_response(404, {"error": "Result is not ready."})
                file = job_dir(path[1]) / path[2]
                self.send_response(200)
                self.send_header("Content-Type", mimetypes.guess_type(file.name)[0] or "application/octet-stream")
                self.send_header("Content-Length", str(file.stat().st_size))
                self.end_headers()
                with file.open("rb") as stream:
                    while chunk := stream.read(1024 * 1024):
                        self.wfile.write(chunk)
                return
            self.json_response(404, {"error": "Not found"})
        except (ValueError, FileNotFoundError):
            self.json_response(404, {"error": "Job or asset not found"})
        except Exception as exc:
            self.json_response(503, {"error": str(exc)[:500]})

    def do_POST(self):
        if self.path != "/jobs":
            return self.json_response(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY:
                return self.json_response(413, {"error": "Request must be under 30 MB."})
            payload = validate(json.loads(self.rfile.read(length)))
            with LOCK:
                request_id = payload.get("request_id")
                records = [json.loads(p.read_text()) for p in JOBS.glob("*/status.json")]
                previous = next((p for p in records if request_id and p.get("request_id") == request_id), None)
                if previous:
                    return self.json_response(202, previous)
                health = capability()
                if not health["ready"]:
                    return self.json_response(503, {"error": health["message"]})
                if sum(p.get("state") not in ("complete", "failed", "interrupted") for p in records) >= 3:
                    return self.json_response(429, {"error": "Worker queue is full. Wait for an active job to finish."})
                job_id = str(uuid.uuid4())
                job_dir(job_id).mkdir()
                state = update(job_id, state="queued", kind=payload["kind"], request_id=request_id, created_at=time.time(),
                               message="Queued. Model weights are downloaded only if needed.")
                EXECUTOR.submit(run, job_id, payload)
            self.json_response(202, state)
        except (ValueError, json.JSONDecodeError) as exc:
            self.json_response(400, {"error": str(exc)})
        except Exception as exc:
            self.json_response(503, {"error": str(exc)[:500]})

if __name__ == "__main__":
    for file in JOBS.glob("*/status.json"):
        try:
            job = json.loads(file.read_text())
            if job.get("state") not in ("complete", "failed", "interrupted"):
                update(job["id"], state="interrupted", message="Worker restarted; resubmit this job.")
        except (ValueError, OSError):
            pass
    ThreadingHTTPServer(("0.0.0.0", 8091), Handler).serve_forever()
