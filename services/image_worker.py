"""Private CPU-capable text-to-image worker. One inference at a time; no paid API."""
import base64
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import os
from pathlib import Path
import threading
import uuid

DATA = Path(os.environ.get('DATA_DIR', '/data')).resolve()
DATA.mkdir(parents=True, exist_ok=True)
MODEL_ID = os.environ.get('IMAGE_MODEL', 'stable-diffusion-v1-5/stable-diffusion-v1-5')
ALLOWED_MODELS = ('stable-diffusion-v1-5/stable-diffusion-v1-5', 'stabilityai/stable-diffusion-xl-base-1.0')
SIZES = {'1:1': (512, 512), '4:5': (512, 640), '16:9': (768, 432)}
LOCK = threading.RLock()
POOL = ThreadPoolExecutor(max_workers=1)
MODEL = None

def job_path(id):
    if not isinstance(id, str) or str(uuid.UUID(id)) != id:
        raise ValueError('Invalid request ID.')
    return DATA / (id + '.json')

def read(id):
    return json.loads(job_path(id).read_text())

def save(j):
    with LOCK:
        target = job_path(j['id'])
        temp = target.with_suffix('.tmp')
        temp.write_text(json.dumps(j))
        temp.replace(target)

def update(id, **changes):
    with LOCK:
        j = read(id)
        j.update(changes)
        save(j)
        return j

def validate(p):
    if not isinstance(p, dict):
        raise ValueError('Send an object.')
    job_path(p.get('id'))
    prompt = p.get('prompt')
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1200:
        raise ValueError('Enter 1–1200 characters for the prompt.')
    negative = p.get('negative_prompt', '')
    if not isinstance(negative, str) or len(negative) > 600:
        raise ValueError('Negative prompt must be under 600 characters.')
    role = p.get('role', 'image')
    if role not in ('image', 'person', 'product', 'background') or p.get('ratio', '1:1') not in SIZES:
        raise ValueError('Invalid role or image size.')
    steps, seed = p.get('steps', 25), p.get('seed', 0)
    if type(steps) is not int or not 10 <= steps <= 40 or type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError('Invalid seed or step count.')
    return dict(id=p['id'], prompt=prompt.strip(), negative_prompt=negative, role=role,
                ratio=p.get('ratio', '1:1'), steps=steps, seed=seed)

def capability():
    ready = MODEL_ID in ALLOWED_MODELS and all(importlib.util.find_spec(m) for m in ('torch', 'diffusers', 'transformers', 'PIL'))
    return dict(ready=bool(ready), model=MODEL_ID, model_loaded=MODEL is not None,
                device=os.environ.get('IMAGE_DEVICE', 'cpu'), paid_api=False,
                message='Local image worker. First generation downloads model weights; CPU generation can take several minutes or longer.' if ready else 'Install the image worker dependencies and choose a supported model.')

def generate(id):
    global MODEL
    try:
        import torch
        from diffusers import AutoPipelineForText2Image
        j = read(id)
        device = os.environ.get('IMAGE_DEVICE', 'cpu')
        if device == 'cuda' and not torch.cuda.is_available():
            raise ValueError('CUDA was requested but this worker has no available CUDA GPU.')
        if device not in ('cpu', 'cuda'):
            raise ValueError('Choose cpu or cuda for IMAGE_DEVICE.')
        torch.set_num_threads(max(1, min(8, int(os.environ.get('OMP_NUM_THREADS', '4')))))
        if MODEL is None:
            update(id, state='loading_model', message='Loading local model weights. The first job downloads them into the persistent model cache.')
            # Do not disable the model's supplied safety checker or execute remote model code.
            MODEL = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=torch.float16 if device == 'cuda' else torch.float32, use_safetensors=True)
            MODEL.to(device)
            MODEL.enable_attention_slicing()
            MODEL.enable_vae_slicing()
        update(id, state='running', message='Generating on '+device+'. This page can stay open while the job runs.')
        guide = {'person': 'One fully clothed adult person only, isolated on a plain white background, no products, no text. ',
                 'product': 'One isolated unbranded product only, plain packaging, plain white background, no people, no lettering. ',
                 'background': 'Empty background scene only, no people, no products, no lettering. ', 'image': ''}[j['role']]
        w, h = SIZES[j['ratio']]
        output = MODEL(prompt=guide+j['prompt'], negative_prompt=j['negative_prompt'] or 'blurry, low quality, distorted hands, watermark, lettering',
                       num_inference_steps=j['steps'], width=w, height=h,
                       generator=torch.Generator(device=device).manual_seed(j['seed']))
        if getattr(output, 'nsfw_content_detected', None) and any(output.nsfw_content_detected):
            raise ValueError('The model filtered this result. Revise the prompt and try a new request.')
        target = DATA / (id+'.png')
        output.images[0].save(str(target)+'.tmp', format='PNG')
        Path(str(target)+'.tmp').replace(target)
        update(id, state='complete', message='Image ready. Review it before using it in a design.')
    except Exception as exc:
        update(id, state='failed', message=str(exc)[:500])

class Handler(BaseHTTPRequestHandler):
    def respond(self, code, value):
        raw = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        try:
            if self.path == '/health':
                return self.respond(200, capability())
            parts = self.path.strip('/').split('/')
            if len(parts) not in (2, 3) or parts[0] != 'jobs' or (len(parts) == 3 and parts[2] != 'result'):
                return self.respond(404, {'error': 'Not found.'})
            j = read(parts[1])
            if len(parts) == 3:
                if j['state'] != 'complete':
                    return self.respond(409, {'error': 'Image is not ready.'})
                return self.respond(200, {'image_base64': base64.b64encode((DATA / (j['id']+'.png')).read_bytes()).decode()})
            return self.respond(200, j)
        except (FileNotFoundError, ValueError, TypeError):
            self.respond(404, {'error': 'Image job not found.'})

    def do_POST(self):
        try:
            if self.path != '/jobs':
                return self.respond(404, {'error': 'Not found.'})
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 8000:
                return self.respond(413, {'error': 'Request too large.'})
            p = validate(json.loads(self.rfile.read(length)))
            if not capability()['ready']:
                return self.respond(503, {'error': capability()['message']})
            with LOCK:
                if job_path(p['id']).exists():
                    old = read(p['id'])
                    if any(old[k] != p[k] for k in p):
                        return self.respond(409, {'error': 'Request ID already used with another prompt.'})
                    return self.respond(200, old)
                active = sum(json.loads(f.read_text()).get('state') in ('queued', 'running', 'loading_model') for f in DATA.glob('*.json'))
                if active >= 4:
                    return self.respond(429, {'error': 'The image queue is full.'})
                p.update(state='queued', message='Waiting for the local image model.')
                save(p)
                POOL.submit(generate, p['id'])
                return self.respond(202, p)
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
            self.respond(400, {'error': str(exc)[:300]})

if __name__ == '__main__':
    for f in DATA.glob('*.json'):
        j = json.loads(f.read_text())
        if j.get('state') in ('queued', 'running', 'loading_model'):
            update(j['id'], state='interrupted', message='Worker restarted. This job was not silently regenerated.')
    ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '8093'))), Handler).serve_forever()
