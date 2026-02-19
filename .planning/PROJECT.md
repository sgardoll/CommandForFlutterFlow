# Connect I/O Custom Code — Managed Paid Monetization

## What This Is

customcode.connectio.com.au is an AI-powered code generation platform for FlutterFlow developers, featuring a 3-step pipeline (Prompt Architect → Code Generator → Code Dissector). This milestone introduces a full monetization layer: Stripe-powered subscription tiers with usage metering, tier-based feature gating, graceful model degradation, and Australian GST compliance.

## Core Value

Users can subscribe, pay, and immediately get metered access to frontier AI models — with limits enforced, graceful fallback when exhausted, and correct Australian tax applied at checkout.

## Requirements

### Validated (Previous Milestone — Direct Commit to FlutterFlow)

- ✓ 3-step pipeline (Prompt Architect → Code Generator → Code Dissector)
- ✓ Multiple AI model support (Gemini, Claude, OpenAI, OpenRouter)
- ✓ API key management with AES-GCM client-side encryption
- ✓ Walkthrough system for first-time users
- ✓ Code display with syntax highlighting + copy-to-clipboard
- ✓ FlutterFlow API Key + Project ID credentials management
- ✓ One-click commit to FlutterFlow via API
- ✓ Commit success/error feedback with mitigation options

### Active

**Stripe + Auth**
- [ ] Stripe subscription products for Free, Professional ($25 AUD/mo), Power Developer ($75 AUD/mo)
- [ ] Stripe Checkout flow with Australian GST applied at checkout
- [ ] Auth layer (JWT or Stripe Customer Portal session) — user identity tied to subscription
- [ ] Subscription state persisted and verified on app load

**Usage Metering + Graceful Degradation**
- [ ] Per-user request counter tracked server-side (Stripe metered billing or lightweight backend)
- [ ] Free tier: 50 requests/month, locked to efficient fallback model only
- [ ] Professional tier: 500 premium requests/month + unlimited fallback after exhaustion
- [ ] Power Developer tier: 2000 premium requests/month + unlimited fallback after exhaustion
- [ ] Silent auto-routing from frontier model → fallback model when premium allocation exhausted
- [ ] In-app notification when approaching/at limit with one-click upgrade path

**Tier-Based Feature Gating**
- [ ] Free: No Model Selector, no Code Dissector project-wide analysis, no saved templates
- [ ] Professional: Full Model Selector, single-file Code Dissector, saved templates
- [ ] Power Developer: Full Model Selector, extended context (128k+), multi-file Code Dissector, beta model previews
- [ ] BYOK (user-supplied keys) available as Power Developer tier feature only

**Australian GST Compliance**
- [ ] 10% GST auto-applied to all Australian billing addresses at checkout
- [ ] Consumer pricing displayed GST-inclusive (e.g. $25 AUD incl. GST)
- [ ] ABN capture for B2B transactions (agency purchases) — tax invoice with GST line item
- [ ] International users: GST not applied

### Out of Scope

- Agency / team tiers (pooled usage, shared libraries) — defer to v2
- Enterprise tier (SSO, audit logs, HYOK, custom contracts) — defer to v2
- Usage dashboard / analytics UI — enforce limits without visual reporting in v1
- Extended context window feature (128k+) — referenced in tiers but implementation deferred unless trivial
- Automated refunds / proration UI — use Stripe Customer Portal for self-serve

## Context

**Current architecture:**
- Vanilla JS + Vite, no backend server — all AI calls proxied via PHP at `/api/`
- AI inference flows: `app.js` → `/api/gemini-proxy.php` (and anthropic/openai variants)
- Client-side AES-GCM encryption for API keys in localStorage
- Deployed to `ftp.connectio.com.au` (static files + PHP)

**Adding monetization requires:**
- A backend layer for subscription verification + usage metering (Stripe webhooks can't hit PHP safely at scale; recommend a lightweight serverless function or a small Node/Express endpoint on the same host)
- Stripe account with Australian entity registration for GST
- User identity (email + Stripe Customer ID) stored somewhere persistent — either Stripe metadata or a minimal DB

**Pricing model logic:**
- Premium requests = frontier model calls (Claude Opus, GPT Codex, Gemini Pro)
- Standard requests = fallback model calls (Gemini Flash) — treated as unlimited
- Allocation resets monthly with Stripe billing cycle
- The platform absorbs ~$20–22 AUD wholesale API cost per Professional user at full utilization; margin relies on average utilization being ~30–40%

## Constraints

- **Tax**: Australian GST compliance required at launch — ATO digital services rules, $75k AUD registration threshold already assumed exceeded
- **Architecture**: Open to adding a lightweight backend (Node/serverless) if Stripe webhooks require it — no hard constraint to stay client-only
- **Deployment**: Must deploy to existing FTP host (connectio.com.au) — PHP + static files today; serverless may need separate hosting
- **Pricing display**: Consumer-facing prices must be GST-inclusive per Australian consumer law

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stripe for billing | Industry standard, handles subscriptions + metered billing + tax | — Pending |
| Three individual tiers only (v1) | Prove model works before agency/enterprise complexity | — Pending |
| BYOK locked to Power Developer tier | Prevents free riders using personal keys to bypass metering | — Pending |
| Architecture change allowed | Stripe webhooks and server-side metering require a backend | — Pending |
| GST-inclusive consumer pricing | Australian consumer law requirement | — Pending |

---
*Last updated: 2026-02-20 after monetization milestone initialization*
