## Plan: Update Code Dissector Rules

**Status:** Complete

The Code Dissector (and other pipeline steps) needed to be updated to reflect the new "FlutterFlow Custom Code Cursor Rules".

### Tasks

1.  **Analyze & Update System Prompt**: Read `app.js` and update the `FF_*` constants.
    -   [x] Locate System Prompt in `app.js`
    -   [x] Update `FF_CORE_PHILOSOPHY`
    -   [x] Update `FF_ARTIFACT_TYPES` (Add mandatory headers)
    -   [x] Update `FF_TYPE_SYSTEM` (Add new types, forbid complex types)
    -   [x] Update `FF_FORBIDDEN_PATTERNS` (Allow Code Files, update import rules)
    -   [x] Update `FF_REQUIRED_PATTERNS` (Add header requirements)
    -   [x] Update `FF_INTEGRATION_GAP_TABLE`
    -   [x] Update `FF_PROMPT_PROTOCOL`
    -   [x] Update `FF_WORKFLOW_PROTOCOL`
    -   [x] Update `FF_TROUBLESHOOTING_CHECKLIST`

### Implementation Details
Updated `app.js` to replace the old constraint constants with new ones derived from the provided definitive guide. This ensures that the AI agents (Prompt Architect, Code Generator, Code Dissector) all share the correct, updated knowledge about FlutterFlow's requirements, specifically regarding:
-   Mandatory file headers/boilerplates for Widgets and Actions.
-   Prohibition of complex types like `EdgeInsets` in parameters.
-   Permission to use `Code Files` for custom classes (with restrictions).
-   Correct handling of imports (managed by FF, but must be present in the header).
