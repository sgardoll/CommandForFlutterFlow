---
quick_task: custom-class-dsl-runner
status: complete
date: 2026-06-06
---

# Summary

Added `/api/flutterflow-dsl-deploy.php`, a PHP bridge that bootstraps a cached FlutterFlow AI workspace, writes a generated edit DSL script, and runs FlutterFlow AI against the target project.

`app.js` now sends `CustomClass` artifacts to that DSL endpoint and still deploys non-class bundle files through the existing FlutterFlow custom-code sync path.

## Verification

- `npm test` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Generated DSL edit script shape passed `dart analyze` in a temporary FlutterFlow AI workspace.
