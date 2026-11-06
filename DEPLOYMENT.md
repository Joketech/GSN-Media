# GitHub, Docker, and VPS deployment

## Architecture

`HTTPS owner gateway → Node dashboard/API → private CPU voice worker / optional CUDA visual worker`

The CPU host runs the application, queue endpoints, and optional voice generation. The visual worker can run on a separate private GPU host. Model weights and output/job records use named Docker volumes.

## Local smoke test

```sh
docker compose config --quiet
docker compose up -d --build app
docker compose --profile voice up -d --build
```

Open `http://localhost:4188`, then **AI creation → Refresh workers**. An offline worker is reported as unavailable; no generation is simulated. Voice jobs need a clean 3–30 second sample, its exact transcript, and the new text to speak. CPU synthesis may be slow.

## Server deployment

For v1, read [integrations/hermes/README.md](integrations/hermes/README.md) first. Run `bash deploy/setup-v1.sh` before starting the app. It creates the `GSN_AGENT_TOKEN` access key without displaying it and preserves existing settings. The loopback/SSH-tunnel setup needs no public proxy. The steps below also cover optional future HTTPS hosting.

1. Install Docker Engine/Compose on the Linux host and clone this repository.
2. Run `bash deploy/preflight.sh` to inspect Docker, RAM, disk, and GPU availability.
3. Copy `.env.example` to `.env`, set the real domain, and configure DNS.
4. Generate the owner password hash with `docker run --rm -it caddy:2-alpine caddy hash-password`. Keep the hash single-quoted in `.env`; do not commit credentials.
5. Start the owner studio:

```sh
docker compose --profile voice --profile public up -d --build
```

The app port stays bound to loopback. Only Caddy publishes 80/443. The worker ports are internal. A real domain and correct Basic Auth configuration are required for public deployment.

## Contabo VPS quick path (SSH tunnel, no domain)

On a CPU-only Contabo VPS with Docker installed:

```sh
git clone https://github.com/Joketech/GSN-Media.git && cd GSN-Media
bash deploy/preflight.sh
bash deploy/setup-v1.sh
docker compose --profile voice up -d --build app voice
```

Then, from your own computer, open a tunnel and browse to `http://localhost:4188`:

```sh
ssh -L 4188:127.0.0.1:4188 YOUR_USER@YOUR_SERVER_IP
```

The app only listens on the server's loopback address and rejects any request whose `Host` header is not `localhost`, `127.0.0.1` or `SITE_DOMAIN`. Opening `http://YOUR_SERVER_IP:4188` directly therefore returns **403 Invalid local host** by design. To serve it publicly, set `SITE_DOMAIN`, point DNS at the server and use the `public` profile as described above. The `gpu` profile cannot run on a CPU-only VPS.

## GPU visual worker

Requires a configured NVIDIA/CUDA GPU, sufficient RAM/model storage, and NVIDIA Container Toolkit. The initial preset is sized for approximately 24 GB VRAM or more. Verify with `nvidia-smi` and a short real inference test; do not infer GPU capacity from CPU-core/RAM specifications.

```sh
docker compose --profile voice --profile gpu --profile public up -d --build
```

The models are:

| Task | Model | License / source |
|---|---|---|
| Short text-to-video clips | Wan2.2 TI2V 5B Diffusers | [Apache 2.0 model card](https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B-Diffusers) |
| Images | Stable Diffusion XL base 1.0 | [Open RAIL++ model card](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) |
| Voice-reference narration | Qwen3-TTS 0.6B Base | [Apache 2.0 model card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base) |

The video preset creates 2/4-second landscape or portrait clips. Both text-to-video and image-to-video are wired in AI creation. Select Image to video, upload a PNG/JPEG/WebP under 10 MB (64 pixels per side minimum, 16 megapixels maximum), and describe subject/camera movement. The worker uses the image as the first frame, centre-cropped to the selected landscape/portrait output. Images are sent to your private GPU worker and are not saved in job status or browser job history. It does not generate an entire documentary in one inference call. Image-conditioned GPU inference still requires a real hardware smoke test. Assemble reviewed scenes and narration in the editor. Keep `VISUAL_WORKER_URL` private through a trusted network or tunnel when using a separate GPU machine.

## GitHub Container Registry

Manually run **Build GSN containers** in GitHub Actions. It builds/pushes app, voice, and visual images to the repository's lowercase GHCR namespace. Private packages require a registry login on the server; keep tokens out of files and logs.

With `.env` configured, use:

```sh
bash deploy/update.sh
# confirmed GPU host only:
bash deploy/update.sh gpu
```

`compose.vps.yaml` uses `IMAGE_PREFIX` and `IMAGE_TAG`; prefer an immutable commit tag to `latest`. The workflow does not invent SSH credentials or deploy to an unspecified account.

## Verification gate

The source/Compose checks are not a completed deployment. Before use, build containers, confirm worker health, submit one image and a short video on actual GPU hardware, submit narration using the owner's sample, import those results into the editor, and verify the exported audiovisual film. These model-inference checks have not yet been completed in this project.

The worker queue is bounded and serial; active inference cancellation, automatic retries, multi-user authorization, server-side project/media migration, and server-side final-film MP4 encoding are not implemented. A worker restart marks unfinished jobs interrupted. The existing editor exports WebM in the browser.

References: [Docker GPU configuration](https://docs.docker.com/compose/how-tos/gpu-support/), [Contabo GPU VPS](https://docs.contabo.com/docs/servers-hosting/gpu-vps/), [Qwen3-TTS usage](https://github.com/QwenLM/Qwen3-TTS).
