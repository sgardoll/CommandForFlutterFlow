## PLANNING COMPLETE

The iterative code refinement loop has been implemented.

### Changes Made

1.  **UI Update (`index.html`)**:
    *   Added a "Refine & Regenerate Code" button to the Code Dissector stage (`#step3-result`).
    *   The button appears automatically when the audit is complete.

2.  **Logic Implementation (`app.js`)**:
    *   Added `runRefinement()` function that:
        *   Constructs a new prompt containing:
            *   Original Specification
            *   Current Code
            *   Audit Report (Issues)
        *   Re-runs the Code Generator (Step 2) with this refinement prompt.
        *   Re-runs the Code Dissector (Step 3) on the new code.
        *   Updates the UI to reflect the new state.
    *   Exported `runRefinement` to the global window object.

### Verification

*   **Refinement Loop**: The user can now click "Refine & Regenerate Code" after an audit to attempt to fix reported issues automatically.
*   **Context Preservation**: The refinement step preserves the original requirements while specifically targeting the audit findings.
*   **State Management**: The pipeline correctly transitions back to Step 2 (Generating) and then forward to Step 3 (Auditing), maintaining a consistent UI state.
