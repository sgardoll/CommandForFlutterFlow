# Connect I/O Custom Code — Advanced UI & BuildShip Integration

## What This Is

customcode.connectio.com.au is an AI-powered code generation platform for FlutterFlow developers, featuring a 3-step pipeline (Prompt Architect → Code Generator → Code Dissector). This milestone migrates AI inference to BuildShip serverless endpoints, adds tier-based feature restrictions and paywall, resolves user identity, and improves UI responsiveness.

## Core Value

Users get a polished, responsive UI with BuildShip-powered AI inference, identity resolution, and tier-based access control — setting the foundation for future monetization enforcement.

## Requirements

### Validated (Previous Milestones)

- ✓ 3-step pipeline (Prompt Architect → Code Generator → Code Dissector) — v0
- ✓ Multiple AI model support (Gemini, Claude, OpenAI, OpenRouter) — v0
- ✓ API key management with AES-GCM client-side encryption — v0
- ✓ Walkthrough system for first-time users — v0
- ✓ Code display with syntax highlighting + copy-to-clipboard — v0
- ✓ FlutterFlow API Key + Project ID credentials management — v0
- ✓ One-click commit to FlutterFlow via API — v0
- ✓ Commit success/error feedback with mitigation options — v0
- ✓ Stripe subscription products (Free, Pro $8.99 USD/mo, Power BYOK) — v1
- ✓ Stripe Checkout flow with Australian GST — v1
- ✓ Auth layer (user identity tied to subscription) — v1
- ✓ Subscription state persisted and verified on app load — v1
- ✓ Per-user request counter tracked via BuildShip — v1
- ✓ Graceful model degradation when limit exhausted — v1
- ✓ In-app notification when approaching/at limit — v1
- ✓ Tier-based feature gating (Free/Pro/Power) — v1
- ✓ BYOK locked to Power Developer tier — v1
- ✓ 10% GST auto-applied to Australian billing addresses — v1
- ✓ GST-inclusive consumer pricing display — v1
- ✓ ABN capture for B2B transactions — v1
- ✓ YouTube Checklist Review pass — v1

### Active

**Advanced UI & Responsiveness (Phase 6)**
- [ ] API Keys and Model selection moved to Advanced dropdown (collapsed by default)
- [ ] Responsive layout — works correctly on mobile and tablet breakpoints
- [ ] UI polish pass based on YouTube checklist feedback

**BuildShip Identity Resolution (Phase 7)**
- [ ] Integrate BuildShip authUserCheck endpoint (https://4tgke4.buildship.run/authUserCheck)
- [ ] Resolve user identity (email, tier, usage) on app load
- [ ] Store resolved identity in app state, drive UI gating from it

**BuildShip LLM Pipeline Migration (Phase 8)**
- [ ] Migrate all AI inference calls to BuildShip runpipeline endpoint (https://4tgke4.buildship.run/service/runpipeline)
- [ ] Remove direct Gemini/Claude/OpenAI/OpenRouter calls from app.js
- [ ] API proxy (/api/) remains for local dev fallback only

**Tier Restrictions & Paywall (Phase 9)**
- [ ] Free tier: 2 generations/month, Gemini 3.1 Pro only, no model selection
- [ ] Pro tier ($8.99 USD/mo): 50 generations/month, model selection, regeneration
- [ ] Power tier: BYOK, unlimited, all features
- [ ] Enforce feature gating in UI based on resolved identity from Phase 7
- [ ] Paywall prompt with upgrade CTA when limit reached or locked feature accessed

### Out of Scope

- Agency / team tiers (pooled usage, shared libraries) — defer to v2
- Enterprise tier (SSO, audit logs, HYOK, custom contracts) — defer to v2
- Usage dashboard / analytics UI — enforce limits without visual reporting
- Extended context window feature (128k+) — referenced in tiers but deferred
- Automated refunds / proration UI — use Stripe Customer Portal for self-serve
- Australian GST compliance details — completed in v1

## Context

**Current architecture:**
- Vanilla JS + Vite, no backend server — all AI calls proxied via PHP at /api/
- AI inference flows: app.js -> /api/gemini-proxy.php (and anthropic/openai variants)
- Client-side AES-GCM encryption for API keys in localStorage
- Deployed to ftp.connectio.com.au (static files + PHP)

**Target architecture (v1.1):**
- AI inference: app.js -> BuildShip runpipeline endpoint (serverless, centralized)
- Identity: app.js -> BuildShip authUserCheck endpoint on load
- PHP proxies remain for local dev only
- BuildShip endpoints: https://4tgke4.buildship.run/authUserCheck and https://4tgke4.buildship.run/service/runpipeline

**Pricing tiers (v1.1):**
- Free: 2 generations/month, Gemini 3.1 Pro only, no model selection, no BYOK, no regeneration (visible in Advanced dropdown labelled PRO)
- Pro: $8.99 USD/mo, 50 generations/month, model selection, regeneration and FlutterFlow debugging prompts
- Power: BYOK, unlimited generations, all features

## Constraints

- **Architecture**: Migrating to BuildShip for all production AI inference — PHP proxies for local dev fallback only
- **Deployment**: Must deploy to existing FTP host (connectio.com.au) — static files + PHP
- **Pricing display**: Consumer-facing prices must be GST-inclusive per Australian consumer law
- **Identity**: BuildShip authUserCheck is the single source of truth for user tier and usage

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stripe for billing | Industry standard, handles subscriptions + metered billing + tax | Shipped v1 |
| Three individual tiers only | Prove model works before agency/enterprise complexity | Shipped v1 |
| BYOK locked to Power Developer tier | Prevents free riders using personal keys to bypass metering | Shipped v1 |
| GST-inclusive consumer pricing | Australian consumer law requirement | Shipped v1 |
| BuildShip for backend | Visual workflow builder for serverless endpoints | Active |
| Migrate LLM inference to BuildShip | Centralize model execution, enable server-side tier enforcement | Active |
| API Keys + Model to Advanced dropdown | Declutter primary UI, keep power-user options accessible | Active |

---
*Last updated: 2026-02-25 after v1 milestone completion and v1.1 initialization*
