# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:**
- No test runner is configured in `ff-landing/package.json`.
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files were found in the focused `ff-landing/` scan.

**Assertion Library:**
- None configured.

## Verification Commands

```bash
cd ff-landing
pnpm lint       # ESLint over the nested app
pnpm build      # TypeScript build + Vite production build
pnpm dev        # Local Vite dev server
pnpm preview    # Preview production build
```

Equivalent `npm run ...` commands should work if dependencies are installed with npm, but the presence of `pnpm-lock.yaml` indicates pnpm is the intended package manager.

## Test File Organization

**Current state:**
- No established test directory.
- No colocated test files.
- No E2E setup.

**Recommended future pattern:**
- Add a test runner before adding tests, likely Vitest + React Testing Library for this Vite/React stack.
- Collocate component tests next to source if the app remains small, e.g. `ff-landing/src/App.test.tsx`.
- Add Playwright only if the landing/demo shell needs browser-level interaction checks.

## What Should Be Tested If This Becomes Product Code

**Unit / component:**
- `PromptComposer` disabled/enabled submit behavior.
- Suggestion chips populate the textarea.
- `App` flash class toggles after submit.

**Visual / integration:**
- Sidebar renders expected design history and download card.
- Responsive behavior if mobile/desktop controls become functional.

**Build safety:**
- TypeScript build should stay clean under `noUnusedLocals` and `noUnusedParameters`.
- ESLint should remain clean under `eslint.config.js`.

## Mocking

- No mocking patterns exist yet.
- Current app has no network calls, localStorage usage, timers beyond `window.setTimeout`, or external data services.
- If testing `App.handleSubmit`, fake timers would be useful for the 900ms flash reset.

## Coverage

- No coverage target or coverage tooling configured.
- If tests are added, start with behavior coverage for `ff-landing/src/App.tsx`; the shadcn component inventory can generally be treated as generated/vendor-like unless customized.

## Test Types

**Current:**
- Manual/browser verification only via Vite dev server or preview.

**Not present:**
- Unit tests.
- Integration tests.
- E2E tests.
- CI workflow scoped to `ff-landing/`.

## Common Patterns to Use Later

```tsx
// Suggested future style, not currently present:
describe('PromptComposer', () => {
  it('enables submit after prompt text is entered', () => {
    // render, act, assert
  })
})
```

---

*Testing analysis: 2026-05-20*
*Update when a real test runner is added to `ff-landing/`.*
