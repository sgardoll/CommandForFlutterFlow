# Stack Research

**Domain:** FlutterFlow multi-artifact custom code generation
**Researched:** 2026-06-05
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vanilla JS + Vite | existing | Product UI and pipeline orchestration | Current root app is already a static Vite app centered on `app.js` and `index.html` |
| BuildShip pipeline endpoint | existing | Prompt Architect, Code Generator, Code Review execution | Current app already routes `architect`, `generator`, and `review` calls through BuildShip |
| FlutterFlow custom code API packaging | existing | Deploy generated code into FlutterFlow | Current deploy path already creates a zip, `file_map`, `serialized_yaml`, and calls FlutterFlow sync API |
| `artifactBundle` JSON contract | new internal model | Represent multiple generated artifacts and their relationships | The current pipeline has `step1Result`, `step2Result`, and `step3Result` as single-result values; multi-code needs a structured plural model |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSZip | existing global | Zip multiple custom code files and pubspec for FlutterFlow deploy | Extend current single-file deploy path to package all selected artifacts |
| Highlight.js | existing global | Render generated Dart code | Reuse for per-artifact code preview tabs/cards |
| FlutterFlow AI/API custom code helpers | current docs | Understand custom widgets/actions/functions/classes semantics | Use as reference for artifact type metadata and deploy shape |

## Installation

No new runtime dependency is required for the milestone MVP. The important stack change is a typed application contract, not a package install.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| One bundle with many artifacts | Many independent pipeline runs | Only for a manual workaround; loses cross-artifact dependencies and coordinated review |
| Structured JSON output from architect/generator/reviewer | Parse many code fences from Markdown | Only as a compatibility fallback; parsing Markdown becomes fragile quickly |
| Extend existing JSZip deploy | Separate FlutterFlow API calls per artifact | Only if FlutterFlow rejects multi-file pushes; otherwise one coherent zip is closer to current API shape |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Hardcoding `agent_kit` widgets | The package is only an example request, not the product scope | Generic bundle/artifact model with examples as test fixtures |
| Single `pipelineState.step2Result` string as source of truth | Cannot represent multiple artifacts, per-artifact review status, or partial deployment | `pipelineState.artifactBundle` with artifact ids and per-artifact state |
| Dependency regex as the only package source | Current `extractDependencies()` guesses versions and misses arbitrary packages | Architect/generator must emit explicit dependency metadata, then fallback to extraction |

## Version Compatibility

| Surface | Compatible With | Notes |
|---------|-----------------|-------|
| FlutterFlow Custom Widgets | width/height, callback actions, widget builder parameters | Widgets require width and height; widget builders are valid for dynamic child content |
| FlutterFlow Custom Actions | `Future<T>` return shape | Actions are async and can use pub.dev packages |
| FlutterFlow Custom Functions | sync, simple Dart | Functions cannot rely on custom imports; keep package-backed logic out |
| FlutterFlow Code Files | classes/enums/utilities | Avoid unsupported parser features such as generics and function-typed fields |

## Sources

- FlutterFlow docs: Writing Custom Code, Custom Widgets, Custom Actions, Code File, VS Code Extension
- FlutterFlow AI API surface docs: custom code helper semantics
- pub.dev `agent_kit` page: example fixture only

---
*Stack research for: multi-code generation*
*Researched: 2026-06-05*
