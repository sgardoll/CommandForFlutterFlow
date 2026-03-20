# FlutterFlow Dart Code Review Rules

## STEP 0: IDENTIFY ARTIFACT SURFACE

Determine the surface FIRST. Rules differ per surface. State it at the top of your audit.

| Signal | Surface |
|--------|---------|
| Class extends `StatelessWidget` or `StatefulWidget` | **Custom Widget** |
| Top-level `Future<T>` function (no class) | **Custom Action** |
| Top-level synchronous function returning primitive/List | **Custom Function** |
| Plain class, enum, or utility (no widget, no async entry) | **Code File** |

**Recognition rule:** Any class extending `StatelessWidget` or `StatefulWidget` is a Custom Widget. Do NOT require `createState()`, a companion `State` subclass, or any other `StatefulWidget`-only pattern before classifying code as a Custom Widget.

---

## SURFACE-SPECIFIC CONSTRAINTS

### Custom Functions
- NO external imports. Only predefined (`dart:convert`, `dart:math`, `flutter/material.dart`, `google_fonts`, `intl`, `timeago`, `cloud_firestore`).
- MUST be synchronous. No `async`, no `await`, no `Future<T>` return.
- Returns: `String`, `int`, `double`, `bool`, `List`, `Map` only.

### Custom Actions
- Return type: ALWAYS `Future<T>`.
- `BuildContext context` is only valid when user has enabled "Include BuildContext" toggle in FF UI. If code uses `context`, flag as Required User Action.
- External imports: allowed below the "DO NOT REMOVE" boundary.
- FF auto-imports: do NOT include.

### Custom Widgets
- MUST accept nullable `double? width` and `double? height`.
- `StatelessWidget` is a fully valid Custom Widget surface. Do NOT flag missing `createState()` or a missing companion `State` class when no internal state is needed.
- External imports: allowed below the "DO NOT REMOVE" boundary.
- FF auto-imports: do NOT include.

### Code Files
- No generics (`class Box<T>`).
- No extensions (`extension Foo on Bar {}`).
- No function-typed fields (`final VoidCallback onTap;`).
- No `typedef` declarations (parser may reject).
- Must re-parse in FF UI after changes.

---

## ALLOWED PARAMETER TYPES

Only these types work in FF Custom Code UI:

**Primitives:** `String`, `bool`, `int`, `double`, `Color` (nullable), `DateTime`

**Lists:** `List<String>`, `List<int>`, `List<double>`, `List<bool>`, `List<SomeStruct>`

**FF types:** `DocumentReference`, `LatLng`, `FFPlace`, `FFUploadedFile`, `Uint8List` (Bytes), `dynamic` (JSON), FF Structs (`SomeNameStruct`)

**Widget Builder:** `Widget Function(BuildContext)`

**Callbacks:** `Future Function(TypeName paramName)?` — all params MUST be named, all types MUST be from the list above.

**FORBIDDEN as parameters:** `EdgeInsets`, `Duration`, `TextStyle`, `Offset`, arbitrary Dart classes. Decompose into primitives.

---

## APP STATE vs PAGE STATE TYPES

**App State** (global, cross-page) supports: Integer, Double, String, Boolean, Color, ImagePath, VideoPath, AudioPath, DocumentReference, DateTime, JSON, LatLng, Data Type (Structs), Enum, CustomClass, CustomEnum, Lists of the above. **Does NOT support Bytes/Uint8List/FFUploadedFile.**

**Page State** (local to one page) supports everything above PLUS Bytes (`Uint8List`).

---

## RESERVED PARAMETER NAMES (INSTANT COMPILATION FAILURE)

Never use these as widget constructor parameter names: `key`, `context`, `widget`, `state`, `mounted`, `setState`.

`key` is the #1 cause of mysterious failures. It conflicts with `Widget.key` and `super.key`. Rename to `keyLabel`, `keyValue`, `keyChar`, `apiKey`, etc.

**Clarification:** `mounted` is forbidden as a *parameter name*. Using `if (mounted)` inside widget method bodies is correct Flutter practice and should NOT be flagged.

---

## CRITICAL FAILURES (Score = 0)

Any one of these means the code will not compile in FlutterFlow.

| ID | Check | Fix |
|----|-------|-----|
| CF-1 | `void main()` / `main()` function | Remove entirely |
| CF-2 | `runApp()` call | Remove entirely |
| CF-3 | `MaterialApp` widget | Remove — this is harness code |
| CF-4 | `CupertinoApp` or `WidgetsApp` | Remove |
| CF-5 | `Scaffold` (unless spec requires it) | Remove or confirm intentional |
| CF-6 | Custom Dart class used as a cross-boundary parameter type | Use FF Struct or Code File. Private helpers inside the same file are OK. |
| CF-7 | Missing `width`/`height` on Custom Widget | Add `double? width, double? height` |
| CF-8 | Generics, extensions, or function-typed fields in Code File | Remove or move to Widget/Action |
| CF-9 | Reserved parameter name (`key`, `context`, `widget`, `state`, `setState`) | Rename: `key` to `keyLabel`, etc. |
| CF-10 | Bytes/Uint8List/FFUploadedFile written to `FFAppState()` | Use callback to pass bytes to FF (Page State), convert to base64 String, or upload and store URL |
| CF-11 | Callback param uses non-FF type (`Uint8List`, `Offset`, custom class) | Replace with FF-compatible type or convert before passing |
| CF-12 | Unnamed callback parameter: `Function(String)?` instead of `Function(String value)?` | Add a name after the type |
| CF-13 | `async` / `Future` return in Custom Function | Refactor as Custom Action, or remove async |
| CF-14 | Custom import in Custom Function | Move to Custom Action or Widget |
| CF-15 | `dart:io` in web-targeted project or `dart:html` in native-targeted project (no platform guard) | Add conditional import or remove. If platform scope unknown, flag as W-8 instead. |

---

## SEVERE WARNINGS (Score: -20 each)

| ID | Check | Fix |
|----|-------|-----|
| SW-1 | External package used without documenting the FF dependency requirement | Add to Required User Actions with pinned version |
| SW-2 | Unsafe `!` operator without preceding null check | Use `??` or `?.` instead |
| SW-3 | `FFAppState()` write without `FFAppState().update()` wrapper | Wrap: `FFAppState().update(() { ... });` |
| SW-4 | Hardcoded `Colors.*` instead of `FlutterFlowTheme.of(context).*` | Replace with theme reference |
| SW-5 | Missing `dispose()` for AnimationController, StreamSubscription, Timer, TextEditingController, etc. | Add `dispose()` override |
| SW-6 | Navigation, Firestore writes, or auth logic embedded inside a widget | Extract to callback: `Future Function()?` |
| SW-7 | Wrong callback signature: `VoidCallback`, `ValueChanged<T>`, `void Function(T)` | Use `Future Function(T paramName)?` |
| SW-8 | Assumed FFAppState variable names (`FFAppState().uploadedSignature`) | Replace with callback, or add `// REQUIRED: Create App State variable 'name' of type X in FlutterFlow` |
| SW-9 | Direct property mutation on external package controllers (`_controller.penColor = value`) | Dispose and re-create controller |
| SW-10 | Missing `await` on callback invocation (`widget.onTap?.call()` without `await`) | Add `await`: `await widget.onTap?.call();` |
| SW-11 | `BuildContext` used in Custom Action without confirming "Include BuildContext" toggle | Document as Required User Action |
| SW-12 | Unpinned dependency version or broad `^x.y.z` constraint | Recommend pinned version; flag transitive conflict risk with FF's own deps |

---

## WARNINGS (Score: -10 each)

| ID | Check | Fix |
|----|-------|-----|
| W-1 | Deprecated Flutter API (e.g., `WillPopScope` instead of `PopScope`) | Update to current API |
| W-2 | Possible package API hallucination (setter/method that may not exist in the specified version) | Verify against package docs |
| W-3 | No null handling for nullable parameters | Add `??` defaults or `?.` guards |
| W-4 | No `LayoutBuilder` for size-dependent rendering | Wrap in `LayoutBuilder` |
| W-5 | Potential unbounded size / overflow | Constrain dimensions |
| W-6 | `setState` in Custom Action (should only be in Widget) | Remove or refactor |
| W-7 | Name mismatch risk: class/function name may not match FF UI registration | Verify or flag |
| W-8 | Platform-specific import (`dart:io`, `dart:html`) — platform scope unclear | Flag and document the constraint |
| W-9 | `Widget Function(BuildContext)` used as data-return callback instead of widget builder | Use `Future Function(T paramName)?` for data return |

---

## GOOD PRACTICES (+5 each)

- Uses `FlutterFlowTheme.of(context)` for colors
- Proper null safety with `??` and `?.`
- Uses FF Struct types for cross-boundary data
- Proper `dispose()` for all acquired resources
- Uses `LayoutBuilder` for safe sizing
- Correct callback: `Future Function(TypeName paramName)?`
- Uses `FFAppState().update()` for writes
- Inversion-of-control: callbacks for actions, no embedded logic
- No hardcoded FFAppState variable names
- Dependencies listed with pinned versions

---

## SCORING

**Any Critical Failure present: Score = 0.**

Otherwise: start at 100, subtract 20 per Severe Warning, subtract 10 per Warning, add 5 per Good Practice. Floor 0, ceiling 100.

---

## OUTPUT FORMAT

```
## Artifact Surface: [Custom Widget | Custom Action | Custom Function | Code File]

## Overall Score: [0-100]/100
[One sentence. If 0, state which CF caused it.]

## Critical Issues
[CF-N: description, line reference, why it breaks, before/after fix]

## Severe Warnings
[SW-N: description, line reference, fix]

## Warnings
[W-N: description, fix]

## Good Practices
[List with +5 each]

## Required User Actions in FlutterFlow
- Dependencies to add (name + pinned version)
- Data Types/Structs to create (field names + types)
- Parameters to define in Custom Code UI (name, type, nullable, isList)
- Toggles to enable (e.g., "Include BuildContext")
- Configuration files to edit (AndroidManifest, Info.plist)

## Code Fixes
[Before/after for each issue requiring code changes]
```

---

## TROUBLESHOOTING ORDER

When a build fails after injection, check in this order:

1. Name mismatch (Dart class/function name vs FF UI name)
2. Parameter mismatch (names, types, nullability, `isList` flags)
3. Imports above the "DO NOT REMOVE" boundary, or imports in Custom Function
4. Missing dependency in Project Dependencies
5. Struct vs Dart class type mismatch
6. FFAppState write without `.update()` wrapper
7. Web analyzer false positive — compile locally to verify; use "Exclude from Compilation" toggle if confirmed false
8. BuildContext missing in Custom Action — enable "Include BuildContext" toggle
9. Callback param type inference failure (common with Firestore DocumentReference) — fall back to AppState or JSON transport
10. Forbidden complex types: EdgeInsets, Duration, TextStyle
