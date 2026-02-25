# Roadmap: Connect I/O Managed Paid Monetization

## Overview

Transform customcode.connectio.com.au from a free/BYOK platform into a subscription-based SaaS with Stripe-powered tiers, usage metering, graceful model degradation, Australian GST compliance, and a BuildShip backend for LLM pipeline execution and identity resolution.

## Domain Expertise

None

## Milestones

- ✅ **[v1 Monetization Foundation](milestones/v1-ROADMAP.md)** — Phases 1-5 (shipped 2026-02-25)
- 🚧 **v1.1 Advanced UI & BuildShip Integration** — Phases 6-9 (in progress)

## Phases

<details>
<summary>✅ v1 Monetization Foundation (Phases 1-5) — SHIPPED 2026-02-25</summary>

- [x] Phase 1: Stripe Foundation — Stripe Checkout, magic link auth, subscription state
- [x] Phase 2: Usage Metering & Degradation — Request tracking, limits, auto-routing
- [x] Phase 3: Tier-Based Feature Gating — Lock/unlock features by subscription
- [x] Phase 4: Australian GST Compliance — Tax logic, ABN capture, invoices
- [x] Phase 5: YouTube Checklist Review — Top 10 checklist review

</details>

### 🚧 v1.1 Advanced UI & BuildShip Integration (In Progress)

**Milestone Goal:** Move AI calls to BuildShip, implement identity tracking, revamp the UI for advanced options, mobile responsiveness, and paywalls.

#### Phase 6: Advanced UI & Responsiveness
**Goal**: Move API keys and Model selection into an "Advanced" collapsed dropdown under the prompt input, make API Keys modal responsive (scrollable with sticky Save button), and ensure mobile homepage hides right panel.
**Depends on**: Previous milestone complete
**Research**: Unlikely (internal UI/CSS patterns)
**Plans**: 4 plans

Plans:
- [ ] PLAN-A: Advanced Dropdown — merge API Keys + Model Selector into collapsible `<details>` below prompt
- [ ] PLAN-B: Modal Sticky Save — make API Keys modal Save button sticky at bottom
- [ ] PLAN-C: Mobile Responsiveness — hide right panel on mobile, full-width sidebar, dvh fix
- [ ] PLAN-D: Pricing Modal Update — update tiers to v1.1 (Free=2gen, Pro=$8.99 USD, Power=BYOK)

#### Phase 7: BuildShip Identity Resolution
**Goal**: Implement browser signature, IP, and cookie tracking sent to `https://4tgke4.buildship.run/authUserCheck`. Confidence score ≥ 75 means same user. Rate-limit and validate the endpoint client-side.
**Depends on**: Phase 6
**Research**: Likely (browser fingerprinting, external API, rate limiting)
**Research topics**:
- Browser fingerprinting libraries (FingerprintJS or custom)
- `identity-resolution-api-docs.md` endpoint schema
- Client-side rate limiting strategies (debounce, per-session flag)
- Cookie handling and IP extraction in BuildShip context
**Plans**: TBD

Plans:
- [ ] 07-01: TBD (run `/gsd-plan-phase 7` to break down)

#### Phase 8: BuildShip LLM Pipeline Migration
**Goal**: Move all LLM API calls (Gemini, Claude, OpenAI) to `https://4tgke4.buildship.run/service/runpipeline`. Define and document exact request/response body schema. Remove direct API calls from app.js.
**Depends on**: Phase 7
**Research**: Likely (external API schema definition, migration pattern)
**Research topics**:
- BuildShip `runpipeline` payload structure
- Error handling and timeout patterns for proxied calls
- Migrating `callGemini()` / `callClaude()` / `callOpenAI()` to unified endpoint
**Plans**: TBD

Plans:
- [ ] 08-01: TBD (run `/gsd-plan-phase 8` to break down)

#### Phase 9: Tier Restrictions & Paywall UI
**Goal**: Enforce Free (2 generations), Pro (50), Power (unlimited) limits based on identity. Display PRO badges in Advanced dropdown for locked features. Create paywall explanation screen for exhausted free users.
**Depends on**: Phase 8
**Research**: Unlikely (internal UI state and conditional rendering)
**Plans**: TBD

Plans:
- [ ] 09-01: TBD (run `/gsd-plan-phase 9` to break down)

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Stripe Foundation | v1 | 3/3 | Complete | 2026-02-25 |
| 2. Usage Metering & Degradation | v1 | 0/TBD | Complete | 2026-02-25 |
| 3. Tier-Based Feature Gating | v1 | 0/TBD | Complete | 2026-02-25 |
| 4. Australian GST Compliance | v1 | 0/TBD | Complete | 2026-02-25 |
| 5. YouTube Checklist Review | v1 | 0/TBD | Complete | 2026-02-25 |
| 6. Advanced UI & Responsiveness | v1.1 | 4/4 | Complete | 2026-02-25 |
| 7. BuildShip Identity Resolution | v1.1 | 1/1 | Complete | 2026-02-25 |
| 8. BuildShip LLM Pipeline Migration | v1.1 | 1/1 | Complete | 2026-02-25 |
| 9. Tier Restrictions & Paywall UI | v1.1 | 1/1 | Complete | 2026-02-25 |