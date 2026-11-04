# GSN Media Studio

A handcoded content dashboard with seven specialist roles: Mira, Seline, Spectra, Lyra, Flux, Veyra, and Relay.

## Current capabilities

- Rotating globe entrance and light, colorful liquid-glass navigation.
- 200 editable post-design combinations and a separate catalog of 200 documentary edit plans.
- Real-footage editing, recorded narration, scene timing, grading, and browser WebM export.
- Optional Docker workers for original SDXL images, short Wan 2.2 video clips, and Qwen3-TTS narration from your voice sample.
- Queued jobs, worker health/status, persisted model results, and import of completed assets into the editor.

**The documentary catalog contains edit plans, not 200 generated films or stock clips.** One small CC0 sample is included for playback tests. AI roles are defined in the application; autonomous research/publishing and live social-network integrations are not connected.

## Run locally

Requires Node.js 22+:

```sh
node server.mjs
```

Open `http://localhost:4187`. Editing works without AI workers. For Docker deployment:

```sh
docker compose up -d --build app
# app + CPU voice worker:
docker compose --profile voice up -d --build
```

The Docker app listens on `http://localhost:4188`. Model weights download on the first submitted job, not during source checkout.

## Deployment and hardware

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Container Registry, Docker Compose, VPS, HTTPS, and GPU-worker configuration.

The GPU profile requires a supported NVIDIA/CUDA GPU with roughly 24 GB VRAM or more. A CPU-only VPS can host the dashboard and CPU voice worker, but cannot run the included GPU visual-worker configuration. Docker and GitHub do not provide GPU compute themselves.

## Validation and limits

Source syntax, Compose configuration, browser workflows, and mocked worker/proxy behavior have been checked. **Container builds and real model inference remain unverified.** There is no guarantee of photorealistic quality, speaker similarity, inference speed, or error-free operation. A GPU smoke test and a real user voice sample are required before relying on generated outputs.

Uploaded project media/settings are currently browser-local; generated results and model-job records use Docker volumes. The HTTPS owner gateway uses Basic Auth; this is not yet a multi-user production platform. Do not publish the model-worker ports directly.

## Credits

The hero artwork is a one-time generated static asset; runtime editing does not call an image-generation service. The mountain background was supplied as project artwork. The flower demo is CC0 media from Mozilla/MDN; see [SAMPLE-FOOTAGE-LICENSE.txt](SAMPLE-FOOTAGE-LICENSE.txt). Model licenses are listed in [DEPLOYMENT.md](DEPLOYMENT.md).
