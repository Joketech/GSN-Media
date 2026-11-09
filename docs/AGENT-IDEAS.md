# Ideas: how the research agent answers a request

The Ideas tab is answered by the owner's Hermes research agent through `integrations/hermes/idea-runner.mjs`, which does steps 1 to 4 below automatically. An agent can also do them by hand with the same API.

All calls use `Authorization: Bearer <GSN_AGENT_TOKEN>` and `/api/v1`.

1. `GET /ideas/requests?status=pending` returns waiting requests. Each one carries `instructions`: the exact brief to follow (brand voice, niche, posting style, refine feedback, and what the two switches mean). Follow it as written. Looking here also marks the agent as online on the Ideas tab for 90 seconds.
2. `POST /ideas/requests/{id}/claim` before you start. Returns 409 if another run took it.
3. Do the work.
   - **Research with Perplexity on (deep web research):** Perplexity-style research on the studio's own server, never a paid search API. At least 5 different `web_search` queries (SearXNG), at least 3 full pages read with `web_extract` (self-hosted Firecrawl), recent sources first, and keep a fact only when 2 independent sources or the original source support it. Put every page you used in that idea's `sources` as `{title, url}` (real http/https links only) and send `"searched": true`.
   - **Steroid mode on:** draft 8 candidates, review each against the brief, rewrite weak ones, return the best 5, add a one-line `review_note`.
   - Never invent statistics, quotes, names or links.
4. `POST /ideas/requests/{id}/result` with
   `{"ideas":[{"title","angle","hook","why_it_works","format","sources":[],"review_note"}], "searched": true, "model":"<model used>"}`
   (1 to 5 ideas, 5 is the target). If research was on and searching failed, send `"searched": false` with no sources, or fail the request:
   `{"status":"failed","error":"why"}`.

The server writes the activity log entries itself when you claim and finish, so the Agents page shows real work. Creators pick, reject, refine, search, copy and post from the Ideas tab; rejected ideas stay on their board. A creator can cancel a request only while it is still waiting (not once claimed).

Wait times shown to creators start as estimates (plain run 20 to 45 s, deep research +60 to 120 s, steroid +30 to 60 s) and switch to measured averages once the studio has timed 3 runs of each kind.
