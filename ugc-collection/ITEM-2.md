# Independent UGC layers â€” implementation checkpoint

Sixty-nine campaigns now have an independent-layer editor (IDs 0-68). Open their **Edit separate layers** link in the collection. The other 131 original ads remain available; they have not yet been converted into independent photographic layers. Existing dashboard styles, globe and collections are unchanged.

Each prepared starter separates person, product, blank packaging, background and wording. Package brand/name labels follow package movement, resizing and rotation. Replacing a person changes only that image source. Packaging tint changes the package alone. The editor supports pointer movement, resizing, rotation, layer order, locking, text changes, undo/redo, IndexedDB project saving, portable JSON projects and PNG export.

Ten automated tests cover independent replacements, package label transforms, atomic campaign-plan validation, invalid image sources, prepared starters and per-campaign layouts, authenticated job claims and expired leases. Browser verification confirmed the coffee starter renders its separate assets and person width changes can be undone and redone without changing product/package image sources. Further browser checks, remaining asset conversions and main-dashboard integration are still pending.

## Hermes contract

This private preview does not pretend to generate AI results. Start its server with an existing `GSN_AGENT_TOKEN` available in the environment; never put that token in browser code or Git. It binds to localhost only. The production agent connection is not configured by this checkpoint.

The editor submits `{templateId, brief, document}` to `POST /api/ugc/briefs` and polls `GET /api/ugc/briefs/{id}`. A trusted Hermes worker claims work using `POST /api/ugc/briefs/claim`, an `Authorization: Bearer <GSN_AGENT_TOKEN>` header and `{agent:"Mira"}`. Mira orchestrates; Seline handles copy and Spectra prepares layer changes. The claim returns the document and a 15-minute lease key.

Complete using `POST /api/ugc/briefs/{id}/complete` with the same authentication and `{leaseKey,plan}`. A plan has `version:1`, the matching `templateId`, and `changes:[{layerId,values}]`. Example values: `{text:"Your campaign headline"}`, `{tint:"#aa5533",tintStrength:0.5}`, or `{src:"data:image/png;base64,..."}`. Changes to locked/unknown layers, unsupported properties and invalid sources are rejected atomically. A completed plan applies automatically only if the user has not edited the document since submitting; otherwise the editor asks them to apply it explicitly.

Job files remain under ignored `data/ugc-briefs/`. Production deployment must retain the main dashboard's authentication and connect the existing Hermes workflow; this localhost queue is not a public unauthenticated service.

Batch 002 adds six assets for IDs 1–3 using built-in image generation, with final prompts saved in `layer-generation-batch-002.json`. All three new assembled designs were visually reviewed in the browser, including their loaded backgrounds and separate text/image layers. The gallery discovers readiness from `layer-assets.json`; it no longer hardcodes the initial three IDs. Each campaign can specify validated layout adjustments without changing the shared originals.

Batch 003 adds dark chocolate, honey and olive oil, each visually checked in the browser. Honey uses a corrected version-2 sheet to remove a neighbouring product fragment from the person crop. Olive oil preserves the original hands-only direction. `audit-layer-assets.py` checks RGBA transparency, crop bounds, background resolution and the editor image-size limit; `layer-asset-audit.json` records the results. Generation prompts and the correction prompt are saved alongside the batch.

Batch 004 adds jollof rice, artisan pizza and sunscreen. All three were visually reviewed in the browser; package label contrast and positioning were corrected during review. A real sunscreen PNG download was inspected and confirmed as 1080 × 1350. All original 200 campaign images remain unchanged.

The export review also found and corrected a thin neighbouring-disk fragment in the sunscreen person crop. The final starter uses `011-kit-v2.png`; its correction prompt is retained in `layer-generation-batch-004-correction.json`.


Batch 005 adds nine personal-care, grooming and lamp campaigns (12-20). Shampoo uses a corrected version-2 sheet. Batch 006 adds twelve home and kitchen campaigns (21-32). Every assembled layout was visually reviewed in the browser, with dark-background heading contrast corrected before acceptance. The rug, vase and mirror use manually reviewed crop boundaries. Prompts, crop proposals and the asset audit are retained. Ten layer tests and the 200-original integrity check pass.

Batch 007 adds twelve cookware and electronics campaigns (33-44), all visually reviewed in the browser. The measuring-cup kit uses a corrected version-2 sheet with a blank package label. Manual crop boundaries preserve narrow products and wide empty boxes. All originals remain intact.

Item 2 is closed at the user-directed checkpoint of 69 accepted layered campaigns. IDs 0-44 were visually reviewed. The user explicitly accepted the 24 later campaigns (45-68) without further visual review and requested their inclusion and feature-branch push. Technical checks cover asset existence, alpha geometry, image-size limits and the independent-layer model. These acceptance counts do not certify 69 unique compositions. The remaining 131 originals retain editable copy but do not have separate photographic layers. No further layer generation is planned in this checkpoint.

Task 3 has started with originality-audit.json: 200 distinct product records, no exact duplicate PNG hashes, and repeated layout systems flagged for composition review. A different colour or product is not sufficient to count as a new composition.
