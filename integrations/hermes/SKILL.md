---
name: gsn-media
description: Create GSN video, voice, social posts and animations.
platforms: [linux]
---

# GSN Media studio

Use the private GSN v1 API on Contabo for daily content jobs. The client is `/opt/gsn-media/integrations/hermes/gsn.py`; read [README.md](README.md) for commands and [API.md](API.md) for payloads. Do not read or print the access key; the client loads it from the server's protected `.env`.

## Roles

Mira coordinates and tracks jobs. Lyra researches and supplies sources. Seline writes scripts and generates narration. Spectra builds posts/carousels. Flux creates animated HTML. Veyra creates video scenes and edits footage. Relay prepares approved assets for publishing. These are responsibilities for the user's Hermes agents, not agents hosted by the studio.

## Procedure

1. Read the user's daily brief: topic, deliverables, selected voice, formats, deadlines, and any GPU budget. Inspect `health`, `voices`, and existing `jobs`.
2. For sourced claims, let Lyra supply evidence; Seline prepares the copy. Mark generated footage as illustrative rather than presenting it as a recording of a real event.
3. Pick `post`, `animation`, `voice`, `text_to_video`, or `image_to_video`. Read the corresponding payload in API.md. Give each job a truthful `agent` and `project`.
4. Use a stable key such as `2026-11-05-project-scene-01-v1` for the same intended job. Reusing the same key and identical content returns that job. Never create a fresh key merely because a response was lost.
5. Submit once; poll `status` or `wait`. GPU jobs require an available GPU worker and the user's generation authorization/budget. Do not start paid rentals from this skill.
6. If a job is interrupted or submission is unconfirmed, inspect worker history before resubmitting. If a job fails, report the error. A changed prompt/revision gets a new explicit revision key.
7. Download completed outputs into the chosen project directory. Check media plays or HTML renders. Report result IDs, output paths, source citations, and any limitations to Mira/the user.
8. Leave outputs pending review unless the user has delegated approval. Relay may publish only with a separately configured destination and publishing authorization. The studio does not publish.

## Daily operation

Hermes owns scheduling. Use the schedule and timezone the user actually chooses; none is installed by this package. GPU offline status does not mean success: continue eligible social/animation work and report which video jobs are blocked. Voice samples are stored on the server; do not transmit them to other services.

## Verification

Check returned state, not a successful HTTP response alone. A completed video must have a playable MP4; narration a WAV; social/animation jobs an HTML result. A four-second generated clip is one scene, not a full documentary. The original footage editor supports manual browser assembly; automated timeline editing and final-film encoding are not v1 API endpoints.
