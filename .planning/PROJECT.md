# Dreamflow Command - FlutterFlow Direct Commit Feature

## What This Is

Extend the Dreamflow Command web application to allow users to optionally provide their FlutterFlow API Key and Project ID, then commit generated code directly to their FlutterFlow project. This eliminates the copy-paste step between code generation and deployment to FlutterFlow.

## Core Value

Seamless one-click deployment from code generation to FlutterFlow project, eliminating manual copy-paste workflow.

## Requirements

### Validated (Existing Capabilities)

- ✓ 3-step pipeline (Prompt Architect → Code Generator → Code Dissector)
- ✓ Multiple AI model support (Gemini, Claude, OpenAI)
- ✓ API key management with encryption
- ✓ Walkthrough system for first-time users
- ✓ Code display with syntax highlighting
- ✓ Copy-to-clipboard functionality

### Active

- [ ] Add FlutterFlow API Key and Project ID fields to API Keys modal
- [ ] Encrypt and store FF credentials in localStorage
- [ ] Add "Commit to FlutterFlow" button after code review (Step 3)
- [ ] Create file preparation utilities (adapt from VS-Code-Extension pattern)
- [ ] Implement state tracking during commit process
- [ ] Create API client for FlutterFlow (adapt from VS-Code-Extension/src/api/)
- [ ] Show commit success/error feedback
- [ ] Provide mitigation options for failed commits

### Out of Scope

- Creating a VS Code: Extension — This is for the web app
- Bidirectional sync (pull from FF) — Push only for v1
- Multiple project support — Single project per session
- Complex conflict resolution — Overwrite strategy only for v1

## Context

The **VS-Code-Extension** folder contains reference implementation:
- `src/api/FlutterFlowApiClient.ts` - API client pattern
- `src/actions/pushToFF.ts` - Push action logic
- `src/fileUtils/` - File parsing and preparation
- `src/ffState/` - State management patterns

The **web app** (`app.js`, `index.html`) currently:
- Has API key modal for AI services
- Generates FlutterFlow-compatible Dart code
- Shows 3-step walkthrough
- Has no FlutterFlow integration yet

We need to adapt the VS-Code-Extension patterns to the web app architecture.

## Constraints

- **Tech Stack**: Vanilla JavaScript (no framework), Vite build tool
- **Security**: Encrypt API keys client-side before localStorage (AES-GCM)
- **UX**: Optional feature — don't require FF credentials
- **Pattern**: Follow VS-Code-Extension's process: fileUtils → ffState → api

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Adapt VS-Code-Extension patterns | Proven working code, maintain consistency | — Pending |
| Add FF credentials to existing API Keys modal | Centralized settings location | — Pending |
| Optional feature | Not all users have FlutterFlow accounts | — Pending |

---
*Last updated: 2025-02-13 after clarification*
