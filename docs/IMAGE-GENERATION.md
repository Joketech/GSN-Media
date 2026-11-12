# Pictures from words (background generation)

The UGC editor's **Generate background** button and the agents' `POST /api/v1/images/generate` use one server-side setting.
Set up one or more of these in `/opt/gsn-media/.env`, then restart the app. Every service you set up appears in the editor's **Service** menu, so you can switch between them for each picture (the choice is remembered). The OpenAI-style service also has a **Model** menu (`IMAGE_GEN_MODELS`, comma-separated, default `gpt-image-2.5-sunburst,gpt-image-1.5`) and a **Quality** menu. The cost of the current choice is always shown under the menus. The free service is available unless you set `IMAGE_GEN_FREE=off`.

1. **An OpenAI-style image service (easiest on a CPU-only VPS).** Set `IMAGE_GEN_KEY`. Optional: `IMAGE_GEN_URL` (any compatible
   server, default OpenAI), `IMAGE_GEN_MODEL` (default `gpt-image-2.5-sunburst`) and `IMAGE_GEN_QUALITY` (`low`, `medium` or `high`; default `low`).
   **This costs money, billed by OpenAI to your account.** Portrait picture, from OpenAI's published pages (Nov 2026): gpt-image-2.5-sunburst is token-billed
   ($30 per million output tokens), roughly $0.005 at low quality up to about $0.17 at the highest (estimates); gpt-image-1.5 is $0.013 low, $0.05 medium, $0.20 high.
   The old gpt-image-1 was shut down on 23 Oct 2026. The editor shows the cost next to the button; override the wording with `IMAGE_GEN_COST_NOTE`.
2. **The studio's own GPU picture worker (Stable Diffusion XL).** Needs an NVIDIA GPU server. Start it with the `gpu` profile
   (`deploy/update.sh gpu`). Leave `IMAGE_GEN_KEY` empty and the app uses it automatically (`IMAGE_GEN_PROVIDER=auto`).
3. **Free hosted service.** Set `IMAGE_GEN_PROVIDER=pollinations`. No key; quality and speed vary, and the prompt is sent to that website.

`IMAGE_GEN_HOURLY_LIMIT` (default 40) caps pictures per hour per workspace so a looping agent cannot run up a bill.
Check the setup at `GET /api/v1/images/status`.

Backgrounds are requested with "no people, no text, no logos" added, so the layers above them stay readable.

