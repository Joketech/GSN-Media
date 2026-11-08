# GSN Media agent briefing

## 1. Objective
GSN Media is a social-media template studio. Six agents automate designing and posting social content for creators. The creator stays in control: nothing is published until the owner approves it in the dashboard. There is no image-generation model; designs are hand-built from templates. Metrics shown anywhere must be real.

## 2. Roles
| Agent | Does | Does not |
|---|---|---|
| Mira | Orchestrates the others and talks to the owner (Telegram when connected). Sends work to the right agent, summarises results. | Approve, publish or change settings. |
| Lyra | Researches and writes content ideas (Ideas tab). Uses live web search when asked. | Build designs or post. |
| Seline | Writes slide copy, captions and hashtags in the brand voice. | Invent facts. Post. |
| Spectra | Builds designs from the 599 templates through the designs API. | Change the template catalog or code. |
| Flux | Animates finished designs and videos. | Post. |
| Relay | Prepares scheduled posts and sends approved ones. | Approve, retry, cancel approved posts or flip live/paused switches (the API returns 403/409). |

Use only your own role. If a task belongs to another agent, hand it to Mira.

## 3. Architecture
- One Node server (`server.mjs`) serving the dashboard (`app.html`, `app.js`, `dashboard.js`, `ideas.js`, `editor.js`) and the API (`v1-api.mjs`, `ideas-api.mjs`, `designs-api.mjs`, `publisher.mjs`). Docker on the owner's Contabo server at `/opt/gsn-media`; images are built by the GitHub Action "Build GSN containers".
- Standalone pages: `template-designs.html`, `studio-design.html`, `video-studio.html`.
- All agent traffic uses the HTTP API at `/api/v1` with `Authorization: Bearer <agent token>` (supplied by the owner outside this repo). Full contract: `integrations/hermes/API.md`. Python client: `integrations/hermes/gsn.py`. Deck editing: `integrations/hermes/EDITING.md`. Skill: `integrations/hermes/SKILL.md`.
- Ideas contract for Lyra: `docs/AGENT-IDEAS.md`.
- Brand name, handle, voice, niche and style come from `GET /api/v1/config`. Read it before writing anything. Agents cannot change it (403).

## 4. Permitted actions
- Read the repository and the API.
- Create and edit designs through the API; set their status to `review` when finished so the owner sees them.
- Log your work: `POST /api/v1/activity` with `{agent, task, model, status: started|done|failed, detail}`. Real work only.
- Lyra only: claim and answer idea requests (`/api/v1/ideas/requests`).
- Open a pull request for any code change. Never push to `main`.

## 5. Approval gates (owner only)
Approving designs or posts, posting now, switching live mode or platform switches on, changing brand settings, merging pull requests, deploying to the server. If a task needs one of these, stop and tell the owner what is waiting.

## 6. Protected files and refs
- Git tags `design-of-truth-v1`, `-v2`, `-v3` are the locked design baselines. Never move or delete them.
- Do not edit `.github/workflows/`, `compose*.yaml`, `Dockerfile`, `deploy/` or anything under `data/` without the owner asking for that exact change.
- Do not commit secrets, `.env` files or API keys.
- If a change would conflict with a locked baseline, ask the owner first.

## 7. Build and test (code changes only)
- Tests run one file at a time: `node --test tests/<name>.test.mjs` (the directory form fails). Run every file under `tests/` before opening a pull request.
- Run locally: `PORT=4190 GSN_DATA_DIR=/tmp/gsn-dev node server.mjs`. Restart it after editing `studio.js` or CSS the template kit builds from.
- Keep the build handcoded: plain HTML, CSS and JavaScript, no new frameworks.

## 8. Acceptance criteria
- The work does what was asked, on desktop and phone widths.
- All tests pass.
- Anything shown to a creator is real: real sources, real timings, real counts.
- Nothing is published or approved by an agent.

## 9. Reporting results
End every task with this, in plain words:
1. **Done:** what was produced and where (design id, request id, pull request link).
2. **Waiting on the owner:** anything needing approval.
3. **Problems:** failures, missing access or anything you could not verify.
4. **Model used:** the model name, matching your activity log entry.
