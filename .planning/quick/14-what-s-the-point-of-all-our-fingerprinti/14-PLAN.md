---
phase: quick
plan: 14
type: execute
wave: 1
depends_on: []
files_modified: ["app.js"]
autonomous: true
requirements: ["QUICK-14"]
must_haves:
  truths:
    - "Clearing local cache does not reset the server-tracked usage count."
    - "If a user exceeds the limit and clears their cache, they still hit the limit."
    - "Local usage count automatically resyncs when receiving a 429 from the server."
  artifacts:
    - path: "app.js"
      provides: "Identity resolution and pipeline requests"
      contains: "res.status === 429"
  key_links:
    - from: "app.js"
      to: "BuildShip /authUserCheck"
      via: "cookie_id parameter matches fingerprint"
      pattern: "cookie_id: result.visitorId"
---

<objective>
Fix the vulnerability where clearing local cache resets the usage count to 0, by aligning local and server usage count sync and ensuring stable identifiers.

Purpose: Prevent users from bypassing generation limits by simply clearing their browser cache.
Output: Updated identity resolution and pipeline calling logic in app.js.
</objective>

<execution_context>
@/Users/home/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/home/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@app.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Use fingerprint directly as stable identifier</name>
  <files>app.js</files>
  <action>
    Modify `resolveIdentity()` to use the `visitorId` (fingerprint) as the `cookieId` instead of calling `getOrCreateCookieId()`. 
    When the cache is cleared, `getOrCreateCookieId()` previously created a new random UUID, causing the backend to treat the user as new. 
    By setting `const cookieId = result.visitorId;`, the backend will receive the same identifier even after a cache clear, allowing it to return the correct historical `usage_count`.
    Remove or comment out `const cookieId = getOrCreateCookieId()` inside `resolveIdentity`.
  </action>
  <verify>
    <automated>grep -q "const cookieId = result.visitorId" app.js</automated>
  </verify>
  <done>The fingerprint is sent as the cookie_id, preventing the backend from creating a new user when local storage is cleared.</done>
</task>

<task type="auto">
  <name>Task 2: Restore 429 usage limit handling and sync</name>
  <files>app.js</files>
  <action>
    In `callBuildShip()`, add logic to handle a 429 status code from the server (this was previously lost during a merge).
    Immediately after `const data = await res.json()`, check `if (res.status === 429)`.
    If true, check `if (data.serverCount !== undefined)`, and if so, sync it to localStorage:
    `localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ count: data.serverCount, month: getCurrentYearMonth() })); updateUsageDisplay();`
    Then `throw new Error(data.message || 'Monthly usage limit reached. Upgrade to continue.')`
  </action>
  <verify>
    <automated>grep -q "res.status === 429" app.js</automated>
  </verify>
  <done>If a user bypasses the local check by clearing cache mid-session, the server's 429 response correctly resyncs their local count and throws a limit error.</done>
</task>

</tasks>

<verification>
Check that both the fingerprint identifier is stable across cache clears, and the pipeline correctly syncs usage if a 429 limit error is hit.
</verification>

<success_criteria>
- `resolveIdentity` uses `result.visitorId` for the `cookieId`.
- `callBuildShip` checks for `res.status === 429` and updates local storage with `data.serverCount`.
</success_criteria>

<output>
After completion, create `.planning/phases/quick/quick-14-SUMMARY.md`
</output>