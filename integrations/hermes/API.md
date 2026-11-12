# GSN v1 API contract

Base: `http://127.0.0.1:4188/api/v1` on the Contabo host. Authenticate with `Authorization: Bearer $GSN_AGENT_TOKEN`. The bundled client reads the key without printing it. Only the browser session endpoint accepts credentials as JSON and sets an HttpOnly SameSite=Strict cookie.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Live voice/visual worker status |
| GET | `/templates` | 200 zero-based template IDs, names, `pages` (capacity, 5 to 10) and the `layouts` of each page. `?pages=N` returns only templates that can carry N pages of wording. |
| GET | `/templates/{id}` | 200 the template's starter pages and the layout guide |
| GET | `/layouts` | 200 what each designed layout expects in its body text |
| POST | `/designs` with `template_id`, `platform` and `copy` | 201 a design built from wording only: `copy` is a list of `{title, body, kicker?, layout?}`, Hook first, call to action last. The template supplies every design decision. Fewer pages than the template holds drops the spare designed pages; more is refused. |
| GET / POST | `/voices` | List profiles / save a name, reference_text, audio_base64 |
| GET | `/jobs` | Latest 200 jobs, newest first; total count |
| POST | `/jobs` | Create a job; required Idempotency-Key header |
| GET | `/jobs/{id}` | Refresh and return worker state |
| GET / HEAD | `/jobs/{id}/asset` | Collected result; supports byte ranges |
| POST | `/jobs/{id}/review` | `{ "review": "approved" }` or rejected |

Creation returns 202 with a recorded job even when its worker rejects it: inspect `state` and `message`. States: submitting, queued, starting, loading_model, running, complete, failed, interrupted. `connection_error` means the service could not be reached; it is not a successful generation. Output fields include `asset_url`, `output` (html/mp4/wav), and `review`. The studio polls active jobs every 10 seconds, copies completed results into its persistent volume, and keeps voice samples out of job history. A worker lost before collection can interrupt a job. In-flight submissions at app restart are marked interrupted rather than silently retried.

All create payloads accept `title` (120 chars), `agent` (80 chars), `project` (120 chars). Use truthful specialist names. Stable keys are 1–160 letters/digits or `_ . : -`. Identical content+key returns the existing job; changed content+key returns 409. A new key requests new work, potentially incurring GPU costs.

## Saved voice and narration

POST `/voices`: `{"name":"My GSN voice","reference_text":"The exact words in the sample.","audio_base64":"BASE64_AUDIO"}`. Max 20 profiles, 20 MB per reference, transcript at most 2000 characters. Worker normalizes up to 30 seconds; at least 3 seconds of speech is required during inference. The profile is stored once on the app server; it is resent only to the configured private voice worker when generating.

POST `/jobs`: `{"kind":"voice","voice_id":"PROFILE_UUID","text":"The new narration to speak.","agent":"Seline"}`. New text max 1200 characters. Returns a WAV once complete. Voice generation on CPU has passed the owner's earlier manual test; saved-profile integration still needs an on-server smoke test.

## Social post / carousel / animation

```json
{"kind":"animation","template_id":24,"ratio":"9 / 16","scene_seconds":3,"brand":"GSN Media","handle":"@gsnmedia","slides":[{"title":"Ideas into impact.","body":"One thoughtful story at a time."},{"title":"Create with intention.","body":"Your next chapter starts here."}],"agent":"Flux"}
```

Use `kind: "post"` for static HTML. Templates: 0–199 (20 layouts × 10 palettes). 1–20 slides; slide title 1–160 chars, body up to 600. Brand/handle up to 80 chars. Ratios: `1 / 1`, `4 / 5`, `9 / 16`, `16 / 9`. Animation scene_seconds: integer 1–10. HTML preserves the existing material layouts. Animation is silent HTML, not a generated MP4. Result previews are sandboxed.

Authentication failures: 401; setup missing: 503; invalid input: 400/415; conflicting key: 409; active-job limit: 429. Responses contain `error`. Do not log Authorization headers or reference samples.

## Scheduling and posting (Postiz)

The studio plans, reviews and sends posts through the owner's self-hosted Postiz. Agents prepare; only the owner approves. The system starts in dry-run: approved posts are marked `simulated` and nothing is published until the owner switches live mode on in Schedule > Setup.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/publish/status` | Postiz connected?, live/paused flags, per-platform switches, limits, max days ahead (30) |
| GET | `/publish/channels` | Connected Postiz channels (`id`, `name`, `platform`) |
| POST | `/schedule/batches` | `{title, notes, posts:[{platform, channel_id, scheduled_at, caption, hashtags, design_id, title}]}`. Creates posts in `review` for the owner. Up to 30 days ahead. |
| GET | `/schedule/batches`, `/schedule/batches/{id}` | Batch list with status counts / one batch with its posts |
| GET | `/schedule/posts` | All posts; filter with `?status=` |
| PATCH | `/schedule/posts/{id}` | Edit wording or time; sends the post back to `review` |
| POST | `/schedule/posts/{id}/media` | Attach rendered pictures/video |
| DELETE | `/schedule/posts/{id}` | Only while draft, review or rejected |

Agents cannot approve, post now, retry, cancel approved posts, or change live/paused/platform switches (403/409). Post statuses: draft, review, approved, posting, posted, simulated, failed, rejected, cancelled. Pictures for a design are rendered once by the owner's browser when approving, and shared by all posts using that design.

## Background removal (AI cutout)

POST `/cutout` with `{"image":"<base64 or data URL>","engine":"all"}` runs the studio's private cutout worker and returns `{width,height,candidates:[{engine,label,foreground,centre,ok,suggested,png_base64}]}`. Engines: `detail` (general objects, fine edges), `people` (people and what they hold), `scene` (whole subject groups) and `all` (default, runs each). `suggested` marks the candidate an automatic heuristic prefers: it keeps most of the middle of the picture without keeping the whole photo. Models disagree on hard photos, so an agent that cares should compare `foreground`/`centre` or leave the choice to a human in the editor. Images up to 16 megapixels; about 2 to 6 seconds per model on CPU. Use the returned PNG as an uploaded photo element in a design.

## Pictures from words
- `GET /images/status` says whether picture generation is set up (`{provider, ready, description, cost, limit_per_hour}`; `cost` says in plain words whether a picture costs money. Tell the owner the cost when you ask to make many pictures).
- `POST /images/generate` with `{"prompt":"warm terracotta studio wall, soft light","aspect":"portrait|square|landscape","purpose":"background|picture"}` returns `{image:"data:image/...;base64,...", provider, width, height, prompt}`. `background` (the default) adds "no people, no text, no logos" to the prompt. Allowed for agents (Spectra and Flux). The result can be large: shrink it to a JPEG/WebP under 1.4 MB before putting it in a design slot. There is an hourly limit per workspace; a 429 means wait. If it answers 503 the owner has not set up a picture service yet; say so, do not retry.
- Log picture work in `/activity` like any other task, with the model or service named in `detail`.

## Brand people, photo layouts and picture slots

**Photo layouts** are templates 400-411 (screen ring, profile and person, stage, brand road, frosted window, magazine cover, outline word, look up, sepia split, giant letters, agency stripe, two frames). Each one has **named picture slots**. `GET /templates` lists them for each layout as `slots: [{key, label}]`; the first slot is the page's main picture.

Every slot fills its frame completely (the picture is cropped to the frame's shape, never stretched) and can be repositioned inside the frame. To replace the pictures on a page send `slots` on that page when creating or updating a design:

```json
{"pages":[{"title":"Meet Ada","slots":{"main":{"src":"data:image/jpeg;base64,...","x":0,"y":-20,"z":140},"avatar":{"person_id":"<id from GET /people>"}}}]}
```

- `src` (or `image`): PNG, JPEG or WebP data URL, up to 1.4 MB. Slots you leave out keep the layout's studio photo.
- `x`, `y`: where the picture sits inside its frame, -100 to 100 (0 is centred). `z`: zoom, 100 to 400 (100 fits the frame).
- Humans do the same in the editor: click a frame, choose Replace picture, drag the picture inside the frame, and use the Zoom slider.
- On pages 2 and later each layout uses the standard designed pages, whose single picture is `image`.

**Brand people** are faces and mascots the brand owns or has permission to use, saved per workspace. Humans add them on the People screen; agents can only read them.

- `GET /people` lists `{id,name,kind,role,permission_note,consent,image_url}` (no image bytes). `GET /people/:id` returns the full record; `GET /people/:id/image` returns the picture.
- `POST /people` (humans only) needs `name`, `kind` (`team`, `mascot` or `release`), `image` (PNG/JPEG/WebP data URL, up to 1.4 MB) and `consent: true`. A `release` also needs `permission_note`. Up to 200 people per workspace. `DELETE /people/:id` is owner only.
- To put a person on a design send `person_id` on the design (first slot of the cover), on a page (`pages[].person_id`), or on one slot (`slots.<key>.person_id`). Unknown ids are rejected. Never use a face that is not in this library.

## Workspaces and agent keys

When the owner turns on accounts (Team page), the studio is split into workspaces. Each workspace has its own designs, voices, jobs, review queue, Postiz account, live switches and agent keys, so one person's or team's work is never visible to another.

- A manager creates an agent key per agent on the Team page (or `POST /accounts/workspaces/{id}/tokens {"name":"Hermes"}` from a signed-in manager session). The key starts with `gsn_`, is shown once, and is sent as `Authorization: Bearer gsn_...`.
- A key is bound to one workspace. Everything it creates and reads (designs, batches, posts, voices, jobs) is inside that workspace. It cannot read other workspaces or the accounts endpoints (401).
- Agents prepare; they never approve, post now, retry, or change live/paused/platform switches. Editors (people) have the same limits; only managers approve.
- The original shared `GSN_AGENT_TOKEN` keeps working and reaches the Main workspace only.
- Postiz addresses and API keys are per workspace, set by a manager. They are never returned by the API.

### Monthly and comic templates

Ids 412–423 are the twelve monthly templates (`month: true`). Ids 424–523 are 100 comic business-humour templates (`funny: true`): ten designs in ten colourways, each with a `main` picture slot and a `sticker` mascot slot that can be replaced through `slots.<key>.src`.
