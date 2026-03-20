# FlutterFlow Dart Code Generation Rules

## STEP 0: CONFIRM ARTIFACT SURFACE

Before writing any code, confirm which surface you are generating for. The constraints differ per surface.

| Surface | Entry Point | Return | Imports | Key Constraint |
|---------|-------------|--------|---------|----------------|
| **Custom Function** | Top-level sync function | `String`, `int`, `double`, `bool`, `List`, `Map` | NO external imports. Only `dart:convert`, `dart:math`, `flutter/material.dart`, `google_fonts`, `intl`, `timeago`, `cloud_firestore`. | No `async`, no `await`, no `Future` |
| **Custom Action** | Top-level async function | `Future<T>` always | External packages allowed below boundary. Do NOT include FF auto-imports. | `BuildContext` only if user enabled "Include BuildContext" toggle |
| **Custom Widget** | Class extending `StatelessWidget` or `StatefulWidget` | N/A (visual) | External packages allowed below boundary. Do NOT include FF auto-imports. | MUST accept `double? width`, `double? height` |
| **Code File** | Plain class, enum, utility | N/A | Standard Dart only | No generics, no extensions, no function-typed fields, no `typedef` |

---

## DO NOT INCLUDE (FF adds these automatically at commit)

```
flutter_flow_theme.dart
flutter_flow_util.dart
index.dart (relative)
/custom_code/actions/index.dart
/flutter_flow/custom_functions.dart
package:flutter/material.dart
```

Do not include comments like `// Automatic FlutterFlow imports` or `// Do not edit above`.

---

## ALLOWED PARAMETER TYPES

Only these types compile in FF Custom Code UI:

**Primitives:** `String`, `bool`, `int`, `double`, `Color` (nullable), `DateTime`

**Lists:** `List<String>`, `List<int>`, `List<double>`, `List<bool>`, `List<SomeStruct>`

**FF types:** `DocumentReference`, `LatLng`, `FFPlace`, `FFUploadedFile`, `Uint8List` (Bytes), `dynamic` (JSON), FF Structs (`SomeNameStruct`)

**Widget Builder:** `Widget Function(BuildContext)`

**FORBIDDEN:** `EdgeInsets` (use individual `double`s), `Duration` (use `int` milliseconds), `TextStyle` (decompose), `Offset`, arbitrary Dart classes.

---

## RESERVED PARAMETER NAMES (WILL NOT COMPILE)

Never use as widget constructor parameters: **`key`**, `context`, `widget`, `state`, `mounted`, `setState`.

`key` is the #1 generation bug. It conflicts with `Widget.key` / `super.key`, causing "Duplicated parameter name" and type mismatch. Always rename: `keyLabel`, `keyValue`, `keyChar`, `apiKey`, `mapKey`, etc.

**Concept trap:** When the widget IS about a "key" (keyboard key, API key, dictionary key), `key` feels like the right name. It is not. Rename it every time.

`mounted` is forbidden as a *parameter name*. Using `if (mounted)` inside widget method bodies is correct and should NOT be avoided.

---

## CALLBACKS (Primary data return mechanism)

**Signature:** `Future Function(TypeName paramName)?`

Every callback parameter MUST have a name. Anonymous params cause parser error.

```dart
// WRONG
final Future<dynamic> Function(String)? onComplete;     // anonymous param
final Future Function(Uint8List?)? onDone;               // non-FF type

// CORRECT
final Future Function(String result)? onComplete;        // named, FF type
final Future Function(FFUploadedFile? file)? onDone;     // FFUploadedFile wraps bytes
final Future Function(FFUploadedFile? bytes, dynamic json, String? label)? onValueChanged;
```

**Supported callback param types:** `String`, `int`, `double`, `bool`, `Color`, `DateTime`, `LatLng`, `FFPlace`, `FFUploadedFile`, `dynamic` (JSON), `DocumentReference`, FF Structs.

**Invocation:** ALWAYS await: `await widget.onComplete?.call(value);`

Never use `VoidCallback`, `ValueChanged<T>`, or `void Function(T)`.

---

## FFAPPSTATE RULES

- NEVER invent variable names. You do not know what exists in the user's project.
- Prefer callbacks over `FFAppState` writes.
- If `FFAppState` is unavoidable, add: `// REQUIRED: Create App State variable 'name' (Type) in FlutterFlow`
- Always use `.update()` for writes: `FFAppState().update(() { FFAppState().myVar = value; });`
- App State does NOT support `Bytes`/`Uint8List`/`FFUploadedFile`. Use callbacks to pass bytes to FF (user stores in Page State), convert to base64 `String`, or upload and store URL as `ImagePath`.

---

## WIDGET STRUCTURE

- Class name MUST match the artifact name from spec exactly (case-sensitive).
- Prefer `StatelessWidget` when no internal state is needed.
- Use `StatefulWidget` only for: `AnimationController`, gesture tracking, local transient UI state.
- State class: `_ArtifactNameState` (private, underscore prefix).
- Use `FlutterFlowTheme.of(context)` for colors. Not `Colors.*`.
- `width` and `height` are nullable. Render correctly when null. Do not overflow.
- Clamp values to prevent negative sizes: `size.clamp(0.0, maxSize)`.

---

## DISPOSE (MANDATORY for StatefulWidgets)

Every `StatefulWidget` MUST override `dispose()`. No exceptions.

Resources requiring disposal: `AnimationController`, `TextEditingController`, `ScrollController`, `FocusNode`, `StreamSubscription`, `Timer`, any external package controller.

```dart
@override
void dispose() {
  _animationController.dispose();
  _textController?.dispose();
  _subscription?.cancel();
  super.dispose();
}
```

---

## EXTERNAL PACKAGE SAFETY

- Only use packages explicitly listed in the spec's dependencies.
- NEVER assume mutable setters exist on package controller objects.
- When updating controller properties in `didUpdateWidget()`: dispose and re-create. Do NOT mutate.

```dart
// CORRECT
void didUpdateWidget(MyWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (widget.penColor != oldWidget.penColor) {
    _controller.dispose();
    _initializeController();
  }
}

// WRONG — setter may not exist
_controller.penColor = widget.penColor;
```

---

## INVERSION OF CONTROL

Do NOT embed inside widgets: navigation, Firestore writes, authentication, database operations.

Expose callbacks. Let FlutterFlow Action Flows handle business logic.

---

## PLATFORM IMPORTS

`dart:io` breaks on web. `dart:html` breaks on native. If the spec does not specify platform, avoid both. If platform-specific code is required, document the constraint.

Allowed Dart SDK imports: `dart:math`, `dart:convert`, `dart:async`, `dart:collection`, `dart:ui`.

---

## OUTPUT FORMAT

Output ONLY complete Dart code. No markdown fences. No preamble. No trailing explanation. Raw valid Dart that pastes directly into FlutterFlow's editor and compiles.
