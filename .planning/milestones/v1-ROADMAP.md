# Milestone v1: Monetization Foundation

**Status:** ✅ SHIPPED 2026-02-25
**Phases:** 1-5
**Total Plans:** 3 (PLAN-A-auth, PLAN-B-stripe, PLAN-C-ui in Phase 1 — remaining phases TBD)

## Overview

Transform customcode.connectio.com.au from a free/BYOK platform into a subscription-based SaaS with Stripe-powered tiers, usage metering, graceful model degradation, and Australian GST compliance. Four phases: Stripe checkout foundation → usage tracking/limits → feature gating by tier → tax compliance.

## Phases

### Phase 1: Stripe Foundation

**Goal**: Users can subscribe to Free/Professional/Power Developer tiers via Stripe Checkout, with subscription state persisted and verified on app load.
**Depends on**: Nothing (first phase)
**Research**: Likely (external API, first Stripe integration in this codebase)
**Plans**: PLAN-A-auth, PLAN-B-stripe, PLAN-C-ui

Plans:
- [x] Plan A: Magic Link Auth Layer
- [x] Plan B: Stripe Checkout + Subscription Products
- [x] Plan C: Subscription UI (header, gating, upgrade prompts)

**Research topics covered**:
- Stripe Checkout vs Payment Links for subscription flow
- Webhook setup for serverless/BuildShip environment
- Storing Stripe Customer ID without database (Stripe metadata vs localStorage)
- Australian entity registration requirements for Stripe account

### Phase 2: Usage Metering & Degradation

**Goal**: Per-user request counters enforce tier limits (50/500/2000 premium requests/month), with silent auto-routing from frontier models → fallback model when exhausted.
**Depends on**: Phase 1 (requires subscription state to know user tier)
**Research**: Likely (architectural decision on where to track usage)
**Plans**: TBD

Plans:
- [x] TBD during execution

### Phase 3: Tier-Based Feature Gating

**Goal**: Free tier locked to fallback model only. Professional tier unlocks Model Selector + Code Dissector. Power Developer tier unlocks extended context + multi-file Code Dissector + BYOK.
**Depends on**: Phase 1, Phase 2
**Research**: Unlikely (internal UI logic)
**Plans**: TBD

Plans:
- [x] TBD during execution

### Phase 4: Australian GST Compliance

**Goal**: 10% GST auto-applied to Australian billing addresses at Stripe checkout. Consumer pricing displayed GST-inclusive. ABN capture for B2B transactions.
**Depends on**: Phase 1
**Research**: Likely (tax compliance)
**Plans**: TBD

Plans:
- [x] TBD during execution

### Phase 5: YouTube Checklist Review

**Goal**: Review and implement items from the top 10 checklist video (voice notes stored on tablet).
**Depends on**: Phase 4
**Research**: Unlikely
**Plans**: TBD

Plans:
- [x] TBD during execution

---

## Milestone Summary

**Key Decisions:**

- Stripe for billing (industry standard, handles subscriptions + metered billing + tax)
- Three individual tiers only (v1) — prove model works before agency/enterprise
- BYOK locked to Power Developer tier — prevents free riders
- BuildShip for backend — visual workflow builder for serverless endpoints
- Architecture change: Stripe webhooks require backend (BuildShip)
- GST-inclusive consumer pricing — Australian consumer law

**Issues Resolved:**

- None tracked (milestone archived without SUMMARY.md files)

**Issues Deferred:**

- Agency/team tiers (pooled usage) → v2
- Enterprise tier (SSO, audit logs) → v2
- Usage dashboard/analytics UI → v2
- Extended context window (128k+) → deferred unless trivial
- Automated refunds/proration UI → use Stripe Customer Portal

**Technical Debt Incurred:**

- None tracked (milestone shipped without granular execution tracking)

---

_For current project status, see .planning/ROADMAP.md_
