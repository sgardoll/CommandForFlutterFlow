# Coding Conventions

**Analysis Date:** 2025-02-13

## Naming Patterns

**Files:**
- kebab-case for config files: `vite.config.js`, `package.json`
- Descriptive names: `app.js`, `index.html`
- No test files (no testing framework)

**Functions:**
- camelCase for all functions: `runCodeGenerator`, `callGemini`
- Verb-first naming: `showWalkthrough`, `updateUI`, `handleClick`
- Async functions: No special prefix, use async/await
- Event handlers: `handle[EventName]` pattern: `handleWelcomeVideoEnd`

**Variables:**
- camelCase for variables: `pipelineState`, `geminiApiKey`
- UPPER_SNAKE_CASE for constants: `PROMPT_ARCHITECT_MODEL`
- No underscore prefix for private (not used)

**Constants:**
- UPPER_SNAKE_CASE: `FF_CORE_PHILOSOPHY`, `STORAGE_KEY_PREFIX`
- Grouped by purpose (FF_ prefix for FlutterFlow constraints)

## Code Style

**Formatting:**
- No semicolons at line ends (explicitly documented in AGENTS.md)
- 2 space indentation (observed in code)
- Template literals preferred for string interpolation
- No trailing commas observed

**Linting:**
- No ESLint configuration present
- No Prettier configuration present
- Relies on manual consistency

**Quotes:**
- Double quotes for strings: `"string"`
- Template literals for interpolation: `` `Hello ${name}` ``
- Single quotes used occasionally in HTML attributes

## Import Organization

**No Module Imports:**
- Project uses vanilla JavaScript (no imports within app.js)
- All dependencies loaded via CDN in index.html
- Vite handles env variables via `import.meta.env`

**CDN Loading (in index.html):**
1. Tailwind CSS
2. Highlight.js (CSS and JS)
3. Dart language support for Highlight.js
4. Google Fonts (Inter, JetBrains Mono)

## Error Handling

**Patterns:**
- Try/catch blocks around all async operations
- Log errors with context: `console.error("FunctionName failed:", error)`
- Fallback logic for API failures
- User-facing alerts for critical errors

**Error Types:**
- Throw on API failures (with fallback)
- Alert on invalid user input
- Console logging for debugging

## Logging

**Framework:**
- console.log for info/debug
- console.error for errors
- No structured logging

**Patterns:**
- Log function entry: `console.log("runThinkingPipeline called")`
- Log errors with context
- Verbose logging in development

## Comments

**When to Comment:**
- Section headers with `---`: `// --- CONFIGURATION ---`
- Complex logic explanations
- FlutterFlow constraint documentation (extensive)
- Function purpose (minimal)

**Documentation Style:**
- AGENTS.md contains comprehensive developer guide
- No JSDoc comments in code
- Extensive template literals for system prompts

**Template Literals:**
- Used extensively for AI system instructions
- Markdown-formatted content
- Stored in constants (FF_*)

## Function Design

**Size:**
- Large functions common (~50-100+ lines)
- Monolithic approach (no module splitting)
- Helper functions extracted for reuse

**Parameters:**
- Destructuring not commonly used
- Simple parameter passing
- Options objects for complex functions

**Return Values:**
- Async functions return promises
- Explicit returns
- No Result<T,E> pattern

## Module Design

**No Modules:**
- Single file architecture (`app.js`)
- All functions in global scope (within module)
- Functions exported to `window` for HTML onclick handlers:
  ```javascript
  window.runThinkingPipeline = runThinkingPipeline
  window.closeWalkthroughModal = closeWalkthroughModal
  ```

**State Management:**
- Global variables at top of file
- Mutable state (no immutability patterns)
- localStorage for persistence

## FlutterFlow-Specific Conventions

**Constraint Constants:**
- `FF_` prefix for all FlutterFlow-related constants
- `FF_CORE_PHILOSOPHY` - Integration principles
- `FF_FORBIDDEN_PATTERNS` - Code that won't compile
- `FF_REQUIRED_PATTERNS` - Must-have code patterns
- `FF_ARTIFACT_TYPES` - Function/Action/Widget definitions

**Naming in Templates:**
- Backtick-escaped code in templates: \`code\`
- Placeholder format: `${variable}`

---

*Convention analysis: 2025-02-13*
*Update when patterns change*
