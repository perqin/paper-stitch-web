# Product

## Purpose

Paper Stitch is a web-based image stitching tool for paper receipts captured in multiple scanner passes. Users arrange the scans, adjust their visible regions and alignment, then save one continuous image, much like a long screenshot.

## Editor workspace

On desktop, the left side is the canvas preview and the right side is a control panel. The image list scrolls independently so that the header, settings, and download area remain available. On narrow screens, the preview and controls stack vertically.

The control panel contains, from top to bottom:

1. **Identity:** application logo and the name **Paper Stitch**.
2. **Stitch mode:** Vertical (default), Horizontal, and Freeform. Freeform is visible but unavailable; it is not planned for the near term.
3. **Canvas settings:** a background-color label and button.
4. **Images:** an ordered, scrollable list with an **Add images** button at its end.
5. **Download:** final output dimensions in pixels and a split button, with PNG as the default format and JPEG as an alternative.

## Image controls

Each image card shows a thumbnail, filename, and original width and height in pixels. It offers:

- Horizontal (X) and vertical (Y) offsets, in pixels.
- Inward crop amounts for top, bottom, left, and right edges, in pixels.
- Rotation angle, in degrees, and a quick-rotate control.
- Move up, move down, and remove actions.

List order represents the intended stitch order. Precise transform semantics and output-size calculation will be defined when image processing is implemented.

## Current delivery: UI shell

The workspace displays two bundled sample scans from the design reference, read-only example values, and explicitly labeled sample output dimensions. These are presentation fixtures, not user imports or a computed stitch result.

Mode selection and the PNG/JPEG menu have local UI state only. Changing them does not change the preview or create a file. Import, image actions, parameter editing, background selection, and downloading are unavailable in this delivery. No image-processing, persistence, or upload behavior is implemented.

## Subsequent functional scope

Future work will connect image import, vertical and horizontal composition, alignment/crop/rotation controls, background selection, output dimension calculation, and PNG/JPEG export. Automatic overlap detection, Freeform, and advanced editing are not part of the current UI-shell scope.
