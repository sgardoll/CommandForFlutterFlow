# Coding Conventions

**Analysis Date:** 2026-05-20

## Naming Patterns

**Files:**
- `App.tsx` and `main.tsx` follow Vite React template naming.
- UI primitives under `ff-landing/src/components/ui/` use lowercase names, with kebab-case for multiword components (`dropdown-menu.tsx`, `aspect-ratio.tsx`).
- Config files use standard tool names (`vite.config.ts`, `eslint.config.js`, `tailwind.config.js`).

**Functions and Components:**
- React components use PascalCase function names: `DesignerLogo`, `PromptComposer`, `Sidebar`, `App`.
- Helpers use camelCase: `cn`, `genId`, `addToRemoveQueue`.
- Event handlers use `handle*` or local verb names: `handleSubmit`, `submit`.

**Variables:**
- camelCase for local state and arrays: `designs`, `suggestions`, `prompt`, `flash`.
- uppercase constants in toast hook: `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`.

**Types:**
- Type aliases and interfaces use PascalCase: `Toast`, `Action`, `State`, `ButtonProps`.
- Type-only imports are used where appropriate, e.g. `import type { ElementType } from "react"`.

## Code Style

**Formatting:**
- Mixed semicolon style exists: `ff-landing/src/App.tsx` uses semicolons, shadcn-generated files mostly omit them.
- Strings are mostly double quotes in `App.tsx` and shadcn files; `main.tsx` and config use single quotes in places.
- Tailwind-heavy JSX with long class strings is the dominant style.

**Linting:**
- ESLint config: `ff-landing/eslint.config.js`.
- Script: `pnpm lint` or `npm run lint` from `ff-landing/`.
- Rules include JS recommended, TypeScript recommended, React Hooks, and React Refresh Vite config.

**TypeScript Strictness:**
- `ff-landing/tsconfig.app.json` enables `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`.

## Import Organization

**Observed order:**
1. React imports.
2. Type imports.
3. Third-party packages (`lucide-react`, Radix, CVA).
4. Internal alias imports (`@/lib/utils`, `@/components/ui/*`).
5. Relative CSS/component imports (`./index.css`, `./App.tsx`).

**Path Aliases:**
- `@/*` maps to `ff-landing/src/*` via `vite.config.ts`, `tsconfig.json`, and `tsconfig.app.json`.

## Error Handling

**Patterns:**
- Main app has no async error handling because it has no external calls.
- shadcn components use local invariant errors where context is required, e.g. carousel context.
- Toast reducer centralizes state transitions in `ff-landing/src/hooks/use-toast.ts`.

## Logging

- No logging framework or `console.log` usage found in `ff-landing/src`.

## Comments

- Very few comments.
- Notable inherited shadcn comment in `use-toast.ts` describes a side-effect tradeoff.
- No TODO/FIXME/HACK markers found in `ff-landing/src` during focused search.

## Function and Module Design

**Main app:**
- `ff-landing/src/App.tsx` keeps all product-specific UI in one file.
- Small local presentational functions (`DesignerLogo`, `DesignRow`, `SidebarAction`) support readability.
- State is local and minimal.

**UI components:**
- shadcn/Radix components use `React.forwardRef`, CVA variant helpers, and `cn()` class merging.
- Public APIs are named exports for most UI primitives.

## Guidance for New Work

- For small landing page changes, edit `ff-landing/src/App.tsx` directly.
- For reusable components, follow the existing `ff-landing/src/components/ui/` shadcn style.
- Prefer the existing `@/` alias for internal imports.
- Keep generated artifacts (`dist/`, `bundle.html`) separate from source changes unless explicitly refreshing deployable output.

---

*Convention analysis: 2026-05-20*
*Update when formatting or component-generation conventions change.*
