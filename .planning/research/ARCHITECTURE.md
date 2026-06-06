# Architecture Research

**Domain:** FlutterFlow multi-artifact custom code generation
**Researched:** 2026-06-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
User prompt
  |
  v
Prompt Architect
  -> ArtifactBundleSpec
       - bundleId
       - artifacts[]
       - relationships[]
       - dependencies[]
  |
  v
Code Generator
  -> ArtifactBundle
       - artifacts[].code
       - artifacts[].metadata
  |
  v
Code Review
  -> BundleReview
       - artifactReviews[]
       - integrationReview
  |
  v
Results UI
  -> artifact cards/tabs
  -> bundle dependency warnings
  -> selected artifact actions
  |
  v
Deploy
  -> fileMap for N artifacts
  -> pubspec.yaml
  -> zipped_custom_code
  -> FlutterFlow sync API
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `ArtifactBundle` model | Canonical plural pipeline state | Plain JS object with stable artifact ids |
| Architect adapter | Normalize legacy single spec or plural bundle spec | `parseArchitectResult()` with schema validation |
| Generator adapter | Normalize many code artifacts | `parseGeneratorResult()`; fallback from code fence for legacy single artifact |
| Review adapter | Map review issues to artifact ids and bundle issues | `parseReviewResult()` plus legacy Markdown support |
| Results renderer | Show each artifact independently | Artifact list + selected code/review panels |
| Deploy planner | Convert selected artifacts into FlutterFlow file map | Extend `prepareCodeForCommit()` into `prepareArtifactForCommit()` and `prepareBundleForCommit()` |

## Recommended Project Structure

The current app is mostly `app.js`. For this milestone, introduce small internal modules only if the change would otherwise make `app.js` harder to reason about:

```
src/
├── types/
│   └── index.ts              # Existing types; add bundle shape if TypeScript path is used
app.js                        # Current product flow; add adapters close to pipeline/deploy functions
index.html                    # Results UI and deploy modal updates
```

## Architectural Patterns

### Pattern 1: Canonical Bundle, Legacy Adapter

**What:** Convert all pipeline outputs into a bundle, even when only one artifact is generated.
**When to use:** Immediately at pipeline boundaries.
**Trade-offs:** Adds schema work, but prevents two product paths.

### Pattern 2: Artifact IDs as Stable UI Keys

**What:** Every artifact gets a stable id from architect output or deterministic fallback.
**When to use:** Rendering, review mapping, regeneration, deploy selection.
**Trade-offs:** Requires migration for old `step2Result` string assumptions.

### Pattern 3: Bundle-Level and Artifact-Level Review

**What:** Review tracks local artifact issues and cross-artifact integration issues separately.
**When to use:** Any multi-file output where dependencies/imports/order matter.
**Trade-offs:** More complex UI, but avoids hiding bundle breakage inside one audit blob.

## Data Flow

### Generation Flow

1. User enters a FlutterFlow custom code request.
2. Architect returns `ArtifactBundleSpec` with `artifacts[]`.
3. Generator returns code per artifact.
4. Review returns per-artifact and bundle-level findings.
5. UI renders bundle summary and artifact cards.

### Deployment Flow

1. User selects all artifacts or a subset.
2. Deploy planner validates each artifact for FlutterFlow surface rules.
3. Planner builds `fileMap` for every selected Dart file and one `pubspec.yaml`.
4. FlutterFlow sync request sends one zip containing all selected artifacts.
5. Result UI maps success/error feedback back to artifact ids where possible.

## Integration Points

| Service | Integration Pattern | Notes |
---------|---------------------|-------|
| BuildShip `runpipeline` | Existing type-based calls: `architect`, `generator`, `review` | Prompt contracts must change to structured bundle JSON |
| FlutterFlow custom code API | Existing zipped custom code push | Extend file map from one file to many files |
| FlutterFlow custom code surfaces | Widgets, actions, functions, code files | Each type has different code/header/import/deploy constraints |

## Anti-Patterns

### Anti-Pattern 1: Treating Multi-Code as a Long String

**What people do:** Ask the LLM for many files inside one Markdown response.
**Why it's wrong:** UI, review, regeneration, and deployment cannot reliably target one artifact.
**Do this instead:** Require structured artifact records.

### Anti-Pattern 2: Deploying Dependencies Without Ownership

**What people do:** Infer `^1.0.0` dependencies from imports and push immediately.
**Why it's wrong:** FlutterFlow/package compilation can fail from bad versions or transitive dependency omissions.
**Do this instead:** Prefer explicit dependency metadata from the model, show user-visible dependency warnings, and keep regex extraction as fallback only.

## Sources

- Local `app.js` pipeline and deploy functions
- FlutterFlow custom code docs and FlutterFlow AI API surface docs

---
*Architecture research for: multi-code generation*
*Researched: 2026-06-05*
