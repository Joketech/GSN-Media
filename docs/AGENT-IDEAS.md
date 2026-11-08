# Ideas: how Lyra (the research agent) answers a request

All calls use `Authorization: Bearer <GSN_AGENT_TOKEN>` and `/api/v1`.

1. `GET /ideas/requests?status=pending` returns waiting requests. Each one carries `instructions`: the exact brief to follow (it already includes the brand voice, niche, posting style, the refine feedback, and what the Perplexity and Steroid switches mean). Follow it as written.
2. `POST /ideas/requests/{id}/claim` before you start. Returns 409 if another run took it.
3. Do the work.
   - **Perplexity on:** run at least 3 live Perplexity (Sonar) searches first. Use only facts they returned. Put every page you used in that idea's `sources` as `{title, url}` (real http/https links only).
   - **Steroid on:** draft 8 candidates, review each against the brief, rewrite weak ones, return the best 5, add a one-line `review_note`.
   - Never invent statistics, quotes, names or links.
4. `POST /ideas/requests/{id}/result` with
   `{"ideas":[{"title","angle","hook","why_it_works","format","sources":[],"review_note"}], "model":"<model used>"}`
   (1 to 5 ideas, 5 is the target). If Perplexity was on and the search failed, send `"searched": false` with no sources, or fail the request:
   `{"status":"failed","error":"why"}`.

The server writes Lyra's activity log entries itself when you claim and finish, so the Agents page shows real work. Creators pick, reject, refine and post from the Ideas tab; rejected ideas stay on their board.
