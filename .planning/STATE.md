# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Users can subscribe, pay, and immediately get metered access to frontier AI models — with limits enforced, graceful fallback when exhausted, and correct Australian tax applied at checkout.

**Current focus:** Phase 8 — BuildShip LLM Pipeline Migration (Plan 08-02: BYOK Registration next)

## Current Position

Phase: 8 of 9 (BuildShip LLM Pipeline Migration)
Plan: 08-01 (Pipeline Migration) ✅ Complete, 08-02 (BYOK Registration) pending
Status: Plan 08-01 complete — all LLM calls route through BuildShip, AI keys removed from browser
Last activity: 2026-02-25 — Plan 08-01 executed + UAT fix

Progress: █████░░░░░ 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~120min
- Total execution time: ~2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 08 | 1/2 | ~120min | ~120min |

**Recent Trend:**
- Last 5 plans: 08-01 (~120min)
- Trend: —

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stripe for billing (industry standard, handles subscriptions + metered billing + tax)
- Three individual tiers only (v1) — prove model works before agency/enterprise
- BYOK locked to Power Developer tier — prevents free riders
- Architecture change allowed — Stripe webhooks require backend
- GST-inclusive consumer pricing — Australian consumer law
- **BuildShip for backend** — Visual workflow builder for serverless endpoints (2026-02-20)
- Move LLM API logic to BuildShip `runpipeline` to centralize model execution (2026-02-25)
- BuildShip returns raw OpenRouter response shape — client handles `data.output || data.content` (2026-02-25)
- All model IDs use OpenRouter format with provider prefix (2026-02-25)
- GPT-5.2-Codex upgraded to GPT-5.3-Codex, Gemini 3.0 Flash removed (2026-02-25)

### Deferred Issues

None yet.

### Roadmap Evolution

- Phase 5 added: YouTube Checklist Review (2026-02-21)
- Milestone v1.1 created: Advanced UI & BuildShip Integration, 4 phases (Phase 6-9) (2026-02-25)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-25 18:50
Stopped at: Plan 08-01 complete — callBuildShip() working, all 3 pipeline steps verified, UAT fix committed. Next: Plan 08-02 (BYOK Registration)
Resume file: .planning/phases/08-buildship-llm-pipeline-migration/08-01-SUMMARY.md
