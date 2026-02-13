# Architecture

**Analysis Date:** 2025-02-13

## Pattern Overview

**Overall:** Single-Page Application (SPA) with 3-Step Pipeline

**Key Characteristics:**
- Monolithic architecture (single `app.js` file ~2000 lines)
- Vanilla JavaScript (no framework)
- Client-side only (no backend server)
- State managed in global variables
- Event-driven UI updates

## Layers

**Presentation Layer:**
- Purpose: UI rendering and event handling
- Contains: HTML templates, event listeners, DOM manipulation
- Location: `index.html` (structure), `app.js` (interaction logic)
- Depends on: Browser APIs, CDN libraries

**Application Layer:**
- Purpose: Core business logic and pipeline orchestration
- Contains: Pipeline functions, state management, API clients
- Location: `app.js` (all application logic)
- Depends on: External AI APIs, browser storage

**Data Layer:**
- Purpose: API communication and data persistence
- Contains: API clients (Gemini, Claude, OpenAI), encryption utilities
- Location: `app.js` (embedded in functions)
- Depends on: External APIs, localStorage

## Data Flow

**Pipeline Execution Flow:**

1. User enters prompt in `index.html` textarea
2. User clicks "Run Pipeline" button
3. `runThinkingPipeline()` in `app.js` initiates workflow
4. **Step 1** - `runPromptArchitect()`:
   - Sends prompt to Gemini API
   - Returns JSON specification
   - UI updates to show results
5. **Step 2** - `runCodeGenerator()`:
   - Sends spec + constraints to AI
   - Returns Dart code
   - Displays with syntax highlighting
6. **Step 3** - `runCodeDissector()`:
   - Audits code for FlutterFlow compatibility
   - Returns markdown report
   - Shows score and issues

**State Management:**
- Global `pipelineState` object tracks:
  - `isRunning` - pipeline status
  - `currentStep` - active step (1-3)
  - `step1Result`, `step2Result`, `step3Result` - cached outputs
- API keys stored encrypted in localStorage

**Error Handling:**
- Try/catch blocks around API calls
- Fallback to secondary model on failure
- User-facing error messages in UI

## Key Abstractions

**Pipeline Functions:**
- Purpose: Execute each stage of code generation
- Examples: `runPromptArchitect()`, `runCodeGenerator()`, `runCodeDissector()`
- Pattern: Async functions with error handling and fallback logic

**API Clients:**
- Purpose: Communicate with AI services
- Examples: `callGemini()`, `callClaude()`, `callOpenAI()`
- Pattern: Fetch wrapper with proxy routing

**Constraints Templates:**
- Purpose: FlutterFlow-specific rules embedded in prompts
- Examples: `FF_CORE_PHILOSOPHY`, `FF_FORBIDDEN_PATTERNS`
- Pattern: Template literals with markdown content

**Walkthrough System:**
- Purpose: Guide first-time users through setup
- Functions: `showWalkthroughIfNeeded()`, `advanceWalkthrough()`, `updateWalkthroughUI()`
- Pattern: Step-based state machine with DOM updates

## Entry Points

**Application Entry:**
- Location: `index.html`
- Triggers: Page load in browser
- Responsibilities: Load UI, initialize event listeners, show walkthrough

**Script Entry:**
- Location: `app.js` (loaded via `<script type="module">`)
- Triggers: DOMContentLoaded event
- Responsibilities: Initialize API keys, set up event handlers

## Error Handling

**Strategy:** Try/catch at function level, graceful degradation

**Patterns:**
- API calls wrapped in try/catch with fallback logic
- Primary model failure → automatic retry with fallback model
- User input validation before pipeline execution
- Console.error with context for debugging

## Cross-Cutting Concerns

**Logging:**
- Console.log/console.error for debugging
- No structured logging framework
- Verbose logging in development

**Validation:**
- Manual input validation before API calls
- Check for empty prompts
- Image reference detection for non-Gemini models

**Security:**
- API keys encrypted with AES-GCM before localStorage
- Device fingerprinting for key binding
- No server-side code (all client-side)

---

*Architecture analysis: 2025-02-13*
*Update when major patterns change*
