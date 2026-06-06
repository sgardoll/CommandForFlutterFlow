# Feature Research

**Domain:** FlutterFlow multi-artifact custom code generation
**Researched:** 2026-06-05
**Confidence:** HIGH

## Feature Landscape

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-artifact prompt architecture | User asks for a capability, not necessarily one file | MEDIUM | Architect must return bundle intent plus artifact list |
| Per-artifact generated code | Users need separate widgets/actions/functions/classes for FlutterFlow | HIGH | Generator output must split by artifact id, type, name, code, dependencies |
| Per-artifact review | A bundle can have one bad artifact and several good ones | HIGH | Review results need artifact-scoped issues and bundle-level integration issues |
| Bundle-level dependency and relationship map | Artifacts can import/call each other | MEDIUM | Needed for ordering, UI display, and deployment |
| Multi-file deploy to FlutterFlow | The current deploy button only commits one generated file | HIGH | Extend file map, zip, validation, progress, and success/error UI |
| Backward compatibility with single artifact | Existing app behavior must continue to work | MEDIUM | Single-artifact result is just a bundle of one |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Partial regeneration | Fix one artifact without throwing away the bundle | HIGH | Requires preserving bundle context and artifact ids |
| Partial deployment | Deploy selected artifacts when the rest are still being refined | MEDIUM | Must warn when dependencies are undeployed |
| Example fixture library | Proves broad capability with realistic multi-artifact examples | LOW | `agent_kit` can be one fixture, not a product-specific path |
| Dependency conflict warnings | Saves FlutterFlow users from opaque compile failures | MEDIUM | Use explicit metadata plus current dependency extraction |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| One huge Dart file containing everything | Easy for an LLM to emit | Fights FlutterFlow surfaces and blocks per-artifact deploy/review | Split into typed artifacts |
| Package-specific generators | Fast demo for one package | Turns examples into product lock-in | Generic artifact decomposition with fixtures |
| Markdown-only output | Easy to display | Hard to deploy and regenerate precisely | Structured JSON plus rendered code views |

## Feature Dependencies

```
Artifact bundle schema
    ├──requires──> Prompt Architect plural output
    ├──requires──> Generator plural output
    ├──requires──> Results UI artifact list
    └──requires──> Multi-file deploy

Per-artifact regeneration
    └──requires──> Artifact ids + bundle context

Partial deployment
    └──requires──> Dependency/relationship map
```

## MVP Definition

### Launch With

- [ ] Architect can return a bundle with one or more artifacts.
- [ ] Generator can return code for each artifact in that bundle.
- [ ] Review can score each artifact and the bundle integration.
- [ ] UI can render an artifact list with selectable code/review panels.
- [ ] Deploy can package all deployable artifacts plus dependencies into one FlutterFlow push.
- [ ] Single-artifact prompts remain supported.

### Add After Validation

- [ ] Regenerate one artifact while preserving the rest of the bundle.
- [ ] Deploy a selected subset with dependency warnings.
- [ ] Save bundle history for later continuation.

### Future Consideration

- [ ] Dedicated template catalog for common multi-artifact patterns.
- [ ] Visual dependency graph editor.
- [ ] Multi-project/library distribution workflows.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bundle schema | HIGH | MEDIUM | P1 |
| Plural pipeline outputs | HIGH | HIGH | P1 |
| Artifact list UI | HIGH | MEDIUM | P1 |
| Multi-file deploy | HIGH | HIGH | P1 |
| Per-artifact regeneration | HIGH | HIGH | P2 |
| Partial deploy | MEDIUM | MEDIUM | P2 |
| Example fixtures | MEDIUM | LOW | P2 |

## Sources

- Local app: current single-artifact `pipelineState`, `prepareCodeForCommit()`, `executeCommit()`, and deploy modal flow
- FlutterFlow docs: Custom Code surfaces and VS Code custom code file layout
- pub.dev `agent_kit`: example multi-widget capability request

---
*Feature research for: multi-code generation*
*Researched: 2026-06-05*
