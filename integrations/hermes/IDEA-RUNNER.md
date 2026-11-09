# Idea runner: Ideas tab ⇄ Hermes

`idea-runner.mjs` connects the Ideas tab to the owner's Hermes agent. It checks the studio for waiting idea requests every few seconds, sends each brief to Hermes through the Hermes API server, checks the reply, and posts the five ideas back. Plain Node, no packages, no paid services.

```
Ideas tab  →  studio (/api/v1/ideas)  ←  idea runner  →  Hermes API server (127.0.0.1:8642)
                                                           ├─ web_search  → SearXNG   (127.0.0.1:8888)
                                                           └─ web_extract → Firecrawl (127.0.0.1:3002)
```

## Requirements on the server
- Hermes API server on: `API_SERVER_ENABLED=true` and `API_SERVER_KEY=...` in `~/.hermes/.env`; `curl http://127.0.0.1:8642/health` answers ok.
- Hermes web tools: `web.search_backend: searxng`, `web.extract_backend: firecrawl`, `FIRECRAWL_API_URL=http://localhost:3002`, and the web tool enabled for the API server platform in `hermes tools`.
- The studio's agent key (`GSN_AGENT_TOKEN` in `/opt/gsn-media/.env`, or a workspace key from the Team page).

## Settings
| Variable | Default | Meaning |
|---|---|---|
| `GSN_URL` | `http://127.0.0.1:4188` | Studio address on the host |
| `GSN_AGENT_TOKEN` | required | Studio agent key |
| `HERMES_URL` | `http://127.0.0.1:8642` | Hermes API server |
| `HERMES_API_KEY` | required | Hermes `API_SERVER_KEY` |
| `HERMES_MODEL` | `hermes-agent` | Model name Hermes lists at `/v1/models` |
| `IDEA_AGENT_NAME` | `Lyra` | Name the agent is given in the brief |
| `IDEA_POLL_SECONDS` | `5` | How often it looks for work |
| `IDEA_TIMEOUT_SECONDS` | `600` | Longest one request may run |
| `IDEA_CONCURRENCY` | `1` | Requests at the same time (max 4) |

## Run it (Docker, same image as the studio)
Put the settings in a file only root can read, e.g. `/opt/gsn-media/idea-runner.env`. Find the image the studio runs (it must include this change): `docker inspect gsn-studio-app-1 --format '{{.Config.Image}}'`. Then, with that image name:

```
docker run -d --name gsn-idea-runner --restart unless-stopped --network host \
  --read-only --cap-drop ALL --security-opt no-new-privileges:true \
  --env-file /opt/gsn-media/idea-runner.env \
  STUDIO_IMAGE node integrations/hermes/idea-runner.mjs
```

`--network host` lets it reach the studio and Hermes on 127.0.0.1 without opening any port. Logs: `docker logs -f gsn-idea-runner` (JSON lines; keys are never logged).

## Behaviour
- One request at a time by default, oldest first.
- If the reply is not valid JSON it asks Hermes once to re-send it as JSON; if that fails the request is marked failed with a "Try again" message.
- Ideas are trimmed to the studio's field limits; only real http(s) links are kept as sources. If deep research was on but no real sources came back, the result is honestly marked as not researched.
- Requests left half-done by a stopped runner are closed after the timeout so the creator can press Try again.

Tests: `node --test tests/idea-runner.test.mjs`.
