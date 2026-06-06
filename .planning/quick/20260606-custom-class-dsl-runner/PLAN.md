---
quick_task: custom-class-dsl-runner
status: complete
date: 2026-06-06
---

# CustomClass DSL Runner

## Goal

Wire a real execution path so `CustomClass` artifacts can deploy with FlutterFlow AI DSL `addCustomClass`.

## Success Criteria

- Browser deploy code sends custom-class entries to a backend DSL runner.
- Mixed bundles deploy custom classes first, then continue with existing custom-code sync for widgets/actions/functions.
- Backend runner generates a brownfield edit DSL script using `app.raw((project) { findCustomClass(...) ?? addCustomClass(...) })`.
- Deployment requirements are documented.

## Verification

- `npm test`
- `npm run build`
- `git diff --check`
- Generated FlutterFlow AI DSL script shape analyzed cleanly with `dart analyze`.
