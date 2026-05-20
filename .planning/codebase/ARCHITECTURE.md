# Architecture

**Analysis Date:** 2026-05-20

## Pattern Overview

**Overall:** Standalone React/Vite single-page frontend nested under the root project.

**Key Characteristics:**
- `ff-landing/` has its own `package.json`, lockfile, TypeScript configs, Vite config, Tailwind config, and source tree.
- The visible app is a static interactive shell, not a data-connected product flow.
- Main screen mimics a designer/AI-prompt interface: sidebar, design history, prompt composer, suggestion chips, and a small submit animation.
- No network calls, auth, persistence, routing, or backend integration were found in `ff-landing/src`.

## Layers

**HTML Boot Layer:**
- Purpose: Browser entry and React root mount.
- Contains: `ff-landing/index.html` with `<div id="root"></div>` and `/src/main.tsx` module script.
- Depends on: Vite dev/build pipeline.

**React App Layer:**
- Purpose: Renders the mock designer landing UI.
- Contains: `DesignerLogo`, `SidebarAction`, `DesignRow`, `PromptComposer`, `Sidebar`, and `App` in `ff-landing/src/App.tsx`.
- Depends on: React state/hooks, `lucide-react`, Tailwind classes.

**Component Library Layer:**
- Purpose: shadcn/Radix reusable component inventory.
- Contains: 43 files under `ff-landing/src/components/ui/` plus `ff-landing/src/hooks/use-toast.ts` and `ff-landing/src/lib/utils.ts`.
- Depends on: Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`.
- Used by: Mostly available but not central to `App.tsx`; the app currently uses custom inline Tailwind markup more than the generated UI components.

**Styling Layer:**
- Purpose: Tailwind theme tokens and global styling.
- Contains: `ff-landing/src/index.css`, `ff-landing/tailwind.config.js`, `ff-landing/postcss.config.js`.
- Depends on: Tailwind CSS and `tailwindcss-animate`.

**Bundle Artifact Layer:**
- Purpose: Built/static outputs.
- Contains: `ff-landing/dist/index.html`, hashed CSS/JS in `ff-landing/dist/`, and a single-file `ff-landing/bundle.html` with inlined CSS/JS.
- Depends on: Vite/Parcel/html-inline tooling.

## Data Flow

**Render Flow:**
1. `ff-landing/index.html` loads `/src/main.tsx`.
2. `ff-landing/src/main.tsx` renders `<App />` into `#root` inside React `StrictMode`.
3. `App` renders the `Sidebar` and `PromptComposer`.
4. `PromptComposer` stores only local prompt text in `useState`.
5. On submit, `App.handleSubmit()` toggles a local `flash` state and resets it with `window.setTimeout`.

**State Management:**
- Local React state only: `prompt` and `flash` in `ff-landing/src/App.tsx`.
- Toast hook has module-level memory state in `ff-landing/src/hooks/use-toast.ts`, but it is not part of the main rendered app flow found in `App.tsx`.

## Key Abstractions

**Static product shell:**
- Purpose: Demonstrate a possible FlutterFlow Custom Code Connect / designer product interface.
- Example: Hard-coded `designs` and `suggestions` arrays in `ff-landing/src/App.tsx`.

**shadcn UI inventory:**
- Purpose: Ready-made primitives for future richer interactions.
- Examples: `ff-landing/src/components/ui/button.tsx`, `dialog.tsx`, `form.tsx`, `toast.tsx`.

**Class merging utility:**
- Purpose: Compose Tailwind classes safely.
- Example: `cn()` in `ff-landing/src/lib/utils.ts`.

## Entry Points

**Development entry:**
- Location: `ff-landing/index.html` → `ff-landing/src/main.tsx` → `ff-landing/src/App.tsx`.
- Trigger: `pnpm dev` / `vite` from `ff-landing/`.

**Production build entry:**
- Location: same source entry; output in `ff-landing/dist/`.
- Trigger: `pnpm build` runs `tsc -b && vite build`.

**Single-file artifact:**
- Location: `ff-landing/bundle.html`.
- Trigger: not scripted in `package.json`, but dependencies and `.parcelrc` suggest Parcel/html-inline tooling.

## Error Handling

**Strategy:** Minimal; this is mostly static UI.
- No API boundary or async external failure path in `App.tsx`.
- shadcn components throw only normal contextual errors such as `useCarousel must be used within a <Carousel />`.

## Cross-Cutting Concerns

**Validation:** None in the visible app; submit button is disabled while the prompt is empty.

**Authentication:** None.

**External APIs:** None found.

**Logging:** None found.

---

*Architecture analysis: 2026-05-20*
*Update when `ff-landing/` becomes connected to real product flows.*
