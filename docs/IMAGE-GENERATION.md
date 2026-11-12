# Pictures from words (background generation)

The UGC editor's **Generate background** button and the agents' `POST /api/v1/images/generate` use one server-side setting.
Choose one of these in `/opt/gsn-media/.env`, then restart the app.

1. **An OpenAI-style image service (easiest on a CPU-only VPS).** Set `IMAGE_GEN_KEY`. Optional: `IMAGE_GEN_URL` (any compatible
   server, default OpenAI) and `IMAGE_GEN_MODEL` (default `gpt-image-1`). Each picture costs what that service charges.
2. **The studio's own GPU picture worker (Stable Diffusion XL).** Needs an NVIDIA GPU server. Start it with the `gpu` profile
   (`deploy/update.sh gpu`). Leave `IMAGE_GEN_KEY` empty and the app uses it automatically (`IMAGE_GEN_PROVIDER=auto`).
3. **Free hosted service.** Set `IMAGE_GEN_PROVIDER=pollinations`. No key; quality and speed vary, and the prompt is sent to that website.

`IMAGE_GEN_HOURLY_LIMIT` (default 40) caps pictures per hour per workspace so a looping agent cannot run up a bill.
Check the setup at `GET /api/v1/images/status`.

Backgrounds are requested with "no people, no text, no logos" added, so the layers above them stay readable.

## Automatic layers for the UGC designs
Designs that were not hand-prepared are split on first open by the cutout worker (`POST /api/v1/ugc-split`): a clean background plus
person and product cut-outs, kept in the app data volume. Cut-outs are automatic, so check the edges. The cutout image must be rebuilt
(`docker compose pull`) because it now includes OpenCV.
