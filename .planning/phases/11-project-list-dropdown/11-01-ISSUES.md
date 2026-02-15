# UAT Issues: Phase 11 Plan 01

**Tested:** 2026-02-14
**Source:** .planning/phases/11-project-list-dropdown/11-01-SUMMARY.md
**Tester:** User via /gsd-verify-work

## Open Issues

### UAT-001: Deploy button hidden after code generation
**Discovered:** 2026-02-14
**Phase/Plan:** 11-01
**Severity:** Blocker
**Feature:** Commit Execution
**Description:** The "Deploy to FlutterFlow" button does not appear even after code generation and refinement are complete.
**Expected:** Button should become visible once code is generated and FlutterFlow credentials are configured.
**Actual:** Button remains hidden.
**Repro:**
1. Generate code in Step 2.
2. Observe sidebar/bottom section.
3. Button is missing.

### UAT-002: Modal UI space optimization partial success
**Discovered:** 2026-02-14
**Phase/Plan:** 11-01
**Severity:** Cosmetic
**Feature:** UI Layout
**Description:** User reported "Partial" satisfaction with space optimization. Modal may still be slightly too large or layout could be improved.
**Expected:** Fully optimized layout for smaller screens.
**Actual:** Layout is improved but still feels suboptimal.

## Resolved Issues

### UAT-001: Deploy button hidden after code generation
**Resolved:** 2026-02-14 - Fixed by adding updateDeployButtonVisibility() calls in pipeline finally blocks.
**Commit:** N/A (applied directly)

---
*Phase: 11-project-list-dropdown*
*Plan: 01*
*Tested: 2026-02-14*
