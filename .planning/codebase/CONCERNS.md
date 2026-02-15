# Codebase Concerns

**Analysis Date:** 2025-02-13

## Tech Debt

**Monolithic app.js:**
- Issue: All ~2000 lines of logic in single file
- File: `app.js` (1974 lines)
- Why: Rapid prototyping, simple scope
- Impact: Difficult to maintain, test, and navigate
- Fix approach: Split into modules (api/, ui/, pipeline/)

**No Test Coverage:**
- Issue: Zero automated tests
- Files: Entire codebase
- Why: Small project, manual testing sufficient
- Impact: Changes risk breaking functionality silently
- Fix approach: Add Vitest, write tests for critical paths

**Client-Side API Key Storage:**
- Issue: API keys stored in browser (even encrypted)
- File: `app.js` - `saveApiKey()`, `getApiKey()` functions
- Why: No backend server to proxy requests
- Impact: Keys could be extracted by determined attacker
- Fix approach: Add backend proxy to hide keys (trade-off: hosting cost)

## Known Bugs

**No Known Bugs:**
- No TODO/FIXME comments found in codebase
- No bug reports in commit messages
- No GitHub issues referenced

## Security Considerations

**API Key Exposure Risk:**
- Risk: Encrypted keys still client-accessible
- Location: `app.js` - encryption functions
- Current mitigation: AES-GCM encryption, device fingerprint binding
- Recommendations: Consider backend proxy for production use

**No Input Sanitization:**
- Risk: User prompts sent directly to AI APIs
- Location: `runThinkingPipeline()` - prompt parameter
- Current mitigation: None (AI APIs handle sanitization)
- Recommendations: Add basic XSS prevention if displaying user input

**Proxy Headers:**
- Risk: `anthropic-dangerous-direct-browser-access` header required
- Location: `vite.config.js` line 24
- Current mitigation: Only in dev server proxy
- Recommendations: Move to backend proxy in production

## Performance Bottlenecks

**Large app.js Bundle:**
- Problem: ~2000 lines of JavaScript in single file
- Measurement: 46KB+ gzipped (from build output)
- Cause: No code splitting or lazy loading
- Improvement path: Split into modules, lazy load walkthrough logic

**No Caching:**
- Problem: No caching of API responses or generated code
- Measurement: N/A
- Cause: Fresh API call on every "Run Pipeline"
- Improvement path: Add localStorage cache for identical prompts

**Synchronous Encryption:**
- Problem: Crypto operations may block UI on slow devices
- Location: `encryptData()`, `decryptData()` in `app.js`
- Measurement: Not measured
- Improvement path: Use Web Workers for crypto operations

## Fragile Areas

**Pipeline State Management:**
- File: `app.js` - `pipelineState` global variable
- Why fragile: Mutable global state, no state machine pattern
- Common failures: Race conditions if user clicks rapidly
- Safe modification: Add state transition guards
- Test coverage: None

**API Error Handling:**
- File: `app.js` - API client functions
- Why fragile: Multiple fallback paths, complex error logic
- Common failures: Fallback may not trigger correctly
- Safe modification: Add structured error types
- Test coverage: None

**Encryption Key Derivation:**
- File: `app.js` - `getEncryptionKey()` function
- Why fragile: Device fingerprint may change (browser updates)
- Common failures: Users lose access to stored keys
- Safe modification: Add key recovery mechanism
- Test coverage: None

## Scaling Limits

**Single-Threaded JavaScript:**
- Current capacity: Browser-dependent
- Limit: Main thread blocking during crypto operations
- Symptoms at limit: UI freezing during key operations
- Scaling path: Move crypto to Web Workers

**API Rate Limits:**
- Current capacity: Dependent on user's API keys
- Limit: Google/Anthropic/OpenAI rate limits apply
- Symptoms at limit: 429 errors, degraded experience
- Scaling path: Implement rate limit handling with user feedback

## Dependencies at Risk

**Vite 5.x:**
- Risk: Dev server proxy may have breaking changes
- Impact: API proxy configuration may need updates
- Migration plan: Monitor Vite changelog, test on updates

**CDN Dependencies:**
- Risk: Tailwind CSS, Highlight.js loaded from CDN
- Impact: If CDN unavailable, app has no styling/syntax highlighting
- Migration plan: Bundle dependencies with Vite instead of CDN

## Missing Critical Features

**Backend Proxy:**
- Problem: API keys exposed client-side
- Current workaround: Encryption + device binding
- Blocks: Production deployment with sensitive keys
- Implementation complexity: Medium (requires server hosting)

**Comprehensive Error Handling:**
- Problem: Limited error recovery for API failures
- Current workaround: Simple fallback to backup model
- Blocks: Robust production usage
- Implementation complexity: Low

**Test Suite:**
- Problem: No automated testing
- Current workaround: Manual testing only
- Blocks: Safe refactoring, CI/CD pipeline
- Implementation complexity: Medium (Vitest setup + test writing)

## Test Coverage Gaps

**All Critical Paths:**
- What's not tested: Everything (no tests exist)
- Risk: Any change could break functionality
- Priority: High
- Difficulty to test: Medium (requires mocking fetch, localStorage)

**Specific Gaps:**
1. API client functions - No error scenario testing
2. Encryption/decryption - No security verification
3. Pipeline state management - No race condition testing
4. Walkthrough logic - No step progression testing

---

*Concerns audit: 2025-02-13*
*Update as issues are fixed or new ones discovered*
