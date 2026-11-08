# Technical architecture

## Stack

- **React and TypeScript** for the browser application.
- **Vite** for development and production bundling; **pnpm** for dependencies, pinned through `packageManager` in `package.json`. Commit `pnpm-lock.yaml` and use `pnpm install --frozen-lockfile` for reproducible installs.
- **Material UI** as the default UI component library, with its Emotion styling engine and MUI icons.
- **ThemeProvider and CssBaseline** for shared visual tokens and baseline styles. Roboto is bundled locally through Fontsource.
- **Oxlint** and the TypeScript production build for static verification.
- **Zustand** for the shared editor document and immutable actions, following the approved [state model](state-model.md).

The application is client-side, with local image import, editing controls, and pure composition geometry. It has no backend, persistence, upload service, pixel renderer, or encoder. The left preview remains static and download is disabled.

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

**CanvasPreview** shows the design's sample composition using clipped image elements on a gray workspace. Despite the product term “canvas,” this is not yet an HTML canvas renderer. Its positions are presentation coordinates, not a transform algorithm or output geometry.

**ImageCard** presents image metadata and editable offset/crop/rotation controls, plus ordering, removal, and quick-rotate actions. Numeric drafts and validation messages stay local to **NumericField**, with valid values committed on blur or Enter. Memoized cards retain unchanged record references. Reset and Add images sit in a fixed toolbar above the scrolling cards.

**DownloadPanel** derives output dimensions through the pure composition module, memoized from image records and mode. It keeps menu visibility and selected format local. The primary download action remains disabled.

**demo.ts** supplies only the unchanged left preview's presentation fixtures. The editing document starts empty and never imports these fixtures automatically.

## State and processing boundaries

**model.ts / store.ts** define the document and typed Zustand actions. Metadata and committed edits are plain data; validation rejects invalid edits without changing the document. Mode changes and Reset atomically zero offsets, crops, and rotations. The store factory creates isolated instances for tests; the application uses one instance.

**resources.ts** serializes import batches, decodes images using browser image APIs, retains source files/object URLs outside Zustand, and registers resources before publishing successful records. Failures are reported per file. Removal detaches the record before revoking its URL; failed or disposed imports release allocated resources. Source URLs are reused for edits and reorder operations.

**composition.ts** calculates cropped and quarter-turned dimensions, sequential placement, and the union bounds. It performs exact safe-integer arithmetic and rejects overflow instead of returning inaccurate dimensions. These are geometry calculations only: neither the left preview nor download consumes them for rendering yet. Future preview and export must share this composition contract; export resource leases and encoding are deferred until download is implemented.

## Verification and workflow

Run `pnpm test`, `pnpm lint`, and `pnpm build`. Tests use Node.js 24's built-in test runner and TypeScript stripping for store, geometry, and resource lifecycle checks. Browser checks cover actual file import, edit validation, quarter-turns, ordering/removal, reset/mode changes, background retention, output dimensions, and desktop/narrow layouts while confirming the static preview and disabled download remain unchanged.

Development normally occurs directly on the default trunk branch, with one Conventional Commit per assigned task. Commit author and committer are `Y.U.K.I. <yuki-bot@perqin.com>`. Keep workstation-specific hostnames outside tracked configuration.
