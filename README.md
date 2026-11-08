# Paper Stitch Web

React + TypeScript web app powered by Vite.

## UI components

Use [Material UI](https://mui.com/material-ui/getting-started/) as the default
component library for project UI. Use MUI components and their `sx` prop for
layout and styling rather than recreating standard controls with custom CSS.

The app uses Emotion (MUI's default styling engine), a shared theme in
`src/theme.ts`, and app-wide `ThemeProvider` and `CssBaseline` in `src/main.tsx`.
Roboto font weights 300, 400, 500, and 700 are bundled locally with Fontsource;
no external font service is required. Customize global design tokens and
component defaults in the shared theme.

## Development

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

## Checks and production build

```sh
npm run lint
npm run build
npm run preview
```

The production build is written to `dist/`.

## Template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
