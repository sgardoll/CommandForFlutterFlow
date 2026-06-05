# Phase 12: Bundle Contract and Legacy Adapter - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce the canonical `artifactBundle` model and normalize both new plural outputs and existing single-artifact outputs through it. This phase establishes the internal contract, adapters, deterministic identifiers, metadata helpers, relationship helpers, and fixture coverage needed for later phases. It must preserve the current single-artifact user experience while creating the foundation for multi-artifact generation.

</domain>

<decisions>
## Implementation Decisions

### Bundle Contract Shape
- `artifactBundle` is the canonical unit of pipeline state; single-artifact output is represented as a bundle with one artifact.
- The schema should be strict enough for client parsing and tests, but tolerant of missing optional fields by applying explicit defaults.
- Artifact ids should prefer model-provided ids, with deterministic fallback ids derived from artifact type and artifact name.
- Dependency and relationship metadata should live at both levels: artifacts own direct dependencies/imports, and the bundle owns cross-artifact relationships and deploy order.

### Legacy Compatibility
- Current architect/code/review strings should be normalized into a one-artifact bundle immediately after each stage.
- Phase 12 should keep visible UI behavior stable; richer multi-artifact UI belongs to Phase 14.
- Structured parsing failures should fall back to current single-artifact behavior and record a bundle warning so users still get usable code.
- Keep `pipelineState.step1Result`, `pipelineState.step2Result`, and `pipelineState.step3Result` as derived compatibility fields until later phases reduce or remove those assumptions.

### Fixtures and Examples
- Phase 12 should include one single-widget fixture and one mixed-artifact bundle fixture.
- Package-backed examples such as `agent_kit` belong in Phase 16 validation, after bundle generation, UI, and deploy paths exist.
- Fixtures should assert stable ids, artifact metadata, dependency metadata, relationships, and legacy fallback behavior.
- Fixtures should live near the code they exercise, not only in `.planning`, so they can run with project checks.

### Phase 12 Implementation Boundary
- Do not update BuildShip prompts in this phase; Phase 13 owns architect/generator/reviewer prompt contracts.
- Update deploy code only enough to keep single-artifact deploy working through the bundle adapter; Phase 15 owns full multi-file deploy.
- Keep implementation in current JavaScript unless a small helper module clearly reduces risk; the root app is currently vanilla JS and `app.js`-centric.
- Phase 12 is done when tests/fixtures prove canonical bundle state, legacy fallback, deterministic ids, metadata/relationship helpers, and unchanged single-artifact behavior.

### the agent's Discretion
- The agent may choose exact helper names, fixture filenames, and test harness shape, provided the changes stay local, preserve current UI/deploy behavior, and do not hardcode any package example as product scope.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pipelineState` currently stores `step1Result`, `step2Result`, and `step3Result` as single-result values.
- `runThinkingPipeline()` orchestrates Prompt Architect, Code Generator, Code Review, then renders a single code panel and one audit report.
- `prepareCodeForCommit()`, `detectCodeType()`, `getFilePathForCodeType()`, `buildApiFileMap()`, and `executeCommit()` already contain the main FlutterFlow artifact/deploy mechanics.
- `extractCodeFromMarkdown()`, `highlightCode()`, and existing result rendering can remain compatibility behavior for one-artifact bundles.

### Established Patterns
- The root product is vanilla JavaScript with Vite, centered on `app.js` and `index.html`.
- FlutterFlow constraints are encoded as prompt template strings in `app.js`.
- Current deploy path uses JSZip, `serialized_yaml`, `file_map`, and FlutterFlow sync API payloads.
- Existing code favors local helpers in `app.js` over separate modules.

### Integration Points
- Bundle normalization should occur at pipeline boundaries after architect/generator/reviewer responses.
- Compatibility fields should remain available for existing UI and deploy functions while bundle-aware helpers are introduced.
- Deployment compatibility should route the currently selected or first artifact through the existing single-artifact deploy path until Phase 15 implements multi-file deploy.

</code_context>

<specifics>
## Specific Ideas

- `agent_kit` is only an example fixture candidate for later validation, not a product-specific target.
- Current single-artifact prompts must remain as simple to run, review, copy, and deploy as they are today.
- The first useful test surface is pure client-side fixture normalization, not live AI or FlutterFlow API calls.

</specifics>

<deferred>
## Deferred Ideas

- BuildShip prompt contract changes are deferred to Phase 13.
- Multi-artifact results UI is deferred to Phase 14.
- Full multi-file FlutterFlow deploy is deferred to Phase 15.
- Package-backed fixture validation is deferred to Phase 16.

</deferred>
