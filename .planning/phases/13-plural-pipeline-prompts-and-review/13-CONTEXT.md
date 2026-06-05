---
phase: 13-plural-pipeline-prompts-and-review
status: context
created: 2026-06-05
---

# Phase 13 Context

## Goal

Update Prompt Architect, Code Generator, and Code Review contracts so BuildShip stages can produce and audit structured bundles of one or more FlutterFlow custom code artifacts.

## Accepted Decisions

1. Prompt Architect must request a structured bundle specification for one or more artifacts, not a single hardcoded package example.
2. Code Generator must return generated code per artifact, preserving artifact ids from the architect output where possible.
3. Code Review must return artifact-level findings and bundle-level integration findings.
4. BuildShip MCP integration is in scope for this phase. The project must install/wire the MCP server from `sgardoll/buildship` if it is not already installed, and verification must include a BuildShip MCP smoke test.

## BuildShip MCP Baseline

- Local repo: `/Users/home/Projects/buildship`
- Remote: `https://github.com/sgardoll/buildship.git`
- MCP server: `/Users/home/Projects/buildship/mcp-server/dist/index.js`
- Repo env: `BUILDSHIP_REPO=/Users/home/Projects/buildship`
- Dreamflow project config:
  - `.mcp.json`
  - `.codex/config.toml`
- Verification command: `npm run verify:buildship-mcp`

The MCP server is the repo-local BuildShip authoring backend for custom nodes and workflows. It is distinct from the existing hosted BuildShip runtime endpoint already used by `app.js` for `authUserCheck`, `service/runpipeline`, billing, and subscription calls.

## Product Boundary

The user corrected the earlier example-driven interpretation: package examples such as `agent_kit` are fixtures, not the product definition. The product is a FlutterFlow custom-code generation app that should output, review, refine, regenerate, and deploy one or more custom widgets, custom actions, custom functions, or custom classes.

## Implementation Notes

- Preserve current hosted BuildShip runtime calls in `app.js`.
- Use the MCP server for backend workflow/node integration and verification evidence.
- Keep Phase 13 focused on pipeline contracts, structured parsing, and compatibility validation.
- Full multi-artifact UI remains Phase 14.
- Full multi-file FlutterFlow deployment remains Phase 15.
