import posthog from "posthog-js";

// --- CONFIGURATION ---
const IS_DEV = import.meta.env.DEV

// --- ANALYTICS ---
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only'
  });
}

function trackEvent(eventName, properties = {}) {
  if (POSTHOG_KEY) {
    try {
      posthog.capture(eventName, properties);
    } catch(e) {
    }
  }
}

// --- AUTH / SUBSCRIPTION CONFIG ---
const BUILDSHIP_BASE_URL = 'https://4tgke4.buildship.run'
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51R8y3MKszA2slvDX8402H2tJtQkNanGCSeAz8YA5hZ8mmiwAR9ztvhGHvzh2KX1KMZt4vvt6wlh1MUtw8C9kbpkJ00NFSVe4GL'
const STRIPE_PRICE_IDS = {
  professional: 'price_1T2ldCKszA2slvDXatdeCpbI',
  power: 'price_1T2le9KszA2slvDXR4mPvw7M'
}

const proGateAttachedSet = new WeakSet()

let authState = {
  email: null,
  sessionToken: null,
  isVerified: false,
}

let subscriptionState = {
  tier: 'free',
  status: 'none',
  periodEnd: null,
}

// --- PIPELINE ---
const PIPELINE_ENDPOINT = `${BUILDSHIP_BASE_URL}/service/runpipeline`

// --- IDENTITY RESOLUTION ---
const IDENTITY_COOKIE_KEY = 'bs_identity'
const IDENTITY_SESSION_KEY = 'bs_user_id'
const IDENTITY_ENDPOINT = `${BUILDSHIP_BASE_URL}/authUserCheck`

let identityState = {
  userId: null,
  status: null, // 'recognized' | 'new' | null
  resolved: false,
}

// --- TIER LIMITS ---
const TIER_LIMITS = {
  free: 2,
  professional: 50,
  power: 2000,
}

const FREE_MODEL = 'google/gemini-3.1-pro-preview'
const PRO_MODELS = [
  'anthropic/claude-4.6-opus',
  'openai/gpt-5.3-codex',
  'openrouter/auto',
  'openrouter/free',
]
const USAGE_STORAGE_KEY = 'ccc_usage'

// Model Configuration
const PROMPT_ARCHITECT_MODEL = "google/gemini-3-flash-preview"
const CODE_REVIEW_MODEL = "google/gemini-3-flash-preview"
const FALLBACK_MODEL = "google/gemini-3.1-pro-preview"

// --- DYNAMIC PRICING ---
const BASE_PRICES_AUD = { professional: 11, power: 49 }

const LOCALE_CURRENCY_MAP = {
  en_US: 'USD', en_GB: 'GBP', en_AU: 'AUD', en_NZ: 'NZD', en_CA: 'CAD',
  en_IN: 'INR', en_SG: 'SGD', en_HK: 'HKD', en_PH: 'PHP', en_ZA: 'ZAR',
  en: 'USD',
  de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', nl: 'EUR', pt_PT: 'EUR',
  pt_BR: 'BRL', pt: 'BRL',
  ja: 'JPY', ko: 'KRW', zh_CN: 'CNY', zh_TW: 'TWD', zh: 'CNY',
  th: 'THB', vi: 'VND', id: 'IDR', ms_MY: 'MYR', ms: 'MYR',
  sv: 'SEK', nb: 'NOK', da: 'DKK', pl: 'PLN', cs: 'CZK',
  hu: 'HUF', ro: 'RON', tr: 'TRY',
  ar: 'AED', he: 'ILS', ru: 'RUB', uk: 'UAH',
}

const AUD_EXCHANGE_RATES_FALLBACK = {
  AUD: 1, USD: 0.65, EUR: 0.60, GBP: 0.52, CAD: 0.88,
  NZD: 1.08, JPY: 97, KRW: 870, INR: 54, SGD: 0.87,
  HKD: 5.08, BRL: 3.18, CNY: 4.70, TWD: 20.5, THB: 22.5,
  VND: 16200, IDR: 10200, MYR: 2.88, SEK: 6.80, NOK: 6.95,
  DKK: 4.48, PLN: 2.60, CZK: 15.2, HUF: 238, RON: 2.98,
  TRY: 20.9, AED: 2.39, ILS: 2.38, PHP: 36.4, ZAR: 11.8,
  RUB: 58, UAH: 26.8, CHF: 0.57, MXN: 11.1, ARS: 580,
  CLP: 610, COP: 2700, PEN: 2.44,
}

let AUD_EXCHANGE_RATES = { ...AUD_EXCHANGE_RATES_FALLBACK }

async function fetchAudExchangeRates() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/AUD', { signal: controller.signal })
    if (!res.ok) return
    const data = await res.json()
    if (data.result !== 'success' || !data.rates) return
    const rates = data.rates
    const updated = { AUD: 1 }
    const allCurrencies = new Set([
      ...Object.keys(AUD_EXCHANGE_RATES_FALLBACK),
      ...Object.values(TIMEZONE_CURRENCY_MAP),
      ...Object.values(LOCALE_CURRENCY_MAP),
    ])
    for (const code of allCurrencies) {
      if (code === 'AUD') continue
      if (typeof rates[code] === 'number' && rates[code] > 0) {
        updated[code] = rates[code]
      } else if (AUD_EXCHANGE_RATES_FALLBACK[code]) {
        updated[code] = AUD_EXCHANGE_RATES_FALLBACK[code]
      }
    }
    AUD_EXCHANGE_RATES = updated
  } catch {
  } finally {
    clearTimeout(timeout)
  }
}

const TIMEZONE_CURRENCY_MAP = {
  'America/Sao_Paulo': 'BRL', 'America/Fortaleza': 'BRL', 'America/Recife': 'BRL',
  'America/Bahia': 'BRL', 'America/Belem': 'BRL', 'America/Manaus': 'BRL',
  'America/Cuiaba': 'BRL', 'America/Campo_Grande': 'BRL', 'America/Araguaina': 'BRL',
  'America/Noronha': 'BRL', 'America/Rio_Branco': 'BRL', 'America/Porto_Velho': 'BRL',
  'America/Boa_Vista': 'BRL', 'America/Maceio': 'BRL', 'America/Santarem': 'BRL',
  'America/Eirunepe': 'BRL',
  'Europe/London': 'GBP', 'Europe/Paris': 'EUR', 'Europe/Berlin': 'EUR',
  'Europe/Madrid': 'EUR', 'Europe/Rome': 'EUR', 'Europe/Amsterdam': 'EUR',
  'Europe/Brussels': 'EUR', 'Europe/Vienna': 'EUR', 'Europe/Lisbon': 'EUR',
  'Europe/Dublin': 'EUR', 'Europe/Helsinki': 'EUR', 'Europe/Athens': 'EUR',
  'Europe/Bucharest': 'RON', 'Europe/Budapest': 'HUF', 'Europe/Warsaw': 'PLN',
  'Europe/Prague': 'CZK', 'Europe/Copenhagen': 'DKK', 'Europe/Stockholm': 'SEK',
  'Europe/Oslo': 'NOK', 'Europe/Zurich': 'CHF', 'Europe/Istanbul': 'TRY',
  'Europe/Moscow': 'RUB', 'Europe/Kiev': 'UAH', 'Europe/Kyiv': 'UAH',
  'Asia/Tokyo': 'JPY', 'Asia/Seoul': 'KRW', 'Asia/Shanghai': 'CNY',
  'Asia/Taipei': 'TWD', 'Asia/Hong_Kong': 'HKD', 'Asia/Singapore': 'SGD',
  'Asia/Kolkata': 'INR', 'Asia/Calcutta': 'INR', 'Asia/Bangkok': 'THB',
  'Asia/Ho_Chi_Minh': 'VND', 'Asia/Jakarta': 'IDR', 'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Dubai': 'AED', 'Asia/Jerusalem': 'ILS', 'Asia/Tel_Aviv': 'ILS',
  'Asia/Manila': 'PHP',
  'Pacific/Auckland': 'NZD',
  'Australia/Sydney': 'AUD', 'Australia/Melbourne': 'AUD', 'Australia/Brisbane': 'AUD',
  'Australia/Perth': 'AUD', 'Australia/Adelaide': 'AUD', 'Australia/Hobart': 'AUD',
  'Australia/Darwin': 'AUD', 'Australia/Lord_Howe': 'AUD',
  'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'America/Edmonton': 'CAD',
  'America/Winnipeg': 'CAD', 'America/Halifax': 'CAD', 'America/St_Johns': 'CAD',
  'America/Regina': 'CAD',
  'America/New_York': 'USD', 'America/Chicago': 'USD', 'America/Denver': 'USD',
  'America/Los_Angeles': 'USD', 'America/Phoenix': 'USD', 'America/Anchorage': 'USD',
  'Pacific/Honolulu': 'USD',
  'America/Mexico_City': 'MXN', 'America/Cancun': 'MXN', 'America/Tijuana': 'MXN',
  'America/Argentina/Buenos_Aires': 'ARS',
  'America/Santiago': 'CLP', 'America/Bogota': 'COP', 'America/Lima': 'PEN',
  'Africa/Johannesburg': 'ZAR',
}

function detectUserCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && TIMEZONE_CURRENCY_MAP[tz]) return TIMEZONE_CURRENCY_MAP[tz]
  } catch {}
  const locale = navigator.language || 'en-US'
  const normalized = locale.replace('-', '_')
  const exactMatch = LOCALE_CURRENCY_MAP[normalized]
  if (exactMatch) return exactMatch
  const langOnly = normalized.split('_')[0]
  const langMatch = LOCALE_CURRENCY_MAP[langOnly]
  if (langMatch) return langMatch
  return 'USD'
}

function formatPrice(audAmount, currency) {
  const rate = AUD_EXCHANGE_RATES[currency] ?? AUD_EXCHANGE_RATES.USD
  const converted = audAmount * rate
  const rounded = Math.round(converted * 100) / 100
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: rounded >= 100 ? 0 : rounded % 1 === 0 ? 0 : 2,
    }).format(rounded)
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(audAmount * AUD_EXCHANGE_RATES.USD)
  }
}

// --- SHARED FLUTTERFLOW CONSTRAINTS TEMPLATE ---
// These constraints are shared across all three pipeline agents to ensure consistency.
// Based on "The Definitive Guide to Integrating Dart Artifacts into FlutterFlow Environments"

const FF_CORE_PHILOSOPHY = `## THE FLUTTERFLOW INTEGRATION PHILOSOPHY

**FlutterFlow is the host organism.** Your Dart must conform to FlutterFlow's boilerplate, parsing rules, and parameter system - not the other way around.

Key principles:
1. **Settings and code must match.** FlutterFlow binds custom code by name/signature. If the UI says the widget/action is \`NeuroRadialGauge\`, your Dart must export that exact class/function name. Name mismatches are a top cause of "mysterious" breakage.
2. **Headers are automatic.** The boilerplate header (with imports) is added automatically at commit time - generated code should be clean (class/function only).
3. **You are responsible for dependencies.** FlutterFlow won't auto-add pubspec packages. If the code imports it, you must add it in Project Dependencies (and sometimes native config).
4. **The Parser Gap is real.** FlutterFlow parses custom code to power the UI (parameter panels, variable pickers). That parser is stricter than Dart itself - valid Dart can still be "invalid" to FlutterFlow.`;

const FF_ARTIFACT_TYPES = `## THE FOUR ARTIFACT SURFACES

### A) Custom Functions (Pure/Sync Logic Silo)
- **Purpose:** Synchronous data manipulation, math calculations, string formatting
- **CRITICAL RESTRICTION:** NO external imports allowed. Stored in \`/lib/flutter_flow/custom_functions.dart\`.
- **Allowed Imports:** Only predefined imports (dart:convert, dart:math, package:flutter/material.dart, google_fonts, intl, timeago, cloud_firestore, etc). NO custom package imports.
- **Returns:** Synchronous value only (String, int, double, bool, List, Map) - NOT Future.
- **Use when:** Pure computation, no side effects, no async.

### B) Custom Actions (Async/Side Effects Silo)
- **Purpose:** API calls, complex logic, third-party libraries
- **Return type:** ALWAYS Future<T>
- **Imports:** 
  - External packages: include (e.g., \`import 'package:flutter_tts/flutter_tts.dart';\`)
  - FlutterFlow imports: DO NOT include - added at commit
- **Use when:** Async operations, external packages.

### C) Custom Widgets (Visual/UI Silo)
- **Purpose:** Custom UI components
- **Imports:** 
  - External packages: include (e.g., \`import 'package:percent_indicator/percent_indicator.dart';\`)
  - FlutterFlow imports: DO NOT include - added at commit
- **Parameters:** Must accept nullable \`width\` and \`height\`.
- **Use when:** Custom UI not in standard library.

### D) Code Files (Classes/Enums/Utilities) - NEW FEATURE
- **Purpose:** Reusable models, enums, utility classes.
- **Location:** \`lib/custom_code/\` (not synced unless in widgets/actions, but managed via UI).
- **Capabilities:** Create custom data types, use properties in UI.
- **Limitations:** No generics, no function-typed fields. Must re-parse in FF after changes.`;

const FF_TYPE_SYSTEM = `## FLUTTERFLOW TYPE SYSTEM (Parameters & State)

### Custom Code Parameter Types
Only these parameter types work in FlutterFlow's Custom Code UI. **ALWAYS Use Simple Types.**

- **Primitives:** String, bool, int, double, Color (nullable), DateTime
- **Lists:** List<String>, List<int>, List<double>, List<bool>, List<ProductStruct>
- **FlutterFlow Structs:** \`SomeNameStruct\` (UpperCamelCase, must exist in FF Data Types)
- **Special types:** DocumentReference, LatLng, FFPlace, FFUploadedFile, Uint8List (Bytes), dynamic (JSON)
- **Action callbacks (widget→FF, data OUT — PREFERRED data return pattern):** Use \`Future Function(ParamType paramName, ...)?\` to pass data from the widget/action back to FlutterFlow. This is the **primary** way to surface data from custom code. Parameters MUST be standard FlutterFlow data types and MUST have names. Example:
  \`\`\`dart
  final Future Function(
      FFUploadedFile? bytes, dynamic jsonObject, String? string)?
      onValueChanged;
  \`\`\`
  Supported param types: \`String\`, \`int\`, \`double\`, \`bool\`, \`Color\`, \`DateTime\`, \`LatLng\`, \`FFPlace\`, \`FFUploadedFile\`, \`dynamic\` (JSON), \`DocumentReference\`, FlutterFlow Structs.
- **Action callbacks (FF→widget, data IN):** Same syntax — \`Future<dynamic> Function(String value)?\` etc. FlutterFlow passes a value from an Action Flow into the widget callback. Same type rules apply.
- **⛔ CRITICAL: Named Callback Parameters Required:** All callback parameters MUST have a name (both directions). FlutterFlow's parser rejects anonymous parameters.
  
  **❌ WRONG — Missing parameter name:**
  \`\`\`dart
  final Future<dynamic> Function(String)? onDrawingComplete;  // ❌ Parser error
  \`\`\`
  
  **✅ CORRECT — Parameter has a name:**
  \`\`\`dart
  final Future<dynamic> Function(String drawing)? onDrawingComplete;  // ✅ Works
  \`\`\`
  
  All callback parameters must be named: \`Function(String value)\`, \`Function(int index)\`, \`Function(bool isValid)\`, etc.
- **Widget Builder:** \`Widget Function(BuildContext)\`

**FORBIDDEN COMPLEX TYPES:**
- ❌ EdgeInsets (use individual doubles: paddingLeft, paddingRight...)
- ❌ Duration (use int milliseconds)
- ❌ TextStyle (break into properties)

### App State Variable Types (CRITICAL — different from parameter types)
App State variables (global, persistent across pages) support ONLY:
- Integer, Double, String, Boolean, Color
- ImagePath, VideoPath, AudioPath
- DocumentReference, DateTime, JSON, LatLng
- Data Type (FF Structs), Enum, CustomClass, CustomEnum
- Lists of any of the above

**App State does NOT support Bytes/Uint8List/FFUploadedFile.** This is a common pitfall — code that stores raw byte data (image bytes, file bytes, signature data) directly in FFAppState will fail to compile.

### Page State Variable Types
Page State variables (local to a single page) support everything App State does, PLUS:
- ✅ Bytes (Uint8List) — available ONLY in Page State, not App State

### Implications for Code Generation
- When the user needs to store byte data: use a callback to pass bytes back to FlutterFlow (user can store in Page State), or convert to base64 String for App State storage, or upload to storage and store the resulting URL as ImagePath.
- NEVER generate code that writes FFUploadedFile or Uint8List to FFAppState — it will not compile.

**IMPORTANT:** Custom Dart classes for data exchange are now allowed via "Code Files", but Structs are still preferred for parameters visible in the UI builder.`;

const FF_STATE_PATTERNS = `## STATE & DATA: FFAppState Patterns

FlutterFlow's generated \`FFAppState\` is a **global singleton that extends ChangeNotifier**.

**CRITICAL WARNING FOR CODE GENERATION:** The variable names below (myVar, localValue) are EXAMPLES ONLY. Generated code must NEVER assume any specific FFAppState variables exist in the user's project. If a variable is referenced, it MUST be documented as a required user action ("Create App State variable X of type Y in FlutterFlow").

### App State vs Page State: Allowed Types

**App State variables** (global, persist across pages) support ONLY these types:
- Integer, Double, String, Boolean, Color
- ImagePath, VideoPath, AudioPath
- DocumentReference, DateTime, JSON, LatLng
- Data Type (custom FF Structs), Enum
- CustomClass, CustomEnum
- Lists of any of the above

**App State does NOT support:**
- ❌ Bytes / Uint8List / FFUploadedFile — these CANNOT be stored in App State
- ❌ Arbitrary Dart objects or custom classes not registered as FF Data Types

**Page State variables** (local to a single page) support everything App State does, PLUS:
- ✅ Bytes (Uint8List) — available in Page State only

**CRITICAL IMPLICATION:** Code that tries to store raw byte data (e.g., image bytes, file bytes, signature PNG data) in FFAppState will fail. For byte data:
1. Use a callback parameter to pass bytes back to FlutterFlow, and let the user store it in Page State or upload it.
2. If persistence across pages is needed, convert bytes to a base64 String and store that in App State instead.
3. Alternatively, upload the bytes to storage and store the resulting URL (ImagePath) in App State.

### Reading state (non-reactive):
\`\`\`dart
final v = FFAppState().myVar; // 'myVar' must exist in the user's FF project
\`\`\`

### Writing state (reactive across app):
\`\`\`dart
FFAppState().update(() => FFAppState().myVar = newValue);
\`\`\`
This triggers \`notifyListeners()\` and updates all subscribed pages.

### Returning values from Custom Widgets:
FlutterFlow doesn't directly "pull" values out of widgets. Two patterns (in order of preference):
1. **Callbacks (PREFERRED):** Use action callback parameters with standard FF data types — lets the user wire the data flow in FlutterFlow UI without needing specific app state variables. Callbacks can carry data directly as named parameters: \`Future Function(FFUploadedFile? bytes, dynamic jsonObject, String? result)? onValueChanged\`. This is the primary mechanism for surfacing data from custom widgets/actions.
2. **AppState workaround (LAST RESORT):** Store result in FFAppState when callback typing is fragile. NOTE: The variable MUST already exist in the user's project, and the value MUST be one of the allowed App State types listed above:
\`\`\`dart
// REQUIRED: Create App State variable 'localValue' (String) in FlutterFlow first
FFAppState().update(() {
  FFAppState().localValue = 'setvalue';
});
\`\`\``;

const FF_FORBIDDEN_PATTERNS = `## FORBIDDEN PATTERNS (Will cause build failures)

- \`void main()\` or \`main()\` function
- \`runApp()\` call
- \`MaterialApp\` or \`Scaffold\` (except rarely)
- Modifying the mandatory header comments or imports ABOVE the "DO NOT REMOVE" line.
- Importing packages without adding them to Project Dependencies (in UI).
- Adding custom imports to Custom Functions (strictly forbidden).
- Using complex parameter types (EdgeInsets, Duration, TextStyle) in Widgets/Actions.
- Using generics or function-typed fields in Code Files.

### ⛔ CRITICAL: RESERVED PARAMETER NAMES (INSTANT COMPILATION FAILURE)

**NEVER name a widget parameter \`key\`. This is THE #1 CAUSE of mysterious build failures.**

**Why it breaks:**
- Flutter widgets inherit a \`Key? key\` property from \`Widget.key\`
- FlutterFlow auto-injects \`super.key\` in widget constructors
- Adding \`this.key\` creates TWO parameters named \`key\` → "Duplicated parameter name" error
- Your custom \`String? key\` conflicts with Flutter's \`Key? key\` → type mismatch error

**WRONG — WILL NOT COMPILE:**
\`\`\`dart
class KeyboardHintWidget extends StatelessWidget {
  final String? key;   // ❌ CONFLICTS with Widget.key
  final String? label;
  const KeyboardHintWidget({super.key, this.key, this.label}); // ❌ DUPLICATED
}
\`\`\`

**CORRECT — RENAME THE PARAMETER:**
\`\`\`dart
class KeyboardHintWidget extends StatelessWidget {
  final String? keyLabel;  // ✅ Renamed from 'key' to 'keyLabel'
  final String? label;
  const KeyboardHintWidget({super.key, this.keyLabel, this.label}); // ✅ Works
}
\`\`\`

**Alternative names for \`key\` parameter:**
- \`keyLabel\`, \`keyValue\`, \`keyText\`, \`keyName\`, \`keyChar\`, \`keyCode\`
- \`apiKey\`, \`dictKey\`, \`mapKey\`, \`cacheKey\`, \`storageKey\`
- Or describe the purpose: \`buttonLabel\`, \`shortcutKey\`, \`accessKey\`

**⚠️ CONCEPT TRAP (most common mistake):**
When your widget's concept IS "a key" (keyboard key, API key, dictionary key, map key), you will feel tempted to name the parameter \`key\`. **DO NOT DO IT.** The semantic fit is perfect, but it will break compilation. Always rename: a \`KeyboardHintWidget\` uses \`keyLabel\` or \`keyChar\`, never \`key\`.

**Other reserved parameter names:** \`context\`, \`widget\`, \`state\`, \`mounted\`, \`setState\` — these conflict with Flutter framework internals.

### EXTERNAL PACKAGE API SAFETY
- NEVER assume mutable setters exist on controller or configuration objects from external packages.
- Package APIs change between versions — if you are not 100% certain a setter exists, do NOT use it.
- When you need to change controller properties after construction (e.g., in \`didUpdateWidget()\`): dispose the old controller and re-create it with new values. Do NOT attempt to mutate properties directly.
- Example (CORRECT):
  \`\`\`dart
  void didUpdateWidget(MyWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.penColor != oldWidget.penColor) {
      _controller.dispose();
      _initializeController(); // Re-create with new values
    }
  }
  \`\`\`
- Example (WRONG — may not compile if setter doesn't exist):
  \`\`\`dart
  _controller.penColor = widget.penColor; // Setter may not exist!
  \`\`\`

### FFAPPSTATE VARIABLE RULES
- NEVER reference specific FFAppState variable names (e.g., \`FFAppState().uploadedSignature\`, \`FFAppState().myCustomVar\`). You cannot know what variables exist in the user's project.
- Instead of writing to FFAppState directly: use callback parameters (\`Future Function()?\`) to communicate data back to FlutterFlow, letting the user wire it to their own app state in the FlutterFlow UI.
- If storing data in FFAppState is absolutely necessary for the pattern to work, you MUST:
  1. Add a clear code comment: \`// REQUIRED: Create an App State variable named 'yourVarName' of type X in FlutterFlow\`
  2. Document this in the output as a required user action
  3. Prefer the callback pattern over direct FFAppState access whenever possible`;

const FF_REQUIRED_PATTERNS = `## REQUIRED PATTERNS (For FlutterFlow compatibility)

### Headers (MANDATORY)
- **Custom Widgets:** Must start with the widget-specific header (see Artifact Types).
- **Custom Actions:** Must start with the action-specific header (see Artifact Types).

### Null Safety
- 100% null-safe Dart. Use \`??\` or \`?.\` over \`!\`.

### Widget Parameters
- ALWAYS include nullable \`width\` and \`height\`.
- Use simple types only (e.g., \`double? padding\` instead of \`EdgeInsets?\`).

### Callbacks & Actions
- **Signature:** \`final Future Function()? onTap;\` or \`final Future Function(String)? onChanged;\`
- **Invocation:** \`await widget.onTap?.call();\` (ALWAYS await actions).

### Dependencies
- **Widgets/Actions:** Imports go BELOW the "DO NOT REMOVE" line.
- **Project Scope:** Dependencies must be added via FlutterFlow UI (Settings -> Project Dependencies).`;

const FF_INTEGRATION_GAP_TABLE = `## THE INTEGRATION GAP (What AI vs. FF Needs)

| Issue | AI Default | FlutterFlow Requirement |
|-------|------------|--------------------------|
| **Imports** | Normal imports | **MANDATORY Header** with specific imports first |
| **Params** | \`EdgeInsets\` | Individual \`double\`s (paddingTop, etc) |
| **Duration** | \`Duration\` | \`int\` (milliseconds) |
| **Callbacks** | \`VoidCallback\` | \`Future Function()\` (always await) |
| **Colors** | \`Colors.blue\` | \`FlutterFlowTheme.of(context).primary\` |
| **State** | \`State<T>\` | \`FFAppState().update(() {...})\` |`;

const FF_TROUBLESHOOTING_CHECKLIST = `## TROUBLESHOOTING CHECKLIST

1. **Header Mismatch:** Does the file start with the EXACT required boilerplate?
2. **Type Issues:** Are you using EdgeInsets, Duration, or TextStyle? (Forbidden).
3. **Imports:** Are custom imports BELOW the "DO NOT REMOVE" line?
4. **Dependencies:** Did you add packages to Project Dependencies in the UI?
5. **Actions:** Are you awaiting callbacks? (\`await widget.onTap()\`)
6. **State:** Use \`FFAppState().update()\` for reactive changes.`;

// --- NEW SECTIONS COMPLETED BASED ON RESEARCH (DEFINITIVE GUIDE) ---

const FF_PROMPT_PROTOCOL = `## THE "CLEAN ROOM" PROMPT PROTOCOL
Use this preamble for all code generation.

> "Act as a Senior Flutter Developer for FlutterFlow."
> 1. **No Header Needed:** Do NOT include import statements or boilerplate headers - these are added automatically at commit time.
> 2. **Types:** Use ONLY simple types (double, int, String, bool). NO complex Flutter types like EdgeInsets, Duration, TextStyle.
> 3. **Actions:** Callbacks must return \`Future\`. Await them.
> 4. **Theme:** Use \`FlutterFlowTheme.of(context)\`.
> 5. **Null Safety:** Strict. \`width\`/\`height\` are nullable.`;

const FF_WORKFLOW_PROTOCOL = `## TRI-SURFACE INTEGRATION WORKFLOW

### Phase 1: Extraction
1. **Isolate Core Class:** Extract only the main Widget/Action code.
2. **Identify Helpers:** Separate internal data models (convert to Structs).
3. **Capture Imports:** List all external packages (add to Project Dependencies).

### Phase 2: Injection
1. **Generate:** Code is generated WITHOUT headers (clean class/function only).
2. **Commit:** Headers are added AUTOMATICALLY when committing to FlutterFlow.
3. **Refactor Name:** Ensure \`class [WidgetName]\` matches exactly.
4. **Refactor Colors:** Use \`FlutterFlowTheme.of(context).primary\`.
5. **Refactor Logic:** Convert calls to \`Future Function()\` callbacks.`;

// Compose the full shared template
const FF_SHARED_CONSTRAINTS = `${FF_CORE_PHILOSOPHY}

---

${FF_ARTIFACT_TYPES}

---

${FF_TYPE_SYSTEM}

---

${FF_STATE_PATTERNS}

---

${FF_FORBIDDEN_PATTERNS}

---

${FF_REQUIRED_PATTERNS}

---

${FF_INTEGRATION_GAP_TABLE}

---

${FF_PROMPT_PROTOCOL}

---

${FF_WORKFLOW_PROTOCOL}

---

${FF_TROUBLESHOOTING_CHECKLIST}`;

// --- SECURE STORAGE (AES-256-GCM encryption) ---
const STORAGE_KEY_PREFIX = "ccc_api_key_";
const ENCRYPTION_KEY_NAME = "ccc_encryption_key";

// Generate or retrieve encryption key using Web Crypto API
async function getEncryptionKey() {
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);

  if (storedKey) {
    const keyData = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      "jwk",
      keyData,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  }

  // Generate a new key derived from a device fingerprint + random salt
  const fingerprint = await generateDeviceFingerprint();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Use PBKDF2 to derive a key from the fingerprint
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(fingerprint),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  // Store the key in session storage (clears when browser closes)
  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));

  // Store salt in localStorage for key regeneration
  localStorage.setItem(STORAGE_KEY_PREFIX + "salt", arrayBufferToBase64(salt));

  return key;
}

// Generate a simple device fingerprint for key derivation
async function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];

  const fingerprint = components.join("|");
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToBase64(hashBuffer);
}

// Encrypt data using AES-256-GCM
async function encryptData(plaintext) {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(plaintext),
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined);
}

// Decrypt data using AES-256-GCM
async function decryptData(encryptedBase64) {
  try {
    const key = await getEncryptionKey();
    const combined = base64ToArrayBuffer(encryptedBase64);

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    return null;
  }
}

// Helper functions for base64 encoding/decoding
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- API KEY MANAGEMENT ---

async function saveApiKey(provider, apiKey) {
  if (!apiKey || apiKey.trim() === "") {
    localStorage.removeItem(STORAGE_KEY_PREFIX + provider);
    return;
  }

  const encrypted = await encryptData(apiKey.trim());
  localStorage.setItem(STORAGE_KEY_PREFIX + provider, encrypted);
}

async function getApiKey(provider) {
  // Only check user-stored key - no environment fallback
  const encrypted = localStorage.getItem(STORAGE_KEY_PREFIX + provider);
  if (encrypted) {
    const decrypted = await decryptData(encrypted);
    if (decrypted) return decrypted;

    // If decryption failed, clean up the stale encrypted data
    localStorage.removeItem(STORAGE_KEY_PREFIX + provider);
  }

  // Return empty string if no user key is configured
  return "";
}

function getFlutterFlowEndpoint() {
  return (
    localStorage.getItem("flutterflow_api_endpoint") ||
    FF_API_ENDPOINTS.production
  );
}

function setFlutterFlowEndpoint(endpoint) {
  localStorage.setItem("flutterflow_api_endpoint", endpoint);
  return true;
}

function hasStoredKey(provider) {
  const keys = {
    flutterflow: flutterflowApiKey,
    flutterflow_project_id: flutterflowProjectId,
  }
  return keys[provider] && keys[provider].length > 0
}

// Get current active API keys (for use in API calls)
let flutterflowApiKey = "";
let flutterflowProjectId = "";

async function initializeApiKeys() {
  flutterflowApiKey = await getApiKey("flutterflow");
  flutterflowProjectId = await getApiKey("flutterflow_project_id");
  updateApiKeyStatusIndicators();
  updateDeployButtonVisibility();
}

// --- API KEY UI FUNCTIONS ---

function openApiKeysModal() {
  const modal = document.getElementById("api-keys-modal");
  modal.classList.add("open");

  // Load current keys into inputs (masked)
  loadApiKeyInputs();
}

function closeApiKeysModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("api-keys-modal");
  if (modal) {
    modal.classList.remove("open");
  }
  // Show walkthrough again after closing API keys
  const walkthroughModal = document.getElementById("walkthrough-modal");
  if (walkthroughModal) {
    advanceWalkthrough();
    walkthroughModal.classList.add("open");
  }
}

let walkthroughStep = 1;

function getWalkthroughSteps() {
  const container = document.querySelector('.wt-steps');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.wt-step-card'));
}

function updateWalkthroughUI() {
  const steps = getWalkthroughSteps();
  if (!steps.length) return;
  steps.forEach((stepEl, idx) => {
    const i = idx + 1;
    if (i === walkthroughStep) {
      stepEl.classList.remove("opacity-60", "bg-gray-50", "border-gray-200");
      stepEl.classList.add("bg-blue-50", "border-blue-200");
      const numEl = stepEl.querySelector("div:first-child");
      if (numEl) {
        numEl.classList.remove("bg-gray-400");
        numEl.classList.add("bg-blue-500");
        numEl.innerHTML = i;
      }
    } else if (i < walkthroughStep) {
      stepEl.classList.remove("opacity-60", "bg-blue-50", "border-blue-200");
      stepEl.classList.add("bg-green-50", "border-green-200");
      const numEl = stepEl.querySelector("div:first-child");
      if (numEl) {
        numEl.classList.remove("bg-blue-500", "bg-gray-400");
        numEl.classList.add("bg-green-500");
        numEl.innerHTML = "✓";
      }
    } else {
      stepEl.classList.add("opacity-60", "bg-gray-50", "border-gray-200");
      stepEl.classList.remove(
        "bg-blue-50",
        "border-blue-200",
        "bg-green-50",
        "border-green-200",
      );
      const numEl = stepEl.querySelector("div:first-child");
      if (numEl) {
        numEl.classList.remove("bg-blue-500", "bg-green-500");
        numEl.classList.add("bg-gray-400");
        numEl.innerHTML = i;
      }
    }
  });
}

function advanceWalkthrough() {
  const totalSteps = getWalkthroughSteps().length;
  if (totalSteps > 0 && walkthroughStep <= totalSteps) {
    walkthroughStep++;
    updateWalkthroughUI();
  }
}

function openWalkthroughModal() {
}

function closeWalkthroughModal(event) {
}

function showWalkthroughIfNeeded() {
}

async function loadApiKeyInputs() {
  const flutterflowInput = document.getElementById("flutterflow-api-key-input");
  const projectIdInput = document.getElementById(
    "flutterflow-project-id-input",
  );

  if (flutterflowApiKey) {
    flutterflowInput.value = "";
    flutterflowInput.placeholder = "Key saved (enter new to replace)";
  } else {
    flutterflowInput.placeholder = "Enter your FlutterFlow API key";
  }

  if (flutterflowProjectId) {
    projectIdInput.value = "";
    projectIdInput.placeholder = "Project ID saved (enter new to replace)";
  } else {
    projectIdInput.placeholder = "Enter your FlutterFlow Project ID";
  }

  updateModalKeyStatuses();
}

function updateModalKeyStatuses() {
  updateKeyStatus("flutterflow", "flutterflow-key-status");
  updateKeyStatus("flutterflow_project_id", "flutterflow-project-status");
}

function updateKeyStatus(provider, statusElementId) {
  const statusEl = document.getElementById(statusElementId);
  if (!statusEl) return;

  const dot = statusEl.querySelector(".key-status-dot");
  const text = statusEl.querySelector("span");

  if (hasStoredKey(provider)) {
    dot.className = "key-status-dot configured";
    text.className = "text-green-600";
    text.textContent = "User key configured";
  } else {
    dot.className = "key-status-dot missing";
    text.className = "text-gray-500";
    text.textContent = "Not configured";
  }
}

function updateDeployButtonVisibility() {
}

function updateApiKeyStatusIndicators() {
  const container = document.getElementById("api-keys-status");
  if (!container) return;

  const dots = container.querySelectorAll(".key-status-dot");
  const providers = [
    "flutterflow",
  ];

  dots.forEach((dot, index) => {
    const provider = providers[index];
    if (provider === "flutterflow") {
      // For FlutterFlow, check both API key and Project ID
      if (
        hasStoredKey("flutterflow") &&
        hasStoredKey("flutterflow_project_id")
      ) {
        dot.className = "key-status-dot configured";
        dot.title = "FlutterFlow (Fully configured)";
      } else if (
        hasStoredKey("flutterflow") ||
        hasStoredKey("flutterflow_project_id")
      ) {
        dot.className = "key-status-dot env";
        dot.title = "FlutterFlow (Partially configured)";
      } else {
        dot.className = "key-status-dot missing";
        dot.title = "FlutterFlow (Not configured)";
      }
    } else if (hasStoredKey(provider)) {
      dot.className = "key-status-dot configured";
      dot.title =
        provider.charAt(0).toUpperCase() + provider.slice(1) + " (User key)";
    } else {
      dot.className = "key-status-dot missing";
      dot.title =
        provider.charAt(0).toUpperCase() +
        provider.slice(1) +
        " (Not configured)";
    }
  });

  // Toggle deploy button visibility
  updateDeployButtonVisibility();
}

async function saveApiKeys() {
  const flutterflowInput = document.getElementById("flutterflow-api-key-input");
  const projectIdInput = document.getElementById(
    "flutterflow-project-id-input",
  );

  // Only save if user entered a new value
  if (flutterflowInput.value.trim()) {
    await saveApiKey("flutterflow", flutterflowInput.value);
  }
  if (projectIdInput.value.trim()) {
    if (!validateFlutterFlowProjectId(projectIdInput.value)) {
      showToast("Invalid FlutterFlow Project ID. Must be at least 5 characters (letters, numbers, dashes).", "error");
      projectIdInput.focus();
      return;
    }
    await saveApiKey("flutterflow_project_id", projectIdInput.value);
  }

  // Reinitialize keys
  await initializeApiKeys();

  // Update UI
  loadApiKeyInputs();

  // Show confirmation
  const btn = document.querySelector("#api-keys-modal .bg-blue-500");
  const originalText = btn.textContent;
  btn.textContent = "Saved!";
  btn.classList.remove("bg-blue-500", "hover:bg-blue-600");
  btn.classList.add("bg-green-500");

  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove("bg-green-500");
    btn.classList.add("bg-blue-500", "hover:bg-blue-600");
    closeApiKeysModal();
  }, 1000);
}

async function clearAllApiKeys() {
  if (!confirm("Are you sure you want to clear all stored API keys?")) return;

  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow_project_id");

  // Reinitialize keys
  await initializeApiKeys();

  // Update UI
  loadApiKeyInputs();
}

// --- FLUTTERFLOW CREDENTIAL VALIDATION ---

function validateFlutterFlowApiKey(key) {
  return Boolean(key && key.trim().length > 0);
}

function validateFlutterFlowProjectId(projectId) {
  // FF Project IDs are alphanumeric with dashes, typically format: name-1234-abcd
  if (!projectId || projectId.trim().length < 5) return false;
  if (projectId.includes(" ")) return false;
  return /^[a-zA-Z0-9-]+$/.test(projectId);
}

function updateInputValidationState(inputId, isValid) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (!input.value) {
    input.style.borderColor = ""; // Reset to default
  } else if (isValid) {
    input.style.borderColor = "#22c55e"; // Green
  } else {
    input.style.borderColor = "#ef4444"; // Red
  }
}

function showValidationError(errorId, show) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.style.display = show ? "block" : "none";
  }
}

function setupFlutterFlowValidation() {
  const apiKeyInput = document.getElementById("flutterflow-api-key-input");
  const projectIdInput = document.getElementById(
    "flutterflow-project-id-input",
  );

  if (apiKeyInput) {
    apiKeyInput.addEventListener("input", (e) => {
      const hasValue = e.target.value.trim().length > 0;
      updateInputValidationState("flutterflow-api-key-input", hasValue);
    });
    apiKeyInput.addEventListener(
      "blur",
      debounce(async (e) => {
        const key = e.target.value.trim();
        if (key) {
          await fetchProjects(key);
        }
      }, 500),
    );
  }

  if (projectIdInput) {
    projectIdInput.addEventListener("input", (e) => {
      const isValid = validateFlutterFlowProjectId(e.target.value);
      updateInputValidationState("flutterflow-project-id-input", isValid);
      showValidationError(
        "flutterflow-project-id-error",
        e.target.value && !isValid,
      );
    });
  }
}

/**
 * Simple debounce utility.
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Fetches projects from FlutterFlow API and populates dropdown.
 * @param {string} apiKey - FlutterFlow API key
 */
async function fetchProjects(apiKey) {
  const container = document.getElementById("flutterflow-projects-container");
  const select = document.getElementById("flutterflow-projects-select");
  const errorElement = document.getElementById("flutterflow-projects-error");

    if (!container || !select) {
      return;
    }

  // Show loading state
  container.classList.remove("hidden");
  select.innerHTML = '<option value="">Loading projects...</option>';
  if (errorElement) errorElement.classList.add("hidden");

  try {
    // Create temporary client instance (no project ID needed)
    const client = new FlutterFlowApiClient(apiKey, "");
    const projects = await client.listProjects();

    if (!projects || projects.length === 0) {
      select.innerHTML = '<option value="">No projects found</option>';
      return;
    }

    // Populate dropdown
    select.innerHTML = '<option value="">Select a project...</option>';
    projects.forEach((project) => {
      const option = document.createElement("option");
      option.value = project.id || project.projectId || "";
      option.textContent =
        project.name || project.projectName || `Project ${project.id}`;
      select.appendChild(option);
    });

    // Connect selection to Project ID input
    select.addEventListener("change", () => {
      const projectIdInput = document.getElementById(
        "flutterflow-project-id-input",
      );
      if (projectIdInput && select.value) {
        projectIdInput.value = select.value;
        // Trigger validation
        projectIdInput.dispatchEvent(new Event("input"));
      }
    });
    } catch (error) {
      select.innerHTML = '<option value="">Error loading projects</option>';
      if (errorElement) {
        errorElement.textContent = `Failed to load projects: ${error.message}`;
        errorElement.classList.remove("hidden");
      }
    }
}

function toggleKeyVisibility(inputId) {
  const input = document.getElementById(inputId);
  const btn = input.nextElementSibling;
  const icon = btn.querySelector("svg");

  if (input.type === "password") {
    input.type = "text";
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    `;
  } else {
    input.type = "password";
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    `;
  }
}

// --- APP STATE ---
let pipelineState = {
  step1Result: null,
  step2Result: null,
  step3Result: null,
  currentStep: 0,
  isRunning: false,
};

// --- KEYBOARD SHORTCUTS & ACCESSIBILITY ---
function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runThinkingPipeline();
      announceToScreenReader('Pipeline execution started');
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'c') {
      e.preventDefault();
      initiateCommitToFlutterFlow();
      announceToScreenReader('Commit to FlutterFlow initiated');
    }
    
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(modal => {
        modal.classList.remove('open');
      });
      announceToScreenReader('Modal closed');
    }
  });
}

function announceToScreenReader(message) {
  let liveRegion = document.getElementById('screen-reader-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'screen-reader-live-region';
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.border = '0';
    liveRegion.style.clip = 'rect(0 0 0 0)';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.clipPath = 'inset(50%)';
    liveRegion.style.wordWrap = 'normal';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = message;
}

// --- HELP MODAL ---
function showHelpModal() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeHelpModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.classList.remove('open');
  }
  document.body.style.overflow = '';
}

  // --- CORE API FUNCTIONS ---

async function checkConnection() {
  try {
    await initializeApiKeys()
  } catch (error) {
    return false
  }
  return true
}

/**
 * Updates progress step visuals.
 * @param {string} stepId - Step ID (preparing, validating, pushing, completed)
 * @param {string} status - Status (pending, active, completed)
 */
function updateProgressStep(stepId, status) {
  const step = document.getElementById(`step-${stepId}`);
  if (!step) return;
  
  const icon = step.querySelector('.progress-step-icon div');
  
  // Remove all status classes
  step.classList.remove('active', 'completed');
  icon.className = 'w-2 h-2 rounded-full';
  
  // Add new status
  switch (status) {
    case 'active':
      step.classList.add('active');
      icon.classList.add('bg-orange-500', 'pulse-animation');
      break;
    case 'completed':
      step.classList.add('completed');
      icon.classList.add('bg-green-500');
      icon.innerHTML = '✓';
      break;
    default: // pending
      icon.classList.add('bg-gray-300');
      break;
  }
}

/**
 * Enhanced progress update with step visualization.
 * @param {string} state - CommitState value
 */
function updateProgressSteps(state) {
  const stateStepMap = {
    [CommitState.IDLE]: { preparing: 'pending', validating: 'pending', pushing: 'pending', completed: 'pending' },
    [CommitState.PREPARING]: { preparing: 'active', validating: 'pending', pushing: 'pending', completed: 'pending' },
    [CommitState.VALIDATING]: { preparing: 'completed', validating: 'active', pushing: 'pending', completed: 'pending' },
    [CommitState.PUSHING]: { preparing: 'completed', validating: 'completed', pushing: 'active', completed: 'pending' },
    [CommitState.SUCCESS]: { preparing: 'completed', validating: 'completed', pushing: 'completed', completed: 'completed' },
    [CommitState.ERROR]: { preparing: 'completed', validating: 'completed', pushing: 'completed', completed: 'pending' },
  };
  
  const steps = stateStepMap[state];
  if (steps) {
    Object.entries(steps).forEach(([stepId, status]) => {
      updateProgressStep(stepId, status);
    });
  }
}

// --- FLUTTERFLOW API CLIENT ---

/**
 * @typedef {Object} FileWarning
 * @property {string} fileType - Type of file (action, widget, function, pubspec)
 * @property {string} errorMessage - Error description
 * @property {boolean} isCritical - If true, prevents syncing
 */

/**
 * @typedef {Object} PushCodeResult
 * @property {number} responseCode - HTTP response code
 * @property {string} [errorMessage] - Error message if failed
 * @property {Map<string, FileWarning[]>} [errorMap] - Map of file paths to warnings
 */

/**
 * FlutterFlow API endpoints
 */
const FF_API_ENDPOINTS = {
  production: "https://api.flutterflow.io/v2/",
  staging: "https://api.flutterflow.io/v2-staging/",
};

/**
 * Client for interacting with the FlutterFlow API.
 * Adapted from the VS Code extension for browser use.
 * Handles authentication and provides methods for code synchronization.
 */
class FlutterFlowApiClient {
  /**
   * Creates a new FlutterFlow API client instance.
   * @param {string} apiKey - Authentication token for API access
   * @param {string} projectId - ID of the FlutterFlow project
   * @param {string} [branchName='main'] - Name of the branch to work with
   * @param {string} [endpoint='production'] - API endpoint to use
   */
  constructor(
    apiKey,
    projectId,
    branchName = "main",
    endpoint = FF_API_ENDPOINTS.production,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = endpoint;
    this._projectId = projectId;
    this._branchName = branchName;
    this._endpoint = endpoint;
  }

  /**
   * Gets the project ID.
   * @returns {string} The FlutterFlow project ID
   */
  get projectId() {
    return this._projectId;
  }

  /**
   * Gets the branch name.
   * In FlutterFlow, "main" and "" both represent the default branch.
   * @returns {string} The branch name (empty string for main branch)
   */
  get branchName() {
    // "main" and "" both represent the default branch in FlutterFlow. The APIs expect "".
    return this._branchName === "main" ? "" : this._branchName;
  }

  /**
   * Pulls code from FlutterFlow and returns it as a structured object.
   * @returns {Promise<Object>} Object containing file contents mapped by path
   */
  async pullCode() {
    try {
      const response = await fetch(`${this.baseUrl}exportCode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          project_id: this.projectId,
          branch_name: this.branchName,
          include_assets: false,
          export_as_module: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // The response should contain a download_url or direct content
      // For now, return the parsed response
      return {
        success: true,
        downloadUrl: data.download_url,
        projectId: this.projectId,
        branchName: this.branchName,
      };
        } catch (error) {
          return { responseCode: 500, errorMessage: error.message };
        }
  }

  /**
   * Pushes custom code to FlutterFlow.
   * @param {Object} pushCodeRequest - Request object containing code data
   * @param {string} pushCodeRequest.project_id - FlutterFlow project ID
   * @param {string} pushCodeRequest.zipped_custom_code - Base64 encoded zip of custom code
   * @param {string} pushCodeRequest.uid - User identifier
   * @param {string} pushCodeRequest.branch_name - Target branch name
   * @param {string} pushCodeRequest.serialized_yaml - Serialized pubspec.yaml content
   * @param {string} pushCodeRequest.file_map - JSON string of file path to content mapping
   * @param {string} pushCodeRequest.functions_map - JSON string of function definitions
   * @returns {Promise<Response>} Fetch response object
   */
  async pushCodeWithRetry(pushCodeRequest, maxRetries = 3) {
    const endpointUrls = [
      FF_API_ENDPOINTS.production,
      FF_API_ENDPOINTS.staging,
    ];
    const startEndpoint = Math.max(0, endpointUrls.indexOf(this._endpoint));

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (let ei = startEndpoint; ei < endpointUrls.length; ei++) {
        const baseUrl = endpointUrls[ei];

        try {
          const response = await fetch(`${baseUrl}syncCustomCodeChanges`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(pushCodeRequest),
          });

          if (response.ok) {
            return response;
          }

          const clonedForLog = response.clone();
          const responseText = await clonedForLog.text();

          if (response.status === 500) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }

          return response;
        } catch (error) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error("All API endpoints failed after retries");
  }

  async pushCode(pushCodeRequest) {
    return this.pushCodeWithRetry(pushCodeRequest);
  }

  /**
   * Lists projects accessible with the current API key.
   * @param {Object} [options] - Optional parameters
   * @param {number} [options.page] - Page number for pagination
   * @param {number} [options.limit] - Maximum number of projects per page
   * @returns {Promise<Array<Object>>} Array of project objects with id and name
   */
  async listProjects(options = {}) {
    const { page = 1, limit = 100 } = options;

    try {
      const response = await fetch(
        "https://api.flutterflow.io/v2/l/listProjects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            project_type: "ALL",
            deserialize_response: true,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `List projects failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();

      // Handle the specific FlutterFlow API wrapper format:
      // { success: true, value: "{\"entries\": [...]}" }
      if (data.success && typeof data.value === "string") {
        try {
          const parsedValue = JSON.parse(data.value);
          if (parsedValue && Array.isArray(parsedValue.entries)) {
            // Map to standard format: { id, name }
            return parsedValue.entries.map((entry) => ({
              id: entry.id,
              name: entry.project?.name || entry.id,
            }));
          }
        } catch (parseError) {
          console.error(
            "Failed to parse stringified project value:",
            parseError,
          );
        }
      }

      // Fallback for other potential formats
      const projects =
        data.projects ||
        data.items ||
        data.entries ||
        (Array.isArray(data) ? data : []);
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      console.error("Error listing projects:", error);
      throw error;
    }
  }
}

/**
 * Parses the response from pushCode API call.
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed result with file warnings
 */
async function parsePushCodeResponse(response) {
  const originalResponse = response.clone();
  let jsonResult;

  try {
    jsonResult = await response.json();
  } catch (error) {
    const text = await originalResponse.text();

    // Check if the response was an error with plain text body (common for 500s)
    if (!response.ok) {
      return {
        success: false,
        responseCode: response.status,
        errorMessage: text || `HTTP ${response.status}`,
        errorMap: new Map(),
      };
    }

    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (!response.ok) {
    // FlutterFlow 400s return file-keyed error maps: {"File.dart": [{"errorMessage": "...", "isCritical": true}]}
    // Standard errors return: {"message": "..."}
    let errorMessage = jsonResult.message || `HTTP ${response.status}`
    let errorMap = new Map()

    if (jsonResult.errors) {
      errorMap = new Map(Object.entries(jsonResult.errors))
    } else if (!jsonResult.message && typeof jsonResult === 'object') {
      // Detect file-keyed error format (keys ending in .dart with array values)
      const fileKeys = Object.keys(jsonResult).filter(k => k.endsWith('.dart') && Array.isArray(jsonResult[k]))
      if (fileKeys.length > 0) {
        errorMap = new Map(Object.entries(jsonResult))
        const allErrors = fileKeys.flatMap(k => jsonResult[k].map(e => `${k}: ${e.errorMessage}`))
        errorMessage = allErrors.join('\n') || `HTTP ${response.status}`
      }
    }

    return {
      success: false,
      responseCode: response.status,
      errorMessage,
      errorMap,
    };
  }

  // Success response
  const valueObject = jsonResult.value ? JSON.parse(jsonResult.value) : {};
  return {
    success: true,
    responseCode: response.status,
    errorMap: new Map(Object.entries(valueObject)),
  };
}

/**
 * Gets user-friendly error message for FlutterFlow API errors.
 * @param {number} statusCode - HTTP status code
 * @param {string} [message] - Optional error message from API
 * @returns {string} User-friendly error message
 */
function getFlutterFlowErrorMessage(statusCode, message) {
  const errorMessages = {
    401: "Authentication failed. Please check your FlutterFlow API key.",
    403: "Access denied. You may not have permission to modify this project.",
    404: "Project not found. Please check your Project ID.",
    409: "Conflict detected. The project may have been modified elsewhere.",
    422: `Validation failed: ${message || "Invalid request format"}`,
    429: "Rate limit exceeded. Please try again in a few minutes.",
    500: "FlutterFlow server error. Please try again later.",
    503: "FlutterFlow service temporarily unavailable.",
  };

  return (
    errorMessages[statusCode] ||
    `FlutterFlow API error: ${message || `HTTP ${statusCode}`}`
  );
}

// --- FILE TYPE DETECTION UTILITIES ---

/**
 * Code type enumeration for FlutterFlow custom code
 * @typedef {Object} CodeType
 * @property {string} ACTION - Custom Action ('A')
 * @property {string} WIDGET - Custom Widget ('W')
 * @property {string} FUNCTION - Custom Function ('F')
 * @property {string} DEPENDENCIES - pubspec.yaml dependencies ('D')
 * @property {string} OTHER - Other file types ('O')
 */
const CodeType = {
  ACTION: "A",
  WIDGET: "W",
  FUNCTION: "F",
  DEPENDENCIES: "D",
  OTHER: "O",
};

/**
 * Detects the type of custom code based on file name and content.
 * @param {string} fileName - Name of the file
 * @param {string} [content] - Optional file content for additional detection
 * @returns {string} Code type (A, W, F, D, or O)
 */
function detectCodeType(fileName, content = "") {
  if (fileName === "pubspec.yaml") {
    return CodeType.DEPENDENCIES;
  }

  if (!fileName.endsWith(".dart") || fileName.endsWith("index.dart")) {
    return CodeType.OTHER;
  }

  if (fileName === "custom_functions.dart") {
    return CodeType.FUNCTION;
  }

  if (content) {
    if (
      content.includes("extends State") ||
      content.includes("StatefulWidget")
    ) {
      if (content.includes("Future") && content.includes("BuildContext")) {
        return CodeType.ACTION;
      }
      return CodeType.WIDGET;
    }

    if (
      content.match(
        /^\s*(String|int|double|bool|List|Map|dynamic|void)\s+\w+\s*\(/m,
      )
    ) {
      return CodeType.FUNCTION;
    }
  }

  return CodeType.OTHER;
}

/**
 * Gets the relative file path based on code type.
 * @param {string} fileName - Original file name
 * @param {string} codeType - Code type (A, W, F, D, O)
 * @returns {string} Relative path in FlutterFlow structure
 */
function getFilePathForCodeType(fileName, codeType) {
  switch (codeType) {
    case CodeType.ACTION:
      return `lib/custom_code/actions/${fileName}`;
    case CodeType.WIDGET:
      return `lib/custom_code/widgets/${fileName}`;
    case CodeType.FUNCTION:
      return "lib/flutter_flow/custom_functions.dart";
    case CodeType.DEPENDENCIES:
      return "pubspec.yaml";
    case CodeType.OTHER:
      // Fallback for unknown types - treat as action/code file
      return `lib/custom_code/actions/${fileName}`;
    default:
      return fileName;
  }
}

/**
 * Derives the FlutterFlow identifier name from a file name and code type.
 * Widgets use PascalCase, actions use camelCase.
 * @param {string} fileName - File name (e.g., 'BigRedBox.dart')
 * @param {string} codeType - Code type (A, W, F, D, O)
 * @returns {string} Identifier name for FlutterFlow
 */
function deriveIdentifierName(fileName, codeType) {
  const baseName = fileName.replace(/\.dart$/, "");
  if (codeType === CodeType.WIDGET) {
    // PascalCase - first letter of each word uppercase
    return baseName.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase());
  }
  if (codeType === CodeType.ACTION) {
    // camelCase - first word lowercase, rest uppercase
    const pascal = baseName.replace(/(^|_)(\w)/g, (_, __, c) =>
      c.toUpperCase(),
    );
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
  if (codeType === CodeType.FUNCTION) {
    return "CustomFunctions";
  }
  if (codeType === CodeType.DEPENDENCIES) {
    return "pubspec.yaml";
  }
  return baseName;
}

/**
 * Builds the file_map in the format expected by FlutterFlow's syncCustomCodeChanges API.
 * Must match the VS Code extension's FileInfo format:
 * { old_identifier_name, new_identifier_name, type, is_deleted }
 * Does NOT include content (content goes in the zip only).
 * @param {Map} fileMap - Internal file map with content/type/path
 * @returns {string} JSON string of file_map for the API
 */
function buildApiFileMap(fileMap) {
  const apiFileMap = {};
  for (const [name, info] of fileMap.entries()) {
    // Skip pubspec.yaml - the VS Code extension filters out DEPENDENCIES type
    if (info.type === CodeType.DEPENDENCIES) continue;
    const identifierName = deriveIdentifierName(name, info.type);
    apiFileMap[name] = {
      old_identifier_name: identifierName,
      new_identifier_name: identifierName,
      type: info.type,
      is_deleted: false,
    };
  }
  return JSON.stringify(apiFileMap);
}

/**
 * Checks if a file is new (has no original checksum).
 * @param {Object} fileInfo - File information object
 * @param {string} [fileInfo.original_checksum] - Original checksum of the file
 * @returns {boolean} True if the file is new
 */
function isNewFile(fileInfo) {
  return fileInfo.original_checksum === undefined;
}

/**
 * Extracts the file name from a full path.
 * @param {string} filePath - Full file path
 * @returns {string} File name without path
 */
function getFileNameFromPath(filePath) {
  return filePath.split("/").pop();
}

// --- PUBSPEC.YAML UTILITIES ---

/**
 * Creates a default pubspec.yaml structure for FlutterFlow.
 * @returns {Object} Default pubspec.yaml structure
 */
function createDefaultPubspec() {
  const pubspec = {
    name: "flutter_flow_custom_code",
    description: "Custom code for FlutterFlow project",
    version: "1.0.0",
    environment: {
      sdk: ">=3.0.0 <4.0.0",
    },
    dependencies: {
      flutter: {
        sdk: "flutter",
      },
    },
    dev_dependencies: {
      flutter_test: {
        sdk: "flutter",
      },
    },
    flutter: {
      uses_material_design: true,
    },
  };

  return pubspec;
}

/**
 * Parses pubspec.yaml to extract dependencies.
 * Note: This is a simplified parser for the web context.
 * Full YAML parsing would require a library like js-yaml.
 * @param {string} yamlContent - Raw pubspec.yaml content
 * @returns {Object} Parsed dependencies object
 */
function parsePubspecDependencies(yamlContent) {
  const dependencies = {};
  let inDependencies = false;
  let currentIndent = 0;

  const lines = yamlContent.split("\n");

  for (const line of lines) {
    // Check if we're entering dependencies section
    if (line.trim() === "dependencies:") {
      inDependencies = true;
      currentIndent = line.search(/\S/);
      continue;
    }

    // Check if we're leaving dependencies section (new section at same or lower indent)
    if (inDependencies) {
      const indent = line.search(/\S/);
      if (line.trim() && indent <= currentIndent && line.trim().endsWith(":")) {
        inDependencies = false;
        continue;
      }

      // Parse dependency line
      if (line.trim() && !line.trim().startsWith("#")) {
        const match = line.match(/^(\s*)(\w+):\s*(.+)?$/);
        if (match) {
          const [, indentStr, name, version] = match;
          if (indentStr.length > currentIndent) {
            dependencies[name] = version ? version.trim() : null;
          }
        }
      }
    }
  }

  return dependencies;
}

/**
 * Merges custom dependencies into pubspec structure.
 * @param {Object} basePubspec - Base pubspec object
 * @param {Object} customDeps - Custom dependencies to add
 * @returns {Object} Merged pubspec structure
 */
function mergeDependencies(basePubspec, customDeps) {
  const merged = { ...basePubspec };

  if (!merged.dependencies) {
    merged.dependencies = {};
  }

  // Add custom dependencies
  for (const [name, version] of Object.entries(customDeps)) {
    // Skip Flutter SDK dependency
    if (name === "flutter") continue;
    merged.dependencies[name] = version;
  }

  return merged;
}

/**
 * Serializes a pubspec object to YAML string format.
 * Note: This is a simplified serializer for FlutterFlow pubspec structure.
 * @param {Object} pubspec - Pubspec object to serialize
 * @returns {string} YAML formatted string
 */
function serializePubspecToYaml(pubspec) {
  const lines = [];

  // Add basic fields
  lines.push(`name: ${pubspec.name}`);
  lines.push(`description: ${pubspec.description}`);
  lines.push(`version: ${pubspec.version}`);
  lines.push("");

  lines.push("environment:");
  for (const [key, value] of Object.entries(pubspec.environment)) {
    lines.push(`  ${key}: '${value}'`);
  }
  lines.push("");

  // Add dependencies
  lines.push("dependencies:");
  for (const [name, value] of Object.entries(pubspec.dependencies)) {
    if (typeof value === "object" && value !== null) {
      lines.push(`  ${name}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`    ${k}: ${v}`);
      }
    } else {
      lines.push(`  ${name}: ${value || ""}`);
    }
  }
  lines.push("");

  // Add dev_dependencies if present
  if (pubspec.dev_dependencies) {
    lines.push("dev_dependencies:");
    for (const [name, value] of Object.entries(pubspec.dev_dependencies)) {
      if (typeof value === "object" && value !== null) {
        lines.push(`  ${name}:`);
        for (const [k, v] of Object.entries(value)) {
          lines.push(`    ${k}: ${v}`);
        }
      } else {
        lines.push(`  ${name}: ${value || ""}`);
      }
    }
    lines.push("");
  }

  // Add flutter section
  if (pubspec.flutter) {
    lines.push("flutter:");
    for (const [key, value] of Object.entries(pubspec.flutter)) {
      if (typeof value === "boolean") {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }

  // FlutterFlow requires dependency_overrides section (must be a map, not null)
  lines.push("dependency_overrides: {}");

  return lines.join("\n");
}

/**
 * Runs pre-commit validation checks.
 * @param {Object} codeInfo - Prepared code info
 * @returns {Object} Check results { canProceed: boolean, issues: string[], warnings: string[] }
 */
function runPreCommitChecks(codeInfo) {
  const issues = [];
  const warnings = [];

  if (codeInfo.content.length > 50000) {
    warnings.push(
      "Code file is large (>50KB). This may take longer to commit.",
    );
  }
  if (codeInfo.content.length > 100000) {
    issues.push(
      "Code file is too large (>100KB). Consider splitting into smaller components.",
    );
  }

  const lineCount = codeInfo.content.split("\n").length;
  if (lineCount > 500) {
    warnings.push(
      `Code has ${lineCount} lines. Consider breaking it into smaller widgets.`,
    );
  }

  if (
    codeInfo.content.includes("setState") &&
    codeInfo.codeType === CodeType.ACTION
  ) {
    warnings.push(
      "Using setState in a Custom Action may not work as expected. Consider using a Custom Widget.",
    );
  }

  if (codeInfo.content.includes("dynamic") && !codeInfo.content.includes("?")) {
    warnings.push(
      'Code uses "dynamic" types. Consider adding explicit types for better null safety.',
    );
  }

  if (codeInfo.content.match(/Color\(0xFF[0-9A-Fa-f]{6}\)/)) {
    warnings.push(
      "Code contains hardcoded colors. Consider using FlutterFlowTheme.of(context) for theme consistency.",
    );
  }

  const printMatches = codeInfo.content.match(/print\s*\(/g);
  if (printMatches && printMatches.length > 3) {
    warnings.push(
      `Code contains ${printMatches.length} print statements. Consider removing debug prints before committing.`,
    );
  }

  return {
    canProceed: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Shows pre-commit summary to user for confirmation.
 * @param {Object} codeInfo - Prepared code info
 * @param {Object} checks - Results from runPreCommitChecks
 * @returns {Promise<boolean>} True if user confirms commit
 */
async function showPreCommitSummary(codeInfo, checks) {
  let summaryHtml = `
    <div class="space-y-4">
      <div>
        <h3 class="font-semibold text-gray-900">Commit Summary</h3>
        <p class="text-sm text-gray-600 mt-1">
          File: <strong>${codeInfo.fileName}</strong><br>
          Type: <strong>${codeInfo.artifactType}</strong><br>
          Size: <strong>${(codeInfo.content.length / 1024).toFixed(1)} KB</strong><br>
          Lines: <strong>${codeInfo.content.split("\n").length}</strong>
        </p>
      </div>
  `;

  if (checks.warnings.length > 0) {
    summaryHtml += `
      <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
        <h4 class="font-medium text-yellow-800 text-sm">Warnings (${checks.warnings.length})</h4>
        <ul class="text-xs text-yellow-700 mt-2 space-y-1">
          ${checks.warnings.map((w) => `<li>• ${w}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  if (checks.issues.length > 0) {
    summaryHtml += `
      <div class="bg-red-50 border border-red-200 rounded p-3">
        <h4 class="font-medium text-red-800 text-sm">Issues (${checks.issues.length})</h4>
        <ul class="text-xs text-red-700 mt-2 space-y-1">
          ${checks.issues.map((i) => `<li>• ${i}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  summaryHtml += "</div>";



  if (!checks.canProceed) {
    return false;
  }

  if (checks.warnings.length > 0) {
    return confirm(
      `Found ${checks.warnings.length} warning(s). Proceed with commit?\n\n${checks.warnings.join("\n")}`,
    );
  }

  return true;
}

// --- FILE VALIDATION FUNCTIONS ---

/**
 * Prepares generated code for FlutterFlow commit.
 * @param {string} rawCode - Raw generated Dart code
 * @param {Object} options - Preparation options
 * @param {string} options.artifactType - Type of artifact (CustomWidget, CustomAction, CustomFunction)
 * @param {string} options.artifactName - Name of the artifact class/function
 * @returns {Object} Prepared code info { content: string, fileName: string, codeType: string }
 */
function prepareCodeForCommit(rawCode, options = {}) {
  const { artifactType = "CustomWidget", artifactName = "GeneratedCode" } =
    options;

  // Clean up the code
  let cleanedCode = rawCode.trim();

  // Remove markdown code fences if present
  if (cleanedCode.startsWith("```dart")) {
    cleanedCode = cleanedCode.replace(/^```dart\n/, "");
  } else if (cleanedCode.startsWith("```")) {
    cleanedCode = cleanedCode.replace(/^```\n/, "");
  }

  if (cleanedCode.endsWith("```")) {
    cleanedCode = cleanedCode.replace(/\n```$/, "");
  }

  // Ensure proper class/function naming
  let fileName = artifactName;
  if (!fileName.endsWith(".dart")) {
    fileName += ".dart";
  }

  // Determine code type from artifact type
  let codeType = CodeType.OTHER;
  switch (artifactType) {
    case "CustomAction":
      codeType = CodeType.ACTION;
      break;
    case "CustomWidget":
      codeType = CodeType.WIDGET;
      break;
    case "CustomFunction":
      codeType = CodeType.FUNCTION;
      fileName = "custom_functions.dart";
      break;
    case "CodeFile":
      // Code Files are treated as Actions for file structure purposes
      // They live in lib/custom_code/actions/
      codeType = CodeType.ACTION;
      break;
  }

  // Add mandatory FlutterFlow header (matching VS-Code-Extension pattern)
  let header = "";
  if (codeType === CodeType.WIDGET) {
    header = `// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

`;
  } else if (codeType === CodeType.ACTION) {
    header = `// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
// Begin custom action code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

`;
  } else if (codeType === CodeType.FUNCTION) {
    header = `// Automatic FlutterFlow imports
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:timeago/timeago.dart' as timeago;
import '/flutter_flow/lat_lng.dart';
import '/flutter_flow/place.dart';
import '/flutter_flow/uploaded_file.dart';

`;
  }

  return {
    content: header + cleanedCode,
    fileName,
    codeType,
    artifactType,
    artifactName,
  };
}

/**
 * Extracts pubspec dependencies from generated code analysis.
 * @param {string} code - Dart code to analyze
 * @returns {Object} Map of package names to versions
 */
function extractDependencies(code) {
  const deps = {};

  // Common FlutterFlow packages that might be imported
  const packagePatterns = [
    { name: "flutter_animate", pattern: /flutter_animate/ },
    { name: "google_fonts", pattern: /google_fonts/ },
    { name: "flutter_svg", pattern: /flutter_svg/ },
    { name: "http", pattern: /package:http\b/ },
    { name: "intl", pattern: /package:intl\b/ },
    { name: "collection", pattern: /package:collection\b/ },
    { name: "rxdart", pattern: /package:rxdart\b/ },
    { name: "timeago", pattern: /package:timeago\b/ },
    { name: "url_launcher", pattern: /package:url_launcher\b/ },
    { name: "cloud_firestore", pattern: /package:cloud_firestore\b/ },
    { name: "firebase_auth", pattern: /package:firebase_auth\b/ },
    { name: "flutter_tts", pattern: /package:flutter_tts\b/ },
    { name: "percent_indicator", pattern: /package:percent_indicator\b/ },
    { name: "fl_chart", pattern: /package:fl_chart\b/ },
    { name: "cached_network_image", pattern: /package:cached_network_image\b/ },
    { name: "image_picker", pattern: /package:image_picker\b/ },
    { name: "file_picker", pattern: /package:file_picker\b/ },
    { name: "shared_preferences", pattern: /package:shared_preferences\b/ },
    { name: "sqflite", pattern: /package:sqflite\b/ },
    { name: "path_provider", pattern: /package:path_provider\b/ },
    { name: "uuid", pattern: /package:uuid\b/ },
    { name: "xml", pattern: /package:xml\b/ },
    { name: "html", pattern: /package:html\b/ },
    { name: "csv", pattern: /package:csv\b/ },
    { name: "pdf", pattern: /package:pdf\b/ },
    { name: "printing", pattern: /package:printing\b/ },
    {
      name: "flutter_local_notifications",
      pattern: /package:flutter_local_notifications\b/,
    },
    { name: "geolocator", pattern: /package:geolocator\b/ },
    { name: "geocoding", pattern: /package:geocoding\b/ },
    { name: "firebase_core", pattern: /package:firebase_core\b/ },
    { name: "firebase_storage", pattern: /package:firebase_storage\b/ },
    { name: "firebase_messaging", pattern: /package:firebase_messaging\b/ },
    { name: "cloud_functions", pattern: /package:cloud_functions\b/ },
    { name: "firebase_analytics", pattern: /package:firebase_analytics\b/ },
    { name: "stripe_checkout", pattern: /package:stripe_checkout\b/ },
    { name: "pay", pattern: /package:pay\b/ },
    { name: "in_app_purchase", pattern: /package:in_app_purchase\b/ },
    { name: "audioplayers", pattern: /package:audioplayers\b/ },
    { name: "just_audio", pattern: /package:just_audio\b/ },
    { name: "video_player", pattern: /package:video_player\b/ },
    { name: "chewie", pattern: /package:chewie\b/ },
    { name: "flutter_rating_bar", pattern: /package:flutter_rating_bar\b/ },
    { name: "shimmer", pattern: /package:shimmer\b/ },
    { name: "carousel_slider", pattern: /package:carousel_slider\b/ },
    {
      name: "flutter_staggered_grid_view",
      pattern: /package:flutter_staggered_grid_view\b/,
    },
    {
      name: "smooth_page_indicator",
      pattern: /package:smooth_page_indicator\b/,
    },
    { name: "qr_flutter", pattern: /package:qr_flutter\b/ },
    { name: "barcode_widget", pattern: /package:barcode_widget\b/ },
    { name: "qr_code_scanner", pattern: /package:qr_code_scanner\b/ },
    { name: "lottie", pattern: /package:lottie\b/ },
    { name: "rive", pattern: /package:rive\b/ },
  ];

  for (const { name, pattern } of packagePatterns) {
    if (pattern.test(code)) {
      deps[name] = "^1.0.0";
    }
  }

  return deps;
}

/**
 * Builds metadata for the commit operation.
 * @param {Object} codeInfo - Code info from prepareCodeForCommit
 * @param {Object} pipelineResult - Results from the generation pipeline (optional)
 * @returns {Object} Commit metadata
 */
function buildCommitMetadata(codeInfo, pipelineResult = {}) {
  return {
    timestamp: new Date().toISOString(),
    artifactType: codeInfo.artifactType,
    artifactName: codeInfo.artifactName,
    codeType: codeInfo.codeType,
    fileName: codeInfo.fileName,
    generatedFrom: pipelineResult.step1Result ? "pipeline" : "direct",
    model: pipelineResult.selectedModel || "unknown",
    codeSize: codeInfo.content.length,
  };
}

/**
 * Validates a Dart file for FlutterFlow compatibility.
 * @param {string} fileName - Name of the file
 * @param {string} content - File content
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateDartFile(fileName, content, codeType) {
  const errors = [];

  // Check for forbidden patterns in FlutterFlow
  const forbiddenPatterns = [
    {
      pattern: /void\s+main\s*\(/,
      message: "Contains main() function - not allowed in FlutterFlow",
    },
    {
      pattern: /runApp\s*\(/,
      message: "Contains runApp() - not allowed in FlutterFlow",
    },
    {
      pattern: /MaterialApp\s*\(/,
      message: "Contains MaterialApp - not allowed in FlutterFlow",
    },
    {
      pattern: /Scaffold\s*\(/,
      message: "Contains Scaffold - usually not needed in FlutterFlow widgets",
    },
  ];

  // Validate imports based on artifact type
  const isCustomFunction =
    fileName.includes("custom_functions") || fileName.includes("functions");
  const importRegex = /^\s*import\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const isAllowedFFImport =
      importPath.startsWith("/flutter_flow/") ||
      importPath.startsWith("/backend/") ||
      importPath.startsWith("/custom_code/") ||
      importPath === "index.dart" ||
      importPath === "package:flutter/material.dart" ||
      importPath === "package:flutter/services.dart";
    const isDartSdkImport =
      importPath.startsWith("dart:") || importPath.startsWith("package:");

    if (isCustomFunction) {
      // Custom Functions: only dart: imports allowed (no external packages)
      if (!importPath.startsWith("dart:")) {
        errors.push(
          `Custom Functions cannot use '${importPath}' - only Dart SDK imports allowed`,
        );
      }
    } else {
      // Widgets/Actions: allow FF imports + dart: + flutter packages
      if (!isAllowedFFImport && !isDartSdkImport) {
        errors.push(
          `Unknown import '${importPath}' - use FlutterFlow managed imports`,
        );
      }
    }
  }

  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(message);
    }
  }

  // Check for required patterns in widgets
  if (fileName.endsWith(".dart") && !fileName.includes("functions")) {
    // Check for null safety
    if (content.includes("!") && !content.includes("??")) {
      // Has bang operator but no null coalescing - potential null safety issue
      // This is just a warning, not an error
    }
  }

  if (codeType === CodeType.WIDGET && !content.match(/class\s+\w+/)) {
    errors.push("No class definition found");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates pubspec.yaml content.
 * @param {string} content - pubspec.yaml content
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validatePubspec(content) {
  const errors = [];

  // Check for required fields
  if (!content.includes("name:")) {
    errors.push("pubspec.yaml missing name field");
  }

  if (!content.includes("dependencies:")) {
    errors.push("pubspec.yaml missing dependencies section");
  }

  // Check for Flutter SDK
  if (!content.includes("flutter:") && !content.includes("sdk: flutter")) {
    errors.push("pubspec.yaml missing Flutter SDK dependency");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a file map before commit.
 * @param {Map<string, Object>} fileMap - Map of file paths to file info
 * @returns {Object} Validation result { valid: boolean, errors: string[], warnings: string[] }
 */
function validateFileMap(fileMap) {
  const errors = [];
  const warnings = [];

  if (!fileMap || fileMap.size === 0) {
    errors.push("No files to commit");
    return { valid: false, errors, warnings };
  }

  for (const [path, fileInfo] of fileMap.entries()) {
    // Check for empty files
    if (!fileInfo.content || fileInfo.content.trim().length === 0) {
      errors.push(`File ${path} is empty`);
    }

    // Check file size (FlutterFlow may have limits)
    if (fileInfo.content && fileInfo.content.length > 100000) {
      warnings.push(`File ${path} is very large (>100KB)`);
    }

    // Validate Dart files
    if (path.endsWith(".dart")) {
      const result = validateDartFile(path, fileInfo.content, fileInfo.type);
      if (!result.valid) {
        errors.push(...result.errors.map((e) => `${path}: ${e}`));
      }
    }

    // Validate pubspec
    if (path === "pubspec.yaml") {
      const result = validatePubspec(fileInfo.content);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
// --- COMMIT STATE MANAGEMENT ---

/**
 * Commit operation states
 */
const CommitState = {
  IDLE: "IDLE",
  PREPARING: "PREPARING",
  VALIDATING: "VALIDATING",
  PUSHING: "PUSHING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

/**
 * Global commit state tracking object
 */
const commitState = {
  currentState: CommitState.IDLE,
  startTime: null,
  endTime: null,
  error: null,
  result: null,
  filesProcessed: 0,
  totalFiles: 0,

  /**
   * Reset state to idle
   */
  reset() {
    this.currentState = CommitState.IDLE;
    this.startTime = null;
    this.endTime = null;
    this.error = null;
    this.result = null;
    this.filesProcessed = 0;
    this.totalFiles = 0;
  },

  /**
   * Set current state
   * @param {string} state - New state from CommitState
   */
  setState(state) {
    if (!Object.values(CommitState).includes(state)) {
      console.error(`Invalid commit state: ${state}`);
      return;
    }

    this.currentState = state;

    if (state === CommitState.PREPARING) {
      this.startTime = Date.now();
    }

    if (state === CommitState.SUCCESS || state === CommitState.ERROR) {
      this.endTime = Date.now();
    }

    // Trigger state change event
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("commitStateChange", {
          detail: { state, commitState: this },
        }),
      );
    }


  },

  /**
   * Set error information
   * @param {Error} error - Error object
   */
  setError(error) {
    this.error = error;
    this.setState(CommitState.ERROR);
  },

  /**
   * Set success result
   * @param {Object} result - Success result data
   */
  setSuccess(result) {
    this.result = result;
    this.setState(CommitState.SUCCESS);
  },

  /**
   * Update file progress
   * @param {number} processed - Number of files processed
   * @param {number} total - Total number of files
   */
  setProgress(processed, total) {
    this.filesProcessed = processed;
    this.totalFiles = total;
  },

  /**
   * Get elapsed time in milliseconds
   * @returns {number|null} Elapsed time or null if not started
   */
  getElapsedTime() {
    if (!this.startTime) return null;
    const end = this.endTime || Date.now();
    return end - this.startTime;
  },

  /**
   * Check if commit is in progress
   * @returns {boolean} True if committing
   */
  isInProgress() {
    return (
      this.currentState === CommitState.PREPARING ||
      this.currentState === CommitState.VALIDATING ||
      this.currentState === CommitState.PUSHING
    );
  },
};

/**
 * Commits generated code to FlutterFlow with full state tracking.
 * @param {string} dartCode - The generated Dart code to commit
 * @param {string} fileName - Name of the file (e.g., "MyWidget.dart")
 * @param {Object} options - Commit options
 * @param {string} options.codeType - Type of code (ACTION, WIDGET, FUNCTION)
 * @param {Object} options.pubspecDeps - Additional pubspec dependencies
 * @returns {Promise<Object>} Commit result
 */
async function commitToFlutterFlow(dartCode, fileName, options = {}) {
  let { codeType = "W" } = options;
  const { pubspecDeps = {} } = options;

  // Validate/fix codeType if passed as full string
  if (codeType === "CustomWidget") codeType = CodeType.WIDGET;
  if (codeType === "CustomAction") codeType = CodeType.ACTION;
  if (codeType === "CustomFunction") codeType = CodeType.FUNCTION;
  if (codeType === "CodeFile") codeType = CodeType.ACTION;

  // Reset and start
  commitState.reset();
  commitState.setState(CommitState.PREPARING);

  try {
    // Get credentials
    const apiKey = await getApiKey("flutterflow");
    const projectId = await getApiKey("flutterflow_project_id");

    if (!apiKey || !projectId) {
      throw new Error(
        "FlutterFlow credentials not configured. Please set your API key and Project ID in the API Keys settings.",
      );
    }

    if (!validateFlutterFlowProjectId(projectId)) {
      throw new Error("Invalid FlutterFlow Project ID format.");
    }

    const endpoint = getFlutterFlowEndpoint();
    const apiClient = new FlutterFlowApiClient(
      apiKey,
      projectId,
      "main",
      endpoint,
    );

    // Prepare file map
    commitState.setState(CommitState.VALIDATING);
    const fileMap = new Map();

    // Add the main code file
    const detectedType = codeType || detectCodeType(fileName, dartCode);
    const filePath = getFilePathForCodeType(fileName, detectedType);

    fileMap.set(fileName, {
      content: dartCode,
      type: detectedType,
      path: filePath,
    });

    commitState.setProgress(0, fileMap.size);

    // Validate files
    const validation = validateFileMap(fileMap);
    if (!validation.valid) {
      throw new Error(`Validation failed:\n${validation.errors.join("\n")}`);
    }

    // Prepare pubspec
    let serializedYaml = serializePubspecToYaml(createDefaultPubspec());

    // Check if we need to merge dependencies
    if (Object.keys(pubspecDeps).length > 0) {
      let basePubspec = createDefaultPubspec();
      basePubspec = mergeDependencies(basePubspec, pubspecDeps);
      serializedYaml = serializePubspecToYaml(basePubspec);
    }

    const fileMapContents = buildApiFileMap(fileMap);

    const fileMapWithPubspec = new Map(fileMap);
    fileMapWithPubspec.set("pubspec.yaml", {
      content: serializedYaml,
      type: "D",
      path: "pubspec.yaml",
    });

    const zippedCustomCode = await createZipFromFileMap(fileMapWithPubspec);

    const pushRequest = {
      project_id: projectId,
      zipped_custom_code: zippedCustomCode,
      uid: `web_${Date.now()}`,
      branch_name: apiClient.branchName,
      serialized_yaml: serializedYaml,
      file_map: fileMapContents,
      functions_map: "{}",
    };

    // Push to FlutterFlow
    commitState.setState(CommitState.PUSHING);
    commitState.setProgress(1, fileMap.size);

    const response = await apiClient.pushCode(pushRequest);
    const result = await parsePushCodeResponse(response);

    if (result.success) {
      commitState.setSuccess({
        fileCount: fileMap.size,
        projectId,
        warnings:
          result.errorMap && result.errorMap.size > 0
            ? Array.from(result.errorMap.entries())
            : [],
      });
    } else {
      const errorMsg =
        result.errorMessage || getFlutterFlowErrorMessage(result.responseCode);
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: `Successfully committed ${fileName} to FlutterFlow project ${projectId}`,
      warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
    };
  } catch (error) {
    console.error("Commit failed:", error);
    commitState.setError(error);

    return {
      success: false,
      error: error.message,
      state: commitState.currentState,
    };
  }
}

  /**
 * Creates a zip file from a file map.
 * @param {Map<string, {content: string, type: string, path: string}>} fileMap - Map of file paths to content
 * @returns {Promise<string>} Base64 encoded zip file
 */
async function createZipFromFileMap(fileMap) {
  try {
    const zip = new JSZip();
    for (const [filePath, fileData] of fileMap) {
      zip.file(filePath, fileData.content);
    }
    const zipBuffer = await zip.generateAsync({
      type: "base64",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return zipBuffer;
  } catch (error) {
    console.error("Failed to create zip archive:", error);
    throw new Error("Failed to create zip archive");
  }
}

async function executeCommit(code, options = {}) {
  const { artifactType, artifactName, pipelineResult } = options;

  try {
    const zip = new JSZip();
    const zipContent = await generateZipContent(code, artifactType, artifactName, pipelineResult);
    zip.file("code.zip", zipContent);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    return zipBlob;
  } catch (error) {
    throw new Error("Failed to create zip archive");
  }
}

// --- PIPELINE FUNCTIONS ---

async function runPromptArchitect(userInput) {
  try {
    const result = await callBuildShip("architect", PROMPT_ARCHITECT_MODEL, userInput, {})
    return result
  } catch (error) {
    throw new Error(`Prompt Architect failed: ${error.message}`)
  }
}

async function runCodeGenerator(masterPrompt, selectedModel) {
  try {
    const result = await callBuildShip("generator", selectedModel, masterPrompt, {})
    return result
  } catch (primaryError) {
    if (selectedModel !== FALLBACK_MODEL) {
      console.warn(`Code Generator failed with ${selectedModel}, retrying with fallback model:`, primaryError.message)
      try {
        const result = await callBuildShip("generator", FALLBACK_MODEL, masterPrompt, {})
        return result
      } catch (fallbackError) {
        throw new Error(`Code Generator failed: primary (${selectedModel}): ${primaryError.message} | fallback (${FALLBACK_MODEL}): ${fallbackError.message}`)
      }
    }
    throw new Error(`Code Generator failed: ${primaryError.message}`)
  }
}

async function runCodeReview(code, architectOutput = null) {
  const context = architectOutput ? { architect_output: architectOutput } : {}
  try {
    const result = await callBuildShip("review", CODE_REVIEW_MODEL, code, context)
    return result
  } catch (error) {
    throw new Error(`Code Review failed: ${error.message}`)
  }
}

// --- MARKDOWN RENDERING ---

function renderMarkdownAudit(markdown) {
  // Parse markdown and convert to rich HTML
  let html = `<div class="audit-report space-y-4">`;

  // Split by lines and process
  const lines = markdown.split("\n");
  let currentSection = "";
  let inCodeBlock = false;
  let codeBlockContent = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const language = detectLanguage(codeBlockContent);
        const highlightedCode = highlightCode(
          codeBlockContent.trim(),
          language,
        );
        html += `<div class="bg-gray-900 rounded-lg p-3 border border-gray-200">
          <pre class="text-xs font-mono overflow-x-auto text-gray-100"><code class="language-${language}">${highlightedCode}</code></pre>
        </div>`;
        codeBlockContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // Handle headers
    if (line.startsWith("# ")) {
      const title = line.substring(2).trim();
      const icon = getSectionIcon(title);
      html += `<div class="audit-header mb-4">
        <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>${icon}</span>
          <span>${title}</span>
        </h2>
      </div>`;
      continue;
    }

    if (line.startsWith("## ")) {
      const title = line.substring(3).trim();
      const icon = getSubsectionIcon(title);
      html += `<div class="audit-subsection mb-3 mt-4">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>${icon}</span>
          <span>${title}</span>
        </h3>
      </div>`;
      continue;
    }

    // Handle lists
    if (line.match(/^[-*+]\s+/)) {
      const item = line.replace(/^[-*+]\s+/, "").trim();
      html += `<div class="audit-list-item flex items-start gap-2 mb-2">
        <span class="text-blue-600 mt-1">•</span>
        <span class="text-gray-700 text-sm">${processInlineFormatting(item)}</span>
      </div>`;
      continue;
    }

    // Handle numbered lists
    if (line.match(/^\d+\.\s+/)) {
      const item = line.replace(/^\d+\.\s+/, "").trim();
      html += `<div class="audit-list-item flex items-start gap-2 mb-2">
        <span class="text-blue-600 mt-1">•</span>
        <span class="text-gray-700 text-sm">${processInlineFormatting(item)}</span>
      </div>`;
      continue;
    }

    // Handle empty lines
    if (line.trim() === "") {
      continue;
    }

    // Handle regular paragraphs
    html += `<p class="text-gray-700 text-sm mb-2">${processInlineFormatting(line)}</p>`;
  }

  html += `</div>`;

  // Wrap in styled container
  return `
    <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-xs font-bold text-green-600 uppercase tracking-wider">Live Audit Report</span>
      </div>
      ${html}
    </div>
  `;
}

function getSectionIcon(title) {
  const icons = {
    "Integration Audit Report": "📋",
    "Critical Issues": "❌",
    Warnings: "⚠️",
    Recommendations: "✅",
    "Overall Score": "📊",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return "📄";
}

function getSubsectionIcon(title) {
  const icons = {
    critical: "❌",
    warning: "⚠️",
    recommendation: "✅",
    score: "📊",
    issue: "🔍",
    fix: "🔧",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return "📝";
}

function detectLanguage(code) {
  // Simple language detection based on code content
  if (
    (code.includes("class ") && code.includes("extends ")) ||
    code.includes("StatelessWidget") ||
    code.includes("StatefulWidget") ||
    code.includes("import 'package:flutter/")
  ) {
    return "dart";
  }
  if (
    code.includes("def ") ||
    code.includes("import ") ||
    code.includes("print(")
  ) {
    return "python";
  }
  if (
    code.includes("function ") ||
    code.includes("const ") ||
    code.includes("console.")
  ) {
    return "javascript";
  }
  return "dart"; // Default to dart for this use case
}

function processInlineFormatting(text) {
  // Bold text **text**
  text = text.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-gray-900 font-semibold">$1</strong>',
  );

  // Italic text *text*
  text = text.replace(/\*(.*?)\*/g, '<em class="text-blue-600">$1</em>');

  // Inline code `code`
  text = text.replace(/`(.*?)`/g, (match, code) => {
    return `<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">${code}</code>`;
  });

  // Highlight important terms
  text = text.replace(
    /\b(FAIL|ERROR|CRITICAL)\b/g,
    '<span class="text-red-600 font-bold">$1</span>',
  );
  text = text.replace(
    /\b(WARN|WARNING)\b/g,
    '<span class="text-amber-600 font-bold">$1</span>',
  );
  text = text.replace(
    /\b(PASS|SUCCESS|OK)\b/g,
    '<span class="text-green-600 font-bold">$1</span>',
  );

  return text;
}

// --- UI FUNCTIONS ---

function updateStepIndicator(step, status) {
  const item = document.getElementById(`step${step}-item`);
  const statusIcon = document.getElementById(`step${step}-status`);
  if (!item || !statusIcon) return;

  // Drive step timers
  if (status === 'active') stepTimingStart(step);
  else if (status === 'completed') stepTimingComplete(step);
  else if (status === 'error') stepTimingClear(step);
  else stepTimingReset(step);

  // Reset classes
  item.classList.remove("active", "completed", "error");
  statusIcon.classList.remove("running", "completed", "error");

  if (status === "active") {
    item.classList.add("active");
    statusIcon.classList.add("running");
    // Spinner icon for running state
    statusIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>`;
  } else if (status === "completed") {
    item.classList.add("completed");
    statusIcon.classList.add("completed");
    // Checkmark icon for completed state
    statusIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`;
  } else if (status === "error") {
    item.classList.add("error");
    statusIcon.classList.add("error");
    // X icon for error state
    statusIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`;
  } else {
    // Reset to clock icon (pending state)
    statusIcon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`;
  }
}

function showStepLoading(step, show) {
  const loading = document.getElementById(`step${step}-loading`);
  const result = document.getElementById(`step${step}-result`);

  if (show) {
    loading.classList.remove("hidden");
    result.classList.add("hidden");
    updateStepIndicator(step, "active");
    setAccordionState(step, 'running');
  } else {
    loading.classList.add("hidden");
    result.classList.remove("hidden");
    updateStepIndicator(step, "completed");
    setAccordionState(step, 'completed');
  }
}

function hideReadyState() {
  const el = document.getElementById('ready-state')
  if (el) el.style.display = 'none'
}

function showReadyState() {
  const paywall = document.getElementById('paywall-exhausted')
  if (paywall) paywall.style.display = 'none'
  const accordions = document.getElementById('workflow-accordions')
  if (accordions) accordions.style.display = 'none'
  const banner = document.getElementById('next-steps-banner')
  if (banner) banner.classList.add('hidden')
  const el = document.getElementById('ready-state')
  if (el) el.style.display = 'flex'
}

function hideWorkflowAccordions() {
  const accordions = document.getElementById('workflow-accordions')
  if (accordions) accordions.style.display = 'none'
}

function showWorkflowAccordions() {
  const el = document.getElementById('ready-state')
  if (el) el.style.display = 'none'
  const paywall = document.getElementById('paywall-exhausted')
  if (paywall) paywall.style.display = 'none'
  const accordions = document.getElementById('workflow-accordions')
  if (accordions) accordions.style.display = 'flex'
}

function setAccordionState(step, state) {
  const accordion = document.getElementById(`accordion-step${step}`)
  if (!accordion) return

  accordion.classList.remove('acc-running', 'acc-completed', 'acc-error')

  const statusIcon = document.getElementById(`accordion-step${step}-status-icon`)

  const ICON_IDLE = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`
  const ICON_SPIN = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>`
  const ICON_CHECK = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>`
  const ICON_ERROR = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>`

  if (state === 'running') {
    accordion.classList.add('acc-running')
    if (statusIcon) statusIcon.innerHTML = ICON_SPIN
  } else if (state === 'completed') {
    accordion.classList.add('acc-completed')
    if (statusIcon) statusIcon.innerHTML = ICON_CHECK
  } else if (state === 'error') {
    accordion.classList.add('acc-error')
    if (statusIcon) statusIcon.innerHTML = ICON_ERROR
  } else {
    if (statusIcon) statusIcon.innerHTML = ICON_IDLE
  }
}

function expandAccordion(step) {
  const body = document.getElementById(`accordion-step${step}-body`)
  const chevron = document.getElementById(`accordion-step${step}-chevron`)
  if (body) body.classList.add('open')
  if (chevron) chevron.classList.add('open')
}

function collapseAccordion(step) {
  const body = document.getElementById(`accordion-step${step}-body`)
  const chevron = document.getElementById(`accordion-step${step}-chevron`)
  if (body) body.classList.remove('open')
  if (chevron) chevron.classList.remove('open')
}

function toggleAccordion(step) {
  const body = document.getElementById(`accordion-step${step}-body`)
  if (!body) return
  if (body.classList.contains('open')) {
    collapseAccordion(step)
  } else {
    expandAccordion(step)
  }
}

function showNextStepsBanner() {
  const banner = document.getElementById('next-steps-banner')
  if (banner) banner.classList.remove('hidden')
}

function hideNextStepsBanner() {
  const banner = document.getElementById('next-steps-banner')
  if (banner) banner.classList.add('hidden')
}

function openFixErrorsModal() {
  const modal = document.getElementById('fix-errors-modal')
  if (modal) modal.classList.add('open')
}

function closeFixErrorsModal(event) {
  if (event && event.target !== event.currentTarget) return
  const modal = document.getElementById('fix-errors-modal')
  if (modal) modal.classList.remove('open')
}

async function runFixErrorsAndClose() {
  closeFixErrorsModal()
  await regenerateFromPastedErrors()
}

function toggleSection(sectionId) {
  const content = document.getElementById(`${sectionId}-content`);
  const chevron = document.getElementById(`${sectionId}-chevron`);

  if (content.classList.contains("open")) {
    content.classList.remove("open");
    if (chevron) chevron.style.transform = "rotate(0deg)";
  } else {
    content.classList.add("open");
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }
}

function toggleStep(step) {
  // For backward compatibility - now we show the step in main stage
  selectWorkflowStep(parseInt(step.replace("step", "")));
}

function selectWorkflowStep(step) {
  for (let i = 1; i <= 3; i++) {
    const item = document.getElementById(`step${i}-item`);
    if (item) item.classList.remove("active");
  }

  const selectedItem = document.getElementById(`step${step}-item`);
  if (selectedItem) selectedItem.classList.add("active");

  showWorkflowAccordions();
  expandAccordion(step);
}

function copyCode(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Use stored raw code if available, otherwise use textContent
  const text = element.dataset.raw || element.textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      trackEvent("Code Copied", { elementId });
      
      // Find the copy button for this element
      const container = element.closest(".code-container");
      const btn = container?.querySelector(".copy-btn");
      if (btn) {
        btn.classList.add("copied");
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!`;
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy`;
        }, 2000);
      }
    })
    .catch((err) => {
      console.warn("Failed to copy to clipboard:", err);
    });
}

function updateModelInfo(selectedModel) {
  const modelNames = {
    "google/gemini-3.1-pro-preview": "Gemini 3.1 Pro",
    "google/gemini-3-flash-preview": "Gemini 3 Flash",
    "anthropic/claude-4.6-opus": "Claude 4.6 Opus",
    "openai/gpt-5.3-codex": "GPT-5.3-Codex",
    "openrouter/auto": "OpenRouter: Auto",
    "openrouter/free": "OpenRouter: Free Models",
  }

  // Helper function to get display name
  function getDisplayName(model) {
    return modelNames[model] || model
  }

  const step1Label = document.getElementById("step1-model-label")
  if (step1Label) step1Label.textContent = getDisplayName(PROMPT_ARCHITECT_MODEL)

  const effectiveModel = getEffectiveModel(selectedModel)
  const step2Label = document.getElementById("step2-model-label")
  if (step2Label) {
    step2Label.textContent = effectiveModel !== selectedModel
      ? `${getDisplayName(selectedModel)} → ${getDisplayName(effectiveModel)} (Free Tier)`
      : getDisplayName(selectedModel)
  }

  const step3Label = document.getElementById("step3-model-label")
  if (step3Label) step3Label.textContent = getDisplayName(CODE_REVIEW_MODEL)

  const acc1Model = document.getElementById("accordion-step1-model")
  if (acc1Model) acc1Model.textContent = getDisplayName(PROMPT_ARCHITECT_MODEL)

  const acc2Model = document.getElementById("accordion-step2-model")
  if (acc2Model) {
    acc2Model.textContent = effectiveModel !== selectedModel
      ? `${getDisplayName(effectiveModel)} (Free Tier)`
      : getDisplayName(selectedModel)
  }

  const acc3Model = document.getElementById("accordion-step3-model")
  if (acc3Model) acc3Model.textContent = getDisplayName(CODE_REVIEW_MODEL)


  if (effectiveModel !== selectedModel) {

  } else {

  }

}

async function runRefinement() {
  if (pipelineState.isRunning) return;

  // Get current model
  const selectedModel = document.getElementById("code-generator-model").value;

  // Set running state
  pipelineState.isRunning = true;
  callEndpoint('standardRegenerate', pipelineState.step2Result, pipelineState.step1Result)
  const btns = document.querySelectorAll(".btn-refine-action");

  btns.forEach((btn) => {
    btn.disabled = true;
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Refining...`;
  });

  try {
    // Construct refinement prompt
    const refinementPrompt = `CRITICAL: This is a REFINEMENT task.
The previously generated code has issues that need fixing.

ORIGINAL SPECIFICATION:
${pipelineState.step1Result}

CURRENT CODE:
${pipelineState.step2Result}

AUDIT REPORT (ISSUES TO FIX):
${pipelineState.step3Result}

Please RE-GENERATE the code to fix the issues listed in the AUDIT REPORT.
Ensure it still adheres to the ORIGINAL SPECIFICATION.
`;

    collapseAccordion(3);
    expandAccordion(2);
    showStepLoading(2, true);

    pipelineState.step2Result = await runCodeGenerator(
      refinementPrompt,
      selectedModel,
    );

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.innerHTML = highlightCode(cleanStep2);
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    await new Promise(r => setTimeout(r, 800));
    collapseAccordion(2);
    expandAccordion(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );

    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result);

    showStepLoading(3, false);
    expandAccordion(2);
    expandAccordion(3);
    showNextStepsBanner();
  } catch (error) {
    console.error("Refinement failed:", error);
    showToast(`Refinement failed: ${error.message}`, "error");
  } finally {
    pipelineState.isRunning = false;
    btns.forEach((btn) => {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg> Refine &amp; Regenerate Code`;
    });
  }
}

  async function callEndpoint(type, code, input) {
  const url = `${BUILDSHIP_BASE_URL}/connectFeedback`
  const data = { type: type, code: code, input: input }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, status: response.status, error: errorText }
    }
    
    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function clearErrorInput() {
  const input = document.getElementById("ff-error-paste-input")
  if (input) input.value = ""
}

async function regenerateFromPastedErrors() {
  const input = document.getElementById("ff-error-paste-input")
  const pastedErrors = input?.value?.trim()

  if (!pastedErrors) {
    input?.focus()
    input?.classList.add("ring-2", "ring-red-400", "border-red-300")
    setTimeout(() => input?.classList.remove("ring-2", "ring-red-400", "border-red-300"), 2000)
    return
  }

  if (!pipelineState.step2Result) {
    showToast("No generated code found. Please run the full pipeline first.", "warning")
    return
  }

  if (pipelineState.isRunning) return

  const selectedModel = document.getElementById("code-generator-model").value
  pipelineState.isRunning = true
  callEndpoint('flutterflowError', pipelineState.step2Result, pastedErrors)

  const btn = document.getElementById("btn-fix-from-errors")
  if (btn) {
    btn.disabled = true
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg> Fixing…`
  }

  try {
    const refinementPrompt = `CRITICAL: This is a REGENERATION task to fix FlutterFlow/Dart build errors.

ORIGINAL SPECIFICATION:
${pipelineState.step1Result}

CURRENT CODE (which produced the errors below):
${pipelineState.step2Result}

FLUTTERFLOW / DART BUILD ERRORS TO FIX:
${pastedErrors}

Carefully analyse each error. Fix ALL of them in the regenerated code without introducing new issues.
Maintain the original specification and intent.`

    selectWorkflowStep(2)
    showStepLoading(2, true)

    pipelineState.step2Result = await runCodeGenerator(refinementPrompt, selectedModel)

    const step2Output = document.getElementById("step2-output")
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result)
    step2Output.innerHTML = highlightCode(cleanStep2)
    step2Output.dataset.raw = cleanStep2
    showStepLoading(2, false)

    await new Promise(r => setTimeout(r, 800));
    collapseAccordion(2);
    expandAccordion(3);
    showStepLoading(3, true)

    pipelineState.step3Result = await runCodeReview(pipelineState.step2Result, pipelineState.step1Result)

    const auditOutput = document.getElementById("step3-output")
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result)
    showStepLoading(3, false)

    expandAccordion(2);
    expandAccordion(3);
    showNextStepsBanner();

    if (input) input.value = ""
  } catch (error) {
    console.error("Fix from errors failed:", error)
    showToast(`Failed to fix errors: ${error.message}`, "error")
  } finally {
    pipelineState.isRunning = false
  }
}

// --- MAIN PIPELINE ---

async function runThinkingPipeline() {
  if (pipelineState.isRunning) return;

  localStorage.setItem("hasSeenWalkthrough", "true");

  const userInput = document.getElementById("pipeline-input").value;
  const selectedModel = document.getElementById("code-generator-model").value;

  if (!userInput.trim()) {
    showToast("Please describe your FlutterFlow widget first.", "warning");
    return;
  }

  if (!canRunPipeline()) return;

  const effectiveModel = getEffectiveModel(selectedModel);

  trackEvent("Pipeline Started", { 
    selectedModel, 
    effectiveModel,
    inputLength: userInput.length
  });

  const btn = document.getElementById("btn-run-pipeline");

  // Reset state
  pipelineState.isRunning = true;
  pipelineState.step1Result = null;
  pipelineState.step2Result = null;
  pipelineState.step3Result = null;

  btn.disabled = true;
  btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
  Running...`;

  updateModelInfo(effectiveModel);

  try {
    hideNextStepsBanner();
    showWorkflowAccordions();

    for (let i = 1; i <= 3; i++) {
      collapseAccordion(i);
      setAccordionState(i, 'idle');
      stepTimingReset(i);
    }

    expandAccordion(1);
    showStepLoading(1, true);

    pipelineState.step1Result = await runPromptArchitect(userInput);
    trackEvent("Prompt Architect Completed");

    const step1Output = document.getElementById("step1-output")
    const cleanStep1 = extractCodeFromMarkdown(pipelineState.step1Result)
    step1Output.innerHTML = highlightCode(cleanStep1, 'json')
    if (cleanStep1 && !step1Output.innerHTML.trim()) {
      step1Output.textContent = cleanStep1
    }
    step1Output.dataset.raw = cleanStep1
    showStepLoading(1, false)

    await new Promise(r => setTimeout(r, 1200));
    collapseAccordion(1);

    expandAccordion(2);
    showStepLoading(2, true);

    pipelineState.step2Result = await runCodeGenerator(
      pipelineState.step1Result,
      effectiveModel,
    );
    trackEvent("Code Generator Completed");

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.innerHTML = highlightCode(cleanStep2);
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    await new Promise(r => setTimeout(r, 1200));
    collapseAccordion(2);

    expandAccordion(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );
    trackEvent("Code Review Completed");

    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result);

    showStepLoading(3, false);

    expandAccordion(2);
    expandAccordion(3);
    showNextStepsBanner();
    sendCompletionNotification();

    incrementUsage();
    updateUsageDisplay();
  } catch (error) {
    console.error("Pipeline failed:", error);
    
    trackEvent("Pipeline Failed", { 
      error: error.message,
      effectiveModel: getEffectiveModel(document.getElementById("code-generator-model").value)
    });

    // Determine which step failed based on the error context
    let errorStep = 1; // Default to step 1
    if (
      error.message.includes("Claude") ||
      error.message.includes("OpenAI") ||
      error.message.includes("Code Generator")
    ) {
      errorStep = 2;
    } else if (error.message.includes("Code Review")) {
      errorStep = 3;
    }

    setAccordionState(errorStep, 'error');
    expandAccordion(errorStep);
    const resultDiv = document.getElementById(`step${errorStep}-result`);
    const loadingDiv = document.getElementById(`step${errorStep}-loading`);
    const output = document.getElementById(`step${errorStep}-output`);

    if (loadingDiv) loadingDiv.classList.add("hidden");
    if (resultDiv) resultDiv.classList.remove("hidden");

    if (output) {
      // Format error message based on type
      let errorMessage = error.message;
      if (error.message.includes("image input")) {
        errorMessage =
          "This model doesn't support image input. Please use Gemini 3.1 Pro for image-based requests or remove image references from your prompt.";
      } else if (
        error.message.includes("Load failed") ||
        error.message.includes("CORS")
      ) {
        errorMessage =
          "API connection failed. This might be due to CORS restrictions or network issues. Please check your API key and try again.";
      }

      output.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 class="text-red-600 font-bold text-xs uppercase mb-2">Connection Error</h4>
        <p class="text-sm text-red-700">${errorMessage}</p>
        <div class="mt-3 text-xs text-gray-500">
          <p>Check if API key is valid</p>
          <p>Try using a different model</p>
          <p>Ensure network allows API calls</p>
        </div>
      </div>`;
    }

    updateStepIndicator(errorStep, "error");
  } finally {
    pipelineState.isRunning = false;
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
    Run`;

    updateDeployButtonVisibility();
  }
}

function retryWithDifferentModel() {
  // Show model selection dialog
  const currentModel = document.getElementById("code-generator-model").value;
  const otherModels = [
    "google/gemini-3.1-pro-preview",
    "anthropic/claude-4.6-opus",
    "openai/gpt-5.3-codex",
  ].filter((model) => model !== currentModel);

  const selectedModel = prompt(
    `Retry with different model?\n\nCurrent: ${currentModel}\n\nOptions:\n1. ${otherModels[0]}\n2. ${otherModels[1]}\n\nEnter 1 or 2:`,
  );

  if (selectedModel === "1") {
    document.getElementById("code-generator-model").value = otherModels[0];
    runThinkingPipeline();
  } else if (selectedModel === "2") {
    document.getElementById("code-generator-model").value = otherModels[1];
    runThinkingPipeline();
  }
}

/**
 * Initiates the commit to FlutterFlow process from the UI.
 * Called when user clicks the "Commit to FlutterFlow" button.
 */
async function initiateCommitToFlutterFlow() {
  if (!pipelineState.step2Result) {
    showToast("No code to commit. Please run the pipeline first.", "warning");
    return;
  }

  const apiKey = await getApiKey("flutterflow");
  const projectId = await getApiKey("flutterflow_project_id");

  if (!apiKey || !projectId) {
    showToast("FlutterFlow credentials not configured. Add your API Key and Project ID in settings.", "warning");
    openApiKeysModal();
    return;
  }

  const code = pipelineState.step2Result;

  let artifactType = "CustomWidget";
  let artifactName = "GeneratedWidget";

  if (pipelineState.step1Result) {
    try {
      const spec = JSON.parse(pipelineState.step1Result);
      artifactType = spec.artifactType || "CustomWidget";
      artifactName = spec.artifactName || "GeneratedWidget";
    } catch (e) {
      console.warn("Could not parse step 1 result:", e);
    }
  }

  const codeInfo = prepareCodeForCommit(code, { artifactType, artifactName });

  const checks = runPreCommitChecks(codeInfo);

  const shouldProceed = await showPreCommitSummary(codeInfo, checks);

  if (!shouldProceed) {

    return;
  }

  showCommitProgress();
  trackEvent("Deploy to FlutterFlow Started", { artifactType, artifactName });

  const result = await executeCommit(code, {
    artifactType,
    artifactName,
    pipelineResult: {
      step1Result: pipelineState.step1Result,
      selectedModel: document.getElementById("code-generator-model")?.value,
    },
  });

  hideCommitProgress();

  if (result.success) {
    trackEvent("Deploy to FlutterFlow Success", { artifactType, artifactName });
    showCommitSuccessModal(result);
  } else {
    trackEvent("Deploy to FlutterFlow Failed", { artifactType, artifactName, error: result.error });
    showCommitFailureModal(result);
  }
}

/**
 * Shows commit errors in the UI with option to regenerate
 */
function showCommitError(result) {
  // Parse error map from result
  let errorMap = result.errorMap || new Map();

  // If errorMap is not a Map, try to convert it
  if (!(errorMap instanceof Map) && typeof errorMap === "object") {
    errorMap = new Map(Object.entries(errorMap));
  }

  // Format error message
  let errorHtml = `<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <h4 class="text-red-600 font-bold text-sm uppercase mb-2">FlutterFlow Commit Failed</h4>
    <p class="text-sm text-red-700 mb-3">${escapeHtml(result.error)}</p>`;

  if (errorMap && errorMap.size > 0) {
    errorHtml += `<div class="mt-3">
      <p class="text-xs font-semibold text-red-600 uppercase mb-2">Errors:</p>
      <ul class="text-sm text-red-700 space-y-2">`;

    for (const [fileName, errorInfo] of errorMap.entries()) {
      const message = errorInfo.errorMessage || errorInfo;
      errorHtml += `<li class="bg-white p-2 rounded border border-red-100">
        <strong class="text-red-800">${escapeHtml(fileName)}:</strong> ${escapeHtml(message)}
      </li>`;
    }

    errorHtml += `</ul></div>`;
  }

  errorHtml += `</div>`;

  // Add regenerate button
  errorHtml += `<div class="flex gap-3 mt-4">
    <button id="btn-regenerate-from-error" class="btn-primary bg-indigo-600 hover:bg-indigo-700">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Fix Errors & Regenerate
    </button>
  </div>`;

  // Display in step 3 output
  const step3Output = document.getElementById("step3-output");
  if (step3Output) {
    step3Output.innerHTML = errorHtml;

    // Add click handler for regenerate button
    document
      .getElementById("btn-regenerate-from-error")
      ?.addEventListener("click", () => {
        regenerateWithErrors(result.error, errorMap);
      });
  }
}

/**
 * Regenerates code with FlutterFlow errors included in the prompt
 */
async function regenerateWithErrors(originalError, errorMap) {
  if (pipelineState.isRunning) return;

  const selectedModel = document.getElementById("code-generator-model").value;

  pipelineState.isRunning = true;

  const btn = document.getElementById("btn-regenerate-from-error");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg> Fixing...`;
  }

  try {
    // Build error context for regeneration
    let errorContext =
      "The previous code had the following errors when committing to FlutterFlow:\n\n";

    if (errorMap && errorMap.size > 0) {
      for (const [fileName, errorInfo] of errorMap.entries()) {
        const message = errorInfo.errorMessage || errorInfo;
        errorContext += `File: ${fileName}\nError: ${message}\n\n`;
      }
    } else {
      errorContext += `${originalError}\n`;
    }

    const refinementPrompt = `CRITICAL: This is a REGENERATION task to fix FlutterFlow errors.

ORIGINAL SPECIFICATION:
${pipelineState.step1Result}

CURRENT CODE:
${pipelineState.step2Result}

FLUTTERFLOW ERRORS TO FIX:
${errorContext}

Please regenerate the code to fix these errors while maintaining the original specification.`;

    // Go to step 2
    selectWorkflowStep(2);
    showStepLoading(2, true);

    // Generate new code
    pipelineState.step2Result = await runCodeGenerator(
      refinementPrompt,
      selectedModel,
    );

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.innerHTML = highlightCode(cleanStep2);
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    // Run audit
    selectWorkflowStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );

    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result);

    showStepLoading(3, false);
  } catch (error) {
    console.error("Regeneration failed:", error);
    showToast(`Regeneration failed: ${error.message}`, "error");
  } finally {
    pipelineState.isRunning = false;

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg> Fix Errors & Regenerate`;
    }

    updateDeployButtonVisibility();
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, "<br>");
}

/**
 * Updates the FlutterFlow credential status indicator in Step 3.
 */
async function updateFlutterFlowCredentialStatus() {
  const statusDot = document.getElementById("ff-status-dot");
  const statusText = document.getElementById("ff-status-text");

  if (!statusDot || !statusText) return;

  const apiKey = await getApiKey("flutterflow");
  const projectId = await getApiKey("flutterflow_project_id");

  if (apiKey && projectId) {
    statusDot.className = "w-2 h-2 rounded-full bg-green-500";
    statusText.textContent = "FlutterFlow credentials configured";
    statusText.className = "text-green-600";
  } else if (apiKey || projectId) {
    statusDot.className = "w-2 h-2 rounded-full bg-yellow-500";
    statusText.textContent = "FlutterFlow credentials incomplete";
    statusText.className = "text-yellow-600";
  } else {
    statusDot.className = "w-2 h-2 rounded-full bg-red-500";
    statusText.textContent = "FlutterFlow credentials not configured";
    statusText.className = "text-red-600";
  }
}

// --- SYNTAX HIGHLIGHTING ---

// Extract code from markdown code blocks (strips ```dart ... ```)
function extractCodeFromMarkdown(text) {
  if (!text) return ''
  if (typeof text !== 'string') return String(text)

  // Match ```language\n...code...\n``` pattern
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  // If no code block found, return original text trimmed
  return text.trim();
}

function highlightCode(code, language = "dart") {
  if (!code) return ""
  try {
    const cleanCode = extractCodeFromMarkdown(code)
    return hljs.highlight(cleanCode, { language }).value
  } catch (error) {
    console.warn("Syntax highlighting failed:", error)
    try {
      return hljs.highlight(extractCodeFromMarkdown(code), { language: 'json' }).value
    } catch {
      return extractCodeFromMarkdown(code) || ""
    }
  }
}

// --- AUTH FUNCTIONS ---

async function sendMagicLink(email) {
  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/auth/send-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    if (!res.ok) throw new Error(`Failed to send magic link: HTTP ${res.status}`)
    return res.json()
  } catch (err) {
    console.error('sendMagicLink failed:', { email, message: err.message, stack: err.stack })
    throw err
  }
}

async function verifyMagicLink(token) {
  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/auth/verify-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json()
    if (data.error || !data.email || !data.sessionToken) {
      throw new Error(data.error || 'Invalid or expired link')
    }
    return data
  } catch (err) {
    console.error('verifyMagicLink failed:', { message: err.message, stack: err.stack })
    throw err
  }
}

async function refreshSession(sessionToken) {
  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/auth/refresh-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    })
    if (!res.ok) {
      console.error('refreshSession: non-OK response', { url: `${BUILDSHIP_BASE_URL}/auth/refresh-session`, status: res.status })
      return null
    }
    const data = await res.json()
    if (data.error || !data.email || !data.sessionToken) {
      console.warn('refreshSession: validation failed', { error: data.error, hasEmail: !!data.email, hasToken: !!data.sessionToken })
      return null
    }
    return data
  } catch (err) {
    console.error('refreshSession: fetch failed', { url: `${BUILDSHIP_BASE_URL}/auth/refresh-session`, message: err.message, stack: err.stack })
    return null
  }
}

function saveSession(email, sessionToken) {
  authState.email = email
  authState.sessionToken = sessionToken
  authState.isVerified = true
  if (email) localStorage.setItem('ccc_email', email)
  if (sessionToken) localStorage.setItem('ccc_sessionToken', sessionToken)
}

function clearSession() {
  authState.email = null
  authState.sessionToken = null
  authState.isVerified = false
  subscriptionState = { tier: 'free', status: 'none', periodEnd: null }
  localStorage.removeItem('ccc_subscription')
  localStorage.removeItem('ccc_email')
  localStorage.removeItem('ccc_sessionToken')
}

function getStoredSession() {
  return {
    email: authState.email || localStorage.getItem('ccc_email'),
    sessionToken: authState.sessionToken || localStorage.getItem('ccc_sessionToken')
  }
}

async function initializeAuth() {
  const params = new URLSearchParams(window.location.search)
  const magicToken = params.get('token')

  if (magicToken) {
    window.history.replaceState({}, '', window.location.pathname)
    try {
      const { email, sessionToken } = await verifyMagicLink(magicToken)
      saveSession(email, sessionToken)
    } catch (err) {
      showToast(err.message || 'Sign-in link invalid or expired.', 'error')
    }
  } else {
    const { email, sessionToken } = getStoredSession()
    if (email && sessionToken) {
      const refreshed = await refreshSession(sessionToken)
      if (refreshed) {
        saveSession(refreshed.email, refreshed.sessionToken)
      } else {
        clearSession()
      }
    }
  }

  updateAuthUI()
}

function openSignInModal() {
  const modal = document.getElementById('signin-modal')
  if (modal) modal.classList.add('open')
}

function closeSignInModal(event) {
  if (event && event.target !== event.currentTarget) return
  const modal = document.getElementById('signin-modal')
  if (modal) modal.classList.remove('open')
}

async function handleMagicLinkRequest() {
  const input = document.getElementById('signin-email-input')
  const btn = document.getElementById('signin-submit-btn')
  const msg = document.getElementById('signin-message')
  const email = input?.value?.trim()

  if (!email || !email.includes('@')) {
    if (msg) msg.textContent = 'Please enter a valid email address.'
    return
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Sending…' }
  if (msg) msg.textContent = ''

  try {
    await sendMagicLink(email)
    if (input) input.value = ''
    if (msg) msg.textContent = `Check your email — we sent a link to ${email}`
    if (btn) btn.textContent = 'Sent!'
  } catch (err) {
    console.error('handleMagicLinkRequest: sendMagicLink failed', { email, err })
    if (msg) msg.textContent = 'Something went wrong. Please try again.'
    if (btn) { btn.disabled = false; btn.textContent = 'Send Link' }
  }
}

function handleSignOut() {
  clearSession()
  clearSubscriptionCache()
  updateAuthUI()
  updateSubscriptionUI()
}

function updateAuthUI() {
  const signedIn = authState.isVerified && !!authState.email
  const signedout = document.getElementById('auth-signedout')
  const signedin = document.getElementById('auth-signedin')
  const guestUsage = document.getElementById('auth-guest-usage')
  if (signedout) signedout.classList.toggle('hidden', signedIn)
  if (signedin) signedin.classList.toggle('hidden', !signedIn)
  if (guestUsage) guestUsage.classList.toggle('hidden', signedIn)
  const emailEl = document.getElementById('auth-user-email')
  if (emailEl) emailEl.textContent = authState.email || ''
  updateGuestUsageCounter()
  updateSubscriptionUI()
}

function getOrCreateCookieId() {
  let cookieId = localStorage.getItem(IDENTITY_COOKIE_KEY)
  if (!cookieId) {
    cookieId = crypto.randomUUID()
    localStorage.setItem(IDENTITY_COOKIE_KEY, cookieId)
  }
  return cookieId
}

async function resolveIdentity() {
  try {
    if (typeof FingerprintJS === 'undefined') {
      console.warn('resolveIdentity: FingerprintJS not loaded, skipping')
      return
    }

    const cookieId = getOrCreateCookieId()
    const fp = await FingerprintJS.load()
    const result = await fp.get()

    const response = await fetch(IDENTITY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: result.visitorId, cookie_id: cookieId }),
    })

    if (!response.ok) {
      throw new Error(`Identity check HTTP ${response.status}`)
    }

    const data = await response.json()
    identityState.userId = data.user_id
    identityState.status = data.status
    identityState.resolved = true
    sessionStorage.setItem(IDENTITY_SESSION_KEY, data.user_id)

    if (data.usage_count !== undefined) {
      const currentMonth = getCurrentYearMonth()
      const serverMonth = data.usage_month || currentMonth
      const serverCount = serverMonth === currentMonth ? data.usage_count : 0
      const local = getUsageData()
      const localCount = local.month === currentMonth ? local.count : 0
      if (serverCount >= localCount || serverMonth > local.month) {
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ count: serverCount, month: currentMonth }))
      }
      updateUsageDisplay()
    }


    } catch (error) {
      return {
        success: false,
        error: error.message,
        state: commitState.currentState,
      };
    }
}

// --- USAGE METERING ---

function getUsageData() {
  const month = getCurrentYearMonth()
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return { count: 0, month }
    return JSON.parse(raw)
  } catch (err) {
    console.warn('getUsageData: failed to parse usage storage', { key: USAGE_STORAGE_KEY, month, err })
    localStorage.removeItem(USAGE_STORAGE_KEY)
    return { count: 0, month }
  }
}

function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getUsage() {
  const data = getUsageData()
  if (data.month !== getCurrentYearMonth()) {
    return { count: 0, month: getCurrentYearMonth() }
  }
  return data
}

function incrementUsage() {
  const current = getUsage()
  const limit = getRunLimit()
  if (current.count >= limit) {
    console.warn('incrementUsage: already at limit, ignoring')
    return current
  }
  const updated = { count: current.count + 1, month: getCurrentYearMonth() }
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

function getRunLimit() {
  return TIER_LIMITS[subscriptionState.tier] ?? TIER_LIMITS.free
}

function canRunPipeline() {
  if (pipelineState.isRunning) return false
  const { count } = getUsage()
  const limit = getRunLimit()
  if (count >= limit) {
    showPaywallExhausted(count, limit)
    openPricingModal()
    return false
  }
  const warningThreshold = Math.floor(limit * 0.8)
  if (count >= warningThreshold) {
    const remaining = limit - count
    showToast(`${remaining} run${remaining === 1 ? '' : 's'} remaining this month.`, 'warning')
  }
  return true
}

function showPaywallExhausted(count, limit) {
  const walkthroughModal = document.getElementById('walkthrough-modal')
  if (walkthroughModal) walkthroughModal.classList.remove('open')

  hideReadyState()
  hideWorkflowAccordions()
  hideNextStepsBanner()

  const paywall = document.getElementById('paywall-exhausted')
  if (!paywall) {
    showToast(`You've used all ${limit} runs for this month. Upgrade to continue.`, 'error')
    openPricingModal()
    return
  }

  paywall.classList.remove('hidden')

  const textEl = document.getElementById('paywall-exhausted-text')
  if (textEl) {
    const tier = subscriptionState.tier
    if (tier === 'free') {
      textEl.textContent = `You've used all ${limit} free generations this month. Upgrade to Pro for 50 generations/month and access to all AI models.`
    } else {
      textEl.textContent = `You've used all ${limit} generations this month on your ${tier} plan. Your limit resets next month.`
    }
  }

  const signInBtn = document.getElementById('paywall-signin-btn')
  if (signInBtn) signInBtn.classList.toggle('hidden', authState.isVerified)

  paywall.style.display = 'flex'
}

function getEffectiveModel(selectedModel) {
  const tier = subscriptionState.tier
  if (tier === 'free' && PRO_MODELS.includes(selectedModel)) {
    return FREE_MODEL
  }
  return selectedModel
}

function updateModelSelectorGating() {
  const container = document.getElementById('code-options-content')
  const select = document.getElementById('code-generator-model')
  if (!container || !select) return

  const tier = subscriptionState.tier
  const isFree = tier === 'free'

  const modelLabels = {
    'google/gemini-3.1-pro-preview': 'Gemini 3.1 Pro',
    'anthropic/claude-4.6-opus': 'Claude 4.6 Opus',
    'openai/gpt-5.3-codex': 'GPT-5.3-Codex',
    'openrouter/auto': 'OpenRouter: Auto Router',
    'openrouter/free': 'OpenRouter: Free Models',
  }

  Array.from(select.options).forEach(opt => {
    const baseLabel = modelLabels[opt.value] || opt.value
    const isPro = PRO_MODELS.includes(opt.value)
    opt.textContent = isPro && isFree ? `${baseLabel} (PRO)` : baseLabel
    opt.disabled = false
  })

  if (isFree && PRO_MODELS.includes(select.value)) {
    select.value = FREE_MODEL
  }

  select.disabled = false

  // Intercept PRO model selection on free tier → open pricing modal
  if (!proGateAttachedSet.has(select)) {
    select.addEventListener('change', () => {
      if (subscriptionState.tier === 'free' && PRO_MODELS.includes(select.value)) {
        select.value = FREE_MODEL
        openPricingModal()
      }
      updateModelInfo(select.value)
    })
    proGateAttachedSet.add(select)
  }

  let notice = document.getElementById('model-selector-free-notice')
  if (isFree) {
    if (!notice) {
      notice = document.createElement('p')
      notice.id = 'model-selector-free-notice'
      notice.className = 'text-xs text-gray-400 mt-1'
      container.appendChild(notice)
    }
    notice.innerHTML = `Free plan — Gemini only. <button onclick="openPricingModal()" style="color:#3b82f6;background:none;border:none;cursor:pointer;font:inherit;padding:0;text-decoration:underline;">Upgrade for all models</button>`
  } else if (notice) {
    notice.remove()
  }

  updateModelInfo(select.value)
}

function updateUsageDisplay() {
  const el = document.getElementById('usage-counter')
  if (!el) return
  const { count } = getUsage()
  const limit = getRunLimit()
  el.textContent = `${count} / ${limit} runs this month`
  const pct = limit > 0 ? count / limit : 0
  el.className = pct >= 1
    ? 'text-xs text-red-600 font-medium'
    : pct >= 0.8
      ? 'text-xs text-yellow-600 font-medium'
      : 'text-xs text-gray-500'
  updateGuestUsageCounter()

  if (count >= limit && !pipelineState.isRunning) {
    showPaywallExhausted(count, limit)
  }
}

function updateGuestUsageCounter() {
  const el = document.getElementById('guest-usage-text')
  if (!el) return
  const usage = getUsageData()
  const count = usage.month === getCurrentYearMonth() ? (usage.count ?? 0) : 0
  const limit = TIER_LIMITS.free
  el.textContent = `${count} / ${limit} generations used`
}

// --- STRIPE FUNCTIONS ---

async function fetchSubscription() {
  if (!authState.isVerified || !authState.sessionToken) {
    subscriptionState = { tier: 'free', status: 'none', periodEnd: null }
    return
  }

  const cached = localStorage.getItem('ccc_subscription')
  if (cached) {
    try {
      const { data, ts } = JSON.parse(cached)
      // Cache bypassed to prevent stale subscription state
      if (false) {
        subscriptionState = data
        return
      }
    } catch (err) {
      console.warn('Failed to parse ccc_subscription cache:', err, '| raw value:', cached)
    }
  }

  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/stripe/get-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: authState.sessionToken })
    })

    const data = await res.json()

    if (data.error) {
      clearSession()
      updateAuthUI()
      return
    }
    subscriptionState = {
      tier: data.tier || 'free',
      status: data.status || 'none',
      periodEnd: data.periodEnd || null
    }

    localStorage.setItem('ccc_subscription', JSON.stringify({
      data: subscriptionState,
      ts: Date.now()
    }))
  } catch (err) {
    console.error('fetchSubscription failed:', err)
  }
}

function clearSubscriptionCache() {
  localStorage.removeItem('ccc_subscription')
}

async function startCheckout(tierId) {
  if (!authState.isVerified || !authState.sessionToken) {
    closePricingModal()
    openSignInModal()
    return
  }

  if (!STRIPE_PRICE_IDS[tierId]) {
    showToast('Invalid plan selected.', 'error')
    return
  }

  const btn = document.getElementById(`checkout-btn-${tierId}`)
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…' }

  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/stripe/create-checkout-session-intl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId, sessionToken: authState.sessionToken, currency: detectUserCurrency() })
    })

    const checkoutData = await res.json()
    if (checkoutData.error || !checkoutData.url) {
      throw new Error(checkoutData.error || 'Failed to create checkout session')
    }

    const { url } = checkoutData
    window.location.href = url
  } catch (err) {
    console.error('startCheckout failed:', err)
    if (btn) { btn.disabled = false; btn.textContent = 'Subscribe' }
    showToast('Could not start checkout. Please try again.', 'error')
  }
}

async function openCustomerPortal() {
  if (!authState.isVerified || !authState.sessionToken) {
    openSignInModal()
    return
  }

  const btn = document.getElementById('manage-billing-btn')
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…' }

  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: authState.sessionToken })
    })

    const portalData = await res.json()
    if (portalData.error || !portalData.url) throw new Error(portalData.error || 'Failed to open billing portal')
    const { url } = portalData
    window.location.href = url
  } catch (err) {
    console.error('openCustomerPortal failed:', err)
    if (btn) { btn.disabled = false; btn.textContent = 'Manage billing' }
    showToast('Could not open billing portal. Please try again.', 'error')
  }
}

async function callBuildShip(step, model, prompt, context = {}) {
  const BUILDSHIP_TIMEOUT_MS = 300000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BUILDSHIP_TIMEOUT_MS)
  try {
    const res = await fetch(PIPELINE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        user_id: identityState.userId,
        sessionToken: authState.sessionToken,
        step,
        model,
        prompt,
        context,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`${data.message || data.error || 'BuildShip pipeline error'} (HTTP ${res.status})`)
    }

    let output = data.output || data.content
    if (!output) {
      throw new Error(`BuildShip returned no output for step "${step}"`)
    }

    // Coerce non-string content (OpenRouter may return array of content parts)
    if (Array.isArray(output)) {
      output = output
        .map(part => typeof part === 'string' ? part : part.text || '')
        .join('')
    }
    if (typeof output !== 'string') {
      output = JSON.stringify(output)
    }
    return output
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`BuildShip ${step} timed out after ${BUILDSHIP_TIMEOUT_MS / 1000}s — the model may be under heavy load, please retry`)
    }
    if (error instanceof TypeError) {
      throw new Error(`BuildShip unreachable: ${error.message}`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function handleCheckoutRedirect() {
  const params = new URLSearchParams(window.location.search)
  const checkout = params.get('checkout')
  if (checkout === 'success') {
    window.history.replaceState({}, '', window.location.pathname)
    clearSubscriptionCache()
    showToast('Subscription active! Welcome aboard.', 'success')
  } else if (checkout === 'cancel') {
    window.history.replaceState({}, '', window.location.pathname)
    showToast('Checkout cancelled.', 'info')
  }
}

// --- SUBSCRIPTION UI ---

function updateSubscriptionUI() {
  const signedIn = authState.isVerified && !!authState.email
  const tier = subscriptionState.tier

  const badge = document.getElementById('subscription-tier-badge')
  if (badge) {
    const labels = { free: 'Free', professional: 'Professional', power: 'Power Developer' }
    const colors = {
      free: 'bg-gray-100 text-gray-600',
      professional: 'bg-indigo-100 text-indigo-700',
      power: 'bg-purple-100 text-purple-700'
    }
    badge.textContent = labels[tier] || 'Free'
    badge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[tier] || colors.free}`
  }

  const upgradePrompt = document.getElementById('upgrade-prompt')
  if (upgradePrompt) upgradePrompt.classList.toggle('hidden', !signedIn || tier !== 'free')

  const manageBillingBtn = document.getElementById('manage-billing-btn')
  if (manageBillingBtn) manageBillingBtn.classList.toggle('hidden', !signedIn || tier === 'free')

  updatePricingModalState(tier)
  updateModelSelectorGating()
  updateUsageDisplay()
}

function updatePricingModalState(tier) {
  const disabledClasses = ['bg-gray-100', 'text-gray-500', 'cursor-default']
  const configs = {
    professional: { btnId: 'checkout-btn-professional', defaultText: 'Subscribe' },
    power: { btnId: 'checkout-btn-power', defaultText: 'Subscribe' }
  }
  Object.entries(configs).forEach(([t, { btnId, defaultText }]) => {
    const btn = document.getElementById(btnId)
    if (!btn) return
    if (t === tier) {
      btn.disabled = true
      btn.textContent = 'Current plan'
      btn.classList.add(...disabledClasses)
    } else {
      btn.disabled = false
      btn.textContent = defaultText
      btn.classList.remove(...disabledClasses)
    }
  })
  const freeCurrent = document.getElementById('free-tier-current')
  if (freeCurrent) freeCurrent.classList.toggle('hidden', tier !== 'free')
}

function updatePricingDisplay() {
  const currency = detectUserCurrency()
  const proEl = document.getElementById('pro-price')
  const powerEl = document.getElementById('power-price')
  const proNote = document.getElementById('pro-price-note')
  const powerNote = document.getElementById('power-price-note')

  if (proEl) proEl.textContent = formatPrice(BASE_PRICES_AUD.professional, currency)
  if (powerEl) powerEl.textContent = formatPrice(BASE_PRICES_AUD.power, currency)

  const note = 'billed monthly'
  if (proNote) proNote.textContent = note
  if (powerNote) powerNote.textContent = note
}

function openPricingModal() {
  updatePricingDisplay()
  updatePricingModalTierState()
  const modal = document.getElementById('pricing-modal')
  if (modal) modal.classList.add('open')
  fetchAudExchangeRates().then(() => updatePricingDisplay())
}

function updatePricingModalTierState() {
  const tier = subscriptionState.tier

  const freeCurrent = document.getElementById('free-tier-current')
  const popularBadge = document.getElementById('pm-popular-badge')
  const proCurrentBadge = document.getElementById('pm-pro-current-badge')
  const checkoutBtnPro = document.getElementById('checkout-btn-professional')
  const proCurrentIndicator = document.getElementById('pro-current-indicator')
  const checkoutBtnPower = document.getElementById('checkout-btn-power')

  if (tier === 'professional') {
    if (freeCurrent) freeCurrent.classList.add('hidden')
    if (popularBadge) popularBadge.style.display = 'none'
    if (proCurrentBadge) proCurrentBadge.style.display = ''
    if (checkoutBtnPro) checkoutBtnPro.classList.add('hidden')
    if (proCurrentIndicator) proCurrentIndicator.classList.remove('hidden')

    let upgradeNote = document.getElementById('pm-pro-upgrade-note')
    if (!upgradeNote) {
      upgradeNote = document.createElement('p')
      upgradeNote.id = 'pm-pro-upgrade-note'
      upgradeNote.className = 'pm-footer-note'
      upgradeNote.style.color = '#6366f1'
      upgradeNote.textContent = "You're on Pro. Upgrade to Power for 2000 generations/month, API access & early features."
      const footerNote = document.querySelector('.pm-footer-note')
      if (footerNote) footerNote.insertAdjacentElement('afterend', upgradeNote)
    }
    upgradeNote.style.display = ''

  } else if (tier === 'power') {
    if (freeCurrent) freeCurrent.classList.add('hidden')
    if (popularBadge) popularBadge.style.display = 'none'
    if (checkoutBtnPro) checkoutBtnPro.classList.add('hidden')
    if (checkoutBtnPower) checkoutBtnPower.classList.add('hidden')

    let powerCurrentEl = document.getElementById('pm-power-current')
    if (!powerCurrentEl) {
      powerCurrentEl = document.createElement('div')
      powerCurrentEl.id = 'pm-power-current'
      powerCurrentEl.className = 'pm-current-plan-indicator'
      powerCurrentEl.textContent = '✓ Current Plan'
      if (checkoutBtnPower) checkoutBtnPower.insertAdjacentElement('afterend', powerCurrentEl)
    }

  } else {
    if (freeCurrent) freeCurrent.classList.remove('hidden')
    if (popularBadge) popularBadge.style.display = ''
    if (proCurrentBadge) proCurrentBadge.style.display = 'none'
    if (checkoutBtnPro) checkoutBtnPro.classList.remove('hidden')
    if (proCurrentIndicator) proCurrentIndicator.classList.add('hidden')
    const upgradeNote = document.getElementById('pm-pro-upgrade-note')
    if (upgradeNote) upgradeNote.style.display = 'none'
  }
}

function closePricingModal(event) {
  if (event && event.target !== event.currentTarget) return
  const modal = document.getElementById('pricing-modal')
  if (modal) modal.classList.remove('open')
}

function showToast(message, type = 'info') {
  const colors = { success: 'bg-green-600 text-white', error: 'bg-red-600 text-white', warning: 'bg-amber-500 text-white', info: 'bg-gray-800 text-white' }
  const toast = document.createElement('div')
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-sm font-medium shadow-lg z-50 transition-opacity duration-300 ${colors[type] || colors.info}`
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", async () => {
  hljs.configure({
    tabReplace: "  ",
    classPrefix: "hljs-",
  });

  initializeWelcomeVideo();

  showReadyState();

  await initializeAuth();
  handleCheckoutRedirect();
  await fetchSubscription();
  updateSubscriptionUI();
  updatePricingDisplay();

  // Initialize API keys and check connection
  await checkConnection();

  // Setup FlutterFlow credential validation
  setupFlutterFlowValidation();

  // Initialize endpoint selector
  const endpointSelect = document.getElementById("flutterflow-endpoint-select");
  if (endpointSelect) {
    const savedEndpoint = getFlutterFlowEndpoint();
    endpointSelect.value = savedEndpoint;
  }

  showWalkthroughIfNeeded();
  resolveIdentity();
  loadNotifyPreference();
  // Walkthrough step tracking
  const pipelineInput = document.getElementById("pipeline-input");
  if (pipelineInput) {
  }


  window.addEventListener("commitStateChange", (event) => {
    const { state } = event.detail;
    updateProgressFromState(state);

    if (
      state === CommitState.PREPARING ||
      state === CommitState.VALIDATING ||
      state === CommitState.PUSHING
    ) {
      showCommitProgress();
    } else if (state === CommitState.SUCCESS || state === CommitState.ERROR) {
      setTimeout(hideCommitProgress, 1000);
    }
  });
});

// --- WELCOME VIDEO FUNCTIONS ---
function initializeWelcomeVideo() {
}

function handleWelcomeVideoEnd() {
  const video = document.getElementById("welcome-video-player");
  if (video) {
    video.addEventListener("click", dismissWelcomeVideo);
    document.addEventListener("keydown", dismissWelcomeVideo);
  }
}

function dismissWelcomeVideo() {
  showWalkthroughIfNeeded();
}

// Store commit data for confirmation
let pendingCommitData = null;

/**
 * Opens the commit confirmation modal with code details.
 * @param {Object} codeInfo - Prepared code info
 * @param {Object} checks - Pre-commit check results
 * @param {Object} deps - Detected dependencies
 */
function openCommitConfirmModal(codeInfo, checks, deps) {
  pendingCommitData = { codeInfo, checks, deps };

  document.getElementById("confirm-file-name").textContent = codeInfo.fileName;
  document.getElementById("confirm-artifact-type").textContent =
    codeInfo.artifactType;
  document.getElementById("confirm-file-size").textContent =
    `${(codeInfo.content.length / 1024).toFixed(1)} KB`;
  document.getElementById("confirm-line-count").textContent =
    codeInfo.content.split("\n").length;

  getApiKey("flutterflow_project_id").then((projectId) => {
    document.getElementById("confirm-project-id").textContent =
      projectId || "Not configured";
  });

  const depsList = document.getElementById("confirm-deps-list");
  const depsSection = document.getElementById("confirm-deps-section");
  if (deps && Object.keys(deps).length > 0) {
    depsList.innerHTML = Object.entries(deps)
      .map(([name, version]) => `<li>• ${name}: ${version}</li>`)
      .join("");
    depsSection.classList.remove("hidden");
  } else {
    depsSection.classList.add("hidden");
  }

  const warningsList = document.getElementById("confirm-warnings-list");
  const warningsSection = document.getElementById("confirm-warnings-section");
  if (checks.warnings && checks.warnings.length > 0) {
    warningsList.innerHTML = checks.warnings
      .map((w) => `<li>• ${w}</li>`)
      .join("");
    warningsSection.classList.remove("hidden");
  } else {
    warningsSection.classList.add("hidden");
  }

  document.getElementById("confirm-code-preview").textContent =
    codeInfo.content;

  document.getElementById("code-preview-content").classList.add("hidden");
  document.getElementById("code-preview-chevron").style.transform =
    "rotate(0deg)";

  const modal = document.getElementById("commit-confirm-modal");
  if (modal) {
    modal.classList.add("open");
  }
}

/**
 * Closes the commit confirmation modal.
 * @param {Event} [event] - Optional click event
 */
function closeCommitConfirmModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("commit-confirm-modal");
  if (modal) {
    modal.classList.remove("open");
  }
  pendingCommitData = null;
}

/**
 * Closes the commit success modal and resets all success fields.
 * @param {Event} [event] - Optional click event (may be undefined)
 */
function closeCommitSuccessModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("commit-success-modal");
  if (modal) {
    modal.classList.remove("open");
  }

  // Reset success fields
  const fieldIds = [
    "success-message",
    "success-project-id",
    "success-file-name",
    "success-artifact-type",
    "success-time",
    "success-size",
  ];
  for (const id of fieldIds) {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  }

  // Hide warnings section
  const warningsSection = document.getElementById("success-warnings-section");
  if (warningsSection) {
    warningsSection.classList.add("hidden");
  }
  const warningsList = document.getElementById("success-warnings-list");
  if (warningsList) {
    warningsList.innerHTML = "";
  }
}

function showCommitSuccessModal(result) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "";
  };

  const fileName = result.metadata?.fileName || "";
  const projectId = result.metadata?.projectId || "";
  const artifactType = result.metadata?.artifactType || "";
  const elapsed = result.elapsedTime ? `${(result.elapsedTime / 1000).toFixed(1)}s` : "";
  const size = result.metadata?.codeSize ? `${(result.metadata.codeSize / 1024).toFixed(1)} KB` : "";

  set("success-message", result.message || "Code committed successfully!");
  set("success-project-id", projectId);
  set("success-file-name", fileName);
  set("success-artifact-type", artifactType);
  set("success-time", elapsed);
  set("success-size", size);

  const ffLink = document.getElementById("success-open-ff-link");
  if (ffLink && projectId) {
    ffLink.href = `https://app.flutterflow.io/project/${projectId}`;
  }

  const warningsSection = document.getElementById("success-warnings-section");
  const warningsList = document.getElementById("success-warnings-list");
  if (result.warnings && result.warnings.length > 0 && warningsSection && warningsList) {
    warningsList.innerHTML = result.warnings.map(([file, errs]) =>
      `<li><span class="font-medium">${escapeHtml(file)}:</span> ${escapeHtml(String(errs))}</li>`
    ).join("");
    warningsSection.classList.remove("hidden");
  }

  const modal = document.getElementById("commit-success-modal");
  if (modal) modal.classList.add("open");
}

function showCommitFailureModal(result) {
  hideCommitProgress();
  showCommitError(result);
}

/**
 * Toggles the code preview section.
 */
function toggleCodePreview() {
  const content = document.getElementById("code-preview-content");
  const chevron = document.getElementById("code-preview-chevron");

  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    chevron.style.transform = "rotate(90deg)";
  } else {
    content.classList.add("hidden");
    chevron.style.transform = "rotate(0deg)";
  }
}

/**
 * Shows the commit progress overlay.
 */
function showCommitProgress() {
  const overlay = document.getElementById("commit-progress-overlay");
  if (overlay) {
    overlay.classList.add("open");
    updateCommitProgress(25, "Preparing code...", "Step 1 of 4");
  }
}

/**
 * Hides the commit progress overlay.
 */
function hideCommitProgress() {
  const overlay = document.getElementById("commit-progress-overlay");
  if (overlay) {
    overlay.classList.remove("open");
  }
}

/**
 * Updates the commit progress UI.
 * @param {number} percent - Progress percentage (0-100)
 * @param {string} message - Status message
 * @param {string} detail - Detailed step info
 */
function updateCommitProgress(percent, message, detail) {
  const progressBar = document.getElementById("commit-progress-bar");
  const progressMessage = document.getElementById("progress-message");
  const progressDetail = document.getElementById("progress-detail");

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressMessage) {
    progressMessage.textContent = message;
  }
  if (progressDetail) {
    progressDetail.textContent = detail;
  }
}

/**
 * Maps commit state to progress UI.
 * @param {string} state - CommitState value
 */
function updateProgressFromState(state) {
  const stateProgressMap = {
    [CommitState.IDLE]: { percent: 0, message: "Ready", detail: "" },
    [CommitState.PREPARING]: {
      percent: 25,
      message: "Preparing code...",
      detail: "Step 1 of 4",
    },
    [CommitState.VALIDATING]: {
      percent: 50,
      message: "Validating...",
      detail: "Step 2 of 4",
    },
    [CommitState.PUSHING]: {
      percent: 75,
      message: "Pushing to FlutterFlow...",
      detail: "Step 3 of 4",
    },
    [CommitState.SUCCESS]: {
      percent: 100,
      message: "Complete!",
      detail: "Step 4 of 4",
    },
    [CommitState.ERROR]: {
      percent: 100,
      message: "Failed",
      detail: "Error occurred",
    },
  };

  const progress = stateProgressMap[state];
  if (progress) {
    updateCommitProgress(progress.percent, progress.message, progress.detail);
  }
}

/**
 * Confirms the commit after modal review.
 */
async function confirmCommitToFlutterFlow() {
  closeCommitConfirmModal();

  if (!pendingCommitData) {
    console.error("No pending commit data");
    return;
  }

  showCommitProgress();

  const { codeInfo } = pendingCommitData;

  let artifactType = "CustomWidget";
  let artifactName = "GeneratedWidget";

  if (pipelineState.step1Result) {
    try {
      const spec = JSON.parse(pipelineState.step1Result);
      artifactType = spec.artifactType || "CustomWidget";
      artifactName = spec.artifactName || "GeneratedWidget";
    } catch (e) {
      console.warn("Could not parse step 1 result:", e);
    }
  }

  const result = await executeCommit(codeInfo.content, {
    artifactType,
    artifactName,
    pipelineResult: {
      step1Result: pipelineState.step1Result,
      selectedModel: document.getElementById("code-generator-model")?.value,
    },
  });

  hideCommitProgress();

  if (result.success) {
    showCommitSuccessModal(result);
  } else {
    showCommitFailureModal(result);
  }

  pendingCommitData = null;
}

// Global exports
// --- STEP TIMING ---
const STEP_AVG_TIMES = { 1: 47, 2: 43, 3: 46 }; // seconds, from observed data
const _stepTimers = {}; // { [step]: { startMs, intervalId } }

function _fmtElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function stepTimingStart(step) {
  // Clear any existing timer for this step
  stepTimingClear(step);
  const startMs = Date.now();
  const hint = document.getElementById(`step${step}-time-hint`);

  const intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    if (hint) hint.textContent = _fmtElapsed(elapsed);
  }, 1000);

  _stepTimers[step] = { startMs, intervalId };
  if (hint) hint.textContent = '0s';
}

function stepTimingComplete(step) {
  const timer = _stepTimers[step];
  if (!timer) return;
  clearInterval(timer.intervalId);
  const elapsed = Math.round((Date.now() - timer.startMs) / 1000);
  const hint = document.getElementById(`step${step}-time-hint`);
  if (hint) hint.textContent = _fmtElapsed(elapsed);
  delete _stepTimers[step];
}

function stepTimingClear(step) {
  if (_stepTimers[step]) {
    clearInterval(_stepTimers[step].intervalId);
    delete _stepTimers[step];
  }
}

function stepTimingReset(step) {
  stepTimingClear(step);
  const hint = document.getElementById(`step${step}-time-hint`);
  const avg = STEP_AVG_TIMES[step];
  if (hint && avg) hint.textContent = `~${avg}s`;
}

// --- NOTIFY ON COMPLETION ---
const NOTIFY_STORAGE_KEY = 'ccc_notify_on_completion';

function isNotifyEnabled() {
  const checkbox = document.getElementById('notify-on-completion');
  return checkbox ? checkbox.checked : false;
}

function loadNotifyPreference() {
  const stored = localStorage.getItem(NOTIFY_STORAGE_KEY);
  const checkbox = document.getElementById('notify-on-completion');
  if (!checkbox) return;
  if (stored === 'true') {
    checkbox.checked = true;
  }
  updateNotifyUI();
}

function saveNotifyPreference(enabled) {
  localStorage.setItem(NOTIFY_STORAGE_KEY, enabled ? 'true' : 'false');
}

function updateNotifyUI() {
  const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
  const badge = document.getElementById('notify-permission-badge');
  const hint = document.getElementById('notify-hint');
  const checkbox = document.getElementById('notify-on-completion');

  if (permission === 'denied') {
    if (badge) badge.classList.remove('hidden');
    if (hint) hint.textContent = 'Notifications are blocked. Allow them in your browser site settings.';
    if (checkbox) checkbox.checked = false;
    saveNotifyPreference(false);
  } else if (permission === 'granted') {
    if (badge) badge.classList.add('hidden');
    if (hint) hint.textContent = 'System notification will fire when the pipeline finishes.';
  } else {
    if (badge) badge.classList.add('hidden');
    if (hint) hint.textContent = 'Get a system notification when the pipeline finishes.';
  }
}

async function handleNotifyToggleClick(event) {
  // Prevent double-fire from label+input
  const checkbox = document.getElementById('notify-on-completion');
  if (!checkbox || event.target === checkbox) return;

  const willBeChecked = !checkbox.checked;

  if (willBeChecked && 'Notification' in window && Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      updateNotifyUI();
      return; // don't check the box
    }
  }

  checkbox.checked = willBeChecked;
  saveNotifyPreference(willBeChecked);
  updateNotifyUI();
}

async function onNotifyToggleChange(checkbox) {
  if (checkbox.checked && 'Notification' in window && Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      checkbox.checked = false;
      updateNotifyUI();
      return;
    }
  }
  saveNotifyPreference(checkbox.checked);
  updateNotifyUI();
}

function sendCompletionNotification() {
  if (!isNotifyEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const n = new Notification('Pipeline Complete', {
      body: 'Your FlutterFlow code is ready. Review it in the dashboard.',
      icon: '/fflogo.webp',
      tag: 'ccc-pipeline-complete', // replace old notification if still visible
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn('Notification failed:', e);
  }
}

window.runThinkingPipeline = runThinkingPipeline;
window.toggleStep = toggleStep;
window.toggleSection = toggleSection;
window.selectWorkflowStep = selectWorkflowStep;
window.copyCode = copyCode;
window.retryWithDifferentModel = retryWithDifferentModel;
window.openApiKeysModal = openApiKeysModal;
window.closeApiKeysModal = closeApiKeysModal;
window.closeWalkthroughModal = closeWalkthroughModal;
window.openWalkthroughModal = openWalkthroughModal;
window.advanceWalkthrough = advanceWalkthrough;
window.commitToFlutterFlow = commitToFlutterFlow;

function focusPromptInput() {
  const input = document.getElementById("pipeline-input");
  if (input) {
    input.focus();
  }
}

function openModelSelector() {
  const details = document.getElementById("advanced-settings");
  if (details) details.open = true;
  const select = document.getElementById("code-generator-model");
  if (select) {
    select.scrollIntoView({ behavior: "smooth", block: "center" });
    select.focus();
    select.click();
  }
}

window.focusPromptInput = focusPromptInput;
window.openModelSelector = openModelSelector;
window.saveApiKeys = saveApiKeys;
window.clearAllApiKeys = clearAllApiKeys;
window.toggleKeyVisibility = toggleKeyVisibility;
window.handleWelcomeVideoEnd = handleWelcomeVideoEnd;
window.dismissWelcomeVideo = dismissWelcomeVideo;
window.initiateCommitToFlutterFlow = initiateCommitToFlutterFlow;
window.updateFlutterFlowCredentialStatus = updateFlutterFlowCredentialStatus;
window.closeCommitConfirmModal = closeCommitConfirmModal;
window.closeCommitSuccessModal = closeCommitSuccessModal
window.showCommitSuccessModal = showCommitSuccessModal
window.showCommitFailureModal = showCommitFailureModal;
window.toggleCodePreview = toggleCodePreview;
window.confirmCommitToFlutterFlow = confirmCommitToFlutterFlow;
window.runRefinement = runRefinement;
window.regenerateFromPastedErrors = regenerateFromPastedErrors;
window.clearErrorInput = clearErrorInput;
window.openFixErrorsModal = openFixErrorsModal;
window.closeFixErrorsModal = closeFixErrorsModal;
window.runFixErrorsAndClose = runFixErrorsAndClose;
window.toggleAccordion = toggleAccordion;
window.expandAccordion = expandAccordion;
window.collapseAccordion = collapseAccordion;
window.showNextStepsBanner = showNextStepsBanner;
window.hideNextStepsBanner = hideNextStepsBanner;
window.setFlutterFlowEndpoint = setFlutterFlowEndpoint;
window.getFlutterFlowEndpoint = getFlutterFlowEndpoint;
window.openSignInModal = openSignInModal;
window.closeSignInModal = closeSignInModal;
window.handleMagicLinkRequest = handleMagicLinkRequest;
window.handleSignOut = handleSignOut;
window.startCheckout = startCheckout;
window.openCustomerPortal = openCustomerPortal;
window.openPricingModal = openPricingModal;
window.closePricingModal = closePricingModal;
function nsCopyGeneratedCode() {
  const element = document.getElementById('step2-output');
  const btn = document.getElementById('ns-copy-btn');
  if (!element || !btn) return;

  const text = element.dataset.raw || element.textContent;
  if (!text.trim()) return;

  navigator.clipboard.writeText(text).then(() => {
    trackEvent('Code Copied', { elementId: 'step2-output', source: 'next-steps-banner' });
    btn.classList.add('copied');
    btn.innerHTML = `<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg style="width:14px;height:14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy Code`;
    }, 2000);
  }).catch(err => {
    console.warn('Failed to copy to clipboard:', err);
  });
}

window.handleNotifyToggleClick = handleNotifyToggleClick;
window.onNotifyToggleChange = onNotifyToggleChange;
window.nsCopyGeneratedCode = nsCopyGeneratedCode;
