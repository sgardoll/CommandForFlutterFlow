# External Integrations

**Analysis Date:** 2025-02-13

## APIs & External Services

**AI/ML Services:**

**Google Gemini API (Primary):**
- Purpose: Prompt analysis, code generation, code auditing
- Integration: REST API via fetch (proxied through Vite)
- Endpoint: `https://generativelanguage.googleapis.com`
- Auth: API key in `VITE_GEMINI_API_KEY` env var
- Models used:
  - `gemini-3-flash-preview` (primary)
  - `gemini-2.5-flash-preview-09-2025` (fallback)
- Location in code: `callGemini()` function in `app.js`

**Anthropic Claude API (Optional):**
- Purpose: Alternative code generation model
- Integration: REST API via fetch (proxied through Vite)
- Endpoint: `https://api.anthropic.com`
- Auth: API key in `VITE_ANTHROPIC_API_KEY` env var
- Special header required: `anthropic-dangerous-direct-browser-access: true`
- Location in code: `callClaude()` function in `app.js`

**OpenAI GPT API (Optional):**
- Purpose: Alternative code generation model
- Integration: REST API via fetch (proxied through Vite)
- Endpoint: `https://api.openai.com`
- Auth: API key in `VITE_OPENAI_API_KEY` env var
- Location in code: `callOpenAI()` function in `app.js`

## Data Storage

**Browser Storage:**

**localStorage:**
- Purpose: Encrypted API key storage
- Keys: `ccc_gemini`, `ccc_anthropic`, `ccc_openai`
- Encryption: AES-GCM with device fingerprint
- Location: `saveApiKey()`, `getApiKey()` in `app.js`

**No Database:**
- No server-side database
- No IndexedDB usage
- No sessionStorage usage

**No File Storage:**
- No cloud storage integration
- No file upload/download functionality

## Authentication & Identity

**API Key Authentication:**
- No user authentication system
- API keys stored encrypted in localStorage
- Device fingerprinting for key binding
- No OAuth, JWT, or session management

**Key Management:**
- Keys encrypted with AES-GCM before storage
- Encryption key derived from device fingerprint
- Keys never transmitted to any server except AI APIs

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Rollbar, etc.)
- Console.error for debugging only

**Analytics:**
- None
- No tracking of user actions

**Logs:**
- Browser console only
- No structured logging
- No remote log aggregation

## CI/CD & Deployment

**Hosting:**
- Static file hosting (no server required)
- Can deploy to any static host (Vercel, Netlify, GitHub Pages)
- Current: Unknown hosting provider

**Build Pipeline:**
- Local build only (`npm run build`)
- No CI/CD configured
- Manual deployment process

## Environment Configuration

**Development:**
- Required env vars: `VITE_GEMINI_API_KEY`
- Optional: `VITE_ANTHROPIC_API_KEY`, `VITE_OPENAI_API_KEY`
- Secrets location: `.env` file (gitignored)
- Template: `.env.example`

**Production:**
- Same environment variables required
- Build-time injection via Vite
- Client-side only (env vars bundled at build)

## Webhooks & Callbacks

**Incoming:**
- None
- No webhook endpoints

**Outgoing:**
- None
- No callbacks to external services

## Rate Limits & Error Handling

**API Rate Limits:**
- Gemini: Subject to Google AI Studio limits
- Claude: Subject to Anthropic rate limits
- OpenAI: Subject to OpenAI rate limits
- No client-side rate limiting implemented

**Error Handling:**
- Automatic fallback to secondary model on failure
- User-facing error messages for API failures
- No retry logic with exponential backoff

## Security Considerations

**API Key Storage:**
- Encrypted with AES-GCM before localStorage
- Device fingerprint binding
- No plaintext storage
- Keys isolated per device/browser

**CORS & Proxies:**
- Vite dev server proxies API requests
- Avoids CORS issues in development
- Production requires same proxy setup or CORS-enabled endpoints

**No Server-Side Code:**
- All API calls made from client
- API keys visible in client code (encrypted at rest)
- Risk: Keys could be extracted by determined attacker

---

*Integration audit: 2025-02-13*
*Update when adding/removing external services*
