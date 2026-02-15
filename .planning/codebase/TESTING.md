# Testing Patterns

**Analysis Date:** 2025-02-13

## Test Framework

**Status:** No test framework configured

**Current Testing:**
- Syntax checking only: `node --check app.js`
- No unit tests
- No integration tests
- No E2E tests

## Test File Organization

**Status:** Not applicable

No test files exist in the codebase:
- No `*.test.js` files
- No `*.spec.js` files
- No `__tests__/` directory
- No `tests/` directory

## Testing Approach

**Manual Testing:**
- Browser-based manual testing
- Dev server (`npm run dev`) for local testing
- Build verification (`npm run build`)

**Code Quality:**
- Syntax validation via `node --check`
- Build process catches bundling errors
- No linting or formatting checks

## Test Coverage

**Current Coverage:** 0%

**Untested Areas:**
- All API client functions (`callGemini`, `callClaude`, `callOpenAI`)
- Encryption/decryption logic
- Pipeline orchestration (`runThinkingPipeline`)
- UI state management
- localStorage operations
- Walkthrough logic

## Mocking Strategy

**Not Implemented:**
- No mocking framework
- No test doubles
- No stubbing of external APIs

## Common Patterns (If Tests Were Added)

**Recommended Approach:**

Since this is a vanilla JS project, recommended test setup would be:

```javascript
// Example test pattern if Vitest/Jest were added

// API client tests would need mocking:
describe('callGemini', () => {
  it('should return parsed response on success', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: 'result' }] } }] })
    })
    
    const result = await callGemini('prompt', 'instruction', 'model')
    expect(result).toBe('result')
  })
})

// Encryption tests:
describe('encryptData', () => {
  it('should encrypt and decrypt data', async () => {
    const data = 'sensitive-api-key'
    const encrypted = await encryptData(data, 'device-fingerprint')
    const decrypted = await decryptData(encrypted, 'device-fingerprint')
    expect(decrypted).toBe(data)
  })
})
```

## Testing Gaps (Priority)

**High Priority:**
1. API client error handling - No tests for fallback logic
2. Encryption security - No verification of AES-GCM implementation
3. Pipeline state management - Race conditions possible

**Medium Priority:**
1. Walkthrough progression logic
2. localStorage key storage/retrieval
3. UI state updates

**Low Priority:**
1. Syntax highlighting integration
2. Modal open/close behavior
3. Copy-to-clipboard functionality

## Recommendations

**If Adding Tests:**

1. **Framework:** Vitest (matches Vite ecosystem)
2. **Location:** Co-located or `tests/` directory
3. **Priority:** Start with API client error handling
4. **Mocking:** Mock fetch for API calls, mock localStorage
5. **Coverage Target:** 60% for critical paths

**Test Structure Example:**
```
├── app.js
├── app.test.js (or tests/app.test.js)
├── package.json
└── vitest.config.js (add config)
```

---

*Testing analysis: 2025-02-13*
*Update when test patterns change*
