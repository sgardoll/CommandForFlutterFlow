# Roadmap: Dreamflow Command - FlutterFlow Direct Commit

## Overview

Add direct FlutterFlow project integration to the Dreamflow Command web application, allowing users to optionally provide their FlutterFlow API Key and Project ID, then commit generated code directly to their FlutterFlow project. This eliminates the copy-paste workflow between code generation and deployment.

## Domain Expertise

- ~/.config/opencode/skills/expertise/web-apps/SKILL.md
- VS-Code-Extension/src/api/ - Reference API client implementation
- VS-Code-Extension/src/actions/ - Reference action patterns
- VS-Code-Extension/src/ffState/ - Reference state management

## Phases

- [ ] **Phase 1: UI Foundation** - Add FlutterFlow credentials to API Keys modal
- [ ] **Phase 2: Security Layer** - Encrypt and store FF credentials
- [ ] **Phase 3: API Client Core** - Create FlutterFlow API client foundation
- [ ] **Phase 4: File Preparation** - Adapt file utilities from VS-Code-Extension
- [ ] **Phase 5: State Management** - Implement commit state tracking
- [ ] **Phase 6: Commit Action** - Create push-to-FlutterFlow action
- [ ] **Phase 7: UI Integration** - Add commit button and workflow
- [ ] **Phase 8: Feedback System** - Success/error handling and mitigation
- [ ] **Phase 9: Testing** - Integration testing and validation
- [ ] **Phase 10: Polish** - UX refinement and edge cases

## Phase Details

### Phase 1: UI Foundation
**Goal**: Add FlutterFlow API Key and Project ID fields to the existing API Keys modal with validation and help text
**Depends on**: Nothing (first phase)
**Research**: Unlikely (existing UI patterns in codebase)
**Plans**: 2 plans
**Status**: Complete

Plans:
- [x] 01-01: Add FlutterFlow API Key and Project ID input fields to API Keys modal
- [x] 01-02: Add validation and help text for FF credentials

### Phase 2: Security Layer
**Goal**: Encrypt and decrypt FlutterFlow credentials using AES-GCM (following existing pattern)
**Depends on**: Phase 1
**Research**: Unlikely (reuse existing encryption utilities)
**Plans**: 0 plans (completed in Phase 1)
**Status**: Complete (integrated into Phase 1)

Note: Encryption was implemented as part of Phase 1 since the existing app.js encryption utilities were easily extended to support FlutterFlow credentials.

### Phase 3: API Client Core
**Goal**: Create FlutterFlow API client adapted from VS-Code-Extension/src/api/
**Depends on**: Phase 1 (Security)
**Research**: Likely (adapt existing patterns to web context)
**Research topics**: Review FlutterFlowApiClient.ts patterns, API endpoints, authentication flow
**Plans**: 4 plans
**Status**: Complete (2026-02-13)

Plans:
- [x] 03-01: Create FlutterFlowApiClient class with constructor
- [x] 03-02: Implement pullCode method (get code from FF)
- [x] 03-03: Implement pushCode method (send code to FF)
- [x] 03-04: Add error handling and response parsing

### Phase 4: File Preparation
**Goal**: Adapt file utilities from VS-Code-Extension for web context
**Depends on**: Phase 3
**Research**: Likely (adapt file parsing to browser environment)
**Research topics**: Review dartParser.ts, fileParsing.ts patterns; adapt for browser File API
**Plans**: 3 plans
**Status**: Complete (2026-02-13)

Plans:
- [x] 04-01: Create file utilities for custom code extraction
- [x] 04-02: Implement pubspec.yaml preparation
- [x] 04-03: Add file validation before commit

### Phase 5: State Management
**Goal**: Implement state tracking for the commit process
**Depends on**: Phase 4
**Research**: Unlikely (follow existing pipelineState pattern)
**Plans**: 2 plans
**Status**: Planned

Plans:
- [ ] 05-01: Create commitState tracking object
- [ ] 05-02: Integrate state updates throughout commit flow

### Phase 6: Commit Action
**Goal**: Create the push-to-FlutterFlow action (adapted from pushToFF.ts)
**Depends on**: Phase 5
**Research**: Likely (adapt action pattern to web workflow)
**Research topics**: Review pushToFF.ts implementation; adapt for single-file commit workflow
**Plans**: 3 plans
**Status**: Planned

Plans:
- [ ] 06-01: Create code preparation utilities
- [ ] 06-02: Integrate commit action with API client
- [ ] 06-03: Add pre-commit validation and checks

### Phase 7: UI Integration
**Goal**: Add "Commit to FlutterFlow" button and integrate into Step 3 workflow
**Depends on**: Phase 6
**Research**: Unlikely (existing UI patterns)
**Plans**: 3 plans
**Status**: Planned

Plans:
- [ ] 07-01: Add "Commit to FlutterFlow" button in Step 3 (Code Dissector)
- [ ] 07-02: Create commit confirmation modal
- [ ] 07-03: Integrate commit action with UI feedback

### Phase 8: Feedback System
**Goal**: Implement success/error feedback and mitigation options
**Depends on**: Phase 7
**Research**: Unlikely (standard error handling patterns)
**Plans**: 3 plans
**Status**: Planned

Plans:
- [ ] 08-01: Create success feedback UI with commit details
- [ ] 08-02: Implement error handling with specific error types
- [ ] 08-03: Add mitigation options for common failures

### Phase 9: Testing
**Goal**: Integration testing and validation
**Depends on**: Phase 8
**Research**: Unlikely (manual testing approach)
**Plans**: 2 plans
**Status**: Planned

Plans:
- [ ] 09-01: Test commit flow with mock API
- [ ] 09-02: Test error handling and edge cases

### Phase 10: Polish
**Goal**: UX refinement and edge case handling
**Depends on**: Phase 9
**Research**: Unlikely (refinement of existing work)
**Plans**: 2 plans
**Status**: Planned

Plans:
- [ ] 10-01: Add loading states and progress indicators
- [ ] 10-02: Final UX review and adjustments

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UI Foundation | 2/2 | Complete | 2025-02-13 |
| 2. Security Layer | -/- | Complete (in Phase 1) | 2025-02-13 |
| 3. API Client Core | 4/4 | Complete | 2026-02-13 |
| 4. File Preparation | 3/3 | Complete | 2026-02-13 |
| 5. State Management | 0/2 | Planned | - |
| 6. Commit Action | 0/3 | Planned | - |
| 7. UI Integration | 0/3 | Planned | - |
| 8. Feedback System | 0/3 | Planned | - |
| 9. Testing | 0/2 | Planned | - |
| 10. Polish | 0/2 | Planned | - |
