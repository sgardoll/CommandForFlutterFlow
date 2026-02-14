# Plan: Deploy Button Visibility Pipeline Check

## Goal
Ensure the "Deploy to FlutterFlow" button is only visible when:
1.  FlutterFlow API Key and Project ID are configured.
2.  The pipeline has successfully run (specifically Step 2 - Code Generator).
3.  There is generated code available to deploy.

## Implementation Steps

### 1. Create Centralized Visibility Logic
Add a new function `updateDeployButtonVisibility()` in `app.js` that:
- Checks if FlutterFlow keys are configured (`hasStoredKey`).
- Checks if `pipelineState.step2Result` exists and has content.
- Toggles the `hidden` class on the `#deploy-section` element.

### 2. Update `app.js`

#### A. Refactor `updateApiKeyStatusIndicators`
- Remove the inline logic that currently toggles the deploy button.
- Call `updateDeployButtonVisibility()` at the end of the function.

#### B. Update `runThinkingPipeline`
- **Start:** Call `updateDeployButtonVisibility()` after resetting `pipelineState` (lines ~2976-2979) to hide the button when a new run starts.
- **Step 2 Success:** Call `updateDeployButtonVisibility()` after Step 2 completes (lines ~3021) to show the button if code was generated.
- **Step 3 Success:** Call `updateDeployButtonVisibility()` after Step 3 (lines ~3034) to ensure consistency.

### 3. Verification
- Verify the button is hidden on initial load (if no previous state, though state is transient).
- Verify the button is hidden when "Run Pipeline" is clicked.
- Verify the button appears after Code Generation (Step 2) completes (if keys are set).
- Verify the button disappears if keys are cleared.
