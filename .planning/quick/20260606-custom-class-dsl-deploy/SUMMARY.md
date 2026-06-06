---
quick_task: custom-class-dsl-deploy
status: complete
date: 2026-06-06
---

# Summary

Custom classes now route to a first-class DSL deploy entry using `addCustomClass` instead of being planned as `lib/custom_code/actions/*.dart` files.

The existing browser deploy path has no FlutterFlow AI DSL runner, so single and bundle commits now fail explicitly for `CustomClass` artifacts before they can reach `syncCustomCodeChanges`.

## Verification

- `npm test` passed.
- `npm run build` passed.
- `git diff --check` passed.
