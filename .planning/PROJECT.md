# Connect I/O Custom Code — Multi-Code Generation

## What This Is

customcode.connectio.com.au is an AI-powered code generation platform for FlutterFlow developers, featuring a pipeline that turns user requests into FlutterFlow-ready custom code. This milestone extends the product from single-artifact generation into coordinated multi-artifact generation, review, refinement, regeneration, and deployment for custom widgets, actions, functions, and classes.

## Core Value

Users can describe a capability once and receive the complete set of FlutterFlow-ready custom code artifacts needed to implement it, with each artifact reviewable, refinable, regenerable, and deployable independently or as a bundle.

## Current Milestone: v1.2 Multi-Code Generation

**Goal:** Extend Connect I/O Custom Code from single-artifact generation into a multi-artifact FlutterFlow code generation workflow that can output, review, refine, regenerate, and deploy one or more custom widgets, custom actions, custom functions, or custom classes from one request.

**Target features:**
- Accept requests that naturally require one or more FlutterFlow custom code artifacts, including package-backed capabilities, UI components, action flows, helper models, and reusable utilities.
- Generate a structured multi-artifact bundle where each artifact has type, name, dependencies, FlutterFlow import instructions, call sites, and deployment metadata.
- Support review, refinement, regeneration, and deployment of each artifact individually or as a coordinated bundle.
- Make generated artifacts usable in FlutterFlow individually, including child widgets and widget builder parameters where applicable.
- Treat package examples such as `agent_kit` as validation scenarios only, not as hardcoded product scope.

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

**Multi-Code Generation (Milestone v1.2)**
- [ ] User can request one or more FlutterFlow custom code artifacts in a single prompt
- [ ] Generated output preserves each artifact as an individually reviewable, refinable, regenerable, and deployable unit
- [ ] Generated bundles support custom widgets, custom actions, custom functions, and custom classes
- [ ] Artifact metadata includes type, name, dependencies, FlutterFlow placement/import guidance, callable interfaces, and deployment status
- [ ] Example-driven validation proves the bundle can handle package-backed multi-widget/multi-class requests without hardcoding those examples into the workflow

**Advanced UI & Responsiveness (Phase 6)**
- [ ] API Keys and Model selection moved to Advanced dropdown (collapsed by default)
- [ ] Responsive layout — works correctly on mobile and tablet breakpoints
- [ ] UI polish pass based on YouTube checklist feedback

**BuildShip Identity Resolution (Phase 7)** ✅
- [x] Integrate BuildShip authUserCheck endpoint (https://4tgke4.buildship.run/authUserCheck)
- [x] Resolve user identity (email, tier, usage) on app load
- [x] Store resolved identity in app state, drive UI gating from it

**BuildShip LLM Pipeline Migration (Phase 8)** ✅
- [x] Migrate all AI inference calls to BuildShip runpipeline endpoint (https://4tgke4.buildship.run/service/runpipeline)
- [x] Remove direct Gemini/Claude/OpenAI/OpenRouter calls from app.js
- [x] API proxy (/api/) remains for local dev fallback only

**Tier Restrictions & Paywall (Phase 9)** ✅
- [x] Free tier: 2 generations/month, Gemini 3.1 Pro only, no model selection
- [x] Pro tier ($8.99 USD/mo): 50 generations/month, model selection, regeneration
- [x] Power tier: BYOK, unlimited, all features
- [x] Enforce feature gating in UI based on resolved identity from Phase 7
- [x] Paywall prompt with upgrade CTA when limit reached or locked feature accessed

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

**Target architecture (v1.2):**
- Generation output becomes a typed artifact bundle instead of a single code block
- Each artifact carries enough metadata for UI rendering, review/refinement prompts, regeneration, and FlutterFlow deployment
- Bundle-level coordination preserves dependencies and call relationships between generated widgets/actions/functions/classes

**Pricing tiers (v1.1):**
- Free: 2 generations/month, Gemini 3.1 Pro only, no model selection, no BYOK, no regeneration (visible in Advanced dropdown labelled PRO)
- Pro: $8.99 USD/mo, 50 generations/month, model selection, regeneration and FlutterFlow debugging prompts
- Power: BYOK, unlimited generations, all features

## Constraints

- **Architecture**: Migrating to BuildShip for all production AI inference — PHP proxies for local dev fallback only
- **Deployment**: Must deploy to existing FTP host (connectio.com.au) — static files + PHP
- **Pricing display**: Consumer-facing prices must be GST-inclusive per Australian consumer law
- **Identity**: BuildShip authUserCheck is the single source of truth for user tier and usage
- **FlutterFlow compatibility**: Generated code must be valid for FlutterFlow custom code surfaces and deployment paths, not generic Flutter-only code
- **Artifact independence**: Multi-code bundles must preserve per-artifact review, regeneration, and deployment so one failed artifact does not invalidate the whole bundle

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
| Multi-artifact bundle output | FlutterFlow capabilities often require several coordinated widgets/actions/functions/classes, not one file | Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-05 after v1.2 milestone initialization*
