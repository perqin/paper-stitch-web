# Technical architecture

## Stack

- **React and TypeScript** for the browser application.
- **Vite** for development and production bundling; **pnpm** for dependencies, pinned through `packageManager` in `package.json`. Commit `pnpm-lock.yaml` and use `pnpm install --frozen-lockfile` for reproducible installs.
- **Material UI** as the default UI component library, with its Emotion styling engine and MUI icons.
- **ThemeProvider and CssBaseline** for shared visual tokens and baseline styles. Roboto is bundled locally through Fontsource.
- **Oxlint** and the TypeScript production build for static verification.
- **Zustand** for future shared editor state. The dependency is installed; the [state model](state-model.md) is a review proposal, not an implemented store.

The current application is a client-side UI shell. It has no backend, storage, upload service, image-processing engine, or application store. Keep existing presentation state local until the state model is approved.

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

**ImageCard** presents image metadata and the seven numeric controls, plus ordering, removal, and quick-rotate actions. Numeric fields are read-only; business actions are disabled. Labels include the image name to distinguish repeated controls for assistive technology.

**DownloadPanel** owns only menu visibility and selected format. The primary download action remains disabled. Output dimensions are labeled as a sample rather than calculated from assets.

**demo.ts** supplies explicitly separated presentation fixtures. Real import state must replace these fixtures when functionality is introduced; it must not treat them as user files or persist them as a project.

## State and future processing boundary

Only transient presentation state is implemented: selected mode and selected export format/menu visibility. There is deliberately no image-editing state or business event pipeline yet. Proposed ownership, fields, and coordinate semantics are documented separately in the [state model draft](state-model.md).

When functional work begins, keep imported image metadata and edit parameters separate from decoded image resources. A composition module should own crop, rotation, placement, and output bounds; preview and export should consume the same composition result to avoid divergent geometry. Import should own image resource lifetimes, and export should own encoding and download behavior. These are intended boundaries, not implemented services or settled algorithms. Rendering technology, limits, coordinate conventions, and JPEG background behavior remain decisions for that work.

## Verification and workflow

Run `pnpm lint` and `pnpm build`. Browser checks should cover the workspace at desktop and narrow widths, independent list scrolling, accessible controls, format menu operation, and successful local asset/font loading without runtime errors.

Development normally occurs directly on the default trunk branch, with one Conventional Commit per assigned task. Commit author and committer are `Y.U.K.I. <yuki-bot@perqin.com>`. Keep workstation-specific hostnames outside tracked configuration.
