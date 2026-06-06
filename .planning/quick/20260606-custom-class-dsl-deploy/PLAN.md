---
quick_task: custom-class-dsl-deploy
status: complete
date: 2026-06-06
---

# CustomClass DSL Deploy Routing

## Goal

Stop routing `CustomClass` artifacts through FlutterFlow `syncCustomCodeChanges` as generic action/code files. Represent them as FlutterFlow AI DSL `addCustomClass` operations instead.

## Success Criteria

- `CustomClass` artifacts do not appear in bundle `fileEntries`.
- Bundle plans expose `CustomClass` artifacts as DSL entries with `operation: "addCustomClass"`.
- The UI deploy path blocks custom classes until a real DSL runner is wired, instead of pushing them through the wrong API.
- Tests cover the planner split and compatibility hint.

## Verification

- `npm test`
- `npm run build`
- `git diff --check`
