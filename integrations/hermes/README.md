# GSN Media v1 — Hermes handoff

The handcoded studio runs on Contabo. Hermes can create the same jobs as the browser through a loopback API. six specialists remain Mira (orchestrator), Lyra (research), Seline (writing/voice), Spectra (design), Flux (animation), Relay (publishing preparation).

## Deploy/update

```bash
cd /opt/gsn-media
git pull --ff-only
bash deploy/setup-v1.sh
docker compose --profile voice up -d --build app voice
python3 integrations/hermes/gsn.py health
```

The setup preserves an existing access key and worker configuration. A fresh `.env` uses no domain and keeps the app on loopback. V1 requires its own `GSN_AGENT_TOKEN`; Basic Auth remains optional for a future HTTPS gateway. Display the token privately with `sed -n 's/^GSN_AGENT_TOKEN=//p' .env` and enter it in the browser at the SSH-tunnel address. Do not paste it in chat. Browser sessions last 12 hours and reset when the app restarts.

Profiles, job records, and collected results live in `app-data`. Back up that volume as well as the existing voice/model volumes. Do not run `docker compose down -v` unless intentionally deleting data. Voice reference recordings are personal data stored in this volume; deletion/retention controls beyond operator-managed volume maintenance are not implemented.

Use the original clean voice reference and exact transcript to save a voice profile. The previously generated result WAV is narration, not automatically your original voice reference. Profiles are references; saving one does not perform a model-training step.

## Connect Hermes

If Hermes uses the root profile on the VPS:

```bash
mkdir -p /root/.hermes/skills/gsn-media
cp integrations/hermes/SKILL.md integrations/hermes/README.md integrations/hermes/API.md /root/.hermes/skills/gsn-media/
```

For another OS user/profile, install in that user's configured skill directory and give the client access to a separate protected environment file holding only `GSN_AGENT_TOKEN` (mode 600, owned by that user). Do not make the studio's full `.env` world-readable. The client accepts `--env-file /path/to/agent.env`. If Hermes runs inside Docker, its loopback is a different network namespace: configure a private shared network or host tunnel and the corresponding HTTPS/private integration; do not publish the app to all interfaces merely to make it reachable.

Tell Hermes to use `/gsn-media` after its skill discovery refresh. Confirm the installed version's skill mechanism; no Hermes process or schedule is changed by this repository.

## Client examples

```bash
python3 integrations/hermes/gsn.py health
python3 integrations/hermes/gsn.py voices
python3 integrations/hermes/gsn.py templates
python3 integrations/hermes/gsn.py create --json integrations/hermes/examples/post.json --key test-post-v1
python3 integrations/hermes/gsn.py create --json integrations/hermes/examples/animation.json --key test-animation-v1
python3 integrations/hermes/gsn.py create --json integrations/hermes/examples/text-video.json --key test-video-v1
python3 integrations/hermes/gsn.py create --json integrations/hermes/examples/image-video.json --image /path/to/start.jpg --key test-image-video-v1
python3 integrations/hermes/gsn.py status JOB_UUID
python3 integrations/hermes/gsn.py wait JOB_UUID --timeout 1800
python3 integrations/hermes/gsn.py download JOB_UUID --out /path/to/new-result.mp4
```

Use the same key with identical content after a network error. Failed/interrupted jobs are not automatically retried. A changed request under the same key returns 409. Review interrupted worker submissions before creating a new key. CLI download refuses to overwrite an existing file.

## Daily brief to give Hermes

“Use GSN Media for the following daily deliverables: [topics, counts, aspect ratios, voice profile, GPU budget]. Mira coordinates; Lyra researches; Seline writes; Spectra creates posts; Flux animates; Track stable job keys per date/project/revision. Return completed files for my review. Report unavailable workers and failures. Use my configured schedule in Africa/Lagos.”

Replace the brackets and choose the schedule yourself. This is a handoff template, not an installed automation. No autonomous research, publishing connector, GPU rental, or final-film rendering service is installed here.

The existing full studio remains at `/classic`: social templates, manual design editing, animation playback/export, footage timeline, and browser narration mixing/WebM export. Its manually saved projects remain browser-local. New v1 API jobs and outputs are server-persistent. Original browser-local job history is not automatically migrated.

## GPU connection

`VISUAL_WORKER_URL` must point to a private, reachable worker. The app Docker container cannot reach a host SSH forward using its own `127.0.0.1`. Plan the Docker-network route with the actual GPU host/port before setting this URL. Keep worker API port 8091 private. No GPU machine has been provisioned or benchmarked by this release.
