# Independent UGC layers â€” implementation checkpoint

Six campaigns now have an independent-layer editor: the approved coffee, grilled meal and gel moisturiser (IDs 0, 8 and 10), plus matcha powder, coconut water and breakfast granola (IDs 1, 2 and 3). Open their **Edit separate layers** link in the collection. The other 194 original ads remain available; they have not yet been converted into independent photographic layers. Existing dashboard styles, globe and collections are unchanged.

Each prepared starter separates person, product, blank packaging, background and wording. Package brand/name labels follow package movement, resizing and rotation. Replacing a person changes only that image source. Packaging tint changes the package alone. The editor supports pointer movement, resizing, rotation, layer order, locking, text changes, undo/redo, IndexedDB project saving, portable JSON projects and PNG export.

Ten automated tests cover independent replacements, package label transforms, atomic campaign-plan validation, invalid image sources, prepared starters and per-campaign layouts, authenticated job claims and expired leases. Browser verification confirmed the coffee starter renders its separate assets and person width changes can be undone and redone without changing product/package image sources. Further browser checks, remaining asset conversions and main-dashboard integration are still pending.

## Hermes contract

This private preview does not pretend to generate AI results. Start its server with an existing `GSN_AGENT_TOKEN` available in the environment; never put that token in browser code or Git. It binds to localhost only. The production agent connection is not configured by this checkpoint.

The editor submits `{templateId, brief, document}` to `POST /api/ugc/briefs` and polls `GET /api/ugc/briefs/{id}`. A trusted Hermes worker claims work using `POST /api/ugc/briefs/claim`, an `Authorization: Bearer <GSN_AGENT_TOKEN>` header and `{agent:"Mira"}`. Mira orchestrates; Seline handles copy and Spectra prepares layer changes. The claim returns the document and a 15-minute lease key.

Complete using `POST /api/ugc/briefs/{id}/complete` with the same authentication and `{leaseKey,plan}`. A plan has `version:1`, the matching `templateId`, and `changes:[{layerId,values}]`. Example values: `{text:"Your campaign headline"}`, `{tint:"#aa5533",tintStrength:0.5}`, or `{src:"data:image/png;base64,..."}`. Changes to locked/unknown layers, unsupported properties and invalid sources are rejected atomically. A completed plan applies automatically only if the user has not edited the document since submitting; otherwise the editor asks them to apply it explicitly.

Job files remain under ignored `data/ugc-briefs/`. Production deployment must retain the main dashboard's authentication and connect the existing Hermes workflow; this localhost queue is not a public unauthenticated service.

Batch 002 adds six assets for IDs 1–3 using built-in image generation, with final prompts saved in `layer-generation-batch-002.json`. All three new assembled designs were visually reviewed in the browser, including their loaded backgrounds and separate text/image layers. The gallery discovers readiness from `layer-assets.json`; it no longer hardcodes the initial three IDs. Each campaign can specify validated layout adjustments without changing the shared originals.
