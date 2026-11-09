# GSN graphical characters

Three batches of 36 characters each: A–Z and 0–9. Gold foil balloons, upholstered sculptural fabric, and glossy lacquered solids. Each character is individually generated original raster artwork with a transparent background. The source PNGs retain their original dimensions; no originals were resized to make the small chat previews.

The 108 still graphics have 108 corresponding animated SVG variants: floating foil, softly breathing fabric and tilting glossy solids. These animate the raster artwork; they are not editable 3D meshes or generated motion footage. SVGs embed their source PNG, work offline and include a reduced-motion still. Browser support for SVG animation varies in third-party editors. The main GSN editor adds the still PNG as an independently editable image; animated SVGs can be previewed or downloaded separately.

The existing Pictures tool adds a Letters & numbers filter and searchable character artwork without changing the dashboard layout, globe, template styles or original UGC catalogue. `GET /characters/catalog.json` lists every character and its static and animated URL. `?download=1` downloads a file. Original UGC routes and counts are preserved.

Built with the built-in image-generation tool. Exact prompts are in generation-01.json through generation-09.json. No paid service, model worker or runtime image-generation feature is added.

Local packaging: `node character-collection/build.mjs`. Verification: `node --test character-collection/characters.test.mjs`. The collection is delivered through the feature/canva-studio branch. A commit or push does not deploy it to the VPS.
