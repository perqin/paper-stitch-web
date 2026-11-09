# Product

## Purpose

Paper Stitch is a web-based image stitching tool for paper receipts captured in multiple scanner passes. Users arrange the scans, adjust their visible regions and alignment, then save one continuous image, much like a long screenshot.

## Editor workspace

On desktop, the left side is the canvas preview and the right side is a control panel. The image list scrolls independently so that the header, settings, and download area remain available. On narrow screens, the preview and controls stack vertically.

The control panel contains, from top to bottom:

1. **Identity:** application logo and the name **Paper Stitch**.
2. **Stitch mode:** Vertical (default), Horizontal, and Freeform. Freeform is visible but unavailable; it is not planned for the near term.
3. **Canvas settings:** a background-color label and button.
4. **Images:** a toolbar above the independently scrollable image list, with **Reset** on the left and **Add images** on the right. Neither button scrolls with the list.
5. **Download:** final output dimensions in pixels and a split button, with PNG as the default format and JPEG as an alternative.

## Image controls

Each image card shows a thumbnail, filename, and original width and height in pixels. It offers:

- Horizontal (X) and vertical (Y) offsets, in pixels.
- Inward crop amounts for top, bottom, left, and right edges, in pixels.
- A rotation selector limited to clockwise `0°`, `90°`, `180°`, and `270°`, and a quick-rotate control.
- Move up, move down, and remove actions.

List order is both stitch and draw order: later images paint over earlier ones where they overlap. Coordinates start at the top-left, with positive X pointing right and positive Y pointing down. The first image is fixed at document `(0, 0)` and its offset inputs are disabled. Later images' offsets adjust automatic stitch positions, not absolute canvas coordinates. Reordering preserves edits; a saved offset is inactive while its image is first and becomes active again if moved later.

Changing stitch mode resets every image's X/Y offsets, four crop amounts, and rotation to zero. Reset performs the same reset without changing mode. Both preserve the images, their order, and canvas background. Crop is applied before quarter-turn rotation; see the [state model](state-model.md) for data structure and composition details. Selecting the active mode does not reset edits.

## Import and editing

The right panel starts with no images. Add images opens a multi-file picker and decodes browser-supported image formats locally, preserving selection order. Each successful image gets an independent record and thumbnail, even when importing the same file again. Unsupported or corrupt files show an error without discarding successful files. No images are uploaded or persisted.

Offsets and inward crops accept whole pixels and apply valid changes immediately. Native input arrows and focused Up/Down keys step by one pixel without losing focus; preview and output dimensions update without waiting for blur. Incomplete text remains a local draft, and invalid values never replace the last valid document value. Blur or Enter finalizes text and reports incomplete input. Crop must leave at least one pixel on each axis. Rotation selection and the quick-rotate button support quarter-turns only. Images can be moved up/down or removed; the first/last ordering actions are disabled at their respective boundaries. Reset and mode changes clear all edits, including unfinished input drafts.

The background button opens the browser color picker and stores an opaque color, initially white, used by both preview and export. Transparent parts of imported images reveal the background or preceding images.

Output dimensions update from the current order, crop, rotation, offsets, and stitch mode. They represent the tight union of the placed rectangles, without automatic scaling or extra outer margins. Empty documents show **Output: —**. Values exceeding exact supported coordinate arithmetic show **Output: out of range**, not an approximate size.

## Preview and download

The left preview renders the current document. Hold the left mouse button anywhere on the image or gray workspace and drag to pan. Scroll the mouse wheel or pinch the trackpad to zoom around the cursor. Wheel events inside a non-empty preview control the image rather than scrolling or zooming the browser page. Fit and 100% remain beside the zoom readout; the pan and +/- zoom buttons are removed. At 100%, one image pixel corresponds to one CSS pixel. First import automatically fits the document.

Dragging is limited independently on each axis: a composed-image edge can move inward no further than 40 display pixels from the corresponding preview edge. If the scaled image is small enough to leave at least 40px on both sides, that direction cannot be dragged and is forced to center. This centering also applies after edits, including negative offsets, and after resizing or zooming. Thus the first image remains at document `(0, 0)`, but its on-screen position may change to keep the composed bounds centered or within drag limits.

Download creates a PNG (default) or JPEG at the displayed original pixel dimensions, without preview scaling, workspace margins, or resolution reduction. Only export translates the tight bounds to its output origin. PNG is lossless; JPEG uses high-quality lossy encoding. Both use the chosen opaque background.

Each download uses the document and format at click time. Editing and removing images remain available while encoding, without changing that result. Only one export runs at a time. Empty documents cannot be downloaded. Browser canvas limits and encoding failures show an error instead of silently shrinking the output.

## Subsequent functional scope

Large-image performance optimization, touchscreen dragging, automatic overlap detection, Freeform, persistence, uploads, and advanced editing remain outside the current scope.
