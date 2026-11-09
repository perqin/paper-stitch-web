# Technical architecture

## Stack

- **React and TypeScript** for the browser application.
- **Vite** for development and production bundling; **pnpm** for dependencies, pinned through `packageManager` in `package.json`. Commit `pnpm-lock.yaml` and use `pnpm install --frozen-lockfile` for reproducible installs.
- **Material UI** as the default UI component library, with its Emotion styling engine and MUI icons.
- **ThemeProvider and CssBaseline** for shared visual tokens and baseline styles. Roboto is bundled locally through Fontsource.
- **Oxlint** and the TypeScript production build for static verification.
- **Zustand** for the shared editor document and immutable actions, following the approved [state model](state-model.md).

The application is entirely client-side: local image import, editing, Canvas 2D preview, and PNG/JPEG export. It has no backend, persistence, or upload service.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/main.tsx` | React bootstrap, global theme, baseline, and font imports. |
| `src/App.tsx` | Application entry into the editor. |
| `src/theme.ts` | Shared palette, typography, and component defaults. |
| `src/features/editor/` | Editor workspace and its presentation components. |
| `src/features/editor/assets/` | Bundled design-reference sample scans. |
| `docs/` | Human-readable product and architecture documentation. |

## Editor modules

**EditorShell** owns the responsive two-column workspace, identity bar, mode selector, canvas settings, and independently scrolling image list. Desktop uses a flexible preview and a 467px control column, following the Figma reference. Narrow screens stack both regions.

**CanvasPreview** renders the document on a viewport-sized Canvas 2D surface. Its local camera controls zoom and pan through overlay buttons; device pixel ratio affects only the preview backing store. First import fits the document, subsequent edits preserve the camera, and viewport resizing preserves its center. **camera.ts** contains the pure view transforms. No mouse, wheel, touch, or trackpad gestures are installed.

**ImageCard** presents image metadata and editable offset/crop/rotation controls, plus ordering, removal, and quick-rotate actions. Numeric drafts and validation messages stay local to **NumericField**, with valid values committed on blur or Enter. Memoized cards retain unchanged record references. Reset and Add images sit in a fixed toolbar above the scrolling cards.

**DownloadPanel** derives output dimensions through the pure composition module and keeps format, progress, and errors local. Each click captures an independent document snapshot and holds its image resources through encoding. Editing remains available; a second export is blocked until completion. Generated download URLs are temporary.

## State and processing boundaries

**model.ts / store.ts** define the document and typed Zustand actions. Metadata and committed edits are plain data; validation rejects invalid edits without changing the document. Mode changes and Reset atomically zero offsets, crops, and rotations. The store factory creates isolated instances for tests; the application uses one instance.

**resources.ts** serializes import batches, decodes images once using browser image APIs, retains source files/object URLs and decoded image elements outside Zustand, and registers resources before publishing successful records. Failures are reported per file. Removal detaches the record before retiring its resource. Synchronous leases keep decoded sources and their URLs alive until preview/export consumers release them. Failed or disposed imports release allocated resources; edits and reordering reuse decoded sources.

Image IDs use UUID v4 from the `uuid` package, which uses `crypto.getRandomValues` when native `crypto.randomUUID` is unavailable. This supports ordinary HTTP development origins as well as HTTPS and localhost; browser validation must cover a non-localhost HTTP origin, not just localhost's secure-context exception.

**composition.ts** calculates cropped and quarter-turned dimensions, sequential placement, and tight union bounds. It performs exact safe-integer arithmetic and rejects overflow rather than returning inaccurate dimensions. The first image is anchored at document `(0, 0)`; subsequent offsets can extend the bounds into negative coordinates without moving that origin.

**renderer.ts** is shared by preview and export. It fills the background once in document bounds, then paints sources in array order with source-over compositing, original-axis cropping, and exact quarter-turn matrices. It does not apply camera, DPR, or bounds normalization.

**export.ts** creates a separate detached canvas at exactly the derived output dimensions. It uses unit scale and translates only by the negative bounds origin. PNG is lossless; JPEG uses quality `0.95`. Preview zoom/pan, viewport size, and DPR never enter this path. Missing resources, unavailable contexts, rejected sizes, and encoding failures are errors, not reasons to skip images or reduce resolution. Tiling, workers, downsampling, and large-image optimizations are deferred.

## Verification and workflow

Run `pnpm test`, `pnpm lint`, and `pnpm build`. Unit tests use Node.js 24's built-in runner and TypeScript stripping for store, geometry, camera, rendering contracts, encoding failures, and resource lifecycle checks.

Install Chromium with `pnpm exec playwright install chromium` (or `install --with-deps chromium` where system libraries are missing), then run `pnpm test:browser`. Playwright starts a separate test server and checks a non-secure HTTP origin at DPR 1 and 2. Native canvas tests compare actual preview/export pixels against an independent crop/rotation/overlap reference. UI tests download real files, verify stable document coordinates and camera-independent output, and exercise deletion during export and recovery from encoding failure.

Development normally occurs directly on the default trunk branch, with one Conventional Commit per assigned task. Commit author and committer are `Y.U.K.I. <yuki-bot@perqin.com>`. Keep workstation-specific hostnames outside tracked configuration.

## Deployment

`.github/workflows/pages.yml` deploys on pushes to `master` or manual dispatch. It installs Node.js 24 and the pnpm version declared in `package.json`, performs a frozen dependency install, runs lint and unit tests, and builds the application. The Vite base path comes from GitHub Pages metadata at build time, supporting repository subpaths without changing local development configuration. Only `dist/` is uploaded and deployed; repository sources and local files are not published as a directory listing.
