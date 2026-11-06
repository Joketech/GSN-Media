# GSN Media Studio

## V1 daily workspace

The default home page is now a focused HTML/CSS/JavaScript studio for saved voice-reference narration, social posts/carousels, and animated HTML. All six specialists remain. The full original editor/globe/template library is retained at `/classic`.

V1 adds a protected agent API, persistent voice references, shared jobs and collected results, stable request keys, review state, and a standard-library Python client for the user's Hermes agents on Contabo. See [the Hermes handoff](integrations/hermes/README.md) and [API contract](integrations/hermes/API.md).

For an existing server checkout, run `bash deploy/setup-v1.sh`, then `docker compose --profile voice up -d --build app voice`. The setup generates a private access key in `.env`. Keep the key and reference samples out of Git and chat. New v1 data uses `app-data`; browser-local legacy projects are preserved separately.

The agent API can create static and animated HTML directly from the existing 200 design combinations. GPU jobs still require a configured visual worker; no GPU has been rented or connected by this release. Voice cloning passed the owner's earlier manual test; the new saved-profile flow must still be smoke-tested on their VPS. Hermes installation and daily schedules are documented, not automatically applied to their server.

A handcoded content dashboard with six specialist roles: Mira, Seline, Spectra, Lyra, Flux, and Relay.

## Social media pack studio

Open the studio and enter through the globe. The dashboard shows your templates in motion (Hook, write-up pages, call to action). Pick a template, choose the platform sizes you need (Instagram, TikTok, LinkedIn, X, YouTube, Facebook and Trending) and the studio creates one editable design per size.

- **Editor:** click to select, drag, resize and rotate; double-click to type; the toolbar appears only for the selected item and the tool dock stays closed until you press **+**. Page strip with Hook / CTA tags, add, duplicate, delete and reorder pages. Undo and redo. Download PNG, JPG, PDF, MP4 or HTML.
- **Saved on the server:** every change is saved with a revision number. If a Hermes agent saved a newer version, you are asked whether to load theirs or keep yours; nothing is overwritten silently.
- **Review flow:** set a design to **Ready for review** and it appears under the bell on the dashboard. Editing an approved design returns it to Draft.
- **Older screens:** the previous workspace is still at `/v1` and the classic design studio at `/classic`.

### Hermes API (designs)

All routes live under `/api/v1` and take `Authorization: Bearer $GSN_AGENT_TOKEN`.

| Route | Purpose |
| --- | --- |
| `GET /platforms` | Platform sizes and groups |
| `GET /designs`, `POST /designs` | List designs; create one (`template_id`, `platform`, optional `title`, `pages`, `brand`, `pack_id`). Starter Hook / write-up / CTA pages are generated when `pages` is omitted. |
| `GET /designs/{id}` | Full design JSON |
| `PUT /designs/{id}` | Save a design. Send the `revision` you read; a stale revision returns 409. |
| `DELETE /designs/{id}` | Remove a design |

Set `status` to `review` when an agent has finished so the owner sees it. The studio page needs no key in the browser (see below); API clients always need the token.

### Access control

The globe no longer leads to a password page. Browser requests from the studio's own origin are accepted without a key, so protect the public address with the Caddy Basic Auth block in `DEPLOYMENT.md`, or keep it on loopback and use an SSH tunnel. Set `GSN_REQUIRE_KEY=1` to bring the access-key gate back.

## Current capabilities

- Rotating globe entrance and light, colorful liquid-glass navigation.
- 200 editable post-design combinations and a separate catalog of 200 documentary edit plans.
- Real-footage editing, recorded narration, scene timing, grading, and browser WebM export.
- Optional Docker workers for original SDXL images and Qwen3-TTS narration from your voice sample.
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
