import posthog from "posthog-js";
import {
  getPrimaryArtifact,
  normalizeArtifactBundle,
} from "./src/artifactBundle.js";
import {
  buildArchitectPrompt,
  buildArtifactRegenerationPrompt,
  buildBundleRegenerationPrompt,
  buildGeneratorPrompt,
  buildReviewPrompt,
  createBuildShipContext,
} from "./src/pipelineContracts.js";
import { createModelArmorError } from "./src/modelArmorResponse.js";
import {
  getCustomActionReturnTypeError,
  getDeclaredDartTypes,
  validateBundleCompatibility,
} from "./src/flutterFlowArtifactValidation.js";
import { buildBundleDeployPlan } from "./src/bundleDeployPlanner.js";
import {
  excludeProvisionedCodeFiles,
  findMissingCodeFiles,
} from "./src/flutterFlowCodeFileProvisioning.js";
import { buildReviewPresentation } from "./src/reviewPresentation.js";
import { buildFlutterFlowSyncMetadata } from "./src/flutterFlowSyncMetadata.js";
import {
  mergeDependenciesIntoYaml,
  validateProjectPubspec,
} from "./src/pubspecSync.js";
import { escapeAttr, escapeHtml, escapeHtmlText } from "./src/htmlEscape.js";
import {
  extractCodeFromMarkdown,
  highlightCode,
  renderMarkdownAudit,
} from "./src/auditRenderer.js";

// --- CONFIGURATION ---
const IS_DEV = import.meta.env.DEV
const FLUTTERFLOW_CLASS_PROVISION_ENDPOINT =
  import.meta.env.VITE_FLUTTERFLOW_CLASS_PROVISION_ENDPOINT ||
  import.meta.env.VITE_FLUTTERFLOW_DSL_DEPLOY_ENDPOINT ||
  "https://ccc-ffai-runner-y5cyj3473a-uw.a.run.app/deployCustomClasses";

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
      console.error("PostHog tracking failed", e);
    }
  }
}

// --- AUTH / SUBSCRIPTION CONFIG ---
const BUILDSHIP_BASE_URL = 'https://4tgke4.buildship.run'
const STRIPE_PRICE_IDS = {
  professional: 'price_1T2ldCKszA2slvDXatdeCpbI',
  power: 'price_1T2le9KszA2slvDXR4mPvw7M'
}

const AUTH_SESSION_STORAGE_KEY = 'ccc_auth_session'

const proGateAttachedSet = new WeakSet()

let authState = {
  email: null,
  sessionToken: null,
  isVerified: false,
}

function createSubscriptionState(overrides = {}) {
  return {
    tier: 'free',
    status: 'none',
    periodEnd: null,
    isLoading: false,
    isResolved: false,
    error: null,
    ...overrides,
  }
}

let subscriptionState = createSubscriptionState({ isResolved: true })

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

const SUBSCRIPTION_CACHE_KEY = 'ccc_subscription'
const SUBSCRIPTION_CACHE_VERSION = 3
const PAID_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'paid'])

const FREE_MODEL = 'google/gemini-3.6-flash'
const PRO_MODELS = [
  'anthropic/claude-opus-5',
  'openai/gpt-5.6-sol',
  'z-ai/glm-5.2',
  'moonshotai/kimi-k3',
  'openrouter/auto-beta-beta',
  'openrouter/free',
  'openrouter/deepseek/deepseek-v4-pro',
]

// Display names for every selectable model. Keep in sync with the
// #code-generator-model options in index.html.
const MODEL_LABELS = {
  'google/gemini-3.6-flash': 'Gemini 3.6 Flash',
  'anthropic/claude-opus-5': 'Claude Opus 5',
  'openai/gpt-5.6-sol': 'GPT-5.6 Sol',
  'z-ai/glm-5.2': 'GLM 5.2',
  'moonshotai/kimi-k3': 'Kimi K3',
  'openrouter/auto-beta-beta': 'OpenRouter: Auto Router',
  'openrouter/free': 'OpenRouter: Free Models',
  'openrouter/deepseek/deepseek-v4-pro': 'DeepSeek v4 Pro',
}

function getModelLabel(model) {
  return MODEL_LABELS[model] || model
}

const USAGE_STORAGE_KEY = 'ccc_usage'

// Model Configuration
const PROMPT_ARCHITECT_MODEL = "google/gemini-3.6-flash"
const CODE_REVIEW_MODEL = "google/gemini-3.6-flash"
const FALLBACK_MODEL = "google/gemini-3.6-flash"

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
- **Supported Return Values:** Use only types exposed by FlutterFlow's Custom Action Return Value selector.
- **Structured results:** Default to JSON with \`Future<dynamic>\` or \`Future<Map<String, dynamic>>\`, and return a JSON-compatible Map/List (for example, \`result.toJson()\`).
- **FlutterFlow Data Types:** \`Future<SomeNameStruct>\` is allowed only when that Data Type already exists in the project.
- **Forbidden:** Never return an arbitrary CustomClass, Code File class, or CustomEnum from a Custom Action. FlutterFlow supports those in state/parameters, but not as Custom Action return values.
- **State workaround:** Write to App/Page State and return \`bool\` only when the user explicitly requests it and the required state variable is documented. Never assume state exists.
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

**IMPORTANT:** Custom Dart classes are allowed through Code Files for state and supported parameters. They are NOT valid Custom Action return values; use JSON or an existing FlutterFlow Struct instead.`;

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
- Returning a CustomClass, Code File class, or CustomEnum from a Custom Action. Use JSON or an existing FlutterFlow Data Type (\`*Struct\`).

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
const SESSION_STORAGE_KEY_PREFIX = "ccc_session_api_key_";
const ENCRYPTION_KEY_NAME = "ccc_encryption_key";
const SESSION_KEY_SCOPE_NAME = "ccc_encryption_key_scope";
const KEY_DB_NAME = "ccc_keystore";
const KEY_DB_STORE = "keys";
const KEY_VERSION_NAME = "ccc_encryption_key_version";
/** @type {Promise<CryptoKey> | null} */
let encryptionKeyPromise = null;
let cachedEncryptionKeyVersion = null;
let usingSessionKeyFallback = false;
let sessionFallbackSupportsDurableCredentials = false;
let keyStorageWarningShown = false;

class CredentialStorageUnavailableError extends Error {
  constructor() {
    super("Secure browser key storage is unavailable.");
    this.name = "CredentialStorageUnavailableError";
  }
}

function notifyKeyStorageFallback() {
  if (keyStorageWarningShown) return;
  keyStorageWarningShown = true;
  const message =
    "Secure browser key storage is unavailable. Existing credentials were left untouched; new credentials will be available only in this tab session.";
  console.warn(message);
  if (document.body) showToast(message, "warning");
}

function currentEncryptionKeyVersion() {
  return localStorage.getItem(KEY_VERSION_NAME) || "";
}

function newEncryptionKeyVersion() {
  return crypto.randomUUID?.()
    || arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

function ensureEncryptionKeyVersion() {
  const current = currentEncryptionKeyVersion();
  if (current) return current;
  const created = newEncryptionKeyVersion();
  localStorage.setItem(KEY_VERSION_NAME, created);
  return created;
}

function invalidateEncryptionKeyCache() {
  encryptionKeyPromise = null;
  cachedEncryptionKeyVersion = null;
  usingSessionKeyFallback = false;
  sessionFallbackSupportsDurableCredentials = false;
}

window.addEventListener("storage", (event) => {
  if (event.key === KEY_VERSION_NAME) invalidateEncryptionKeyCache();
});

// IndexedDB can persist a CryptoKey object without exposing its raw bytes.
// This prevents an injected script from exporting the key for offline use.
// It does not let browser storage survive arbitrary same-origin script: XSS
// could still ask Web Crypto to decrypt while it is running.
/** @returns {Promise<IDBDatabase>} */
function openKeyDatabase() {
  return /** @type {Promise<IDBDatabase>} */ (new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_DB_STORE)) {
        db.createObjectStore(KEY_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

/**
 * @template T
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} operation
 * @returns {Promise<T>}
 */
async function runKeyDatabaseRequest(mode, operation) {
  const db = /** @type {IDBDatabase} */ (await openKeyDatabase());
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_DB_STORE, mode);
    let request;
    try {
      request = operation(transaction.objectStore(KEY_DB_STORE));
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    let result;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Encryption key transaction failed."));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Encryption key transaction aborted."));
    };
  });
}

/** @param {unknown} key */
function isUsableEncryptionKey(key) {
  return key instanceof CryptoKey
    && key.algorithm?.name === "AES-GCM"
    && key.extractable === false
    && key.usages.includes("encrypt")
    && key.usages.includes("decrypt");
}

/** @returns {Promise<CryptoKey | null>} */
async function loadStoredEncryptionKey() {
  const key = await runKeyDatabaseRequest("readonly", (store) =>
    store.get(ENCRYPTION_KEY_NAME),
  );
  return isUsableEncryptionKey(key) ? key : null;
}

/** @param {CryptoKey} key */
async function persistEncryptionKey(key) {
  await runKeyDatabaseRequest("readwrite", (store) =>
    store.put(key, ENCRYPTION_KEY_NAME),
  );
}

async function deleteStoredEncryptionKey() {
  invalidateEncryptionKeyCache();
  try {
    await runKeyDatabaseRequest("readwrite", (store) =>
      store.delete(ENCRYPTION_KEY_NAME),
    );
  } catch (error) {
    console.warn("Could not delete the stored encryption key:", error);
  }
}

// Re-import an earlier sessionStorage JWK as non-extractable before removing
// the exportable copy. This keeps existing encrypted credentials readable.
/** @returns {Promise<CryptoKey | null>} */
async function migrateLegacySessionKey() {
  const legacy = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  if (!legacy) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(legacy),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await persistEncryptionKey(key);

  // The legacy JWK is the only recovery path until the IndexedDB write has
  // committed successfully.
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
  sessionStorage.removeItem(SESSION_KEY_SCOPE_NAME);
  localStorage.removeItem(STORAGE_KEY_PREFIX + "salt");
  return key;
}

/**
 * @param {boolean} allowCreation
 * @returns {Promise<CryptoKey>}
 */
async function resolveSessionEncryptionKey(allowCreation) {
  const stored = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  if (stored) {
    sessionFallbackSupportsDurableCredentials =
      sessionStorage.getItem(SESSION_KEY_SCOPE_NAME) !== "session";
    return crypto.subtle.importKey(
      "jwk",
      JSON.parse(stored),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  if (!allowCreation) throw new CredentialStorageUnavailableError();

  const exportableKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", exportableKey);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(jwk));
  sessionStorage.setItem(SESSION_KEY_SCOPE_NAME, "session");
  sessionFallbackSupportsDurableCredentials = false;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * @param {boolean} allowSessionFallbackCreation
 * @returns {Promise<CryptoKey>}
 */
async function resolveEncryptionKey(allowSessionFallbackCreation) {
  if (
    sessionStorage.getItem(SESSION_KEY_SCOPE_NAME) === "session"
    && sessionStorage.getItem(ENCRYPTION_KEY_NAME)
  ) {
    notifyKeyStorageFallback();
    usingSessionKeyFallback = true;
    return resolveSessionEncryptionKey(allowSessionFallbackCreation);
  }

  try {
    const stored = await loadStoredEncryptionKey();
    if (stored) return stored;

    const migrated = await migrateLegacySessionKey();
    if (migrated) return migrated;

    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await persistEncryptionKey(key);
    return key;
  } catch (error) {
    console.warn("IndexedDB encryption-key storage failed:", error);
    notifyKeyStorageFallback();
    usingSessionKeyFallback = true;
    return resolveSessionEncryptionKey(allowSessionFallbackCreation);
  }
}

/**
 * @param {{allowSessionFallbackCreation?: boolean}} [options]
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey(options = {}) {
  const { allowSessionFallbackCreation = true } = options;
  const version = ensureEncryptionKeyVersion();
  if (cachedEncryptionKeyVersion !== version) {
    invalidateEncryptionKeyCache();
  }
  const pending = /** @type {Promise<CryptoKey>} */ (
    encryptionKeyPromise || resolveEncryptionKey(allowSessionFallbackCreation)
  );
  encryptionKeyPromise = pending;
  cachedEncryptionKeyVersion = version;
  try {
    return await pending;
  } catch (error) {
    invalidateEncryptionKeyCache();
    throw error;
  }
}

// Encrypt data using AES-256-GCM
async function encryptData(plaintext) {
  const key = /** @type {CryptoKey} */ (await getEncryptionKey());
  const keyVersion = cachedEncryptionKeyVersion;
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

  return {
    ciphertext: arrayBufferToBase64(combined),
    keyVersion,
    sessionFallback: usingSessionKeyFallback,
  };
}

// Decrypt data using AES-256-GCM
async function decryptData(encryptedBase64, options = {}) {
  const { isSessionCredential = false } = options;
  try {
    const key = /** @type {CryptoKey} */ (await getEncryptionKey({
      allowSessionFallbackCreation: false,
    }));
    if (
      usingSessionKeyFallback
      && !isSessionCredential
      && !sessionFallbackSupportsDurableCredentials
    ) {
      throw new CredentialStorageUnavailableError();
    }
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
    if (error instanceof CredentialStorageUnavailableError) throw error;
    console.error("Decryption failed:", error);
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
    sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + provider);
    return;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const encrypted = await encryptData(apiKey.trim());
    if (encrypted.keyVersion === currentEncryptionKeyVersion()) {
      const storage = encrypted.sessionFallback ? sessionStorage : localStorage;
      const prefix = encrypted.sessionFallback
        ? SESSION_STORAGE_KEY_PREFIX
        : STORAGE_KEY_PREFIX;
      storage.setItem(prefix + provider, encrypted.ciphertext);
      if (!encrypted.sessionFallback) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + provider);
      }
      return;
    }
    invalidateEncryptionKeyCache();
  }

  throw new Error("Encryption key changed while saving. Please try again.");
}

async function getApiKey(provider) {
  // Only check user-stored key - no environment fallback
  const sessionEncrypted = sessionStorage.getItem(
    SESSION_STORAGE_KEY_PREFIX + provider,
  );
  const encrypted = sessionEncrypted
    || localStorage.getItem(STORAGE_KEY_PREFIX + provider);
  if (encrypted) {
    let decrypted;
    try {
      decrypted = await decryptData(encrypted, {
        isSessionCredential: Boolean(sessionEncrypted),
      });
    } catch (error) {
      if (error instanceof CredentialStorageUnavailableError) return "";
      throw error;
    }
    if (decrypted) return decrypted;

    // If decryption failed, clean up the stale encrypted data
    const storage = sessionEncrypted ? sessionStorage : localStorage;
    const prefix = sessionEncrypted
      ? SESSION_STORAGE_KEY_PREFIX
      : STORAGE_KEY_PREFIX;
    storage.removeItem(prefix + provider);
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
  // Remove an exportable key left by an earlier version even if its encrypted
  // credentials were already cleared.
  if (sessionStorage.getItem(ENCRYPTION_KEY_NAME)) {
    await getEncryptionKey();
  }
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

  // The project dropdown is the only way to pick a project, so populate it as
  // soon as a stored key is available.
  if (flutterflowApiKey) {
    fetchProjects(flutterflowApiKey);
  }
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
  const modal = document.getElementById("walkthrough-modal");
  if (modal) {
    walkthroughStep = 1;
    updateWalkthroughUI();
    modal.classList.add("open");
  }
}

function closeWalkthroughModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById("walkthrough-modal");
  if (modal) {
    modal.classList.remove("open");
  }

  const dontShow = document.getElementById("walkthrough-dont-show");
  if (dontShow && dontShow.checked) {
    localStorage.setItem("hasSeenWalkthrough", "true");
  }
}

function showWalkthroughIfNeeded() {
  // Never show walkthrough for paid users
  if (authState.isVerified && isSubscriptionResolved() && subscriptionState.tier !== 'free') return;

  const hasSeen = localStorage.getItem("hasSeenWalkthrough");
  if (!hasSeen) {
    const modal = document.getElementById("walkthrough-modal");
    if (modal) {
      walkthroughStep = 1;
      updateWalkthroughUI();
      modal.classList.add("open");
    }
  }
}

async function loadApiKeyInputs() {
  const flutterflowInput = document.getElementById("flutterflow-api-key-input");

  if (flutterflowApiKey) {
    flutterflowInput.value = "";
    flutterflowInput.placeholder = "Key saved (enter new to replace)";
  } else {
    flutterflowInput.placeholder = "Enter your FlutterFlow API key";
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
  const hasGeneratedCode =
    pipelineState.step2Result && pipelineState.step2Result.length > 0;

  const deployBtn = document.getElementById("btn-deploy-to-ff");
  const runBtn = document.getElementById("btn-run-pipeline");

  // Run Pipeline stays visible next to Deploy so a generation can be restarted
  // without closing the results.
  if (runBtn) runBtn.classList.remove("hidden");
  if (deployBtn) {
    deployBtn.classList.toggle("hidden", !hasGeneratedCode);
  }
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
  const projectSelect = document.getElementById("flutterflow-projects-select");

  // Only save if user entered a new value
  if (flutterflowInput.value.trim()) {
    await saveApiKey("flutterflow", flutterflowInput.value);
  }

  const selectedProjectId = projectSelect?.value.trim() || "";
  if (selectedProjectId) {
    if (!validateFlutterFlowProjectId(selectedProjectId)) {
      showToast("The selected FlutterFlow project has an unexpected ID format.", "error");
      projectSelect.focus();
      return;
    }
    await saveApiKey("flutterflow_project_id", selectedProjectId);
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

  // Rotate before and after deletion. Other tabs cannot continue treating a
  // cached key as current, and any save that raced with the clear is removed.
  localStorage.setItem(KEY_VERSION_NAME, newEncryptionKeyVersion());
  invalidateEncryptionKeyCache();
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow_project_id");
  sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + "flutterflow");
  sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + "flutterflow_project_id");
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
  sessionStorage.removeItem(SESSION_KEY_SCOPE_NAME);
  localStorage.removeItem(STORAGE_KEY_PREFIX + "salt");
  await deleteStoredEncryptionKey();
  localStorage.setItem(KEY_VERSION_NAME, newEncryptionKeyVersion());
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow_project_id");
  sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + "flutterflow");
  sessionStorage.removeItem(SESSION_STORAGE_KEY_PREFIX + "flutterflow_project_id");

  // Reinitialize keys
  await initializeApiKeys();

  const projectSelect = document.getElementById("flutterflow-projects-select");
  if (projectSelect) {
    projectSelect.innerHTML =
      '<option value="">Enter your API key to load projects</option>';
  }

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

function setupFlutterFlowValidation() {
  const apiKeyInput = document.getElementById("flutterflow-api-key-input");

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
 * Fetches projects from FlutterFlow API and populates the always-visible
 * project dropdown, which is the only way to choose a target project.
 * @param {string} apiKey - FlutterFlow API key
 */
async function fetchProjects(apiKey) {
  const select = document.getElementById("flutterflow-projects-select");
  const errorElement = document.getElementById("flutterflow-projects-error");

  if (!select) {
    console.error("Projects dropdown element not found");
    return;
  }

  // Show loading state
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

    // Re-select the already configured project so the dropdown reflects state
    if (flutterflowProjectId) {
      select.value = flutterflowProjectId;
    }
  } catch (error) {
    console.error("Failed to fetch projects:", error);
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
  bundleSpec: null,
  artifactBundle: null,
  bundleReview: null,
  selectedArtifactId: null,
  resultsViewMode: "summary",
  currentStep: 0,
  isRunning: false,
};

function resetPipelineResults() {
  pipelineState.step1Result = null;
  pipelineState.step2Result = null;
  pipelineState.step3Result = null;
  pipelineState.bundleSpec = null;
  pipelineState.artifactBundle = null;
  pipelineState.bundleReview = null;
  pipelineState.selectedArtifactId = null;
  pipelineState.resultsViewMode = "summary";
}

function updateBundleSpecFromArchitectResult() {
  pipelineState.bundleSpec = normalizeArtifactBundle(pipelineState.step1Result, {
    artifactType: "CustomWidget",
    artifactName: "GeneratedWidget",
  });
}

function updateArtifactBundleFromGeneratedCode() {
  const primarySpecArtifact = getPrimaryArtifact(pipelineState.bundleSpec);
  pipelineState.artifactBundle = normalizeArtifactBundle(pipelineState.step2Result, {
    id: pipelineState.bundleSpec?.id,
    title: pipelineState.bundleSpec?.title,
    description: pipelineState.bundleSpec?.description,
    artifactType: primarySpecArtifact.artifactType,
    artifactName: primarySpecArtifact.artifactName,
    fileName: primarySpecArtifact.fileName,
    dependencies: primarySpecArtifact.dependencies,
    relationships: pipelineState.bundleSpec?.relationships,
    code: pipelineState.step2Result || "",
  });
  const compatibility = validateBundleCompatibility(pipelineState.artifactBundle);
  pipelineState.artifactBundle = {
    ...pipelineState.artifactBundle,
    warnings: [
      ...pipelineState.artifactBundle.warnings,
      ...compatibility.findings.map((finding) => finding.message),
    ],
    metadata: {
      ...pipelineState.artifactBundle.metadata,
      compatibility,
    },
  };
  pipelineState.selectedArtifactId = getPrimaryArtifact(pipelineState.artifactBundle).id;
}

function updateBundleReviewFromReviewResult() {
  const reviewBundle = normalizeArtifactBundle(pipelineState.step3Result, {
    id: pipelineState.artifactBundle?.id,
    title: pipelineState.artifactBundle?.title,
  });
  const reviewByArtifactId = new Map(
    reviewBundle.artifacts.map((artifact) => [artifact.id, artifact.review]),
  );
  pipelineState.bundleReview = normalizeArtifactBundle({
    id: pipelineState.artifactBundle?.id,
    title: pipelineState.artifactBundle?.title,
    artifacts: pipelineState.artifactBundle?.artifacts?.map((artifact) => ({
      ...artifact,
      review: reviewByArtifactId.get(artifact.id) || artifact.review || pipelineState.step3Result || null,
    })) || [],
    relationships: pipelineState.artifactBundle?.relationships,
    warnings: pipelineState.artifactBundle?.warnings,
  });
}

function getCurrentArtifactMetadata() {
  const artifact = getSelectedArtifact();
  return {
    artifactType: artifact.artifactType || "CustomWidget",
    artifactName: artifact.artifactName || "GeneratedWidget",
  };
}

function getSelectedArtifact() {
  const bundle = pipelineState.artifactBundle || pipelineState.bundleSpec || null;
  const artifacts = Array.isArray(bundle?.artifacts) ? bundle.artifacts : [];
  return artifacts.find((artifact) => artifact.id === pipelineState.selectedArtifactId)
    || getPrimaryArtifact(bundle);
}

function getSelectedArtifactCode() {
  const artifact = getSelectedArtifact();
  return artifact.code || pipelineState.step2Result || "";
}

// --- CORE API FUNCTIONS ---

async function checkConnection() {
  try {
    await initializeApiKeys()
  } catch (error) {
    console.error('checkConnection: initializeApiKeys failed:', error)
    return false
  }
  return true
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
   * Exports the project source and returns the base64 zip, mirroring the
   * VS Code extension's exportCode call.
   * @returns {Promise<string>} Base64-encoded project zip
   */
  async exportProjectZip() {
    console.log(
      `Exporting code from FlutterFlow project: ${this.projectId}, branch: ${this.branchName || "main"}`,
    );

    // The extension's request shape is tried first; the flat shape is kept as a
    // fallback for API deployments that still expect it.
    const requestBodies = [
      {
        project: { path: `projects/${this.projectId}` },
        ...(this.branchName ? { branch_name: this.branchName } : {}),
        export_as_module: false,
        include_assets_map: false,
        format: false,
        export_as_debug: false,
      },
      {
        project_id: this.projectId,
        branch_name: this.branchName,
        include_assets: false,
        export_as_module: false,
      },
    ];

    let lastError = null;
    for (const body of requestBodies) {
      try {
        const response = await fetch(`${this.baseUrl}exportCode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(
            `Export failed: ${response.status} - ${errorText}`,
          );
          continue;
        }

        const data = await response.json();
        const projectZip = data?.value?.project_zip || data?.project_zip;
        if (!projectZip) {
          lastError = new Error(
            "Export response did not include project source.",
          );
          continue;
        }
        return projectZip;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Export failed for an unknown reason.");
  }

  /**
   * Reads the project's current pubspec.yaml and custom-code source files out
   * of one export.
   * @returns {Promise<{pubspecYaml: string, files: Map<string, string>}>}
   */
  async fetchProjectSource() {
    const base64Zip = await this.exportProjectZip();
    const zip = await JSZip.loadAsync(base64Zip, { base64: true });

    // Exports are nested under a single project folder. Pick the shallowest
    // pubspec.yaml so a bundled sub-package's manifest can't be mistaken for
    // the project's own.
    const pubspecPath = Object.keys(zip.files)
      .filter(
        (path) =>
          !zip.files[path].dir &&
          (path === "pubspec.yaml" || path.endsWith("/pubspec.yaml")),
      )
      .sort((a, b) => a.split("/").length - b.split("/").length)[0];

    if (!pubspecPath) {
      throw new Error("Export did not contain a pubspec.yaml.");
    }

    const rootPrefix = pubspecPath.slice(
      0,
      pubspecPath.length - "pubspec.yaml".length,
    );
    const files = new Map();
    const sourcePaths = Object.keys(zip.files).filter((archivePath) => {
      if (zip.files[archivePath].dir || !archivePath.startsWith(rootPrefix)) {
        return false;
      }
      const projectPath = archivePath.slice(rootPrefix.length);
      return (
        projectPath === "lib/flutter_flow/custom_functions.dart" ||
        (projectPath.startsWith("lib/custom_code/") &&
          projectPath.endsWith(".dart"))
      );
    });

    await Promise.all(
      sourcePaths.map(async (archivePath) => {
        files.set(
          archivePath.slice(rootPrefix.length),
          await zip.files[archivePath].async("string"),
        );
      }),
    );

    return {
      pubspecYaml: await zip.files[pubspecPath].async("string"),
      files,
    };
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
          console.log(
            `Push attempt ${attempt + 1} to ${baseUrl}syncCustomCodeChanges`,
          );
          console.log("Request metadata:", {
            project_id: pushCodeRequest.project_id,
            branch_name: pushCodeRequest.branch_name,
            uid: pushCodeRequest.uid,
            zipped_custom_code_length:
              pushCodeRequest.zipped_custom_code?.length || 0,
            file_map_length: pushCodeRequest.file_map?.length || 0,
            functions_map_length: pushCodeRequest.functions_map?.length || 0,
          });
          const response = await fetch(`${baseUrl}syncCustomCodeChanges`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(pushCodeRequest),
          });

          if (response.ok) {
            console.log(`Push to ${baseUrl} succeeded!`);
            return response;
          }

          const clonedForLog = response.clone();
          const responseText = await clonedForLog.text();
          console.log(
            `Push to ${baseUrl} returned ${response.status}: ${responseText}`,
          );

          if (response.status === 500) {
            console.warn(`Endpoint ${baseUrl} returned 500, trying next...`);
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }

          return response;
        } catch (error) {
          console.warn(
            `Push to ${baseUrl} failed: ${error.message}, trying next...`,
          );
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
    console.log(`Listing projects for API key via V2 endpoint`);

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
  // Standalone custom code file under lib/custom_code/, e.g. a plain Dart
  // class. FlutterFlow syncs these through syncCustomCodeChanges like any
  // other custom code file.
  CODE_FILE: "C",
  DEPENDENCIES: "D",
  OTHER: "O",
};

const WIDGET_CLASS_REGEX =
  /class\s+\w+\s+extends\s+(?:StatelessWidget|StatefulWidget)\b/;
const STATE_CLASS_REGEX = /extends\s+State<\w+>/;

/**
 * Detects the type of custom code based on file name and content.
 * @param {string} fileName - Name of the file
 * @param {string} [content] - Optional file content for additional detection
 * @returns {string} Code type (A, W, F, C, D, or O)
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
    const hasWidgetClass = WIDGET_CLASS_REGEX.test(content);
    const hasStateClass = STATE_CLASS_REGEX.test(content);

    if (hasWidgetClass || hasStateClass) {
      return CodeType.WIDGET;
    }

    if (/^\s*Future(?:<[^>]+>)?\s+\w+\s*\(/m.test(content)) {
      return CodeType.ACTION;
    }

    if (
      content.match(
        /^\s*(String|int|double|bool|List|Map|dynamic|void)\s+\w+\s*\(/m,
      )
    ) {
      return CodeType.FUNCTION;
    }
  }

  // Anything else that is still Dart — a plain class, an enum, a mixin, a
  // utility library — is a standalone custom code file.
  return CodeType.CODE_FILE;
}

/**
 * Gets the relative file path based on code type.
 * @param {string} fileName - Original file name
 * @param {string} codeType - Code type (A, W, F, C, D, O)
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
    case CodeType.CODE_FILE:
      // Standalone custom code files are flat under lib/custom_code/.
      return `lib/custom_code/${fileName}`;
    case CodeType.DEPENDENCIES:
      return "pubspec.yaml";
    case CodeType.OTHER:
      return `lib/custom_code/${fileName}`;
    default:
      return fileName;
  }
}

/**
 * Builds the file_map in the format expected by FlutterFlow's syncCustomCodeChanges API.
 * New files carry current_checksum without original_checksum; existing files
 * carry both, matching FlutterFlow's VS Code extension.
 * @param {Map} fileMap - Internal file map with content/type/path
 * @param {Map<string, string>} remoteFiles - Current project source by path
 * @returns {Promise<{fileMapContents: string, functionsMapContents: string}>}
 */
async function buildApiSyncMetadata(fileMap, remoteFiles = new Map()) {
  return buildFlutterFlowSyncMetadata(fileMap, remoteFiles);
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

// The project's current pubspec and custom-code files, cached per project for
// the session. Fetching them means one full project export.
const projectSourceCache = new Map();

function projectSourceCacheKey(apiClient) {
  return `${apiClient.baseUrl}|${apiClient.projectId}|${apiClient.branchName}`;
}

function invalidateProjectSourceCache(apiClient) {
  projectSourceCache.delete(projectSourceCacheKey(apiClient));
}

async function provisionMissingCodeFiles(
  apiClient,
  fileMap,
  remoteFiles,
  commitMessage,
) {
  const missingCodeFiles = findMissingCodeFiles(fileMap, remoteFiles);
  if (missingCodeFiles.length === 0) {
    return { remoteFiles, syncFileMap: fileMap };
  }

  console.log(
    `Provisioning ${missingCodeFiles.length} new FlutterFlow custom code file(s) before sync.`,
  );
  const response = await fetch(FLUTTERFLOW_CLASS_PROVISION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: apiClient.apiKey,
      projectId: apiClient.projectId,
      baseUrl: apiClient.baseUrl,
      commitMessage,
      customClasses: missingCodeFiles,
    }),
  });
  const responseText = await response.text();
  let result = {};
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    result = {};
  }

  if (!response.ok || result.success === false) {
    const details = result.details ? ` ${result.details}` : "";
    throw new Error(
      `${result.error || "FlutterFlow custom class provisioning failed."}${details}`,
    );
  }

  invalidateProjectSourceCache(apiClient);
  return {
    remoteFiles,
    syncFileMap: excludeProvisionedCodeFiles(fileMap, missingCodeFiles),
  };
}

/**
 * Reads the project's current pubspec.yaml, then merges in the packages the
 * generated code needs.
 *
 * FlutterFlow applies the pushed `serialized_yaml` as the project's complete
 * dependency set, so this must start from the file already in the project.
 * Synthesizing one would silently drop every package the project already had.
 *
 * @param {FlutterFlowApiClient} apiClient - Client for the target project
 * @param {Object<string, string>} newDependencies - name -> version constraint
 * @returns {Promise<{
 *   yaml: string,
 *   added: string[],
 *   alreadyPresent: string[],
 *   remoteFiles: Map<string, string>,
 * }>}
 * @throws If the project's pubspec.yaml cannot be read, so a deploy fails
 *   rather than overwriting the project's dependencies with a guess.
 */
async function resolveProjectPubspec(apiClient, newDependencies = {}) {
  const cacheKey = projectSourceCacheKey(apiClient);

  let projectSource = projectSourceCache.get(cacheKey);
  if (projectSource === undefined) {
    try {
      projectSource = await apiClient.fetchProjectSource();
    } catch (error) {
      throw new Error(
        `Could not read your project's pubspec.yaml (${error.message}). ` +
          "Deploy was stopped so your existing package dependencies aren't overwritten. " +
          "Check your FlutterFlow API key and project, then try again.",
      );
    }

    const validation = validateProjectPubspec(projectSource.pubspecYaml);
    if (!validation.valid) {
      throw new Error(
        `Your project's pubspec.yaml could not be read reliably (${validation.errors.join("; ")}). ` +
          "Deploy was stopped so your existing package dependencies aren't overwritten.",
      );
    }

    projectSourceCache.set(cacheKey, projectSource);
  }

  return {
    ...mergeDependenciesIntoYaml(projectSource.pubspecYaml, newDependencies),
    remoteFiles: projectSource.files,
  };
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

  console.log("Pre-commit summary:", summaryHtml);

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
  let codeType = CodeType.CODE_FILE;
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
    case "CustomClass":
    case "CodeFile":
      // Standalone custom code files, synced to lib/custom_code/ as type "C".
      codeType = CodeType.CODE_FILE;
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
function validateDartFile(
  fileName,
  content,
  codeType,
  declaredTypes = new Set(),
  artifactName = "",
) {
  const errors = [];
  const hasWidgetClass = WIDGET_CLASS_REGEX.test(content);
  const hasStateClass = STATE_CLASS_REGEX.test(content);

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
  if (codeType === CodeType.WIDGET && !hasWidgetClass && !hasStateClass) {
    errors.push(
      "No widget class definition found (must extend StatelessWidget or StatefulWidget)",
    );
  }

  if (codeType === CodeType.ACTION) {
    const returnTypeError = getCustomActionReturnTypeError(content, {
      functionName: artifactName,
      declaredTypes,
    });
    if (returnTypeError) errors.push(returnTypeError);
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

  const declaredTypes = new Set(
    Array.from(fileMap.values()).flatMap((fileInfo) =>
      getDeclaredDartTypes(fileInfo.content || "")
    ),
  );

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
      const result = validateDartFile(
        path,
        fileInfo.content,
        fileInfo.type,
        declaredTypes,
        fileInfo.artifactName,
      );
      if (!result.valid) {
        errors.push(...result.errors.map((e) => `${path}: ${e}`));
      }
    }

    // Validate pubspec
    if (path === "pubspec.yaml") {
      const result = validateProjectPubspec(fileInfo.content);
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

    console.log(`Commit state changed to: ${state}`);
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
  const { pubspecDeps = {}, artifactName = fileName } = options;

  // Validate/fix codeType if passed as full string
  if (codeType === "CustomWidget") codeType = CodeType.WIDGET;
  if (codeType === "CustomAction") codeType = CodeType.ACTION;
  if (codeType === "CustomFunction") codeType = CodeType.FUNCTION;
  if (codeType === "CustomClass") codeType = CodeType.CODE_FILE;
  if (codeType === "CodeFile") codeType = CodeType.CODE_FILE;

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
      artifactName,
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

    // Read the project's pubspec.yaml, add whatever the code needs, and push
    // the merged file back so existing packages are preserved.
    const pubspecMerge = await resolveProjectPubspec(apiClient, pubspecDeps);
    const serializedYaml = pubspecMerge.yaml;
    const provisioning = await provisionMissingCodeFiles(
      apiClient,
      fileMap,
      pubspecMerge.remoteFiles,
      `Provision ${artifactName} custom class`,
    );

    const syncMetadata = await buildApiSyncMetadata(
      provisioning.syncFileMap,
      provisioning.remoteFiles,
    );

    const fileMapWithPubspec = new Map(provisioning.syncFileMap);
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
      file_map: syncMetadata.fileMapContents,
      functions_map: syncMetadata.functionsMapContents,
    };

    // Push to FlutterFlow
    commitState.setState(CommitState.PUSHING);
    commitState.setProgress(1, fileMap.size);

    // A push can change custom code, functions, or dependencies even when its
    // response is lost, so the exported project snapshot is now stale.
    invalidateProjectSourceCache(apiClient);

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
      addedDependencies: pubspecMerge.added,
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
 * Executes the complete commit action with all integrations.
 * @param {string} code - Generated Dart code
 * @param {Object} options - Commit options
 * @param {string} options.artifactType - Type of artifact
 * @param {string} options.artifactName - Name of artifact
 * @param {Object} options.pipelineResult - Pipeline generation results
 * @returns {Promise<Object>} Commit result with full details
 */

async function createZipFromFileMap(fileMap) {
  try {
    const zip = new JSZip();

    for (const [name, info] of fileMap.entries()) {
      zip.file(name, info.content);
    }

    const zipBuffer = await zip.generateAsync({
      type: "base64",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    return zipBuffer;
  } catch (error) {
    console.error("Error creating zip:", error);
    return "";
  }
}

async function executeCommit(code, options = {}) {
  const { artifactType, artifactName, pipelineResult } = options;

  console.log(`Starting commit for ${artifactName} (${artifactType})`);

  try {
    // Step 1: Prepare the code
    commitState.setState(CommitState.PREPARING);
    const codeInfo = prepareCodeForCommit(code, { artifactType, artifactName });

    // Step 2: Extract dependencies
    const deps = extractDependencies(codeInfo.content);
    console.log("Detected dependencies:", deps);

    // Step 3: Validate FlutterFlow credentials
    commitState.setState(CommitState.VALIDATING);
    const apiKey = await getApiKey("flutterflow");
    const projectId = await getApiKey("flutterflow_project_id");

    if (!apiKey) {
      throw new Error(
        "FlutterFlow API Key not configured. Please add it in API Keys settings.",
      );
    }
    if (!projectId) {
      throw new Error(
        "FlutterFlow Project ID not configured. Please add it in API Keys settings.",
      );
    }

    if (!validateFlutterFlowProjectId(projectId)) {
      throw new Error("Invalid FlutterFlow Project ID format.");
    }

    // Step 5: Prepare file map
    const fileMap = new Map();
    fileMap.set(codeInfo.fileName, {
      artifactName,
      content: codeInfo.content,
      type: codeInfo.codeType,
      path: getFilePathForCodeType(codeInfo.fileName, codeInfo.codeType),
      functionName:
        codeInfo.codeType === CodeType.FUNCTION ? artifactName : undefined,
    });

    commitState.setProgress(0, fileMap.size);

    // Step 6: Validate files
    const validation = validateFileMap(fileMap);
    if (!validation.valid) {
      throw new Error(
        `File validation failed:\n${validation.errors.join("\n")}`,
      );
    }

    if (validation.warnings.length > 0) {
      console.warn("Validation warnings:", validation.warnings);
    }

    commitState.setState(CommitState.PUSHING);
    const endpoint = getFlutterFlowEndpoint();
    const apiClient = new FlutterFlowApiClient(
      apiKey,
      projectId,
      "main",
      endpoint,
    );

    // Step 7: Merge the code's dependencies into the project's own pubspec.yaml
    const pubspecMerge = await resolveProjectPubspec(apiClient, deps);
    const serializedYaml = pubspecMerge.yaml;
    const provisioning = await provisionMissingCodeFiles(
      apiClient,
      fileMap,
      pubspecMerge.remoteFiles,
      `Provision ${artifactName} custom class`,
    );

    const syncMetadata = await buildApiSyncMetadata(
      provisioning.syncFileMap,
      provisioning.remoteFiles,
    );

    const fileMapWithPubspec = new Map(provisioning.syncFileMap);
    fileMapWithPubspec.set("pubspec.yaml", {
      content: serializedYaml,
      type: CodeType.DEPENDENCIES,
      path: "pubspec.yaml",
    });

    const zippedCustomCode = await createZipFromFileMap(fileMapWithPubspec);

    const pushRequest = {
      project_id: projectId,
      zipped_custom_code: zippedCustomCode,
      uid: `web_${Date.now()}`,
      branch_name: apiClient.branchName,
      serialized_yaml: serializedYaml,
      file_map: syncMetadata.fileMapContents,
      functions_map: syncMetadata.functionsMapContents,
    };

    commitState.setProgress(1, fileMap.size);

    // A push can change custom code, functions, or dependencies even when its
    // response is lost, so the exported project snapshot is now stale.
    invalidateProjectSourceCache(apiClient);

    const response = await apiClient.pushCode(pushRequest);
    const result = await parsePushCodeResponse(response);

    // Step 10: Handle result
    if (result.success) {
      const metadata = { ...buildCommitMetadata(codeInfo, pipelineResult), projectId };

      commitState.setSuccess({
        ...metadata,
        fileCount: fileMap.size,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
      });

      return {
        success: true,
        message: `Successfully committed ${codeInfo.fileName} to FlutterFlow`,
        metadata,
        addedDependencies: pubspecMerge.added,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
        elapsedTime: commitState.getElapsedTime(),
      };
    } else {
      const errorMsg =
        result.errorMessage || getFlutterFlowErrorMessage(result.responseCode);
      const errorWithMap = new Error(errorMsg);
      errorWithMap.errorMap = result.errorMap;
      throw errorWithMap;
    }
  } catch (error) {
    console.error("Commit execution failed:", error);
    commitState.setError(error);

    // Try to extract errorMap from the error if available
    let errorMap = new Map();
    if (error.errorMap) {
      errorMap = error.errorMap;
    } else if (error.message && error.message.includes("{")) {
      // Try to parse errorMap from error message
      try {
        const match = error.message.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          errorMap = new Map(Object.entries(parsed));
        }
      } catch (e) {}
    }

    return {
      success: false,
      error: error.message,
      errorMap: errorMap,
      state: commitState.currentState,
      elapsedTime: commitState.getElapsedTime(),
    };
  }
}

async function executeBundleCommit(bundlePlan, options = {}) {
  const { pipelineResult } = options;

  try {
    commitState.setState(CommitState.PREPARING);
    if (bundlePlan.errors?.length > 0) {
      throw new Error(`Bundle validation failed:\n${bundlePlan.errors.join("\n")}`);
    }
    const fileMap = new Map(
      bundlePlan.fileEntries.map((entry) => [
        entry.fileName,
        {
          artifactId: entry.artifactId,
          artifactName: entry.artifactName,
          content: entry.content,
          type: entry.type,
          path: entry.path,
          functionName:
            entry.type === CodeType.FUNCTION
              ? entry.artifactName
              : undefined,
        },
      ]),
    );

    commitState.setProgress(0, fileMap.size);

    const validation = validateFileMap(fileMap);
    if (!validation.valid) {
      throw new Error(`File validation failed:\n${validation.errors.join("\n")}`);
    }

    commitState.setState(CommitState.VALIDATING);
    const apiKey = await getApiKey("flutterflow");
    const projectId = await getApiKey("flutterflow_project_id");

    if (!apiKey) {
      throw new Error("FlutterFlow API Key not configured. Please add it in API Keys settings.");
    }
    if (!projectId) {
      throw new Error("FlutterFlow Project ID not configured. Please add it in API Keys settings.");
    }
    if (!validateFlutterFlowProjectId(projectId)) {
      throw new Error("Invalid FlutterFlow Project ID format.");
    }

    commitState.setState(CommitState.PUSHING);
    const endpoint = getFlutterFlowEndpoint();
    const apiClient = new FlutterFlowApiClient(
      apiKey,
      projectId,
      "main",
      endpoint,
    );

    const pubspecMerge = await resolveProjectPubspec(
      apiClient,
      bundlePlan.dependencies,
    );
    const serializedYaml = pubspecMerge.yaml;
    const provisioning = await provisionMissingCodeFiles(
      apiClient,
      fileMap,
      pubspecMerge.remoteFiles,
      `Provision ${bundlePlan.title} custom classes`,
    );
    const syncMetadata = await buildApiSyncMetadata(
      provisioning.syncFileMap,
      provisioning.remoteFiles,
    );

    const fileMapWithPubspec = new Map(provisioning.syncFileMap);
    fileMapWithPubspec.set("pubspec.yaml", {
      content: serializedYaml,
      type: CodeType.DEPENDENCIES,
      path: "pubspec.yaml",
    });

    const zippedCustomCode = await createZipFromFileMap(fileMapWithPubspec);
    const pushRequest = {
      project_id: projectId,
      zipped_custom_code: zippedCustomCode,
      uid: `web_${Date.now()}`,
      branch_name: apiClient.branchName,
      serialized_yaml: serializedYaml,
      file_map: syncMetadata.fileMapContents,
      functions_map: syncMetadata.functionsMapContents,
    };

    commitState.setProgress(1, fileMap.size);
    // A push can change custom code, functions, or dependencies even when its
    // response is lost, so the exported project snapshot is now stale.
    invalidateProjectSourceCache(apiClient);

    const response = await apiClient.pushCode(pushRequest);
    const result = await parsePushCodeResponse(response);

    if (result.success) {
      const metadata = {
        ...pipelineResult,
        artifactType: "Bundle",
        artifactName: bundlePlan.title,
        fileName: `${bundlePlan.fileEntries.length} artifacts`,
        codeSize: bundlePlan.fileEntries.reduce((sum, entry) => sum + entry.content.length, 0),
        projectId,
      };

      commitState.setSuccess({
        ...metadata,
        fileCount: fileMap.size,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
      });

      return {
        success: true,
        message: `Successfully committed ${bundlePlan.fileEntries.length} artifacts to FlutterFlow`,
        metadata,
        addedDependencies: pubspecMerge.added,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
        elapsedTime: commitState.getElapsedTime(),
      };
    }

    const errorMsg = result.errorMessage || getFlutterFlowErrorMessage(result.responseCode);
    const errorWithMap = new Error(errorMsg);
    errorWithMap.errorMap = result.errorMap;
    throw errorWithMap;
  } catch (error) {
    console.error("Bundle commit execution failed:", error);
    commitState.setError(error);
    return {
      success: false,
      error: error.message,
      errorMap: error.errorMap || new Map(),
      state: commitState.currentState,
      elapsedTime: commitState.getElapsedTime(),
    };
  }
}

// --- PIPELINE FUNCTIONS ---

async function runPromptArchitect(userInput) {
  try {
    const result = await callBuildShip(
      "architect",
      PROMPT_ARCHITECT_MODEL,
      buildArchitectPrompt(userInput),
      createBuildShipContext("architect"),
    )
    return result
  } catch (error) {
    if (error.isModelArmor) throw error
    throw new Error(`Prompt Architect failed: ${error.message}`)
  }
}

async function runCodeGenerator(masterPrompt, selectedModel) {
  const prompt = buildGeneratorPrompt(masterPrompt)
  const context = createBuildShipContext("generator", pipelineState.bundleSpec)
  try {
    const result = await callBuildShip("generator", selectedModel, prompt, context)
    return result
  } catch (primaryError) {
    if (primaryError.isModelArmor) throw primaryError
    if (selectedModel !== FALLBACK_MODEL) {
      console.warn(`Code Generator failed with ${selectedModel}, retrying with fallback model:`, primaryError.message)
      try {
        const result = await callBuildShip("generator", FALLBACK_MODEL, prompt, context)
        return result
      } catch (fallbackError) {
        if (fallbackError.isModelArmor) throw fallbackError
        throw new Error(`Code Generator failed: primary (${selectedModel}): ${primaryError.message} | fallback (${FALLBACK_MODEL}): ${fallbackError.message}`)
      }
    }
    throw new Error(`Code Generator failed: ${primaryError.message}`)
  }
}

async function runCodeReview(code, architectOutput = null) {
  const context = {
    ...createBuildShipContext("review", pipelineState.artifactBundle || pipelineState.bundleSpec),
    architect_output: architectOutput,
  }
  try {
    const result = await callBuildShip("review", CODE_REVIEW_MODEL, buildReviewPrompt(code), context)
    return result
  } catch (error) {
    if (error.isModelArmor) throw error
    throw new Error(`Code Review failed: ${error.message}`)
  }
}

function getPipelineErrorMessage(error, prefix) {
  if (error.isModelArmor) {
    return `${error.userTitle}: ${error.userMessage}`;
  }
  return `${prefix}: ${error.message}`;
}

// --- MARKDOWN RENDERING ---

// --- UI FUNCTIONS ---

function updateStepIndicator(step, status) {
  const item = document.getElementById(`step${step}-item`);
  const statusIcon = document.getElementById(`step${step}-status`);
  if (!item || !statusIcon) return;

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
  } else {
    loading.classList.add("hidden");
    result.classList.remove("hidden");
    updateStepIndicator(step, "completed");
  }
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
  // Remove active class from all workflow items
  for (let i = 1; i <= 3; i++) {
    const item = document.getElementById(`step${i}-item`);
    if (item) item.classList.remove("active");
  }

  // Add active class to selected workflow item
  const selectedItem = document.getElementById(`step${step}-item`);
  if (selectedItem) selectedItem.classList.add("active");

  // Hide welcome video
  dismissWelcomeVideo();

  // Hide ready state
  const readyState = document.getElementById("ready-state");
  if (readyState) readyState.classList.add("hidden");

  // Hide all step contents
  for (let i = 1; i <= 3; i++) {
    const content = document.getElementById(`step${i}-content`);
    if (content) content.classList.add("hidden");
  }

  // Show selected step content
  const selectedContent = document.getElementById(`step${step}-content`);
  if (selectedContent) selectedContent.classList.remove("hidden");

  // Update stage title
  const stageTitle = document.getElementById("stage-title");
  const titles = {
    1: "Prompt Architect",
    2: "Code Generator",
    3: "Code Review",
  };
  if (stageTitle)
    stageTitle.textContent = titles[step] || "Active Workflow Stage";
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
  // Update step 1 (Prompt Architect) model label - uses PROMPT_ARCHITECT_MODEL
  const step1Label = document.getElementById("step1-model-label")
  if (step1Label) {
    step1Label.textContent = getModelLabel(PROMPT_ARCHITECT_MODEL)
  }

  // Update step 2 (Code Generator) model label - shows selected model
  // If user is on free tier and selected a paid model, show: "Selected Model → Free Model"
  const effectiveModel = getEffectiveModel(selectedModel)
  const step2Label = document.getElementById("step2-model-label")
  if (step2Label) {
    if (effectiveModel !== selectedModel) {
      // Free tier user selected a paid model - show both
      step2Label.textContent = `${getModelLabel(selectedModel)} → ${getModelLabel(effectiveModel)} (Free Tier)`
    } else {
      // User's selection matches effective model
      step2Label.textContent = getModelLabel(selectedModel)
    }
  }

  // Update step 3 (Code Review) model label - uses CODE_REVIEW_MODEL
  const step3Label = document.getElementById("step3-model-label")
  if (step3Label) {
    step3Label.textContent = getModelLabel(CODE_REVIEW_MODEL)
  }

  console.log(`Step 1 (Prompt Architect): ${getModelLabel(PROMPT_ARCHITECT_MODEL)}`)
  if (effectiveModel !== selectedModel) {
    console.log(`Step 2 (Code Generator): ${getModelLabel(selectedModel)} → ${getModelLabel(effectiveModel)} (Free Tier fallback)`)
  } else {
    console.log(`Step 2 (Code Generator): ${getModelLabel(selectedModel)}`)
  }
  console.log(`Step 3 (Code Review): ${getModelLabel(CODE_REVIEW_MODEL)}`)
}

async function runRefinement() {
  console.log("runRefinement called");

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
    const selectedArtifact = getSelectedArtifact();
    const refinementPrompt = buildArtifactRegenerationPrompt({
      bundleSpec: pipelineState.step1Result,
      artifactBundle: JSON.stringify(pipelineState.artifactBundle || pipelineState.step2Result),
      bundleReview: pipelineState.step3Result,
      artifactId: selectedArtifact.id,
      userFeedback: "Fix the issues listed in the audit report.",
    });

    // Show progress bar for refinement
    showPipelineProgress();
    updatePipelineProgressStep(2);

    // Step 2: Code Generator (Refinement)
    selectWorkflowStep(2);
    showStepLoading(2, true);

    // We use the same runCodeGenerator function but with the refinement prompt
    pipelineState.step2Result = await runCodeGenerator(
      refinementPrompt,
      selectedModel,
    );
    updateArtifactBundleFromGeneratedCode();

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.textContent = cleanStep2;
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    // Step 3: Code Audit (Re-audit)
    selectWorkflowStep(3);
    updatePipelineProgressStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );
    updateBundleReviewFromReviewResult();

    const auditOutput = document.getElementById("step3-output");
    auditOutput.textContent = pipelineState.step3Result;

    showStepLoading(3, false);

    // Show updated results
    hidePipelineProgress();
    const auditHtml = renderMarkdownAudit(pipelineState.step3Result);
    showResultsView(cleanStep2, auditHtml);
  } catch (error) {
    console.error("Refinement failed:", error);
    hidePipelineProgress();
    showToast(getPipelineErrorMessage(error, "Refinement failed"), "error");
  } finally {
    pipelineState.isRunning = false;
    btns.forEach((btn) => {
      btn.disabled = false;
      btn.textContent = "Refine & Regenerate";
    });
    updateDeployButtonVisibility();
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
      console.error(`callEndpoint failed: ${response.status} ${response.statusText}`, errorText)
      return { success: false, status: response.status, error: errorText }
    }
    
    const result = await response.json()
    console.log('Telemetry success:', result)
    return result
  } catch (error) {
    console.error('callEndpoint failed:', error)
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
    const refinementPrompt = buildBundleRegenerationPrompt({
      bundleSpec: pipelineState.step1Result,
      artifactBundle: JSON.stringify(pipelineState.artifactBundle || pipelineState.step2Result),
      bundleReview: pipelineState.step3Result,
      userFeedback: pastedErrors,
    });

    hideErrorInputPanel()
    showPipelineProgress()
    updatePipelineProgressStep(2)

    selectWorkflowStep(2)
    showStepLoading(2, true)

    pipelineState.step2Result = await runCodeGenerator(refinementPrompt, selectedModel)
    updateArtifactBundleFromGeneratedCode()

    const step2Output = document.getElementById("step2-output")
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result)
    step2Output.textContent = cleanStep2
    step2Output.dataset.raw = cleanStep2
    showStepLoading(2, false)

    selectWorkflowStep(3)
    updatePipelineProgressStep(3)
    showStepLoading(3, true)

    pipelineState.step3Result = await runCodeReview(pipelineState.step2Result, pipelineState.step1Result)
    updateBundleReviewFromReviewResult()

    const auditOutput = document.getElementById("step3-output")
    auditOutput.textContent = pipelineState.step3Result
    showStepLoading(3, false)

    hidePipelineProgress()
    const auditHtml = renderMarkdownAudit(pipelineState.step3Result)
    showResultsView(cleanStep2, auditHtml)

    if (input) input.value = ""
  } catch (error) {
    console.error("Fix from errors failed:", error)
    hidePipelineProgress()
    showToast(getPipelineErrorMessage(error, "Failed to fix errors"), "error")
  } finally {
    pipelineState.isRunning = false
    if (btn) {
      btn.disabled = false
      btn.textContent = "Fix Errors & Regenerate"
    }
    updateDeployButtonVisibility()
  }
}

// --- MAIN PIPELINE ---

async function runThinkingPipeline() {
  console.log("runThinkingPipeline called");

  if (pipelineState.isRunning) return;

  localStorage.setItem("hasSeenWalkthrough", "true");

  const userInput = document.getElementById("pipeline-input").value;
  const selectedModel = document.getElementById("code-generator-model").value;

  if (!userInput.trim()) {
    showToast("Please describe your FlutterFlow widget first.", "warning");
    return;
  }

  if (!(await canRunPipeline())) return;

  const effectiveModel = getEffectiveModel(selectedModel);

  trackEvent("Pipeline Started", { 
    selectedModel, 
    effectiveModel,
    inputLength: userInput.length
  });

  const btn = document.getElementById("btn-run-pipeline");

  // Reset state
  pipelineState.isRunning = true;
  resetPipelineResults();

  btn.disabled = true;
  btn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
  Running...`;

  // Update model info
  updateModelInfo(effectiveModel);

  try {
    // Dismiss welcome video and hide ready state, show progress
    dismissWelcomeVideo();
    const readyState = document.getElementById("ready-state");
    if (readyState) readyState.classList.add("hidden");
    const paywallEl = document.getElementById("paywall-exhausted");
    if (paywallEl) paywallEl.classList.add("hidden");

    // Show pipeline progress bar
    showPipelineProgress();

    // Step 1: Prompt Architect
    selectWorkflowStep(1);
    updatePipelineProgressStep(1);
    showStepLoading(1, true);

    pipelineState.step1Result = await runPromptArchitect(userInput);
    updateBundleSpecFromArchitectResult();
    trackEvent("Prompt Architect Completed");

    const step1Output = document.getElementById("step1-output")
    const cleanStep1 = extractCodeFromMarkdown(pipelineState.step1Result)
    step1Output.textContent = cleanStep1
    step1Output.dataset.raw = cleanStep1
    showStepLoading(1, false)

    // Step 2: Code Generator
    selectWorkflowStep(2);
    updatePipelineProgressStep(2);
    showStepLoading(2, true);

    pipelineState.step2Result = await runCodeGenerator(
      pipelineState.step1Result,
      effectiveModel,
    );
    updateArtifactBundleFromGeneratedCode();
    trackEvent("Code Generator Completed");

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.textContent = cleanStep2;
    step2Output.dataset.raw = cleanStep2; // Store raw for copy
    showStepLoading(2, false);

    // Step 3: Code Audit
    selectWorkflowStep(3);
    updatePipelineProgressStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );
    updateBundleReviewFromReviewResult();
    trackEvent("Code Review Completed");

    const auditOutput = document.getElementById("step3-output");
    auditOutput.textContent = pipelineState.step3Result;

    showStepLoading(3, false);

    // Hide progress bar and show split-panel results
    hidePipelineProgress();
    const auditHtml = renderMarkdownAudit(pipelineState.step3Result);
    showResultsView(cleanStep2, auditHtml);

    incrementUsage();
    updateUsageDisplay();
  } catch (error) {
    console.error("Pipeline failed:", error);
    hidePipelineProgress();

    if (error.isUsageLimit) {
      const { count } = getUsage()
      showPaywallExhausted(count, getRunLimit(), { openModal: true })
      return
    }

    trackEvent("Pipeline Failed", {
      error: error.message,
      effectiveModel: getEffectiveModel(document.getElementById("code-generator-model").value)
    });

    // Determine which step failed based on the error context
    const modelArmorSteps = {
      architect: 1,
      generator: 2,
      review: 3,
    };
    let errorStep = modelArmorSteps[error.pipelineStep] || 1;
    if (!error.pipelineStep && (
      error.message.includes("Claude") ||
      error.message.includes("OpenAI") ||
      error.message.includes("Code Generator")
    )) {
      errorStep = 2;
    } else if (!error.pipelineStep && error.message.includes("Code Review")) {
      errorStep = 3;
    }

    selectWorkflowStep(errorStep);
    const resultDiv = document.getElementById(`step${errorStep}-result`);
    const loadingDiv = document.getElementById(`step${errorStep}-loading`);
    const output = document.getElementById(`step${errorStep}-output`);

    // Hide loading and show error
    if (loadingDiv) loadingDiv.classList.add("hidden");
    if (resultDiv) resultDiv.classList.remove("hidden");

    if (output) {
      if (error.isModelArmor) {
        output.innerHTML = `<div role="alert" class="bg-amber-50 border border-amber-200 rounded-lg p-4" style="white-space:normal;overflow-wrap:anywhere;font-family:'Delight','DM Sans',sans-serif;line-height:1.5;">
          <h4 class="text-amber-800 font-bold text-xs uppercase mb-2">${escapeHtml(error.userTitle)}</h4>
          <p class="text-sm text-amber-900">${escapeHtml(error.userMessage)}</p>
          <p class="mt-3 text-xs text-amber-700">${escapeHtml(error.retryExplanation)}</p>
        </div>`;
      } else {
        // Format error message based on type
        let errorMessage = error.message;
        if (error.message.includes("image input")) {
          errorMessage =
            `This model doesn't support image input. Please use ${getModelLabel(FREE_MODEL)} for image-based requests or remove image references from your prompt.`;
        } else if (
          error.message.includes("Load failed") ||
          error.message.includes("CORS")
        ) {
          errorMessage =
            "API connection failed. This might be due to CORS restrictions or network issues. Please check your API key and try again.";
        }

        output.innerHTML = `<div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 class="text-red-600 font-bold text-xs uppercase mb-2">Connection Error</h4>
          <p class="text-sm text-red-700">${escapeHtml(errorMessage)}</p>
          <div class="mt-3 text-xs text-gray-500">
            <p>Check if API key is valid</p>
            <p>Try using a different model</p>
            <p>Ensure network allows API calls</p>
          </div>
        </div>`;
      }
    }

    updateStepIndicator(errorStep, "error");
  } finally {
    pipelineState.isRunning = false;
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z"/>
    </svg>
    Run Pipeline`;

    updateDeployButtonVisibility();
  }
}

function retryWithDifferentModel() {
  // Show model selection dialog
  const currentModel = document.getElementById("code-generator-model").value;
  const otherModels = [
    FREE_MODEL,
    "anthropic/claude-opus-5",
    "openai/gpt-5.6-sol",
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
  const code = getSelectedArtifactCode();
  if (!code) {
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

  if (pipelineState.artifactBundle?.artifacts?.length > 1) {
    await initiateBundleCommitToFlutterFlow();
    return;
  }

  const { artifactType, artifactName } = getCurrentArtifactMetadata();

  const codeInfo = prepareCodeForCommit(code, { artifactType, artifactName });

  const checks = runPreCommitChecks(codeInfo);

  const shouldProceed = await showPreCommitSummary(codeInfo, checks);

  if (!shouldProceed) {
    console.log("User cancelled commit");
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

async function initiateBundleCommitToFlutterFlow() {
  const apiKey = await getApiKey("flutterflow");
  const projectId = await getApiKey("flutterflow_project_id");

  if (!apiKey || !projectId) {
    showToast("FlutterFlow credentials not configured. Add your API Key and Project ID in settings.", "warning");
    openApiKeysModal();
    return;
  }

  const plan = buildBundleDeployPlan(pipelineState.artifactBundle);
  if (plan.errors.length > 0) {
    showToast(`Bundle validation failed: ${plan.errors.join("; ")}`, "error");
    return;
  }
  const fileMap = new Map(
    plan.fileEntries.map((entry) => [
      entry.fileName,
      {
        content: entry.content,
        type: entry.type,
        path: entry.path,
      },
    ]),
  );

  const validation = validateFileMap(fileMap);
  const checks = {
    canProceed: validation.valid && plan.errors.length === 0,
    issues: [...plan.errors, ...validation.errors],
    warnings: [...plan.warnings, ...validation.warnings],
  };
  if (!checks.canProceed) {
    showToast(`Bundle validation failed: ${checks.issues.join("; ")}`, "error");
    return;
  }
  const codeInfo = {
    content: plan.fileEntries.map((entry) => `// ${entry.fileName}\n${entry.content}`).join("\n\n"),
    fileName: `${plan.fileEntries.length} files`,
    codeType: "bundle",
    artifactType: "Bundle",
    artifactName: plan.title,
  };

  openCommitConfirmModal(codeInfo, checks, plan.dependencies, plan);
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

    const refinementPrompt = buildBundleRegenerationPrompt({
      bundleSpec: pipelineState.step1Result,
      artifactBundle: JSON.stringify(pipelineState.artifactBundle || pipelineState.step2Result),
      bundleReview: pipelineState.step3Result,
      userFeedback: errorContext,
    });

    showPipelineProgress();
    updatePipelineProgressStep(2);

    // Go to step 2
    selectWorkflowStep(2);
    showStepLoading(2, true);

    // Generate new code
    pipelineState.step2Result = await runCodeGenerator(
      refinementPrompt,
      selectedModel,
    );
    updateArtifactBundleFromGeneratedCode();

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.textContent = cleanStep2;
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    // Run audit
    selectWorkflowStep(3);
    updatePipelineProgressStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeReview(
      pipelineState.step2Result,
      pipelineState.step1Result,
    );
    updateBundleReviewFromReviewResult();

    const auditOutput = document.getElementById("step3-output");
    auditOutput.textContent = pipelineState.step3Result;

    showStepLoading(3, false);

    hidePipelineProgress();
    const auditHtml = renderMarkdownAudit(pipelineState.step3Result);
    showResultsView(cleanStep2, auditHtml);
  } catch (error) {
    console.error("Regeneration failed:", error);
    hidePipelineProgress();
    showToast(getPipelineErrorMessage(error, "Regeneration failed"), "error");
  } finally {
    pipelineState.isRunning = false;

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Fix Errors & Regenerate";
    }

    updateDeployButtonVisibility();
  }
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
  const storedSession = getStoredSession()
  const sessionChanged = (authState.email || storedSession.email) !== email
  authState.email = email
  authState.sessionToken = sessionToken
  authState.isVerified = true
  subscriptionState = createSubscriptionState({ isLoading: true })
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ email, sessionToken }))
  if (sessionChanged) clearSubscriptionCache()
}

function clearSession() {
  authState.email = null
  authState.sessionToken = null
  authState.isVerified = false
  subscriptionState = createSubscriptionState({ isResolved: true })
  localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
  localStorage.removeItem(SUBSCRIPTION_CACHE_KEY)
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!raw) return { email: null, sessionToken: null }
    const session = JSON.parse(raw)
    if (!session.email || !session.sessionToken) return { email: null, sessionToken: null }
    return session
  } catch (err) {
    console.warn('getStoredSession: failed to parse auth session:', err)
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return { email: null, sessionToken: null }
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

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!email || !emailRegex.test(email) || email.length > 254) {
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

    const fp = await FingerprintJS.load()
    const result = await fp.get()
    const cookieId = result.visitorId

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

    console.log(`Identity resolved: ${data.status} (${data.user_id.slice(0, 8)}...) usage: ${data.usage_count ?? 'n/a'}`)
  } catch (error) {
    console.error('resolveIdentity failed:', error)
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
  const updated = { count: current.count + 1, month: getCurrentYearMonth() }
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

function isSubscriptionLoading() {
  return !!subscriptionState.isLoading
}

function isSubscriptionResolved() {
  return !!subscriptionState.isResolved
}

function normalizeTier(value) {
  if (!value) return null
  const tier = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_')
  if (tier === 'pro' || tier === 'professional_plan') return 'professional'
  if (tier === 'power_developer' || tier === 'power_plan') return 'power'
  if (Object.prototype.hasOwnProperty.call(TIER_LIMITS, tier)) return tier
  return null
}

function tierFromPriceId(priceId) {
  if (!priceId) return null
  return Object.entries(STRIPE_PRICE_IDS).find(([, id]) => id === priceId)?.[0] || null
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function firstSubscriptionLike(...values) {
  return values.find(value => value && typeof value === 'object') || {}
}

function normalizeSubscriptionResponse(data) {
  const response = data.data && typeof data.data === 'object' ? data.data : data
  const subscription = firstSubscriptionLike(
    response.subscription,
    response.stripeSubscription,
    response.currentSubscription,
    response.customer?.subscriptions?.data?.[0],
    response.subscriptions?.data?.[0],
    response.subscriptions?.[0],
  )
  const metadata = response.metadata || subscription.metadata || response.customer?.metadata || {}
  const priceId = firstValue(
    response.priceId,
    response.price_id,
    response.stripePriceId,
    response.stripe_price_id,
    subscription.priceId,
    subscription.price_id,
    subscription.plan?.id,
    subscription.price?.id,
    subscription.items?.data?.[0]?.price?.id,
    subscription.items?.[0]?.price?.id,
    subscription.lines?.data?.[0]?.price?.id,
  )
  const status = firstValue(response.status, response.subscriptionStatus, response.subscription_status, subscription.status, 'none')
  const explicitTier = normalizeTier(firstValue(
    response.tier,
    response.plan,
    response.planId,
    response.plan_id,
    response.subscriptionTier,
    response.subscription_tier,
    response.product,
    response.productName,
    subscription.tier,
    subscription.plan,
    metadata.tier,
    metadata.plan,
  ))
  const paidByStatus = PAID_SUBSCRIPTION_STATUSES.has(String(status).toLowerCase())
  const paidByFlag = response.active === true || response.isSubscribed === true || response.subscribed === true || response.hasSubscription === true
  const tier = explicitTier || tierFromPriceId(priceId) || ((paidByStatus || paidByFlag) ? 'professional' : 'free')

  return createSubscriptionState({
    tier,
    status,
    periodEnd: firstValue(response.periodEnd, response.currentPeriodEnd, response.current_period_end, subscription.current_period_end, subscription.periodEnd, null),
    isResolved: true,
  })
}

function getRunLimit() {
  return TIER_LIMITS[subscriptionState.tier] ?? TIER_LIMITS.free
}

async function canRunPipeline() {
  if (authState.isVerified && (!isSubscriptionResolved() || isSubscriptionLoading())) {
    await fetchSubscription({ force: true })
    updateSubscriptionUI()
  }

  if (authState.isVerified && !isSubscriptionResolved()) {
    showToast('Could not verify your subscription. Please refresh or try Manage billing.', 'error')
    return false
  }

  const { count } = getUsage()
  const limit = getRunLimit()
  if (count >= limit) {
    showPaywallExhausted(count, limit, { openModal: true })
    return false
  }
  const warningThreshold = Math.floor(limit * 0.8)
  if (count >= warningThreshold) {
    const remaining = limit - count
    showToast(`${remaining} run${remaining === 1 ? '' : 's'} remaining this month.`, 'warning')
  }
  return true
}

function hidePaywallExhausted() {
  const paywall = document.getElementById('paywall-exhausted')
  if (paywall) paywall.classList.add('hidden')
}

function showPaywallExhausted(count, limit, options = {}) {
  const walkthroughModal = document.getElementById('walkthrough-modal')
  if (walkthroughModal) walkthroughModal.classList.remove('open')

  const readyState = document.getElementById('ready-state')
  if (readyState) readyState.classList.add('hidden')

  const previewContainer = document.getElementById('preview-frame-container')
  if (previewContainer) previewContainer.style.display = 'none'

  const stageContainer = document.getElementById('main-stage-container')
  if (stageContainer) stageContainer.classList.add('visible')

  const resultsView = document.getElementById('results-view')
  if (resultsView) resultsView.classList.remove('visible')
  document.body.classList.remove("results-fullscreen", "results-with-sidebar")

  const pipelineProgress = document.getElementById('pipeline-progress')
  if (pipelineProgress) pipelineProgress.classList.remove('visible')

  const paywall = document.getElementById('paywall-exhausted')
  if (!paywall) {
    showToast(`You've used all ${limit} runs for this month. Upgrade to continue.`, 'error')
    openPricingModal()
    return
  }

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

  paywall.classList.remove('hidden')
  if (options.openModal) openPricingModal()
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
  const unresolvedSignedIn = authState.isVerified && !isSubscriptionResolved()
  const isFree = !unresolvedSignedIn && tier === 'free'

  Array.from(select.options).forEach(opt => {
    const baseLabel = getModelLabel(opt.value)
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
      if (isSubscriptionResolved() && subscriptionState.tier === 'free' && PRO_MODELS.includes(select.value)) {
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

  if (authState.isVerified && isSubscriptionLoading()) {
    el.textContent = 'Checking plan…'
    el.className = 'text-xs text-gray-500'
    updateGuestUsageCounter()
    hidePaywallExhausted()
    return
  }

  if (authState.isVerified && !isSubscriptionResolved()) {
    el.textContent = 'Plan check failed'
    el.className = 'text-xs text-red-600 font-medium'
    updateGuestUsageCounter()
    hidePaywallExhausted()
    return
  }

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
  } else {
    hidePaywallExhausted()
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

async function fetchSubscription(options = {}) {
  const force = options.force === true

  if (!authState.isVerified || !authState.sessionToken) {
    subscriptionState = createSubscriptionState({ isResolved: true })
    return
  }

  subscriptionState = { ...subscriptionState, isLoading: true, error: null }

  const cached = localStorage.getItem(SUBSCRIPTION_CACHE_KEY)
  if (!force && cached) {
    try {
      const { data, email, ts, version } = JSON.parse(cached)
      const cacheMatchesSession = version === SUBSCRIPTION_CACHE_VERSION && email === authState.email
      if (cacheMatchesSession && Date.now() - ts < 5 * 60 * 1000) {
        subscriptionState = { ...data, isLoading: false, isResolved: data.isResolved !== false }
        return
      }
    } catch (err) {
      console.warn('Failed to parse subscription cache:', err, '| raw value:', cached)
    }
  }

  try {
    const res = await fetch(`${BUILDSHIP_BASE_URL}/stripe/get-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: authState.sessionToken, email: authState.email })
    })

    const data = await res.json()

    if (data.error) {
      const isAuthError = ['unauthorized', 'invalid session', 'expired session'].some(message => String(data.error).toLowerCase().includes(message))
      if (isAuthError) {
        clearSession()
        updateAuthUI()
        return
      }
      subscriptionState = createSubscriptionState({ isResolved: false, error: data.error })
      return
    }
    subscriptionState = normalizeSubscriptionResponse(data)

    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
      version: SUBSCRIPTION_CACHE_VERSION,
      data: subscriptionState,
      email: authState.email,
      ts: Date.now()
    }))
  } catch (err) {
    console.error('fetchSubscription failed:', err)
    subscriptionState = { ...subscriptionState, isLoading: false, isResolved: false, error: err.message }
  }
}

function clearSubscriptionCache() {
  localStorage.removeItem(SUBSCRIPTION_CACHE_KEY)
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
  const BUILDSHIP_TIMEOUT_MS = 120000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BUILDSHIP_TIMEOUT_MS)
  try {
    const res = await fetch(PIPELINE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        user_id: identityState.userId,
        step,
        model,
        prompt,
        context,
      }),
    })

    const data = await res.json()

    if (res.status === 429) {
      if (data.serverCount !== undefined) {
        localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ count: data.serverCount, month: getCurrentYearMonth() }))
        updateUsageDisplay()
      }
      const usageError = new Error(data.message || 'Monthly usage limit reached. Upgrade to continue.')
      usageError.isUsageLimit = true
      throw usageError
    }

    const modelArmorError = createModelArmorError(data, step)
    if (modelArmorError) throw modelArmorError

    console.log(`[BuildShip] ${step} response keys:`, Object.keys(data), 'content type:', typeof data.content)
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
      throw new Error(`BuildShip ${step} timed out after ${BUILDSHIP_TIMEOUT_MS / 1000}s`)
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
  const loading = signedIn && isSubscriptionLoading()
  const resolved = !signedIn || isSubscriptionResolved()

  const badge = document.getElementById('subscription-tier-badge')
  if (badge) {
    const labels = { free: 'Free', professional: 'Professional', power: 'Power Developer' }
    const colors = {
      free: 'bg-gray-100 text-gray-600',
      professional: 'bg-indigo-100 text-indigo-700',
      power: 'bg-purple-100 text-purple-700',
      unresolved: 'bg-red-50 text-red-600',
    }
    badge.textContent = loading ? 'Checking…' : resolved ? labels[tier] || 'Free' : 'Plan unavailable'
    badge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${resolved ? colors[tier] || colors.free : colors.unresolved}`
  }

  const upgradePrompt = document.getElementById('upgrade-prompt')
  if (upgradePrompt) upgradePrompt.classList.toggle('hidden', !signedIn || loading || !resolved || tier !== 'free')

  const manageBillingBtn = document.getElementById('manage-billing-btn')
  if (manageBillingBtn) manageBillingBtn.classList.toggle('hidden', !signedIn || loading || (resolved && tier === 'free'))

  updatePricingModalState(resolved ? tier : null)
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
  const modal = document.getElementById('pricing-modal')
  if (modal) modal.classList.add('open')
  fetchAudExchangeRates().then(() => updatePricingDisplay())
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
  // Initialize highlight.js
  hljs.configure({
    tabReplace: "  ",
    classPrefix: "hljs-",
  });

  // Initialize welcome video
  initializeWelcomeVideo();

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
  if (IS_DEV && new URLSearchParams(window.location.search).get("debugBundle") === "multi") {
    setTimeout(showDebugMultiArtifactResults, 0);
    setTimeout(showDebugMultiArtifactResults, 1600);
  }
  // Walkthrough step tracking
  const pipelineInput = document.getElementById("pipeline-input");
  if (pipelineInput) {
    pipelineInput.addEventListener("input", () => {
      if (walkthroughStep === 2 && pipelineInput.value.trim().length > 0) {
        advanceWalkthrough();
        updateWalkthroughUI();
      }
    });

    pipelineInput.addEventListener("blur", () => {
      const walkthroughModal = document.getElementById("walkthrough-modal");
      if (walkthroughStep === 2 && walkthroughModal) {
        walkthroughModal.classList.add("open");
      }
    });

    pipelineInput.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        const walkthroughModal = document.getElementById("walkthrough-modal");
        if (walkthroughStep === 2 && walkthroughModal) {
          setTimeout(() => {
            walkthroughModal.classList.add("open");
          }, 100);
        }
      }
    });
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
  const previewContainer = document.getElementById("preview-frame-container");
  if (previewContainer) {
    previewContainer.style.display = "";
  }
}

function handleWelcomeVideoEnd() {
  const video = document.getElementById("welcome-video-player");
  if (video) {
    video.addEventListener("click", dismissWelcomeVideo);
    document.addEventListener("keydown", dismissWelcomeVideo);
  }
}

function dismissWelcomeVideo() {
  const previewContainer = document.getElementById("preview-frame-container");
  const stageContainer = document.getElementById("main-stage-container");
  const readyState = document.getElementById("ready-state");

  if (previewContainer) previewContainer.style.display = "none";
  if (stageContainer) stageContainer.classList.add("visible");
  if (readyState) readyState.classList.remove("hidden");

  const video = document.getElementById("welcome-video-player");
  if (video) {
    video.removeEventListener("click", dismissWelcomeVideo);
  }
  document.removeEventListener("keydown", dismissWelcomeVideo);

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
function openCommitConfirmModal(codeInfo, checks, deps, bundlePlan = null) {
  pendingCommitData = { codeInfo, checks, deps, bundlePlan };

  document.getElementById("confirm-file-name").textContent = codeInfo.fileName;
  document.getElementById("confirm-artifact-type").textContent =
    codeInfo.artifactType;
  document.getElementById("confirm-file-size").textContent =
    `${(codeInfo.content.length / 1024).toFixed(1)} KB`;
  document.getElementById("confirm-line-count").textContent =
    bundlePlan ? `${bundlePlan.fileEntries.length} files` : codeInfo.content.split("\n").length;

  getApiKey("flutterflow_project_id").then((projectId) => {
    document.getElementById("confirm-project-id").textContent =
      projectId || "Not configured";
  });

  const depsList = document.getElementById("confirm-deps-list");
  const depsSection = document.getElementById("confirm-deps-section");
  if (deps && Object.keys(deps).length > 0) {
    depsList.innerHTML = Object.entries(deps)
      .map(([name, version]) => `<li>• ${escapeHtmlText(name)}: ${escapeHtmlText(version)}</li>`)
      .join("");
    depsSection.classList.remove("hidden");
  } else {
    depsSection.classList.add("hidden");
  }

  const warningsList = document.getElementById("confirm-warnings-list");
  const warningsSection = document.getElementById("confirm-warnings-section");
  if (checks.warnings && checks.warnings.length > 0) {
    warningsList.innerHTML = checks.warnings
      .map((w) => `<li>• ${escapeHtmlText(w)}</li>`)
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

  // Only worth a row when the deploy actually changed the project's pubspec.
  const addedDeps = result.addedDependencies || [];
  const depsRow = document.getElementById("success-deps-row");
  if (depsRow) depsRow.classList.toggle("hidden", addedDeps.length === 0);
  set("success-deps", addedDeps.join(", "));

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
  if (!pendingCommitData) {
    console.error("No pending commit data");
    return;
  }

  const commitData = pendingCommitData;
  closeCommitConfirmModal();
  showCommitProgress();

  if (commitData.bundlePlan) {
    const result = await executeBundleCommit(commitData.bundlePlan, {
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

    return;
  }

  const { codeInfo } = commitData;

  const { artifactType, artifactName } = getCurrentArtifactMetadata();

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

// --- PIPELINE PROGRESS BAR & RESULTS VIEW ---
let pipelineProgressTimer = null;
let pipelineStartTime = null;
const PIPELINE_ESTIMATED_DURATION = 120; // seconds

function showPipelineProgress() {
  const progress = document.getElementById("pipeline-progress");
  const resultsView = document.getElementById("results-view");
  const readyState = document.getElementById("ready-state");

  if (readyState) readyState.classList.add("hidden");
  if (resultsView) resultsView.classList.remove("visible");
  document.body.classList.remove("results-fullscreen", "results-with-sidebar");
  if (progress) progress.classList.add("visible");

  pipelineStartTime = Date.now();

  // Reset dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`pdot-${i}`);
    if (dot) { dot.className = "progress-dot"; }
  }

  updatePipelineProgressStep(1);
  startProgressTimer();
}

function updatePipelineProgressStep(step) {
  const titles = {
    1: "Analyzing your prompt...",
    2: "Generating Dart code...",
    3: "Running code audit..."
  };
  const substeps = {
    1: "Step 1 of 3 \u2014 Prompt Architect",
    2: "Step 2 of 3 \u2014 Code Generator",
    3: "Step 3 of 3 \u2014 Code Review"
  };

  const titleEl = document.getElementById("progress-title-text");
  const substepEl = document.getElementById("progress-substep-text");
  if (titleEl) titleEl.textContent = titles[step] || titles[1];
  if (substepEl) substepEl.textContent = substeps[step] || substeps[1];

  // Update dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`pdot-${i}`);
    if (!dot) continue;
    if (i < step) {
      dot.className = "progress-dot completed";
    } else if (i === step) {
      dot.className = "progress-dot active";
    } else {
      dot.className = "progress-dot";
    }
  }
}

function startProgressTimer() {
  if (pipelineProgressTimer) clearInterval(pipelineProgressTimer);

  pipelineProgressTimer = setInterval(() => {
    const elapsed = (Date.now() - pipelineStartTime) / 1000;
    const elapsedEl = document.getElementById("progress-elapsed");
    const fillEl = document.getElementById("pipeline-progress-fill");

    if (elapsedEl) elapsedEl.textContent = `${Math.floor(elapsed)}s`;

    // Ease toward ~95% over the estimated duration, never quite reaching 100%
    const rawPct = (elapsed / PIPELINE_ESTIMATED_DURATION) * 100;
    const easedPct = Math.min(95, rawPct * (1 - Math.exp(-elapsed / (PIPELINE_ESTIMATED_DURATION * 0.6))) * 1.2);
    if (fillEl) fillEl.style.width = `${easedPct}%`;
  }, 250);
}

function hidePipelineProgress() {
  if (pipelineProgressTimer) {
    clearInterval(pipelineProgressTimer);
    pipelineProgressTimer = null;
  }

  // Snap to 100%
  const fillEl = document.getElementById("pipeline-progress-fill");
  if (fillEl) fillEl.style.width = "100%";

  // Mark all dots completed
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`pdot-${i}`);
    if (dot) dot.className = "progress-dot completed";
  }

  // Brief pause then hide
  setTimeout(() => {
    const progress = document.getElementById("pipeline-progress");
    if (progress) progress.classList.remove("visible");
    if (fillEl) fillEl.style.width = "0%";
  }, 400);
}

function reviewStatusIcon(status, className = "") {
  const paths = {
    pass: `<path d="M20 6 9 17l-5-5"/>`,
    warning: `<path d="M12 9v4m0 4h.01"/><path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/>`,
    fail: `<path d="m15 9-6 6m0-6 6 6"/><circle cx="12" cy="12" r="9"/>`,
  };
  return `<svg class="review-status-icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[status] || paths.warning}</svg>`;
}

function reviewStatusLabel(status) {
  return {
    pass: "Passed review",
    warning: "Needs attention",
    fail: "Blocking issues",
  }[status] || "Needs attention";
}

function getReviewPresentation() {
  return buildReviewPresentation({
    bundle: pipelineState.artifactBundle,
    reviewResult: pipelineState.step3Result,
  });
}

function renderFinding(finding) {
  return `
    <div class="review-finding review-finding-${escapeAttr(finding.severity)}">
      ${reviewStatusIcon(finding.severity)}
      <div>
        <div class="review-finding-message">${escapeHtml(finding.message)}</div>
        ${finding.suggestion ? `<div class="review-finding-suggestion">${escapeHtml(finding.suggestion)}</div>` : ""}
        <span class="review-source">${escapeHtml(finding.source)}</span>
      </div>
    </div>
  `;
}

function renderManualStep(step) {
  return `
    <li class="manual-step">
      <div>
        <strong>${escapeHtml(step.title)}</strong>
        ${step.detail && step.detail !== step.title ? `<p>${escapeHtml(step.detail)}</p>` : ""}
      </div>
    </li>
  `;
}

function renderSummaryDetail(presentation) {
  const summaryDetail = document.getElementById("results-summary-detail");
  const resultsTitle = document.getElementById("results-title");
  if (!summaryDetail) return;
  if (resultsTitle) {
    resultsTitle.textContent = presentation.title;
  }

  const score = presentation.score;
  const scoreTone = score == null
    ? "neutral"
    : score >= 80 ? "pass" : score >= 60 ? "warning" : "fail";
  const scoreLabel = score == null
    ? ""
    : score >= 80 ? "Strong" : score >= 60 ? "Needs work" : "High risk";
  const findings = presentation.findings.length
    ? `
      <ul class="summary-findings">
        ${presentation.findings.map((finding) => `
          <li class="summary-finding-${escapeAttr(finding.severity)}">
            ${reviewStatusIcon(finding.severity)}
            <span>
              <strong>${escapeHtml(finding.message)}</strong>
              ${finding.suggestion ? `<small>${escapeHtml(finding.suggestion)}</small>` : ""}
            </span>
          </li>
        `).join("")}
      </ul>
    `
    : "";
  const manualSteps = presentation.manualSteps.length
    ? `
      <section class="summary-manual-callout">
        <h3>${reviewStatusIcon("warning")} Complete in FlutterFlow</h3>
        <ul>
          ${presentation.manualSteps.map((step) => `
            <li>
              <strong>${escapeHtml(step.title)}</strong>
              ${step.detail && step.detail !== step.title ? `<span>${escapeHtml(step.detail)}</span>` : ""}
            </li>
          `).join("")}
        </ul>
      </section>
    `
    : "";

  summaryDetail.innerHTML = `
    <section class="review-summary">
      <div class="review-summary-copy">
        <p class="review-summary-text">${escapeHtml(presentation.summary)}</p>
        ${findings}
        ${manualSteps}
      </div>
      <div class="review-score-column">
        <aside class="review-score review-score-${escapeAttr(scoreTone)}" aria-label="${score == null ? "Review not scored" : `Review score ${score} out of 100`}">
          <span class="review-score-label">Score</span>
          <strong>${score == null ? "—" : escapeHtml(score)}</strong>
          <span class="review-score-total">${score == null ? "Not scored" : "out of 100"}</span>
          ${scoreLabel ? `<span class="review-score-status">${escapeHtml(scoreLabel)}</span>` : ""}
        </aside>
        <div class="review-score-feedback">
          <span>Is the generated code correct?</span>
          <div class="review-score-feedback-controls">
            <button class="feedback-btn" id="btn-feedback-up" onclick="submitResultsFeedback('up')" title="Yes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>
            </button>
            <button class="feedback-btn" id="btn-feedback-down" onclick="submitResultsFeedback('down')" title="No">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSelectedArtifactReview(presentation) {
  const selectedArtifact = presentation.artifacts.find(
    (artifact) => artifact.id === pipelineState.selectedArtifactId,
  ) || presentation.artifacts[0];
  if (!selectedArtifact) return "";

  const emptyFindingState = {
    pass: {
      icon: "pass",
      message: "No file-specific issues were found.",
    },
    warning: {
      icon: "warning",
      message: "This file needs attention, but Code Review did not return a specific finding.",
    },
    fail: {
      icon: "fail",
      message: "This file is blocked, but Code Review did not return a specific finding.",
    },
  }[selectedArtifact.status];
  const findings = selectedArtifact.findings.length
    ? selectedArtifact.findings.map(renderFinding).join("")
    : `<div class="review-empty-state review-empty-${escapeAttr(selectedArtifact.status)}">${reviewStatusIcon(emptyFindingState.icon)} ${escapeHtml(emptyFindingState.message)}</div>`;
  const dependencies = selectedArtifact.dependencies?.length
    ? selectedArtifact.dependencies.map((dependency) => `
      <li><code>${escapeHtml(dependency.name)}${dependency.version ? ` ${escapeHtml(dependency.version)}` : ""}</code>${dependency.reason ? `<p>${escapeHtml(dependency.reason)}</p>` : ""}</li>
    `).join("")
    : `<li class="review-muted">No external packages</li>`;
  const imports = selectedArtifact.imports?.length
    ? selectedArtifact.imports.map((item) => `<code>${escapeHtml(item)}</code>`).join("")
    : `<span class="review-muted">No imports returned</span>`;
  const publicApi = selectedArtifact.publicApi?.length
    ? selectedArtifact.publicApi.map((item) => `<code>${escapeHtml(item)}</code>`).join("")
    : `<span class="review-muted">No public API signature returned</span>`;
  const relationships = selectedArtifact.relationships.length
    ? selectedArtifact.relationships.map((relationship) => `
      <li><strong>${escapeHtml(relationship.from || "Bundle")}</strong> ${escapeHtml(relationship.type)} <strong>${escapeHtml(relationship.to || "Bundle")}</strong>${relationship.description ? `<p>${escapeHtml(relationship.description)}</p>` : ""}</li>
    `).join("")
    : `<li class="review-muted">No relationships for this file</li>`;

  return `
    <div class="file-review-header file-review-${selectedArtifact.status}">
      <div>
        <span class="file-review-status">${reviewStatusIcon(selectedArtifact.status)} ${escapeHtml(reviewStatusLabel(selectedArtifact.status))}</span>
        <h3>${escapeHtml(selectedArtifact.artifactName)}</h3>
        ${selectedArtifact.description ? `<p>${escapeHtml(selectedArtifact.description)}</p>` : ""}
      </div>
      <div class="file-review-meta">
        <span>${escapeHtml(selectedArtifact.artifactType)}</span>
        <span>${escapeHtml(selectedArtifact.fileName)}</span>
      </div>
    </div>
    <section class="file-review-section">
      <h4>Code Review findings</h4>
      ${findings}
    </section>
    ${selectedArtifact.manualSteps.length ? `
      <section class="file-review-section file-manual-section">
        <h4>Manual FlutterFlow steps for this file</h4>
        <ol>${selectedArtifact.manualSteps.map(renderManualStep).join("")}</ol>
      </section>
    ` : ""}
    <details class="file-technical-details">
      <summary>File details</summary>
      <div class="file-detail-grid">
        <section class="file-review-section">
          <h4>Dependencies</h4>
          <ul class="dependency-list">${dependencies}</ul>
        </section>
        <section class="file-review-section">
          <h4>Deployment</h4>
          <dl class="file-deploy-facts">
            <div><dt>Status</dt><dd>${escapeHtml(selectedArtifact.deployStatus || "pending")}</dd></div>
            <div><dt>Order</dt><dd>${selectedArtifact.index + 1} of ${presentation.artifacts.length}</dd></div>
            <div><dt>Path hint</dt><dd>${escapeHtml(selectedArtifact.pathHint || "Not returned")}</dd></div>
          </dl>
        </section>
      </div>
      <section class="file-review-section">
        <h4>Public API</h4>
        <div class="code-chip-list">${publicApi}</div>
      </section>
      <section class="file-review-section">
        <h4>Imports</h4>
        <div class="code-chip-list">${imports}</div>
      </section>
      <section class="file-review-section">
        <h4>Relationships</h4>
        <ul class="file-relationship-list">${relationships}</ul>
      </section>
    </details>
  `;
}

function renderBundleControls(presentation) {
  const strip = document.getElementById("bundle-strip");
  const summaryTab = document.getElementById("results-summary-tab");
  const tabs = document.getElementById("artifact-tabs");
  const count = document.getElementById("results-file-count");
  if (summaryTab) {
    summaryTab.classList.toggle("active", pipelineState.resultsViewMode === "summary");
  }
  if (!presentation.artifacts.length) {
    if (count) count.textContent = "0 files";
    if (strip) strip.classList.remove("visible");
    if (tabs) tabs.innerHTML = "";
    return;
  }

  if (count) {
    const fileCount = presentation.artifacts.length;
    count.textContent = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  }
  if (tabs) {
    tabs.innerHTML = presentation.artifacts.map((artifact) => `
      <button
        type="button"
        class="artifact-tab${pipelineState.resultsViewMode === "file" && artifact.id === pipelineState.selectedArtifactId ? " active" : ""}"
        data-artifact-id="${escapeAttr(artifact.id)}"
        title="${escapeAttr(`${reviewStatusLabel(artifact.status)} · ${artifact.fileName || artifact.artifactName}`)}"
      >
        <span class="artifact-tab-status status-${escapeAttr(artifact.status)}">${reviewStatusIcon(artifact.status)}</span>
        <span>
          <span class="artifact-tab-name">${escapeHtml(artifact.artifactName)}</span>
          <span class="artifact-tab-meta">${escapeHtml(artifact.artifactType)}</span>
        </span>
      </button>
    `).join("");
    tabs.onclick = (event) => {
      const tab = event.target.closest(".artifact-tab");
      if (tab?.dataset?.artifactId) {
        selectArtifact(tab.dataset.artifactId);
      }
    };
  }

  if (strip) strip.classList.add("visible");
}

function updateSelectedArtifactPanels() {
  document.body.classList.add("results-fullscreen");
  document.body.classList.add("results-with-sidebar");
  const resultsView = document.getElementById("results-view");
  const codeOutput = document.getElementById("results-code-output");
  const auditOutput = document.getElementById("results-audit-output");
  const summaryDetail = document.getElementById("results-summary-detail");
  const artifactSplit = document.getElementById("artifact-results-split");
  const presentation = getReviewPresentation();
  const selectedCode = getSelectedArtifactCode();

  renderSummaryDetail(presentation);
  renderBundleControls(presentation);

  if (codeOutput) codeOutput.textContent = "";
  if (codeOutput) {
    const highlighted = highlightCode(selectedCode);
    codeOutput.innerHTML = highlighted; // eslint-disable-line -- highlight.js output
  }
  if (auditOutput) {
    auditOutput.innerHTML = renderSelectedArtifactReview(presentation);
  }
  if (summaryDetail) {
    summaryDetail.classList.toggle("hidden", pipelineState.resultsViewMode !== "summary");
  }
  if (artifactSplit) {
    artifactSplit.classList.toggle("hidden", pipelineState.resultsViewMode !== "file");
  }
  if (resultsView) resultsView.classList.add("visible");
}

function showResultsView(codeContent, auditContent) {
  if (!pipelineState.selectedArtifactId) {
    pipelineState.selectedArtifactId = getPrimaryArtifact(pipelineState.artifactBundle).id;
  }
  pipelineState.resultsViewMode = "summary";
  document.body.classList.add("results-fullscreen");
  const legacyReviewOutput = document.getElementById("step3-output");
  if (legacyReviewOutput) legacyReviewOutput.textContent = "";
  updateSelectedArtifactPanels();
  updateDeployButtonVisibility();

  // Reset feedback buttons
  const upBtn = document.getElementById("btn-feedback-up");
  const downBtn = document.getElementById("btn-feedback-down");
  if (upBtn) upBtn.className = "feedback-btn";
  if (downBtn) downBtn.className = "feedback-btn";
}

function showDebugMultiArtifactResults() {
  pipelineState.step1Result = JSON.stringify({
    schemaVersion: "artifact-bundle/v1",
    id: "debug-agent-ui",
    title: "Debug Agent UI",
    artifacts: [
      {
        id: "custom-class-agent-event",
        artifactType: "CustomClass",
        artifactName: "AgentEvent",
        fileName: "agent_event.dart",
        description: "Data model for agent events.",
      },
      {
        id: "custom-widget-agent-timeline",
        artifactType: "CustomWidget",
        artifactName: "AgentTimeline",
        fileName: "agent_timeline.dart",
        description: "Widget for rendering chronological agent events.",
      },
    ],
    relationships: [
      {
        from: "custom-widget-agent-timeline",
        to: "custom-class-agent-event",
        type: "imports",
      },
    ],
    deployOrder: ["custom-class-agent-event", "custom-widget-agent-timeline"],
  });
  updateBundleSpecFromArchitectResult();
  pipelineState.step2Result = JSON.stringify({
    schemaVersion: "artifact-bundle/v1",
    id: "debug-agent-ui",
    title: "Debug Agent UI",
    artifacts: [
      {
        id: "custom-class-agent-event",
        artifactType: "CustomClass",
        artifactName: "AgentEvent",
        fileName: "agent_event.dart",
        code: "class AgentEvent {\n  const AgentEvent({required this.id, required this.label});\n  final String id;\n  final String label;\n}\n",
      },
      {
        id: "custom-widget-agent-timeline",
        artifactType: "CustomWidget",
        artifactName: "AgentTimeline",
        fileName: "agent_timeline.dart",
        code: "class AgentTimeline extends StatelessWidget {\n  const AgentTimeline({super.key});\n  @override\n  Widget build(BuildContext context) {\n    return const SizedBox.shrink();\n  }\n}\n",
      },
    ],
    relationships: [
      {
        from: "custom-widget-agent-timeline",
        to: "custom-class-agent-event",
        type: "imports",
      },
    ],
    deployOrder: ["custom-class-agent-event", "custom-widget-agent-timeline"],
  });
  updateArtifactBundleFromGeneratedCode();
  pipelineState.step3Result = JSON.stringify({
    schemaVersion: "artifact-bundle/v1",
    id: "debug-agent-ui",
    overallReview: {
      status: "warn",
      score: 86,
      summary: "The bundle structure is sound. AgentTimeline still needs its event rendering completed before release.",
      manualActions: [
        {
          title: "Wire the generated AgentTimeline into the target page",
          detail: "Add the custom widget in FlutterFlow and bind its event data.",
          location: "UI Builder > Custom Widgets",
          timing: "after deploy",
        },
      ],
    },
    artifacts: [
      {
        id: "custom-class-agent-event",
        artifactName: "AgentEvent",
        artifactType: "CustomClass",
        review: { status: "pass", findings: [] },
      },
      {
        id: "custom-widget-agent-timeline",
        artifactName: "AgentTimeline",
        artifactType: "CustomWidget",
        review: {
          status: "warn",
          findings: [
            {
              severity: "warning",
              message: "Widget is a placeholder.",
              suggestion: "Render the event collection before shipping.",
            },
          ],
        },
      },
    ],
  });
  updateBundleReviewFromReviewResult();
  dismissWelcomeVideo();
  const paywallEl = document.getElementById("paywall-exhausted");
  if (paywallEl) paywallEl.classList.add("hidden");
  const walkthroughModal = document.getElementById("walkthrough-modal");
  if (walkthroughModal) walkthroughModal.classList.remove("open");
  const readyState = document.getElementById("ready-state");
  if (readyState) readyState.classList.add("hidden");
  const stageContainer = document.getElementById("main-stage-container");
  if (stageContainer) stageContainer.classList.add("visible");
  hidePipelineProgress();
  showResultsView(getSelectedArtifactCode(), renderMarkdownAudit(pipelineState.step3Result));
}

function selectArtifact(artifactId) {
  pipelineState.selectedArtifactId = artifactId;
  pipelineState.resultsViewMode = "file";
  updateSelectedArtifactPanels();
}

function selectResultsSummary() {
  pipelineState.resultsViewMode = "summary";
  updateSelectedArtifactPanels();
}

function copyResultsCode() {
  const btn = document.getElementById("btn-copy-results");
  const rawCode = getSelectedArtifactCode();

  navigator.clipboard.writeText(rawCode).then(() => {
    if (btn) {
      btn.classList.add("copied");
      const label = btn.querySelector("span");
      if (label) {
        const origText = label.textContent;
        label.textContent = "Copied!";
        setTimeout(() => {
          btn.classList.remove("copied");
          label.textContent = origText;
        }, 2000);
      }
    }
  });
}

function submitResultsFeedback(direction) {
  const upBtn = document.getElementById("btn-feedback-up");
  const downBtn = document.getElementById("btn-feedback-down");

  // Toggle
  if (direction === "up") {
    upBtn.classList.toggle("active-up");
    downBtn.classList.remove("active-down");
  } else {
    downBtn.classList.toggle("active-down");
    upBtn.classList.remove("active-up");
  }

  const feedbackType = direction === "up" ? "thumbsUp" : "thumbsDown";
  callEndpoint(feedbackType, pipelineState.step2Result, pipelineState.step1Result);
  trackEvent("Generation Feedback", { feedback: feedbackType });
}

function showErrorInputPanel() {
  const panel = document.getElementById("error-input-panel");
  if (panel) {
    panel.classList.remove("hidden");
    panel.style.display = "flex";
    const input = document.getElementById("ff-error-paste-input");
    if (input) setTimeout(() => input.focus(), 100);
  }
}

function hideErrorInputPanel() {
  const panel = document.getElementById("error-input-panel");
  if (panel) {
    panel.classList.add("hidden");
    panel.style.display = "none";
  }
}

window.copyResultsCode = copyResultsCode;
window.selectArtifact = selectArtifact;
window.selectResultsSummary = selectResultsSummary;
window.submitResultsFeedback = submitResultsFeedback;
window.showErrorInputPanel = showErrorInputPanel;
window.hideErrorInputPanel = hideErrorInputPanel;
