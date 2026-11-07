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
