# Technology Stack

**Analysis Date:** 2026-05-20

## Focus

This map is a focused refresh for `ff-landing/`, a nested frontend app inside the root `dreamflowCommandForFlutterFlow` repository.

## Languages

**Primary:**
- TypeScript / TSX - `ff-landing/src/App.tsx`, `ff-landing/src/main.tsx`, and `ff-landing/src/components/ui/*.tsx`.
- CSS with Tailwind directives - `ff-landing/src/index.css`.

**Secondary:**
- JavaScript config files - `ff-landing/eslint.config.js`, `ff-landing/tailwind.config.js`, `ff-landing/postcss.config.js`.
- HTML entry/bundle files - `ff-landing/index.html`, `ff-landing/bundle.html`, `ff-landing/dist/index.html`.

## Runtime

**Environment:**
- Browser-only React SPA; `ff-landing/index.html` mounts `src/main.tsx` into `#root`.
- No server runtime or backend code found inside `ff-landing/`.

**Package Manager:**
- pnpm, indicated by `ff-landing/pnpm-lock.yaml`.
- `ff-landing/package.json` has npm-compatible scripts: `dev`, `build`, `lint`, `preview`.

## Frameworks and Build Tools

**Core:**
- React 19 - UI runtime (`react`, `react-dom`).
- Vite 8 - dev server and production bundler via `ff-landing/vite.config.ts`.
- Tailwind CSS 3.4 - styling via `ff-landing/tailwind.config.js` and `ff-landing/src/index.css`.
- shadcn/Radix-style component stack - `ff-landing/components.json`, `ff-landing/src/components/ui/*.tsx`, Radix packages in `package.json`.

**Build/Dev:**
- TypeScript 6 - `tsc -b` in build script, config split across `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.
- ESLint 10 - `ff-landing/eslint.config.js`.
- PostCSS + Autoprefixer - `ff-landing/postcss.config.js`.
- Parcel 2 + `html-inline` - present in dev dependencies and `.parcelrc`; likely used to produce the checked-in single-file `ff-landing/bundle.html`.

## Critical Dependencies

- `lucide-react` - all visible icons in `ff-landing/src/App.tsx`.
- `@radix-ui/*` packages - shadcn-style primitives used by reusable UI components under `ff-landing/src/components/ui/`.
- `class-variance-authority`, `clsx`, `tailwind-merge` - class composition utilities used by shadcn components and `ff-landing/src/lib/utils.ts`.
- `tailwindcss-animate` - Tailwind animation plugin referenced in `ff-landing/tailwind.config.js`.
- `sonner` and local toast components - available UI infrastructure, though the main app shell does not currently use it directly.

## Configuration

**Aliases:**
- `@` maps to `ff-landing/src` in both `ff-landing/vite.config.ts` and TypeScript configs.

**Environment:**
- No `VITE_*`, `process.env`, `import.meta.env`, API key, or external-service env usage found in `ff-landing/src`.

**Build output:**
- Vite/Parcel output exists in `ff-landing/dist/` and `ff-landing/bundle.html`.
- `ff-landing/.gitignore` excludes `node_modules`, `dist`, and `.parcel-cache`, but those directories currently exist in the worktree.

## Purpose Summary

`ff-landing/` is not the root product app. It is a separate, modern React/Tailwind prototype or landing/demo shell for a FlutterFlow Custom Code Connect / designer-style interface.

---

*Stack analysis: 2026-05-20*
*Update after major dependency changes in `ff-landing/`.*
