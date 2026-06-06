---
phase: 14-multi-artifact-results-ui
status: context
created: 2026-06-05
---

# Phase 14 Context

## Goal

Replace the single code/audit results surface with a bundle-aware UI while keeping the one-artifact path direct.

## Decisions

- Extend the existing split results view in place instead of creating a separate bundle page.
- Show the bundle summary only when there is more than one artifact.
- Track `pipelineState.selectedArtifactId` so selected artifact state can drive code, audit, copy, and deploy actions.
- Keep full multi-file deployment for Phase 15; Phase 14 only ensures selected single-artifact deploy remains coherent.

## Verification Fixture

Development-only route:

```text
http://127.0.0.1:3001/?debugBundle=multi
```

This seeds a two-artifact bundle without calling the hosted BuildShip runtime so browser verification can inspect the UI repeatedly.
