# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```text
dreamflowCommandForFlutterFlow/
├── package.json             # Root Vite app manifest for the main project
├── README.md                # Root product documentation
├── .planning/               # GSD planning/codebase maps
└── ff-landing/              # Separate React/Vite/Tailwind landing/demo subapp
    ├── package.json         # Independent frontend manifest and scripts
    ├── pnpm-lock.yaml       # pnpm lockfile for the nested app
    ├── index.html           # Vite HTML entry point
    ├── bundle.html          # Single-file generated/static bundle artifact
    ├── dist/                # Generated production build output
    ├── public/              # Static assets served by Vite
    ├── src/                 # React source
    │   ├── App.tsx          # Main designer-style landing UI
    │   ├── main.tsx         # React root bootstrap
    │   ├── index.css        # Tailwind globals and theme tokens
    │   ├── components/ui/   # shadcn/Radix UI component inventory
    │   ├── hooks/           # Toast hook
    │   └── lib/             # Shared utility functions
    └── *.config.*           # Vite, Tailwind, ESLint, PostCSS, TypeScript config
```

## Directory Purposes

**`ff-landing/`:**
- Purpose: Independent landing/demo frontend app inside the larger FlutterFlow Custom Code Connect repository.
- Contains: React source, UI component primitives, Vite/Tailwind build config, and generated bundle artifacts.
- Key files: `package.json`, `index.html`, `src/App.tsx`, `bundle.html`.

**`ff-landing/src/`:**
- Purpose: Source of truth for the React app.
- Contains: `App.tsx`, `main.tsx`, global CSS, UI components, hooks, utilities.
- Key files: `src/App.tsx` is the main screen; `src/main.tsx` is the entry point.

**`ff-landing/src/components/ui/`:**
- Purpose: shadcn-style component library generated or copied into the project.
- Contains: 43 reusable TSX components such as `button.tsx`, `dialog.tsx`, `form.tsx`, `toast.tsx`.
- Current usage: mostly infrastructure; the main app uses hand-written Tailwind markup.

**`ff-landing/public/`:**
- Purpose: Static assets.
- Contains: `favicon.svg`, `icons.svg`.

**`ff-landing/dist/`:**
- Purpose: Generated production output.
- Contains: `index.html`, hashed JS, hashed CSS.
- Committed: should be ignored by `ff-landing/.gitignore`, but exists in the worktree.

**`ff-landing/.parcel-cache/` and `ff-landing/node_modules/`:**
- Purpose: local tooling/dependency artifacts.
- Committed: should be ignored by `ff-landing/.gitignore`, but exist in the worktree.

## Key File Locations

**Entry Points:**
- `ff-landing/index.html` - Vite/browser entry.
- `ff-landing/src/main.tsx` - React root creation.
- `ff-landing/src/App.tsx` - Main UI implementation.

**Configuration:**
- `ff-landing/package.json` - scripts and dependencies.
- `ff-landing/vite.config.ts` - Vite React plugin and `@` alias.
- `ff-landing/tailwind.config.js` - Tailwind theme/colors/content paths.
- `ff-landing/components.json` - shadcn UI aliases and style config.
- `ff-landing/eslint.config.js` - lint rules.
- `ff-landing/tsconfig*.json` - TypeScript project refs and strict app config.

**Core Logic:**
- `ff-landing/src/App.tsx` - all current product-specific UI state and rendering.

**Testing:**
- No test files or test script found under `ff-landing/`.

**Documentation:**
- `ff-landing/README.md` - unchanged Vite template README, not product-specific.

## Naming Conventions

**Files:**
- PascalCase for app components: `App.tsx`.
- lowercase/kebab-ish shadcn component files: `button.tsx`, `dropdown-menu.tsx`, `aspect-ratio.tsx`.
- config files use framework defaults: `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`.

**Directories:**
- Conventional React app layout: `src/`, `src/components/ui/`, `src/hooks/`, `src/lib/`, `public/`.

## Where to Add New Code

**Landing page UI changes:**
- Primary code: `ff-landing/src/App.tsx`.
- Global style/theme changes: `ff-landing/src/index.css` and `ff-landing/tailwind.config.js`.

**Reusable UI primitives:**
- Existing pattern: `ff-landing/src/components/ui/`.
- Utilities: `ff-landing/src/lib/utils.ts` or new files under `ff-landing/src/lib/`.

**Tests:**
- No established test structure exists; add a test runner first before creating test files.

## Special Directories and Artifacts

**`ff-landing/bundle.html`:**
- Purpose: generated single-file artifact with inline CSS/JS.
- Source: likely Parcel/html-inline workflow; no package script currently documents regeneration.

**`ff-landing/dist/`:**
- Purpose: generated Vite/Parcel output.
- Source: build tooling.
- Caution: do not edit by hand; update source in `ff-landing/src/` instead.

---

*Structure analysis: 2026-05-20*
*Update when `ff-landing/` structure changes.*
