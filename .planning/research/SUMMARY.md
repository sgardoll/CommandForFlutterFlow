# Project Research Summary

**Project:** Connect I/O Custom Code
**Domain:** FlutterFlow multi-artifact custom code generation
**Researched:** 2026-06-05
**Confidence:** HIGH

## Executive Summary

The app currently solves one problem well: it turns a user prompt into one FlutterFlow-ready artifact through Prompt Architect, Code Generator, Code Review, and optional deploy-to-FlutterFlow. The v1.2 milestone should not become a generator for any single package or example. It should pluralize the existing pipeline so one request can produce a coordinated bundle of custom widgets, custom actions, custom functions, and code files.

The main architecture change is a canonical `artifactBundle` model. Every result, including a single widget, should become a bundle with stable artifact ids, artifact type metadata, code, dependencies, relationships, review status, and deployment status. This lets the UI review/refine/regenerate/deploy one artifact or the whole bundle without losing cross-artifact context.

The biggest risk is leaving single-artifact assumptions in place while adding a multi-artifact UI. Current code paths parse `artifactType` and `artifactName` from one architect result, store one generated code string in `pipelineState.step2Result`, validate one file, and push one file plus pubspec. Those are the seams the roadmap must address first.

## Key Findings

### Recommended Stack

Keep the existing Vite/vanilla JS/BuildShip/FlutterFlow API stack. The milestone does not need a new framework; it needs a stronger contract between existing pipeline stages.

**Core technologies:**
- BuildShip pipeline endpoint: continue using `architect`, `generator`, and `review`, but require structured bundle JSON.
- JSZip/FlutterFlow sync: extend current zip/file map deployment from one Dart file to many.
- FlutterFlow custom code rules: keep per-surface validation strict for widgets/actions/functions/code files.

### Expected Features

**Must have:**
- Artifact bundle schema
- Plural architect/generator/review outputs
- Artifact list/detail UI
- Bundle and per-artifact review
- Multi-file deploy
- Legacy single-artifact compatibility

**Should have:**
- Per-artifact regeneration with bundle context
- Selected-artifact deploy with dependency warnings
- Example fixture suite for package-backed multi-artifact requests

**Defer:**
- Template marketplace
- Visual dependency graph editor
- FlutterFlow library distribution automation

### Architecture Approach

Introduce a single internal model:

1. `ArtifactBundleSpec` from Prompt Architect
2. `ArtifactBundle` from Code Generator
3. `BundleReview` from Code Review
4. `DeployPlan` from selected artifacts

The UI should render the bundle summary and a stable list of artifact cards/tabs. The deploy path should build a file map from all selected artifacts, not from one `codeInfo`.

### Critical Pitfalls

1. **Example becomes scope** — keep `agent_kit` as a validation fixture only.
2. **Single-artifact state survives** — replace `step2Result` as the canonical output with `artifactBundle`.
3. **Partial regeneration breaks relationships** — regenerate with full bundle context.
4. **Multi-file deploy omits files** — test zip/file map generation for multiple artifacts.
5. **FlutterFlow surface rules blur** — validate every artifact by type.

## Implications for Roadmap

### Phase 12: Bundle Contract and Legacy Adapter
**Rationale:** Everything depends on a canonical plural model.
**Delivers:** Bundle schema, parser/normalizer, legacy single-artifact adapter, tests/fixtures.
**Avoids:** UI pluralization with single-result internals.

### Phase 13: Plural Pipeline Prompts and Review
**Rationale:** BuildShip stages need structured output contracts before UI/deploy can trust them.
**Delivers:** Architect/generator/reviewer prompt updates and parsing for bundle outputs.
**Uses:** Existing BuildShip endpoint flow.

### Phase 14: Multi-Artifact Results UI
**Rationale:** Users need to inspect, copy, refine, and regenerate artifacts separately.
**Delivers:** Artifact list/cards/tabs, selected artifact code/review panels, bundle summary, dependency warnings.

### Phase 15: Multi-File FlutterFlow Deploy
**Rationale:** Product value is not complete until plural output can deploy.
**Delivers:** Multi-artifact file map, zip, pubspec dependency merge, pre-commit summary, success/error mapping.

### Phase 16: Refinement, Regeneration, and Fixture Validation
**Rationale:** The app promises review/refine/regenerate; plural output must preserve that value.
**Delivers:** Per-artifact and bundle regeneration flows, pasted error repair mapping, fixture validation including a package-backed multi-artifact example.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Local app already has the needed primitives |
| Features | HIGH | Derived from existing product flow and user correction |
| Architecture | HIGH | Current single-artifact seams are clear |
| Pitfalls | HIGH | FlutterFlow constraints and current code assumptions are explicit |

**Overall confidence:** HIGH

## Gaps to Address

- BuildShip response contract: verify whether endpoint can be changed to strict JSON per stage or whether client must tolerate Markdown.
- FlutterFlow API multi-file behavior: current code already zips multiple map entries in principle, but the actual app path only adds one artifact. Needs implementation verification.
- Code File placement: current `CodeFile` maps to action path in `prepareCodeForCommit()`; milestone must correct this if FlutterFlow API supports code files distinctly.

## Sources

### Primary
- Local `app.js` and `index.html` pipeline/deploy implementation
- FlutterFlow docs: Writing Custom Code, Custom Widgets, Custom Actions, Code File, VS Code Extension
- FlutterFlow AI API surface docs: custom code helper semantics

### Secondary
- pub.dev `agent_kit`: used only as one example of a multi-widget request shape

---
*Research completed: 2026-06-05*
*Ready for requirements: yes*
