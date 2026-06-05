# Roadmap: Connect I/O Custom Code

## Overview

customcode.connectio.com.au is a FlutterFlow-ready custom code generation product. It currently turns a prompt into one artifact through Prompt Architect, Code Generator, Code Review, and optional deploy-to-FlutterFlow. Milestone v1.2 extends that pipeline so one request can produce, review, refine, regenerate, and deploy a coordinated bundle of FlutterFlow custom widgets, custom actions, custom functions, and code files.

## Domain Expertise

FlutterFlow custom code generation, multi-artifact pipeline design, BuildShip-backed AI orchestration, and FlutterFlow custom code deployment payloads.

## Milestones

- ✅ **[v1 Monetization Foundation](milestones/v1-ROADMAP.md)** — Phases 1-5 (shipped 2026-02-25)
- ✅ **v1.1 Advanced UI & BuildShip Integration** — Phases 6-9 (shipped 2026-02-25; E2E manual testing still noted in STATE)
- 🚧 **v1.2 Multi-Code Generation** — Phases 12-16 (planning)

## Phases

<details>
<summary>✅ v1 Monetization Foundation (Phases 1-5) — SHIPPED 2026-02-25</summary>

- [x] Phase 1: Stripe Foundation — Stripe Checkout, magic link auth, subscription state
- [x] Phase 2: Usage Metering & Degradation — Request tracking, limits, auto-routing
- [x] Phase 3: Tier-Based Feature Gating — Lock/unlock features by subscription
- [x] Phase 4: Australian GST Compliance — Tax logic, ABN capture, invoices
- [x] Phase 5: YouTube Checklist Review — Top 10 checklist review

</details>

<details>
<summary>✅ v1.1 Advanced UI & BuildShip Integration (Phases 6-9) — SHIPPED 2026-02-25</summary>

- [x] Phase 6: Advanced UI & Responsiveness — Advanced dropdown, responsive API key modal, mobile layout, pricing modal update
- [x] Phase 7: BuildShip Identity Resolution — Auth user check, identity/tier/usage resolution, UI gating state
- [x] Phase 8: BuildShip LLM Pipeline Migration — BuildShip `runpipeline`, direct provider call removal, local fallback preserved
- [x] Phase 9: Tier Restrictions & Paywall UI — Free/Pro/Power limits, model gating, paywall overlay

</details>

### 🚧 v1.2 Multi-Code Generation (Planning)

**Milestone Goal:** Extend the existing single-artifact FlutterFlow generation pipeline into a multi-artifact workflow that can output, review, refine, regenerate, and deploy one or more custom widgets, custom actions, custom functions, or code files from one request.

#### ✅ Phase 12: Bundle Contract and Legacy Adapter
**Goal:** Introduce the canonical `artifactBundle` model and normalize both new plural outputs and existing single-artifact outputs through it.
**Depends on:** v1.1 shipped pipeline
**Research:** Complete (`.planning/research/SUMMARY.md`)
**Requirements:** BUND-01, BUND-02, BUND-03, BUND-04, PIPE-04, FIXT-01
**Success criteria:**
1. Single-artifact generation is represented as a one-artifact bundle.
2. Multi-artifact fixtures can be parsed into stable artifact ids, metadata, dependencies, and relationships.
3. Existing single-artifact prompts still render and deploy through compatibility adapters.
4. Unit fixtures cover one-widget and mixed-artifact bundle parsing without live API calls.

Plans:
- [x] 12-01: Define `artifactBundle` schema, parser, and validation fixtures
- [x] 12-02: Adapt legacy `step1Result` / `step2Result` single-output state into bundle state
- [x] 12-03: Add artifact relationship and dependency metadata helpers

#### ✅ Phase 13: Plural Pipeline Prompts and Review
**Goal:** Update Prompt Architect, Code Generator, and Code Review contracts so BuildShip stages can produce and audit structured bundles.
**Depends on:** Phase 12
**Research:** Complete; phase planning should verify BuildShip response contract details
**Requirements:** PIPE-01, PIPE-02, PIPE-03, PIPE-05, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05
**Success criteria:**
1. Architect prompt requests structured bundle specs for one or more artifacts.
2. Generator prompt returns code per artifact rather than one undifferentiated Dart block.
3. Reviewer prompt returns per-artifact findings and bundle-level integration findings.
4. Package-backed requests are handled through generic dependency/artifact metadata, not hardcoded package paths.
5. BuildShip MCP from `sgardoll/buildship` is installed/wired and included in verification.

Plans:
- [x] 13-01: Update architect/generator/reviewer prompt contracts for bundles
- [x] 13-02: Parse structured bundle responses with Markdown fallback
- [x] 13-03: Add per-artifact FlutterFlow compatibility validation by artifact type

#### Phase 14: Multi-Artifact Results UI
**Goal:** Replace the single code/audit results surface with a bundle-aware UI that keeps single-artifact use simple.
**Depends on:** Phase 12, Phase 13
**Research:** Complete
**Requirements:** REVI-01, REVI-02, REVI-03, UI-01, UI-02, UI-03, UI-04, UI-05
**Success criteria:**
1. Results view shows bundle summary, artifact count, deployable count, warnings, and overall review status.
2. Artifact list/cards are keyed by stable artifact id.
3. Selecting an artifact updates code preview, review panel, copy action, refine action, and deploy action.
4. Single-artifact output remains visually direct and does not feel like extra workflow.

Plans:
- [ ] 14-01: Build artifact list/card UI and selected artifact state
- [ ] 14-02: Render artifact-level code and review panels
- [ ] 14-03: Render bundle-level dependency and relationship warnings

#### Phase 15: Multi-File FlutterFlow Deploy
**Goal:** Extend deploy-to-FlutterFlow from one generated file plus pubspec to a selected bundle of generated artifacts plus merged dependency metadata.
**Depends on:** Phase 12, Phase 14
**Research:** Complete; phase planning should verify Code File placement support in the FlutterFlow API path
**Requirements:** DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05
**Success criteria:**
1. Deploy planner builds a file map and zip containing every selected artifact.
2. `pubspec.yaml` includes explicit dependency metadata and warns on inferred/missing versions.
3. Pre-deploy summary shows artifact list, dependencies, warnings, and relationship constraints.
4. FlutterFlow file-specific errors map back to affected artifacts when possible.
5. Payload construction is verified without calling the live FlutterFlow API.

Plans:
- [ ] 15-01: Build `prepareBundleForCommit()` and multi-artifact file map generation
- [ ] 15-02: Merge explicit dependencies and improve dependency warning UX
- [ ] 15-03: Update deploy confirmation, progress, success, and failure UI for bundles

#### Phase 16: Refinement, Regeneration, and Fixture Validation
**Goal:** Preserve the product's review/refine/regenerate loop for multi-artifact bundles and validate with realistic fixture prompts.
**Depends on:** Phase 13, Phase 14, Phase 15
**Research:** Complete
**Requirements:** REVI-04, REVI-05, FIXT-02, FIXT-03, FIXT-04, FIXT-05
**Success criteria:**
1. User can regenerate one artifact with full bundle context and unchanged sibling artifacts.
2. User can regenerate the full bundle from review feedback or pasted FlutterFlow build errors.
3. Fixtures cover mixed widget/action/function/class bundles.
4. A package-backed multi-artifact fixture, such as `agent_kit` or equivalent, proves generic behavior without hardcoding package-specific paths.
5. Multi-file deploy payload fixture verifies zip/file map construction without live FlutterFlow API side effects.

Plans:
- [ ] 16-01: Add per-artifact regeneration flow with bundle context
- [ ] 16-02: Add bundle-level regeneration from review and pasted build errors
- [ ] 16-03: Add fixture validation suite for single, mixed, package-backed, regeneration, and deploy payload cases

## Progress

**Execution Order:**
Phases execute in numeric order: 12 → 13 → 14 → 15 → 16

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
| 12. Bundle Contract and Legacy Adapter | v1.2 | 3/3 | Complete | 2026-06-05 |
| 13. Plural Pipeline Prompts and Review | v1.2 | 3 | Pending | — |
| 14. Multi-Artifact Results UI | v1.2 | 3 | Pending | — |
| 15. Multi-File FlutterFlow Deploy | v1.2 | 3 | Pending | — |
| 16. Refinement, Regeneration, and Fixture Validation | v1.2 | 3 | Pending | — |

## Traceability Summary

| Requirement Group | Covered By |
|-------------------|------------|
| Bundle Contract | Phase 12 |
| Pipeline Generation | Phase 13 |
| Artifact Review and Refinement | Phases 14, 16 |
| Results UI | Phase 14 |
| FlutterFlow Deployment | Phase 15 |
| FlutterFlow Compatibility | Phases 13, 15 |
| Validation Fixtures | Phases 12, 16 |
