# Pitfalls Research

**Domain:** FlutterFlow multi-artifact custom code generation
**Researched:** 2026-06-05
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Example Becomes Scope

**What goes wrong:** A package example like `agent_kit` becomes hardcoded into prompts, UI, requirements, or tests.
**Why it happens:** It is concrete and memorable, so planning overfits to it.
**How to avoid:** Treat examples as fixtures; build a generic artifact bundle model.
**Warning signs:** Requirements mention specific example widgets as core product behavior.
**Phase to address:** Phase 1.

### Pitfall 2: Single-Artifact State Survives Too Long

**What goes wrong:** New UI displays multiple artifacts, but deploy/refine/review still reads `pipelineState.step2Result`.
**Why it happens:** Existing flow is deeply one-string oriented.
**How to avoid:** Introduce canonical `pipelineState.artifactBundle` and adapt legacy single output into it.
**Warning signs:** Code still parses only `artifactType` and `artifactName` from one JSON spec.
**Phase to address:** Phase 1.

### Pitfall 3: Partial Regeneration Breaks Relationships

**What goes wrong:** Regenerating one artifact changes a public class/function/parameter that another artifact imports or calls.
**Why it happens:** Regeneration prompt lacks bundle context and relationship constraints.
**How to avoid:** Pass full bundle spec and relationship map into per-artifact regeneration.
**Warning signs:** Regeneration prompt includes only one code file and one audit report.
**Phase to address:** Phase 3.

### Pitfall 4: Multi-File Deploy Omits Required Files

**What goes wrong:** FlutterFlow receives one changed file while dependent custom classes/actions/widgets are missing.
**Why it happens:** Current deploy path creates a file map with one generated file plus pubspec.
**How to avoid:** Bundle deploy planner must include all selected artifacts and warn about undeployed dependencies.
**Warning signs:** `fileMap.size` is always 1 before adding pubspec.
**Phase to address:** Phase 4.

### Pitfall 5: FlutterFlow Surface Rules Get Blurred

**What goes wrong:** Functions import packages, code files use unsupported parser features, widgets omit width/height, or actions return non-Future values.
**Why it happens:** Multi-artifact generation makes it tempting to use generic Dart rules.
**How to avoid:** Validate each artifact against its FlutterFlow surface before review and deploy.
**Warning signs:** One review score for the whole bundle with no per-surface checks.
**Phase to address:** All phases.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Continue using `step2Result` string | Faster initial UI | Blocks per-artifact actions | Never for final v1.2 |
| Parse many code fences | Easy LLM prompt | Fragile deploy/regenerate | Temporary fallback only |
| Infer arbitrary dependency versions | Simple deploy | Compile failures | Only as warning/fallback |

## "Looks Done But Isn't" Checklist

- [ ] **Bundle UI:** Verify deploy/refine/review use the selected artifact, not the first artifact.
- [ ] **Multi-file deploy:** Verify zip contains every selected artifact path plus pubspec.
- [ ] **Dependency metadata:** Verify package names and versions are surfaced before deploy.
- [ ] **Single-artifact compatibility:** Verify existing one-widget prompt still works.
- [ ] **Example validation:** Verify a package-backed multi-artifact example works without package-specific code paths.

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Example becomes scope | Phase 1 | Requirements and tests use examples as fixtures only |
| Single-artifact state survives | Phase 1 | `artifactBundle` is canonical state |
| Regeneration breaks relationships | Phase 3 | Per-artifact regeneration receives bundle context |
| Multi-file deploy omits files | Phase 4 | Zip/file map tests cover N artifacts |
| Surface rules blur | Every phase | Per-artifact validation by type |

## Sources

- Local `app.js` single-artifact pipeline/deploy code
- FlutterFlow custom code docs
- FlutterFlow AI API surface docs

---
*Pitfalls research for: multi-code generation*
*Researched: 2026-06-05*
