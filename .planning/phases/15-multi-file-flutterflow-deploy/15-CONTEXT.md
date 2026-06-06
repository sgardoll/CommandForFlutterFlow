---
phase: 15-multi-file-flutterflow-deploy
status: context
created: 2026-06-05
---

# Phase 15 Context

## Goal

Extend deploy-to-FlutterFlow from one generated file plus pubspec to a selected bundle of generated artifacts plus merged dependency metadata.

## Decisions

- Reuse existing FlutterFlow API client, zip generation, `file_map`, pubspec serialization, and commit modal flows.
- Add a pure deploy planner for local tests; live FlutterFlow API calls remain manual/user-triggered only.
- Multi-file deploy uses all artifacts in `deployOrder` for now. Phase 16 can add more refined subset/regeneration controls.
- Custom classes and code files use the current fallback custom-code action path until Code File placement support is validated against live FlutterFlow behavior.

## Verification Boundary

Phase 15 verifies payload construction locally and does not call the live FlutterFlow API.
