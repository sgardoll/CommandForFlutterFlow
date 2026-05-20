# External Integrations

**Analysis Date:** 2026-05-20

## Summary

`ff-landing/` currently has no runtime external integrations. It is a browser-only React/Tailwind UI shell with static data and local React state.

## APIs & External Services

**Runtime APIs:**
- None found in `ff-landing/src`.
- No `fetch`, `axios`, API client, `VITE_*`, `import.meta.env`, or `process.env` usage was found during focused search.

**AI / FlutterFlow / BuildShip / OpenRouter:**
- No direct integration code found in `ff-landing/src`.
- The page title and UI copy relate to FlutterFlow Custom Code Connect / designer concepts, but the subapp does not call product APIs.

## Data Storage

**Databases:**
- None.

**File Storage:**
- None.

**Caching:**
- None at runtime.
- Build/tool caches exist locally: `ff-landing/.parcel-cache/`, `ff-landing/node_modules/`.

## Authentication & Identity

**Auth Provider:**
- None.

**User/session state:**
- UI includes hard-coded user display text (`Stuart Gardoll`, `Designer`) in `ff-landing/src/App.tsx`.
- No sign-in, sign-out, token, or session implementation exists.

## Monitoring & Analytics

**Error tracking:**
- None.

**Analytics:**
- None found in `ff-landing/`.
- Root project has `posthog-js` in its own `package.json`, but `ff-landing/package.json` does not and `ff-landing/src` does not reference it.

**Logs:**
- None.

## CI/CD & Deployment

**Hosting:**
- No deployment target configured in `ff-landing/`.
- Deployable artifacts exist: `ff-landing/dist/` and `ff-landing/bundle.html`.

**CI Pipeline:**
- No `ff-landing`-specific workflow found during this focused scan.

## Environment Configuration

**Development:**
- No required environment variables found.
- Run locally with Vite from `ff-landing/`.

**Production:**
- `pnpm build` produces static assets suitable for static hosting.
- `bundle.html` appears intended for a single-file embed/share/deploy path, but no regeneration script documents it.

## Webhooks & Callbacks

- None.

## Security Notes

- No secrets should be needed for `ff-landing/` in its current state.
- Generated `bundle.html` and `dist/` should not contain secrets; focused search found no env/API usage in source.

---

*Integration audit: 2026-05-20*
*Update if `ff-landing/` becomes connected to backend/product APIs.*
