# Local text-to-image generation

In Design Studio, open **Show tools → Create image**. Describe a person, product, background or complete image. Select a shape, optionally set a seed and generate. Results are saved on the server and available when you reopen the tool. Each workspace has its own private results.

**Add as a new layer** preserves the current page and its other images. A background is inserted below the other layers. **Replace selected image only** targets an explicitly selected image; it does not replace every photograph. Existing combined photographs still contain their person and product in one image. They cannot be ungrouped by this feature. For independent control, create or upload person and product images separately. Use the existing Remove background control after insertion where needed. Text, packaging names and labels should be separate text layers.

This feature does not generate an exact copy of a requested face or guarantee perfect product geometry. A seed helps reproduce a result with the same model/settings; changing a prompt can still change the whole generated image. There is no reference-photo identity conditioning or automatic product recolouring in this first version.

## Deployment

The source is ready for review; it has not been pushed or deployed automatically. After the approved source is present on the VPS, run **on Contabo**:

```sh
cd /opt/gsn-media
docker compose -f compose.yaml -f compose.vps.yaml --profile images build app images
docker compose -f compose.yaml -f compose.vps.yaml --profile images up -d app images
docker compose -f compose.yaml -f compose.vps.yaml logs --tail=60 images
```

This builds the app and CPU image worker from the source actually checked out on the server. The images profile is opt-in and is separate from the old GPU/video worker. It exposes no public worker port. The app connects privately through `IMAGE_WORKER_URL=http://images:8093`.

Model weights download from Hugging Face on the **first generation** into the `image-models` Docker volume. The default model is [Stable Diffusion 1.5](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5), subject to its CreativeML OpenRAIL-M licence. Read the model's licence and model card before commercial use. No Hugging Face Inference API, OpenAI API, paid image service, token or subscription is used.

The existing VPS can attempt CPU inference; it is not benchmarked here. Generation may take several minutes or longer, and image quality/faces/hands are not guaranteed. Images are generated at 512×512, 512×640 or 768×432. This is not an export-resolution photorealism guarantee. `IMAGE_MODEL=stabilityai/stable-diffusion-xl-base-1.0` is an optional larger model, with its own licence and substantially higher RAM, disk and inference demands. The default container is CPU-only. CUDA requires a separately prepared compatible GPU image/runtime.

The default worker is limited to four CPU cores, 14 GB memory and one active inference. It permits up to four queued requests; the app retains up to 200 image requests per workspace. Generated images and model cache use persistent volumes. No automatic paid-service fallback exists. Existing VPS charges, storage, bandwidth and electricity still apply.

## Hermes agent API

The routes use the existing agent Bearer key and workspace authentication:

1. `GET /api/v1/images/health` reports dependencies/configuration; `model_loaded` distinguishes an installed service from loaded model weights. A health response alone does not prove inference.
2. `POST /api/v1/images` with a new UUID `request_key` and a prompt creates one queued job. Repeating the same key/payload returns that job; reusing a key with different settings returns 409.
3. Poll `GET /api/v1/images/{id}` until `state` is `complete` and `has_image` is true. On interruptions, poll the same job before creating a new request.
4. `GET /api/v1/images/{id}/asset` returns `image_base64` and MIME type. Add it to a design page's `elements` as `data:image/png;base64,...` with its own position/size; do not overwrite a complete page image when only the person should change. Existing design image-size limits still apply.
5. `GET /api/v1/images` lists saved requests/results for that workspace.

Example request:

```json
{
  "request_key": "8be02710-2f91-48e1-92b6-e8bb0703cb28",
  "prompt": "An adult woman in an orange jumper, full body, seated, realistic studio photography",
  "negative_prompt": "blurry, distorted hands, lettering, watermark",
  "role": "person",
  "ratio": "4:5",
  "steps": 25,
  "seed": 42
}
```

Roles are `person`, `product`, `background`, `image`. Steps are 10–40. Seeds are 0–2147483647. Generation is never automatically published. Review model results before using them in a company advertisement.

## Validation limits

Node integration tests use a mocked worker to test queueing, duplicate protection, persistence, output collection, authentication and workspace isolation. Python tests exercise worker validation and storage without model weights. These do **not** establish visual quality or successful CPU inference. A real first-generation smoke test remains necessary on the chosen host.
