# UGC integration handoff — 9 November 2026

## Delivered on feature/canva-studio

- 200 single-page covers, each containing editable Hook, product description, brand, category, CTA and handle. Different products, photographs and complete stage/type combinations; changing colour alone does not count as a new design. Common visual motifs are shared across the collection.
- All 20 category contact sheets checked in the browser. A DOM overflow check across all 200 covers found no clipped Hook/description boxes. The three previously approved cover directions remain in place.
- 69 accepted independent-layer starters. **The other 131 still use composite photographs. They are not independently replaceable person/product/packaging layers.** This count has not been inflated by the cover work.
- Templates → **UGC collection · 200 single-page designs** opens `/ugc/` on the main studio server. No separate port is needed in production.
- The main editor's **Pictures** tool searches 407 entries: 200 complete campaign photographs and 207 separately selectable person/product/packaging cutouts from the 69 accepted kits. Filters distinguish full photos from cutouts. Multiple images can be added; Replace selected changes one selected image. Cutout transparency is preserved in WebP, and late image loads cannot overwrite a different page or a changed selected image.
- PNG/JPEG/editable HTML cover downloads, and PNG/editable project downloads in the independent-layer editor. Browser verification downloaded a real 1080 × 1350 PNG for hand drum, edited and restored its Hook, added two independent images to a main-studio page, verified undo/redo, and verified that replacement changed only one image source, and exported/imported an olive-oil project with all four images embedded. Large prepared backgrounds are safely encoded for portable JSON so importing the project does not hit the per-image storage limit.
- Studio-authenticated, workspace-scoped campaign queues under `/api/v1/ugc`. Both the legacy agent token and valid workspace-issued agent keys can claim their permitted queue. Human browser authentication cannot claim worker jobs, and a client cannot grant itself worker status through JSON.

## Integration agent

Merge this feature branch through your normal review process. Preserve the existing `.env`, access settings, workspaces and persistent data volume. The Dockerfile already copies the collection with the application; there are no new production dependencies or paid services. Keep the existing globe files and dashboard CSS unchanged. The current-main integration preserves its People, Background, named image slots, accounts and publishing controls. The older image-generation add-on is excluded because the current project brief removed that service. This source has not yet been deployed to the VPS.

Run from the repository root:

```sh
node --test ugc-collection/layers.test.mjs ugc-collection/compositions.test.mjs ugc-collection/integration.test.mjs tests/accounts.test.mjs tests/designs.test.mjs tests/v1.test.mjs
node ugc-collection/verify.mjs
```

27 automated tests passed. The 200-record asset check reports no missing images or exact duplicate PNG hashes. `originality-audit.json` checks exact composition combinations independently of colours; it is not proof that no visual motif is shared.

## Hermes connection

The production adapter is implemented, but no live Hermes worker was connected or inference run. Mira orchestrates; Seline writes and Spectra edits the layer plan. Lyra, Flux and Relay keep their established roles. No video agent or generation feature is added.

A signed-in browser submits `{templateId,brief,document}` to `POST /api/v1/ugc/briefs` with the selected `X-GSN-Workspace`. A trusted worker uses its existing bearer key:

- `POST /api/v1/ugc/briefs/claim` with `{agent:"Mira"}`
- `POST /api/v1/ugc/briefs/{id}/complete` with `{leaseKey,plan}`
- The editor polls `GET /api/v1/ugc/briefs/{id}`.

A plan is `{version:1,templateId,changes:[{layerId,values}]}`. Stable layer IDs include `person`, `product`, `packaging`, `background`, `hook`, `description`, `cta`, `package-brand` and `package-name`. Replace only requested sources. Respect locks. Plans validate atomically and stale editor revisions do not silently overwrite human edits. Worker leases expire after 15 minutes.

UGC editable projects currently save in IndexedDB on the user's device and can be downloaded as portable JSON. The main studio's server-backed archive is unchanged; UGC projects are not represented as archived main-studio designs yet. Submitted agent briefs retain their document snapshot in the workspace's persistent server queue.

Task 4 was explicitly excluded by the user. No generated image was deleted or re-reviewed as part of that task.

## Combined-source verification

All 15 JavaScript test files in tests/ and ugc-collection/ passed individually after resolving against current main. The asset check still finds 200 products and no missing or exact duplicate campaign images. The merged browser preview verified Pictures loading 407 entries alongside People and Background, independent image insertion, selected replacement and undo/redo.
