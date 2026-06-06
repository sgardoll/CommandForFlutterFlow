---
phase: 16-refinement-regeneration-and-fixture-validation
status: context
created: 2026-06-05
---

# Phase 16 Context

## Goal

Preserve the review/refine/regenerate loop for multi-artifact bundles and validate with realistic fixtures.

## Decisions

- Standard refine targets the selected artifact but requests the full bundle back so sibling artifacts remain available.
- Pasted FlutterFlow build errors regenerate the full bundle because file-specific errors can involve relationships and dependencies.
- Fixture validation remains local and does not call the hosted BuildShip runtime or live FlutterFlow API.
- Package-backed fixtures prove generic dependency behavior using `agent_kit` as an example, not a hardcoded product path.
