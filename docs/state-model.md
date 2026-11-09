# Editor state model

**Status: implemented for editing, geometry, Canvas 2D preview, and PNG/JPEG download.** The document remains separate from browser resources, the preview camera, and export snapshots.

## Goals and boundaries

Use one small Zustand store as the source of truth for the current stitching document. Separate editable document data, browser image resources, derived composition, and transient UI state. Do not add persistence, undo history, middleware, multiple document support, or Freeform state in this iteration.

## Document state

| Field | Shape / default | Meaning |
| --- | --- | --- |
| `mode` | `vertical` or `horizontal`; default `vertical` | Determines automatic placement along the stitch axis. Freeform is not a valid active mode. |
| `backgroundColor` | Opaque RGB hex color; default `#FFFFFF` | Background of the composed image, not the gray preview workspace. Applies equally to preview and PNG/JPEG export. Transparency is deferred. |
| `images` | Ordered array of image records; initially empty | Both list order and draw order. Later records paint over earlier ones where they overlap. |

Start with an ordered array rather than an entity map plus a separate order array: the list is small, the code is easier to follow, and there is only one ordering invariant. Use stable image IDs for updates and React keys, never indices or filenames. Revisit normalization only if real performance measurements justify it.

### Image record

| Field | Shape / default | Meaning |
| --- | --- | --- |
| `id` | Browser-generated UUID | Identity for one imported occurrence. Importing the same file again creates a separate occurrence. |
| `name` | Original filename | Display metadata; not an identity or a filesystem path. |
| `originalSize` | Positive integer `width`, `height` | Decoded source dimensions, after browser orientation handling and before edits. |
| `offset` | Signed pixel `x`, `y`; both zero | Adjustment from automatic placement, inactive while the record is first. |
| `crop` | Non-negative pixel `top`, `right`, `bottom`, `left`; all zero | Inward crop in the original image's coordinate system. |
| `rotationDeg` | `0`, `90`, `180`, or `270`; default `0` | Clockwise quarter-turn rotation after cropping. Other angles are invalid. |

Metadata and edit parameters are plain data. The record does not contain `File`, image elements, object URLs, `ImageBitmap`, canvas objects, generated blobs, or computed positions.

## Placement semantics

- Use screen coordinates: the top-left is the origin, positive X points right, and positive Y points down. Document edit units are original image pixels, independent of preview zoom/pan. Offsets and crop amounts are whole pixels.
- Apply inward crop first, then a clockwise quarter-turn. At `90` or `270` degrees, exchange the cropped width and height; at `0` or `180`, retain them. The resulting rectangle is axis-aligned, so arbitrary-angle bounding-box calculations are unnecessary.
- For Vertical, align each automatic position to the document's left edge and to the preceding image's placed bottom edge. For Horizontal, align it to the document's top edge and to the preceding image's placed right edge. The first image's placed top-left is always `(0, 0)`; its offsets are ignored and its offset inputs are hidden with their layout space reserved. Preserving the stored offsets allows them to become active again if that record moves later in the list.
- For subsequent images, add X/Y offsets to the automatic position. Placement of the next image follows the current image's adjusted edge, so edits along the stitch axis shift subsequent images. Negative offsets permit overlap; positive offsets permit a gap.
- Reordering recomputes automatic placement and preserves each image's edits. Changing to a different mode resets all images' offsets, four crop values, and rotation to zero in the same update as the mode change. Selecting the already-active mode is a no-op.
- The Reset button performs that same parameter reset without changing the mode. Both operations preserve image identity, metadata, resources, order, and canvas background color. Reset is not removal or a new document.
- Derive output bounds from the union of placed image rectangles. Only export translates that union to its output origin. Preview uses document coordinates and an independent, constrained camera: a small axis is forced to center when its scaled extent fits inside the viewport minus 80 CSS pixels; a larger axis is clamped to 40px inward edge limits. These camera constraints also apply after document edits, intentionally overriding previous screen-position stability without changing document placements. Coordinates and sizes are already whole pixels; blank margins outside the union are not retained in export.
- Empty documents have no output dimensions and cannot be exported. Source images are not scaled to equal width or height by default.

These semantics are pure geometry shared by preview and export. Stored offsets are distinct from computed absolute positions.

## State ownership

| Owner | Data and responsibility |
| --- | --- |
| Zustand document store | Mode, background, ordered metadata and committed edits; synchronous immutable actions. |
| Import/resource controller | File selection and decoding, source `File`s, preview URLs and decoded resources keyed by image ID, import progress/errors, cancellation and cleanup. |
| Composition module | Pure derivation of cropped/rotated bounds, placed rectangles and output dimensions from the document. Shared by preview and export; not stored as a second source of truth. |
| React components | Menu anchors, selected download format, color-picker visibility, numeric text drafts, validation messages, and the preview's independent camera. |
| DownloadPanel / export module | Local encoding progress/error, a click-time document/format snapshot, and retained source leases. No generated blobs in the document store. |

Store actions are the only document mutation interface: change mode (with parameter reset), reset all positioning parameters, change background, append decoded images, update one image's edit parameters, move an image up/down, and remove an image. Do not expose a generic arbitrary document patch action. Crop must leave a positive source area; offsets/crops must be finite integers, and rotation must be one of the four supported angles. An invalid edit leaves the last valid document unchanged; components may temporarily display incomplete text such as a minus sign while editing.

## Resource lifecycle and asynchronous work

Decode an import batch outside Zustand, then append successful image records in selection order, not decode-completion order. Failed files produce import feedback without placeholder document records. Imports must be serialized by the controller so separate batches also preserve selection order.

Register resources before publishing their records. A resource registry owns each record's file, decoded image, and object URL. Preview acquires sources for each synchronous draw; export retains them through encoding. Removal first detaches the record, then retires the resource, releasing its URL only after the last lease ends. Failed or disposed imports release anything already allocated. Reordering and parameter edits do not recreate URLs or decode again.

Export captures the document and format at click time and holds source resources until encoding completes or fails. Subsequent edits affect the next export, not the in-flight result. Leases are released on both success and failure. Workers and complex caches are deferred.

## Zustand usage

Use a typed store with immutable updates. Subscribe to narrow fields or individual image records, preserving untouched records' references. Avoid subscribing every card to the entire store. Use stable selector results; use Zustand's `useShallow` when a selector intentionally returns a new tuple or shallow object. Derive composition through a pure function with stable memoization at the consumer boundary, not an allocating selector that recalculates on every store read.

Keep one store per active application session; isolated tests should create fresh store instances. Do not add `persist`, Immer, Redux DevTools, or a context provider without a concrete need. In particular, receipt contents and browser resources must not be automatically written to local storage or sent to debugging services.

## Example document state

This is a plain JavaScript example, not executable application code or production initial state. It shows two imported images with illustrative edits. Store action functions are intentionally omitted; browser resources remain outside this object.

```js
const state = {
  mode: 'vertical',
  backgroundColor: '#FFFFFF',
  images: [
    {
      id: '06b659aa-0d64-4556-b77e-464ebbba38a7',
      name: 'receipt-01.png',
      originalSize: { width: 672, height: 3375 },
      offset: { x: 0, y: 0 },
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
      rotationDeg: 0,
    },
    {
      id: 'b0e22302-da62-4b96-b569-0af6d3902978',
      name: 'receipt-02.png',
      originalSize: { width: 670, height: 3282 },
      offset: { x: -10, y: -200 },
      crop: { top: 50, right: 0, bottom: 0, left: 0 },
      rotationDeg: 90,
    },
  ],
}
```

After Reset, every record has `offset: { x: 0, y: 0 }`, all four crop values set to `0`, and `rotationDeg: 0`. Changing mode performs the same reset and updates `mode`. No filenames, original dimensions, image order, or background settings are reset.

The store's real initial document and preview have no images. Bundled design-reference scans are not imported automatically.

## References

- [Zustand](https://github.com/pmndrs/zustand)
- [TypeScript usage](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript)
- [Selector stability and useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow)
