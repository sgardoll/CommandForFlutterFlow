# Roadmap: Connect I/O Managed Paid Monetization

## Overview

Transform customcode.connectio.com.au from a free/BYOK platform into a subscription-based SaaS with Stripe-powered tiers, usage metering, graceful model degradation, and Australian GST compliance. Four phases: Stripe checkout foundation → usage tracking/limits → feature gating by tier → tax compliance.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Stripe Foundation** - Products, checkout, subscription state
- [ ] **Phase 2: Usage Metering & Degradation** - Request tracking, limits, auto-routing
- [ ] **Phase 3: Tier-Based Feature Gating** - Lock/unlock features by subscription
- [ ] **Phase 4: Australian GST Compliance** - Tax logic, ABN capture, invoices
- [ ] **Phase 5: YouTube Checklist Review** - Go through top 10 checklist from that guy off YouTube (voice notes on tablet)

## Phase Details

### Phase 1: Stripe Foundation
**Goal**: Users can subscribe to Free/Professional/Power Developer tiers via Stripe Checkout, with subscription state persisted and verified on app load.

**Depends on**: Nothing (first phase)

**Research**: Likely (external API, first Stripe integration in this codebase)

**Research topics**:
- Stripe Checkout vs Payment Links for subscription flow
- Webhook setup for serverless/FTP environment (PHP proxy existing, may need Node endpoint)
- Storing Stripe Customer ID without database (Stripe metadata vs localStorage)
- Australian entity registration requirements for Stripe account

**Plans**: TBD (will be refined during phase planning)

Plans:
- TBD during `/gsd-plan-phase 1`

### Phase 2: Usage Metering & Degradation
**Goal**: Per-user request counters enforce tier limits (50/500/2000 premium requests/month), with silent auto-routing from frontier models → fallback model when exhausted. In-app notifications when approaching limits.

**Depends on**: Phase 1 (requires subscription state to know user tier)

**Research**: Likely (architectural decision on where to track usage)

**Research topics**:
- Stripe metered billing vs lightweight backend counter (serverless function or Node/Express on same host)
- Silent model routing logic in `callGemini()` — how to inject tier/usage state into API proxy flow
- Notification UI patterns (toast vs banner vs modal for limit warnings)
- Monthly reset mechanism tied to Stripe billing cycle

**Plans**: TBD

Plans:
- TBD during `/gsd-plan-phase 2`

### Phase 3: Tier-Based Feature Gating
**Goal**: Free tier locked to fallback model only (no Model Selector). Professional tier unlocks Model Selector + single-file Code Dissector. Power Developer tier unlocks extended context + multi-file Code Dissector + BYOK option.

**Depends on**: Phase 1 (requires subscription state), Phase 2 (usage limits must be enforced before gating premium features)

**Research**: Unlikely (internal UI logic, patterns exist in app.js for conditional feature display)

**Plans**: TBD

Plans:
- TBD during `/gsd-plan-phase 3`

### Phase 4: Australian GST Compliance
**Goal**: 10% GST auto-applied to Australian billing addresses at Stripe checkout. Consumer pricing displayed GST-inclusive. ABN capture for B2B transactions with proper tax invoice formatting.

**Depends on**: Phase 1 (Stripe checkout must exist to inject tax logic)

**Research**: Likely (tax compliance, unfamiliar regulatory logic)

**Research topics**:
- Stripe Tax automatic calculation vs manual 10% GST logic
- Australian consumer law requirements for GST-inclusive pricing display
- ABN validation API (Australian Business Register lookup)
- Tax invoice formatting requirements for B2B transactions (must show GST line item)
- International user handling (GST not applied)

**Plans**: TBD

Plans:
- TBD during `/gsd-plan-phase 4`

### Phase 5: YouTube Checklist Review
**Goal**: Review and implement items from the top 10 checklist video (voice notes stored on tablet).

**Depends on**: Phase 4 (complete monetization foundation first)

**Research**: Unlikely (internal review task)

**Plans**: TBD

Plans:
- TBD during `/gsd-plan-phase 5`

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Stripe Foundation | 0/TBD | Not started | - |
| 2. Usage Metering & Degradation | 0/TBD | Not started | - |
| 3. Tier-Based Feature Gating | 0/TBD | Not started | - |
| 4. Australian GST Compliance | 0/TBD | Not started | - |
| 5. YouTube Checklist Review | 0/TBD | Not started | - |
