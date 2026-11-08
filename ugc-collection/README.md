# GSN UGC single-page collection — item 1

This standalone collection contains 200 product campaign definitions. Each design is one 4:5 page with an editable Hook, product-specific description, brand, category, CTA and handle. It does not modify the existing dashboard, globe, templates or picture library.

Run `node ugc-collection/server.mjs` from the repository root and open http://localhost:4246/. The gallery counts only photographs actually present on disk. Search by product or caption, filter by category, and use Contact sheet to compare designs. Open **Edit / download** to change wording and download PNG, JPEG or a self-contained editable HTML file. Text changes persist in this browser's local storage; downloaded HTML is the portable editable copy.

`manifest.json` contains the product briefs, copy, palettes and generation prompts. `data.js` is its browser catalogue, with prompts omitted. There are 20 categories with 10 distinct product types each; flavour and colour variants are not counted as different products. The artwork combines individual photographic scenes with eight composition systems, twenty typography/frame families and additional variants. The three previously approved coffee, gel-moisturiser and grilled-chicken photographs are reused once each; the remaining photographs are newly generated. Those three have dedicated art direction instead of the general composition rules.

Run `node ugc-collection/verify.mjs --report` to check all 200 records and PNG assets, resolution, exact duplicate image hashes, unique product names/Hooks/descriptions, and browser/source catalogue consistency. It exits unsuccessfully while any photograph is missing. The optional `asset-audit.json` records image hashes and dimensions. Hash comparisons cannot establish visual originality; review the contact sheet as well.

The person, product and background are still combined in each photograph at this stage. Independent person/product/packaging/background editing and agent campaign actions are item 2 and are intentionally deferred until item 1 is complete. Main-dashboard integration belongs to a later step. Do not describe this standalone collection as already integrated or deployed to the VPS.

The parked `ugc-assets`, `ugc-data.js`, `ugc-designs.js` and `ugc.css` files outside this directory belong to an earlier, paused layer experiment. They are not loaded by this collection and must not be mistaken for the final layer system.
