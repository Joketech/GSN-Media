# Editing GSN decks with Hermes

Mira coordinates the request. Seline edits the wording. Spectra edits page layouts and artwork. Flux handles animation when requested. Relay prepares approved assets.

1. Start from the user's **Export agent deck JSON** file when editing an existing draft. For a fresh design, use the authenticated GET /api/v1/templates endpoint and select the template's id, ratio, and slides. Use the catalog ID exactly as returned.
2. Interpret page numbers as one-based. The first page is the Hook, and the last is the CTA. Preserve any fields the user did not ask to change.
3. Edit title for the headline, body for supporting copy, kicker for the label, brandText for the brand line, and footerText for the footer. Use six-digit hex strings in background, ink, and accent.
4. To duplicate a page, deep-copy the slide and insert it after the source or before the final CTA, whichever is earlier. When copying the Hook or CTA, set the copy's deckLayout to feature. To move or remove pages, modify the slides array while keeping one Hook first and one CTA last. The editor accepts up to 15 pages.
5. To change the main artwork, set motif to a valid Picture Library ID such as gsn-1100 and remove image if replacing an uploaded photo. Set artLayer to behind, front, or background to change placement relative to text. Use artX, artY, and artScale to adjust position and size.
6. Return the edited JSON with template_id, ratio, and slides. The user opens Design Studio and selects **Import agent deck JSON**. Save the design in the archive after reviewing it. For an optional HTML proof, submit the same fields with kind post or animation to POST /api/v1/jobs and follow the existing approval workflow.

The JSON handoff carries page copy, layout, colors, and main artwork. Use a workspace backup for complete drafts with extra image and graphic layers, per-text-box styling, or crop adjustments. If Hermes has browser access, it can use the Design Studio canvas and Layers panel to edit those items directly. Keep approvals and publishing under the user's control.

Example request: “Seline, rewrite the Hook for logistics directors. Spectra, duplicate page 2 before the CTA, and change that new page to explain delayed dispatch alerts. Keep the original artwork and send me the editable deck JSON for review.”

## Layer operations

Open **Layers** in Design Studio. Shift-click rows, then select **Group**. Drag a member on the canvas to move the group. Select the group and click **Ungroup** to move its members independently. **Toggle position lock** protects the selected layers against canvas dragging while leaving their wording editable. Drag a layer row onto another row to change their stacking priority. The main artwork, text block, and added graphics have their own stacking containers.

For a JSON handoff, use layerGroups (arrays of layer keys), positionLocks (an array of layer keys), and layerOrder (keys from back to front). Portable keys are title, body, kicker, brandText, footerText, and artwork. The rendered HTML proof accepts layerOrder. Groups and locks take effect when importing the JSON into Design Studio. Use the browser editor or a full workspace backup to retain grouping and locks on added photo and graphic layers.

Example request: “Spectra, group the Hook headline and supporting copy, lock the main artwork, and put the artwork behind the headline. Leave the copy editable.”
