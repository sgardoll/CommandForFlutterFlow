# Requirements: Connect I/O Custom Code v1.2

**Defined:** 2026-06-05
**Core Value:** Users can describe a capability once and receive the complete set of FlutterFlow-ready custom code artifacts needed to implement it, with each artifact reviewable, refinable, regenerable, and deployable independently or as a bundle.

## v1.2 Requirements

### Bundle Contract

- [ ] **BUND-01**: User requests are represented internally as an artifact bundle, even when the request produces only one artifact
- [ ] **BUND-02**: Each artifact in a bundle has a stable id, artifact type, artifact name, file name, description, dependency metadata, and deploy status
- [ ] **BUND-03**: Bundle metadata captures relationships between artifacts, including imports, call relationships, and required deployment order
- [ ] **BUND-04**: Existing single-artifact prompts continue to work through the same bundle model without a separate legacy UI path

### Pipeline Generation

- [ ] **PIPE-01**: Prompt Architect can return a structured bundle specification containing one or more FlutterFlow artifacts
- [ ] **PIPE-02**: Code Generator can return generated Dart code for every artifact in the bundle specification
- [ ] **PIPE-03**: Code Review can return artifact-level findings and bundle-level integration findings
- [ ] **PIPE-04**: Pipeline parsing handles structured JSON responses first and preserves a safe fallback for legacy single-artifact responses
- [ ] **PIPE-05**: Package-backed requests are handled generically through artifact/dependency metadata rather than package-specific product code

### Artifact Review and Refinement

- [ ] **REVI-01**: User can inspect generated code for each artifact separately
- [ ] **REVI-02**: User can inspect review results for each artifact separately
- [ ] **REVI-03**: User can see bundle-level warnings for dependency, import, and cross-artifact relationship issues
- [ ] **REVI-04**: User can regenerate one artifact while preserving the rest of the bundle and passing full bundle context to the regeneration prompt
- [ ] **REVI-05**: User can regenerate the full bundle from review feedback or pasted FlutterFlow build errors

### Results UI

- [ ] **UI-01**: Results view shows a bundle summary with artifact count, deployable count, warnings, and overall review status
- [ ] **UI-02**: Results view shows an artifact list or card set keyed by stable artifact id
- [ ] **UI-03**: Selecting an artifact updates the code panel, review panel, copy action, refine action, and deploy action to that artifact
- [ ] **UI-04**: Results UI clearly distinguishes artifact-level actions from bundle-level actions
- [ ] **UI-05**: Single-artifact results remain as simple to use as the current results view

### FlutterFlow Deployment

- [ ] **DEPL-01**: User can deploy all deployable artifacts in a bundle to FlutterFlow in one operation
- [ ] **DEPL-02**: Deployment packaging includes every selected artifact in the FlutterFlow file map and zip payload
- [ ] **DEPL-03**: Deployment packaging merges explicit dependency metadata into `pubspec.yaml` and warns when dependency versions are inferred or missing
- [ ] **DEPL-04**: User can deploy a selected subset only when required dependencies and relationship constraints are satisfied or explicitly acknowledged
- [ ] **DEPL-05**: Deployment success and failure messages map back to affected artifacts where FlutterFlow returns file-specific errors

### FlutterFlow Compatibility

- [ ] **COMP-01**: Custom Widgets are validated for FlutterFlow-specific widget constraints, including nullable width/height and supported callback signatures
- [ ] **COMP-02**: Custom Actions are validated for async `Future` behavior, supported parameters, optional BuildContext handling, and dependency metadata
- [ ] **COMP-03**: Custom Functions are validated as synchronous simple Dart without custom package imports
- [ ] **COMP-04**: Code Files are validated for FlutterFlow parser-compatible classes/enums and avoid unsupported generics or function-typed fields
- [ ] **COMP-05**: Cross-artifact imports use FlutterFlow-compatible paths and do not assume app state variables or data types that the user has not declared

### Validation Fixtures

- [ ] **FIXT-01**: Test fixtures cover a one-artifact custom widget request
- [ ] **FIXT-02**: Test fixtures cover a mixed widget/action/function/class bundle request
- [ ] **FIXT-03**: Test fixtures cover a package-backed multi-artifact request, using `agent_kit` or an equivalent package only as an example scenario
- [ ] **FIXT-04**: Test fixtures cover partial regeneration without changing unrelated artifacts
- [ ] **FIXT-05**: Test fixtures cover multi-file deployment payload construction without calling the live FlutterFlow API

## Future Requirements

### Bundle History

- **HIST-01**: User can save and reopen previous artifact bundles
- **HIST-02**: User can compare regenerated artifact versions

### Advanced Visualization

- **VIS-01**: User can view a dependency graph of artifacts in a bundle
- **VIS-02**: User can reorder deployment groups visually

### Template Catalog

- **TEMP-01**: User can start from reusable multi-artifact templates
- **TEMP-02**: User can publish successful artifact bundle patterns as templates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hardcoded `agent_kit` generator | `agent_kit` is an example request, not the product scope |
| Full FlutterFlow library distribution | Multi-code deployment to one project is the v1.2 goal; reusable library publishing is later |
| Visual dependency graph editor | Useful, but a list/card UI is enough to validate bundle generation |
| Live FlutterFlow API deployment tests in CI | Avoid external-service side effects; test payload construction locally |
| Multi-user team collaboration on bundles | Existing product is individual-user oriented; defer team workflows |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUND-01 | TBD | Pending |
| BUND-02 | TBD | Pending |
| BUND-03 | TBD | Pending |
| BUND-04 | TBD | Pending |
| PIPE-01 | TBD | Pending |
| PIPE-02 | TBD | Pending |
| PIPE-03 | TBD | Pending |
| PIPE-04 | TBD | Pending |
| PIPE-05 | TBD | Pending |
| REVI-01 | TBD | Pending |
| REVI-02 | TBD | Pending |
| REVI-03 | TBD | Pending |
| REVI-04 | TBD | Pending |
| REVI-05 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |
| UI-05 | TBD | Pending |
| DEPL-01 | TBD | Pending |
| DEPL-02 | TBD | Pending |
| DEPL-03 | TBD | Pending |
| DEPL-04 | TBD | Pending |
| DEPL-05 | TBD | Pending |
| COMP-01 | TBD | Pending |
| COMP-02 | TBD | Pending |
| COMP-03 | TBD | Pending |
| COMP-04 | TBD | Pending |
| COMP-05 | TBD | Pending |
| FIXT-01 | TBD | Pending |
| FIXT-02 | TBD | Pending |
| FIXT-03 | TBD | Pending |
| FIXT-04 | TBD | Pending |
| FIXT-05 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 34 total
- Mapped to phases: 0
- Unmapped: 34

---
*Requirements defined: 2026-06-05*
*Last updated: 2026-06-05 after v1.2 milestone research*
