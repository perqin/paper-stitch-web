# Editor state model

**Status: proposal for review — not implemented.** Zustand is installed, but no application store, model types, actions, or component bindings have been added. Existing UI-only state remains local to its components.

## Goals and boundaries

Use one small Zustand store as the source of truth for the current stitching document. Separate editable document data, browser image resources, derived composition, and transient UI state. Do not add persistence, undo history, middleware, multiple document support, or Freeform state in this iteration.

## Proposed document state

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
| `offset` | Signed pixel `x`, `y`; both zero | Adjustment from the automatically assigned position. |
| `crop` | Non-negative pixel `top`, `right`, `bottom`, `left`; all zero | Inward crop in the original image's coordinate system. |
| `rotationDeg` | Clockwise degrees; default zero | Rotation after cropping, normalized to a single turn. |

Metadata and edit parameters are plain data. The record does not contain `File`, image elements, object URLs, `ImageBitmap`, canvas objects, generated blobs, or computed positions.

## Placement semantics proposed for approval

- Use original image pixels as the document coordinate units; preview zoom never changes edit values. Initially offsets and crop amounts are whole pixels; rotation can be fractional.
- Apply inward crop first, then rotate about the cropped image's center. Use the rotated rectangle's axis-aligned bounding box for placement; rotation must not silently clip content.
- For Vertical, align each automatic position to the document's left edge and to the preceding image's placed bottom edge. For Horizontal, align it to the document's top edge and to the preceding image's placed right edge. The first image's automatic position is the origin.
- Add the image's X/Y offsets to that automatic position. Placement of the next image follows the current image's adjusted edge, so edits along the stitch axis shift subsequent images. Negative offsets permit overlap; positive offsets permit a gap.
- Reordering recomputes automatic placement and preserves each image's edits. Switching modes preserves X/Y offsets as physical axes; it does not swap or reset them.
- Derive output bounds from the union of placed image rectangles. Translate that union to the output origin and round outer bounds outward to whole pixels. Offsets move images relative to one another, not against a fixed-size canvas; blank margins outside the union are not retained.
- Empty documents have no output dimensions and cannot be exported. Source images are not scaled to equal width or height by default.

These semantics are proposals, not behavior already promised by the UI shell. They deliberately distinguish stored offsets from computed absolute positions.

## State ownership

| Owner | Data and responsibility |
| --- | --- |
| Zustand document store | Mode, background, ordered metadata and committed edits; synchronous immutable actions. |
| Import/resource controller | File selection and decoding, source `File`s, preview URLs and decoded resources keyed by image ID, import progress/errors, cancellation and cleanup. |
| Composition module | Pure derivation of cropped/rotated bounds, placed rectangles and output dimensions from the document. Shared by preview and export; not stored as a second source of truth. |
| React components | Menu anchors, selected download format, color-picker visibility, numeric text drafts and validation messages. Export format remains local to DownloadPanel because it has no other consumer. |
| Export controller | Encoding progress/error and a consistent document snapshot for each download. No generated blobs in the document store. |

Store actions are the only document mutation interface: change mode/background, append decoded images, update one image's edit parameters, move an image up/down, and remove an image. Do not expose a generic arbitrary document patch action. Crop must leave a positive source area, and every numeric edit must be finite. An invalid edit leaves the last valid document unchanged; components may temporarily display incomplete text such as a minus sign while editing.

## Resource lifecycle and asynchronous work

Decode an import batch outside Zustand, then append successful image records in selection order, not decode-completion order. Failed files produce import feedback without placeholder document records. Imports must be serialized by the controller so separate batches also preserve selection order.

Register resources before publishing their records. A resource registry owns each record's corresponding file and browser resources. Removal first detaches the record from the document, then releases resources once no preview/export consumer holds them. Cancelled or failed imports release anything already allocated. Reordering and parameter edits do not recreate source URLs or decode the file again.

Export captures the current document and format at click time and holds its source resources until encoding completes or fails. Subsequent edits affect the next export, not the in-flight result. No worker, cache, or reference-counting implementation is selected by this proposal; these are lifecycle requirements for the eventual controllers.

## Zustand usage

Use a typed store with immutable updates. Subscribe to narrow fields or individual image records, preserving untouched records' references. Avoid subscribing every card to the entire store. Use stable selector results; use Zustand's `useShallow` when a selector intentionally returns a new tuple or shallow object. Derive composition through a pure function with stable memoization at the consumer boundary, not an allocating selector that recalculates on every store read.

Keep one store per active application session; isolated tests should create fresh store instances. Do not add `persist`, Immer, Redux DevTools, or a context provider without a concrete need. In particular, receipt contents and browser resources must not be automatically written to local storage or sent to debugging services.

## Review decisions

1. Confirm offsets are relative to sequential automatic placement, with stitch-axis adjustments propagating to later images, rather than absolute canvas coordinates.
2. Confirm crop-before-rotation, clockwise angles, and original-pixel units.
3. Confirm mode switches retain edits and output uses tight union bounds without automatic scaling or extra outer margins.
4. Confirm an opaque white default background for both export formats; PNG transparency is deferred.

After approval, introduce model types, a store factory/actions, resource coordination, and focused tests in a separate implementation task. The sample fixtures must not become the initial production document.

## References

- [Zustand](https://github.com/pmndrs/zustand)
- [TypeScript usage](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript)
- [Selector stability and useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow)
