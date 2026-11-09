# Technical architecture

## Stack

- **React and TypeScript** for the browser application.
- **Vite** for development and production bundling; **pnpm** for dependencies, pinned through `packageManager` in `package.json`. Commit `pnpm-lock.yaml` and use `pnpm install --frozen-lockfile` for reproducible installs.
- **Material UI** as the default UI component library, with its Emotion styling engine and MUI icons.
- **ThemeProvider, colorSchemes, useColorScheme, and CssBaseline** for shared visual tokens, native color-scheme support, and system-default light/dark mode. Roboto is bundled locally through Fontsource.
- **i18next and react-i18next** for English/Chinese UI copy, accessible labels, interpolation, validation, and error presentation.
- **Oxlint** and the TypeScript production build for static verification.
- **Zustand** for the shared editor document and immutable actions, following the approved [state model](state-model.md).

The application is entirely client-side: local image import, editing, Canvas 2D preview, and PNG/JPEG export. It has no backend, document persistence, or upload service. Only explicit UI language/theme preferences are remembered locally.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/main.tsx` | React bootstrap, global theme, baseline, and font imports. |
| `src/App.tsx` | Application entry into the editor. |
| `src/theme.ts` | Shared palette, typography, and component defaults. |
| `src/i18n.ts`, `src/language.ts`, `src/locales/` | Browser language resolution, initialization, and matching English/Chinese dictionaries. |
| `public/paper-stitch.svg` | Shared app icon for README, header, and favicon; header URLs respect Vite's deployment base. |
| `src/features/editor/` | Editor workspace and its presentation components. |
| `src/features/editor/assets/` | Bundled design-reference sample scans. |
| `docs/` | Human-readable product and architecture documentation. |

## Editor modules

**EditorShell** owns the responsive two-column workspace, identity bar, two-mode selector, general controls, and independently scrolling image list. The labeled Reset button sits beside the Background picker; the default-enabled overlap switch is transient preview state. Add images follows the cards inside the scroll region, with a centered large FAB and hint replacing it when empty. The list hides scrollbars without reserving a gutter. Desktop uses a flexible preview and a 467px control column, following the Figma reference. Narrow screens stack both regions.

**ConfirmDialog** gates mode changes, Reset, and image removal. The shell keeps a pending action (including the target mode or stable image ID), without changing the document or resources until confirmation. Cancel, Escape, and backdrop dismissal abandon the action. Reset and confirmed mode changes still clear numeric drafts as well as committed parameters; selecting the active mode is a no-op. Removal uses the existing resource retirement/lease path.

**HeaderActions** provides a language menu, MUI light/dark toggle, safe new-tab GitHub link, and concise purpose/privacy help dialog. Browser language preferences select the first supported primary language (`en`/`zh`), with English fallback; an explicit choice is stored separately from receipt data. MUI manages system color-scheme tracking and explicit theme persistence. `html.lang`, the document title, and the product name follow the active language: Paper Stitch / 拼纸条. Application errors are translated at the UI boundary, retaining native diagnostics and filenames rather than coupling domain/resource APIs to the UI language.

**CanvasPreview** renders the document on a viewport-sized Canvas 2D surface. Left-mouse dragging uses pointer capture; a non-passive wheel listener zooms at the cursor, including ctrl+wheel trackpad pinch. Safari GestureEvents provide its native pinch path. Device pixel ratio affects only the backing store. Fit and 100% remain as view-reset controls; directional pan and +/- zoom buttons are removed.

**camera.ts** owns pure transforms and per-axis constraints in CSS pixels. Each visible edge can move inward at most 40px. If the scaled bounds fit inside an axis with 40px margins on both sides, that axis is locked and centered. Constraints run after drag, zoom, viewport resize, and document edits, so locked-axis centering overrides previous screen-position stability. Otherwise edits preserve the camera unless a boundary requires clamping. Initial Fit reserves toolbar clearance; export geometry never uses these view constraints.

**ImageCard** presents metadata and a two-row, four-column parameter grid: X/Y each use one quarter and the angle readout/90° button spans the right half; four crop fields share the second row. First-image offsets are not rendered, but the rotation group keeps its right-half position. **NumericField** uses small, suffix-free inputs with short visible labels and descriptive accessible names. It commits valid changes immediately, including native spinner and keyboard steps, while retaining incomplete/invalid drafts locally. External value changes synchronize drafts without replacing the focused input. Blur or Enter finalizes text validation. Memoized cards retain unchanged record references. Add images scrolls after the cards.

**DownloadPanel** derives output dimensions through the pure composition module and keeps format, progress, and errors local. Each click captures an independent document snapshot and holds its image resources through encoding. Editing remains available; a second export is blocked until completion. Generated download URLs are temporary.

## State and processing boundaries

**model.ts / store.ts** define the document and typed Zustand actions. Metadata and committed edits are plain data; validation rejects invalid edits without changing the document. Mode changes and Reset atomically zero offsets, crops, and rotations. The store factory creates isolated instances for tests; the application uses one instance.

**resources.ts** serializes import batches, decodes images once using browser image APIs, retains source files/object URLs and decoded image elements outside Zustand, and registers resources before publishing successful records. Failures are reported per file. Removal detaches the record before retiring its resource. Synchronous leases keep decoded sources and their URLs alive until preview/export consumers release them. Failed or disposed imports release allocated resources; edits and reordering reuse decoded sources.

Image IDs use UUID v4 from the `uuid` package, which uses `crypto.getRandomValues` when native `crypto.randomUUID` is unavailable. This supports ordinary HTTP development origins as well as HTTPS and localhost; browser validation must cover a non-localhost HTTP origin, not just localhost's secure-context exception.

**composition.ts** calculates cropped and quarter-turned dimensions, sequential placement, and tight union bounds. It performs exact safe-integer arithmetic and rejects overflow rather than returning inaccurate dimensions. The first image is anchored at document `(0, 0)`; subsequent offsets can extend the bounds into negative coordinates without moving that origin.

**renderer.ts** is shared by preview and export. It fills the background once in document bounds, then paints sources in array order with source-over compositing, original-axis cropping, and exact quarter-turn matrices. It does not apply camera, DPR, or bounds normalization.

**alignment.ts** derives preview-only eligibility from the existing placed rectangles: a focused non-first image must intersect its immediate previous or next neighbor with positive area. The preview reads actual DOM focus on draw and schedules redraws on focus changes, avoiding stale focus after blur, removal, or reorder. Only the eligible image receives optional renderer alpha `0.5`; the background and other images remain unchanged. Export never supplies that option. Toggling alignment assistance or changing theme does not recreate the preview camera or gesture listeners.

**export.ts** creates a separate detached canvas at exactly the derived output dimensions. It uses unit scale and translates only by the negative bounds origin. PNG is lossless; JPEG uses quality `0.95`. Preview zoom/pan, viewport size, and DPR never enter this path. Missing resources, unavailable contexts, rejected sizes, and encoding failures are errors, not reasons to skip images or reduce resolution. Tiling, workers, downsampling, and large-image optimizations are deferred.

## Verification and workflow

Run `pnpm test`, `pnpm lint`, and `pnpm build`. Unit tests use Node.js 24's built-in runner and TypeScript stripping for store, geometry, camera, rendering contracts, encoding failures, and resource lifecycle checks.

Install Chromium with `pnpm exec playwright install chromium` (or `install --with-deps chromium` where system libraries are missing), then run `pnpm test:browser`. Playwright starts a separate test server and checks a non-secure HTTP origin at DPR 1 and 2. Native canvas tests compare actual preview/export pixels against an independent crop/rotation/overlap reference. UI tests download real files, verify stable document coordinates and camera-independent output, and exercise deletion during export and recovery from encoding failure.

Development normally occurs directly on the default trunk branch, with one Conventional Commit per assigned task. Commit author and committer are `Y.U.K.I. <yuki-bot@perqin.com>`. Keep workstation-specific hostnames outside tracked configuration.

## Deployment

`.github/workflows/pages.yml` deploys on pushes to `master` or manual dispatch. It installs Node.js 24 and the pnpm version declared in `package.json`, performs a frozen dependency install, runs lint and unit tests, and builds the application. The Vite base path comes from GitHub Pages metadata at build time, supporting repository subpaths without changing local development configuration. Only `dist/` is uploaded and deployed; repository sources and local files are not published as a directory listing.
