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

List order represents the intended stitch order. Coordinates start at the top-left, with positive X pointing right and positive Y pointing down. Offsets adjust automatic stitch positions, not absolute canvas coordinates.

Changing stitch mode resets every image's X/Y offsets, four crop amounts, and rotation to zero. Reset performs the same reset without changing mode. Both preserve the images, their order, and canvas background. Crop is applied before quarter-turn rotation; see the [state model](state-model.md) for data structure and composition details. Selecting the active mode does not reset edits.

## Current delivery: editing controls

The right panel starts with no images. Add images opens a multi-file picker and decodes browser-supported image formats locally, preserving selection order. Each successful image gets an independent record and thumbnail, even when importing the same file again. Unsupported or corrupt files show an error without discarding successful files. No images are uploaded or persisted.

Offsets and inward crops accept whole pixels and commit on blur or Enter. Invalid inputs show feedback and leave the last valid document unchanged. Crop must leave at least one pixel on each axis. Rotation selection and the quick-rotate button support quarter-turns only. Images can be moved up/down or removed; the first/last ordering actions are disabled at their respective boundaries. Reset and mode changes clear all edits, including unfinished input drafts.

The background button opens the browser color picker and stores an opaque color, initially white. It does not recolor the placeholder preview yet.

Output dimensions update from the current order, crop, rotation, offsets, and stitch mode. They represent the tight union of the placed rectangles, without automatic scaling or extra outer margins. Empty documents show **Output: —**. Values exceeding exact supported coordinate arithmetic show **Output: out of range**, not an approximate size.

The left preview remains the original static, labeled design sample and does not respond to imported images or edits. PNG/JPEG format selection remains available, but downloading is disabled. Pixel rendering, encoding, persistence, and uploads are not implemented.

## Subsequent functional scope

Future work will connect the document to canvas rendering and PNG/JPEG export. Automatic overlap detection, Freeform, and advanced editing remain outside the current scope.
