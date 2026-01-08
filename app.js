// --- CONFIGURATION ---
// Environment keys (fallback)
const envGeminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const envAnthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const envOpenaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || "";

// Model Configuration
const PROMPT_ARCHITECT_MODEL = "gemini-3-flash-preview";
const CODE_DISSECTOR_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash-preview-09-2025";

// --- SHARED FLUTTERFLOW CONSTRAINTS TEMPLATE ---
// These constraints are shared across all three pipeline agents to ensure consistency.
// Based on "The Definitive Guide to Integrating Dart Artifacts into FlutterFlow Environments"

const FF_CORE_PHILOSOPHY = `## THE FLUTTERFLOW INTEGRATION PHILOSOPHY

**FlutterFlow is the host organism.** Your Dart must conform to FlutterFlow's boilerplate, parsing rules, and parameter system - not the other way around.

Key principles:
1. **Settings and code must match.** FlutterFlow binds custom code by name/signature. If the UI says the widget/action is \`NeuroRadialGauge\`, your Dart must export that exact class/function name. Name mismatches are a top cause of "mysterious" breakage.
2. **Never modify the auto-import section.** FlutterFlow injects imports above a hard boundary (\`// Do not remove or modify the code above this line\`). Code goes BELOW that line only.
3. **You are responsible for dependencies.** FlutterFlow won't auto-add pubspec packages. If the code imports it, you must add it in Project Dependencies (and sometimes native config).
4. **The Parser Gap is real.** FlutterFlow parses custom code to power the UI (parameter panels, variable pickers). That parser is stricter than Dart itself - valid Dart can still be "invalid" to FlutterFlow.`;

const FF_ARTIFACT_TYPES = `## THE FOUR ARTIFACT SURFACES

### A) Custom Functions (Pure/Sync Logic Silo)
- **Purpose:** Synchronous data manipulation, math calculations, string formatting, data transformation
- **CRITICAL RESTRICTION:** NO external imports allowed - only dart:core, dart:math, dart:convert, dart:collection
- **Returns:** Synchronous value (String, int, double, bool, List, Map, etc.) - NOT Future
- **Use when:** Pure computation with no side effects, no async operations, no external dependencies
- **Examples:** Luhn algorithm validation, date formatting, list filtering, math calculations

### B) Custom Actions (Async/Side Effects Silo)
- **Purpose:** Side effects, API calls, complex logic chains, third-party library usage, file operations
- **Return type:** ALWAYS Future<T> - even synchronous logic must be wrapped
- **External imports:** ALLOWED (packages from pub.dev, added via Project Dependencies)
- **Optional:** Include BuildContext toggle for context-dependent work
- **Use when:** Anything async, anything needing external packages, anything with side effects
- **Examples:** HTTP requests, Bluetooth/sensors, file I/O, device APIs, auth flows

### C) Custom Widgets (Visual/UI Silo)
- **Purpose:** Custom UI not available in FlutterFlow's component library
- **CRITICAL:** Must accept \`width\` and \`height\` parameters (both \`double?\`, nullable) - FlutterFlow injects these
- **Data passing:** Strictly via constructor parameters - no direct access to parent page state
- **FFAppState access:** Only if explicitly passed as parameter, or use FFAppState().update() pattern
- **Editor behavior:** Widget is a "black box" - renders as placeholder in design view until compiled
- **Use when:** Charts, gauges, CustomPainter, complex animations, gesture-heavy interactions
- **Examples:** Radial gauges, custom charts, signature pads, audio visualizers, game elements

### D) Code Files (Classes/Enums/Utilities)
- **Purpose:** Reusable models, enums, utility classes accessible in variable dialogs/action flows
- **PARSER LIMITATIONS (documented by FlutterFlow):**
  * NO generics
  * NO function-typed fields/params
  * NO extensions
- **Translation:** Keep Code Files boring and parse-friendly. Anything "clever" belongs elsewhere.
- **Use when:** Shared utility functions, simple enum definitions, parse-friendly helper classes`;

const FF_TYPE_SYSTEM = `## FLUTTERFLOW TYPE SYSTEM (Parameters)

Only these parameter types work in FlutterFlow's Custom Code UI:
- **Primitives:** String, bool, int, double, Color, DateTime
- **Lists of primitives:** List<String>, List<int>, List<double>, List<bool>
- **FlutterFlow Structs:** \`SomeNameStruct\` or \`List<SomeNameStruct>\` (must exist in FF Data Types)
- **Special types:** DocumentReference, LatLng (only if project uses Firebase/Maps)
- **Action callbacks:** \`Future<dynamic> Function()?\` (Custom Widgets only, for triggering FF actions)

**IMPORTANT:** Never define new Dart model classes for data exchange. If structured data is needed, use FlutterFlow Structs created in Data Types. Custom Dart classes can only be used internally (private) within your code file.`;

const FF_STATE_PATTERNS = `## STATE & DATA: FFAppState Patterns

FlutterFlow's generated \`FFAppState\` is a **global singleton that extends ChangeNotifier**.

### Reading state (non-reactive):
\`\`\`dart
final v = FFAppState().myVar;
\`\`\`

### Writing state (reactive across app):
\`\`\`dart
FFAppState().update(() => FFAppState().myVar = newValue);
\`\`\`
This triggers \`notifyListeners()\` and updates all subscribed pages.

### Returning values from Custom Widgets:
FlutterFlow doesn't directly "pull" values out of widgets. Two patterns:
1. **Callbacks:** Use \`Future<dynamic> Function()?\` action parameters
2. **AppState workaround:** Store result in FFAppState when callback typing is fragile:
\`\`\`dart
FFAppState().update(() {
  FFAppState().localValue = 'setvalue';
});
\`\`\``;

const FF_FORBIDDEN_PATTERNS = `## FORBIDDEN PATTERNS (Will cause immediate build failures)

These patterns are TOXIC in FlutterFlow custom code:
- \`void main()\` or \`main()\` function
- \`runApp()\` call
- \`MaterialApp\` widget
- \`CupertinoApp\` or \`WidgetsApp\`
- \`Scaffold\` widget (unless spec explicitly requires full-screen scaffold, which is rare)
- \`MyApp\` or similar wrapper classes
- ANY \`import\` statements (FlutterFlow manages all imports)
- Custom Dart classes for data models (use FF Structs instead)
- Generics, extensions, or function-typed params in Code Files`;

const FF_REQUIRED_PATTERNS = `## REQUIRED PATTERNS (For FlutterFlow compatibility)

### Null Safety
- 100% null-safe Dart required - no exceptions
- Every nullable input must have explicit defaults or guards
- NEVER use the \`!\` operator unless mathematically proven safe - prefer \`??\` or \`?.\`
- Handle null width/height gracefully in Custom Widgets

### Widget Parameters (Custom Widgets)
- ALWAYS include as first parameters:
  \`\`\`dart
  final double? width;
  final double? height;
  \`\`\`
- Handle null width/height - never assume they have values
- Use LayoutBuilder for size-dependent rendering:
  \`\`\`dart
  LayoutBuilder(
    builder: (context, constraints) {
      final w = widget.width ?? constraints.maxWidth;
      final h = widget.height ?? constraints.maxHeight;
      // Use w and h safely
    }
  )
  \`\`\`

### Theming
- Use \`FlutterFlowTheme.of(context).primary\` instead of \`Colors.blue\`
- Use \`FlutterFlowTheme.of(context).primaryText\` for text colors
- Use \`FlutterFlowTheme.of(context).secondaryBackground\` for surfaces
- Only hardcode colors if intentional and documented

### Callbacks & Actions
- Action callback signature: \`final Future<dynamic> Function()? onSomeAction;\`
- To invoke callbacks: \`widget.onSomeAction?.call();\`
- Do NOT embed navigation/database writes inside widgets - expose Action Parameters

### Resource Management
- ALWAYS dispose() controllers: AnimationController, StreamSubscription, TextEditingController
- Use \`with SingleTickerProviderStateMixin\` or \`TickerProviderStateMixin\` for animations
- Initialize AnimationController in initState(), not in build()
- Use didUpdateWidget() to respond to parameter changes from FlutterFlow`;

const FF_INTEGRATION_GAP_TABLE = `## THE INTEGRATION GAP (What AI generates vs. What FlutterFlow needs)

| Issue | What AI Typically Generates | What FlutterFlow Actually Needs |
|-------|----------------------------|--------------------------------|
| Project Scope | Full app with main() | Fragment/component only |
| Imports | import statements | None (FF manages all imports) |
| Dependencies | Auto-added in code | Manual entry in Project Dependencies UI |
| Data Models | \`class User {...}\` | \`UserStruct\` (FF Data Type) |
| State Access | \`FFAppState()\` directly | Passed as parameter or use update() |
| Colors | \`Colors.blue\` | \`FlutterFlowTheme.of(context).primary\` |
| Callbacks | \`ValueChanged<T>\` | \`Future<dynamic> Function()?\` |
| Widget Sizing | Assumes parent constraints | Must handle null width/height |`;

const FF_TROUBLESHOOTING_CHECKLIST = `## TROUBLESHOOTING CHECKLIST (Fast elimination order)

When something fails, check these in order:
1. **Name mismatch** between FlutterFlow UI and Dart symbol (widget/action/function name)
2. **Parameters mismatch** (including nullability + isList flag in FF UI)
3. **Imports** placed above the boundary (illegal) or missing required imports below it
4. **Missing dependency** in Project Dependencies
5. **Type mismatch** between Struct vs Dart class
6. **FFAppState update not triggering rebuild** - didn't use \`FFAppState().update(() { ... })\`
7. **Web analyzer lies** - if code is correct but editor complains, compile/export/run locally; consider Exclude from Compilation
8. **Callback param type inference issues** (common with Firestore refs) - work around with AppState or JSON/primitive transport`;

// --- NEW SECTIONS COMPLETED BASED ON RESEARCH (DEFINITIVE GUIDE) ---

const FF_PROMPT_PROTOCOL = `## THE "CLEAN ROOM" PROMPT PROTOCOL
Use this preamble for all code generation to ensure FlutterFlow compatibility.

> "Act as a Senior Flutter Developer."
> 1. **Context:** This widget will be injected into a FlutterFlow environment.
> 2. **Constraints:**
>    * **Do NOT use:** \`Scaffold\`, \`MaterialApp\`, \`AppBar\`, or \`SystemChrome\`.
>    * **State:** Keep state local to the widget.
>    * **Data:** Accept \`[DataTypeStruct]\` as a required parameter (replace with Struct, not Class).
>    * **Styling:** Use \`Theme.of(context)\` for colors; do not hardcode hex values.
>    * **Null Safety:** Assume strict null safety.
>    * **Sizing:** Expect \`width\` and \`height\` parameters to be nullable.`;

const FF_WORKFLOW_PROTOCOL = `## TRI-SURFACE INTEGRATION WORKFLOW

### Phase 1: Extraction (From AI/Local to FF)
1. **Isolate Core Class:** Extract only the main \`StatefulWidget\` or \`StatelessWidget\`.
2. **Identify Helpers:** Separate internal data models - these MUST be converted to FlutterFlow Structs.
3. **Capture Imports:** List all \`import package:...\`. These must be manually added to FF Project Dependencies.

### Phase 2: Injection (Into FF)
1. **Prepare Host:** Create Custom Widget in FF with parameters matching the extracted code.
2. **Refactor Name:** Ensure \`class [WidgetName]\` matches the FF Custom Widget name exactly.
3. **Refactor Colors:** Replace \`Colors.red\` with \`FlutterFlowTheme.of(context).error\`.
4. **Refactor Logic:** Convert internal navigation/API calls to \`Future Function()\` callbacks.`;

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
      ["encrypt", "decrypt"]
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
    ["deriveBits", "deriveKey"]
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
    ["encrypt", "decrypt"]
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
    encoder.encode(plaintext)
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
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
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

function hasStoredKey(provider) {
  // Check if we actually have a usable (decrypted) key, not just encrypted data
  const keys = {
    gemini: geminiApiKey,
    anthropic: anthropicApiKey,
    openai: openaiApiKey
  };
  return keys[provider] && keys[provider].length > 0;
}

function hasEnvKey(provider) {
  // Environment keys are not used by default
  return false;
}

// Get current active API keys (for use in API calls)
let geminiApiKey = "";
let anthropicApiKey = "";
let openaiApiKey = "";

async function initializeApiKeys() {
  geminiApiKey = await getApiKey("gemini");
  anthropicApiKey = await getApiKey("anthropic");
  openaiApiKey = await getApiKey("openai");
  updateApiKeyStatusIndicators();
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
  modal.classList.remove("open");
}

async function loadApiKeyInputs() {
  const geminiInput = document.getElementById("gemini-api-key-input");
  const anthropicInput = document.getElementById("anthropic-api-key-input");
  const openaiInput = document.getElementById("openai-api-key-input");

  // Show masked value if key is actually usable (decrypted successfully)
  if (geminiApiKey) {
    geminiInput.value = "";
    geminiInput.placeholder = "Key saved (enter new to replace)";
  } else {
    geminiInput.placeholder = "Enter your Gemini API key";
  }

  if (anthropicApiKey) {
    anthropicInput.value = "";
    anthropicInput.placeholder = "Key saved (enter new to replace)";
  } else {
    anthropicInput.placeholder = "Enter your Claude API key";
  }

  if (openaiApiKey) {
    openaiInput.value = "";
    openaiInput.placeholder = "Key saved (enter new to replace)";
  } else {
    openaiInput.placeholder = "Enter your OpenAI API key";
  }

  updateModalKeyStatuses();
}

function updateModalKeyStatuses() {
  updateKeyStatus("gemini", "gemini-key-status");
  updateKeyStatus("anthropic", "anthropic-key-status");
  updateKeyStatus("openai", "openai-key-status");
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

function updateApiKeyStatusIndicators() {
  const container = document.getElementById("api-keys-status");
  if (!container) return;

  const dots = container.querySelectorAll(".key-status-dot");
  const providers = ["gemini", "anthropic", "openai"];

  dots.forEach((dot, index) => {
    const provider = providers[index];
    if (hasStoredKey(provider)) {
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
}

async function saveApiKeys() {
  const geminiInput = document.getElementById("gemini-api-key-input");
  const anthropicInput = document.getElementById("anthropic-api-key-input");
  const openaiInput = document.getElementById("openai-api-key-input");

  // Only save if user entered a new value
  if (geminiInput.value.trim()) {
    await saveApiKey("gemini", geminiInput.value);
  }
  if (anthropicInput.value.trim()) {
    await saveApiKey("anthropic", anthropicInput.value);
  }
  if (openaiInput.value.trim()) {
    await saveApiKey("openai", openaiInput.value);
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
  }, 1500);
}

async function clearAllApiKeys() {
  if (!confirm("Are you sure you want to clear all stored API keys?")) return;

  localStorage.removeItem(STORAGE_KEY_PREFIX + "gemini");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "anthropic");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "openai");

  // Reinitialize keys (will fall back to env keys)
  await initializeApiKeys();

  // Update UI
  loadApiKeyInputs();
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

// --- CORE API FUNCTIONS ---

async function checkConnection() {
  // Initialize API keys from storage/env
  await initializeApiKeys();

  if (!geminiApiKey) {
    console.warn(
      "Gemini API Key not found. Configure via API Keys settings or .env file"
    );
    return false;
  }
  return true;
}

async function callGemini(
  prompt,
  systemInstruction,
  modelId = PROMPT_ARCHITECT_MODEL
) {
  // Use same-origin proxy to avoid CORS issues
  const url = `/api/gemini/v1beta/models/${modelId}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      maxOutputTokens: 16384,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Gemini call failed:", error);
    if (modelId !== FALLBACK_MODEL) {
      console.log("Trying fallback model...");
      return callGemini(prompt, systemInstruction, FALLBACK_MODEL);
    }
    throw error;
  }
}

async function callClaude(prompt, systemInstruction) {
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key not found");
  }

  // Use proxy to avoid CORS issues
  const url = "/api/anthropic/v1/messages";
  const payload = {
    model: "claude-opus-4-5-20251101",
    max_tokens: 16384,
    system: systemInstruction,
    messages: [{ role: "user", content: prompt }],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API Error:", response.status, errorText);

      // Handle specific error types
      if (errorText.includes("image") || errorText.includes("media")) {
        throw new Error(
          "Claude API error: This model doesn't support image input. Please use Gemini 3.0 Pro for image-based requests."
        );
      }

      if (response.status === 401) {
        throw new Error(
          "Claude API authentication failed. Please check your Anthropic API key in the .env file."
        );
      }

      throw new Error(`Claude API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text;
  } catch (error) {
    console.error("Claude call failed:", error);
    throw error;
  }
}

async function callOpenAI(prompt, systemInstruction) {
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not found");
  }

  // GPT-5-Codex models require the Responses API, not Chat Completions
  const url = "/api/openai/v1/responses";
  
  // Responses API uses 'input' with instructions, not messages array
  // Note: temperature is not supported with codex models
  const payload = {
    model: "gpt-5.1-codex-max",
    instructions: systemInstruction,
    input: prompt,
    max_output_tokens: 16384,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openai-api-key": openaiApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, errorText);

      // Handle specific error types
      if (
        errorText.includes("image") ||
        errorText.includes("vision") ||
        errorText.includes("media")
      ) {
        throw new Error(
          "OpenAI API error: This model doesn't support image input. Please use Gemini 3.0 Pro for image-based requests."
        );
      }

      if (response.status === 401) {
        throw new Error(
          "OpenAI API authentication failed. Please check your OpenAI API key in the .env file."
        );
      }

      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    // Responses API returns output array with reasoning and message objects
    // Find the message object and extract text from content
    const messageOutput = data.output?.find(item => item.type === "message");
    const textContent = messageOutput?.content?.find(c => c.type === "output_text");
    return textContent?.text || "";
  } catch (error) {
    console.error("OpenAI call failed:", error);
    throw error;
  }
}

// --- PIPELINE FUNCTIONS ---

async function runPromptArchitect(userInput) {
  // Derive system instruction from shared template + architect-specific additions
  const architectSpecificInstructions = `## YOUR ROLE

You are a FlutterFlow Integration Architect. Your job is to analyze a user's request and produce a comprehensive, structured JSON specification for a code generator that will create FlutterFlow-compatible Dart code.

You understand the "Parser Gap" - valid Dart can still be invalid to FlutterFlow's stricter parser.

---

## YOUR TASK

Analyze the user's request and output a JSON specification with this exact structure:

{
  "artifactType": "CustomWidget" | "CustomAction" | "CustomFunction" | "CodeFile",
  "artifactName": "ExactNameInPascalCase",
  "rationale": "Why this artifact type is appropriate for this request",
  
  "parameters": [
    {
      "name": "paramName",
      "ffType": "FlutterFlow UI type (e.g., Double, String, Data Type - GaugeZone)",
      "dartType": "Dart type (e.g., double?, String, List<GaugeZoneStruct>)",
      "required": true | false,
      "isList": true | false,
      "defaultHandling": "How null/missing values should be handled"
    }
  ],
  
  "dataTypesRequired": [
    {
      "structName": "NameOfStruct",
      "fields": [
        {"name": "fieldName", "type": "String | int | double | bool | Color | DateTime | List<T>"}
      ],
      "purpose": "What this struct represents"
    }
  ],
  
  "dependencies": {
    "allowed": true | false,
    "packages": ["package_name: ^version"] | [],
    "dartImports": ["dart:math", "dart:convert"] | [],
    "nativeConfigRequired": "Description of any AndroidManifest/Info.plist changes needed, or null",
    "note": "Explanation if dependencies are restricted"
  },
  
  "implementationSpec": {
    "description": "Detailed description of what the code should do",
    "visualRequirements": "For widgets: appearance, colors, layout behavior",
    "behavioralRequirements": "Interactions, animations, state changes",
    "edgeCases": ["List of edge cases to handle"],
    "flutterFlowPatterns": ["Use FlutterFlowTheme.of(context).primary for colors", "other FF-specific patterns"],
    "stateAccessPattern": "none | readonly | reactive (using FFAppState().update())"
  },
  
  "constraints": {
    "artifactSpecific": ["Constraints specific to this artifact type"],
    "nullSafety": ["Null handling requirements"],
    "layoutSafety": ["For widgets: overflow prevention, size handling"],
    "parserSafety": ["For Code Files: no generics, no extensions, no function-typed params"]
  },
  
  "antiPatterns": {
    "mustNotInclude": ["main()", "runApp()", "MaterialApp", "Scaffold", "import statements"],
    "mustNotUse": ["FFAppState() direct access without parameter passing", "hardcoded Colors.*", "ValueChanged<T> callbacks"],
    "reasoning": ["Why each anti-pattern is forbidden in FlutterFlow context"]
  },
  
  "userActionsRequired": {
    "inFlutterFlowUI": ["Create Custom Widget named X", "Add parameters Y, Z in UI", "Add dependency P in Project Settings"],
    "dataTypesToCreate": ["Create Struct named X with fields A, B, C"],
    "configFilesIfNeeded": ["Edit AndroidManifest for permission X"]
  }
}

---

## ARTIFACT-SPECIFIC CONSTRAINT RULES

When artifactType is "CustomFunction":
- dependencies.allowed MUST be false
- dependencies.packages MUST be empty []
- dependencies.note MUST explain "Custom Functions cannot use external packages - pure Dart only"
- antiPatterns.mustNotInclude MUST include any async/await keywords
- No Future return types allowed

When artifactType is "CustomAction":
- Return type MUST be Future<T>
- constraints.artifactSpecific MUST mention "Must use async/await pattern"
- constraints.artifactSpecific MUST mention "Return type is always Future"
- dependencies.allowed is true

When artifactType is "CustomWidget":
- parameters MUST include width (double?, not required) and height (double?, not required) FIRST
- constraints.layoutSafety MUST address null width/height handling
- constraints.layoutSafety MUST mention overflow prevention
- constraints.layoutSafety MUST mention using LayoutBuilder if size-dependent rendering
- implementationSpec.flutterFlowPatterns MUST include FlutterFlowTheme usage
- If stateful, antiPatterns MUST mention proper disposal of controllers
- antiPatterns.mustNotUse MUST include "navigation inside widget" and "database writes inside widget"

When artifactType is "CodeFile":
- constraints.parserSafety MUST include "No generics", "No extensions", "No function-typed params"
- Note that Code Files are for parse-friendly utilities only

---

Output ONLY the raw JSON object. No markdown code fences, no explanatory text, no preamble. Just valid JSON.`;

  const systemInstruction = `${FF_SHARED_CONSTRAINTS}

---

${architectSpecificInstructions}`;

  const prompt = `Analyze this FlutterFlow custom code request and produce a JSON specification:

"${userInput}"

Remember: Output ONLY valid JSON matching the specified structure.`;

  try {
    const result = await callGemini(
      prompt,
      systemInstruction,
      PROMPT_ARCHITECT_MODEL
    );
    return result;
  } catch (error) {
    console.error("Prompt Architect failed:", error);
    throw error;
  }
}

async function runCodeGenerator(masterPrompt, selectedModel) {
  let result;

  // Code Generator specific instructions that extend the shared template
  const codeGeneratorSpecificInstructions = `## YOUR ROLE

You are a Senior Flutter/Dart Engineer specializing in FlutterFlow custom code production. You receive a JSON specification and output ONLY production-ready Dart code that compiles immediately when pasted into FlutterFlow.

You understand that FlutterFlow is the host organism - your code must conform to its rules, not the other way around.

---

## HARD CONSTRAINTS (NON-NEGOTIABLE)

### Boilerplate Mandate
- Do NOT output any import statements - FlutterFlow manages all imports automatically
- Do NOT include comments like "// Automatic FlutterFlow imports" or "// Do not edit above"
- Code will be pasted BELOW FlutterFlow's auto-generated import section
- Class/function name MUST match the "artifactName" from the specification EXACTLY (case-sensitive)

### External Dependencies
- Only use packages explicitly listed in the specification's "dependencies" section
- For Custom Functions: NO external packages whatsoever - this is enforced by FlutterFlow
- All packages must be FlutterFlow-compatible and available on pub.dev
- Allowed Dart SDK imports: dart:math, dart:convert, dart:async, dart:collection, dart:ui
- Remember: user must manually add dependencies in FlutterFlow's Project Dependencies

### Widget Structure Rules
- Prefer StatelessWidget when no internal state is needed
- Use StatefulWidget ONLY for: AnimationController, gesture tracking, local transient UI state
- State class naming convention: \`_ArtifactNameState\` (private, with underscore prefix)
- Use \`with SingleTickerProviderStateMixin\` or \`TickerProviderStateMixin\` for animations

### Layout Safety (Custom Widgets)
- Must render correctly when width and height are null
- Must NOT cause overflow errors - use Flexible, Expanded, or constrained containers
- Clamp values to prevent negative sizes: \`size.clamp(0.0, maxSize)\`
- For CustomPainter, handle edge cases where size is zero

### Animation Best Practices
- Initialize AnimationController in initState(), not in build()
- Always set vsync: this (requires TickerProviderStateMixin)
- Use didUpdateWidget() to respond to parameter changes from FlutterFlow
- Prefer Curves.easeInOut or physics-based curves for natural motion
- Duration should be reasonable (150-500ms for UI, up to 1200ms for dramatic effects)

### Inversion of Control Pattern
- Do NOT navigate inside custom widgets
- Do NOT write to Firestore/databases inside widgets
- Do NOT embed authentication logic in UI components
- Instead: expose Action Parameters (callbacks) so the widget triggers FlutterFlow Action Flows

---

## OUTPUT FORMAT

Output ONLY the complete Dart code. Nothing else.
- No markdown code fences (\`\`\`)
- No "Here's the code:" or similar preamble
- No explanatory comments outside the code
- No trailing explanation
- Just raw, valid Dart code that compiles

The code should paste directly into FlutterFlow's custom code editor and compile without modification.`;

  // Base system instruction derived from shared template
  const baseSystemInstruction = `${FF_SHARED_CONSTRAINTS}

---

${codeGeneratorSpecificInstructions}`;

  // Model-specific instruction adjustments
  const getModelSpecificInstruction = (baseInstruction, model) => {
    const modelTweaks = {
      "claude-4.5-opus": `
ADDITIONAL GUIDANCE FOR THIS MODEL:
- Be extremely precise with Dart syntax
- Prefer explicit type annotations over inference
- Use comprehensive null checks`,

      "gpt-5.1-codex-max": `
ADDITIONAL GUIDANCE FOR THIS MODEL:  
- Focus on code correctness over verbosity
- Ensure all edge cases from the spec are handled
- Double-check parameter types match exactly`,

      "gemini-3.0-pro": `
ADDITIONAL GUIDANCE FOR THIS MODEL:
- Strictly follow the JSON specification structure
- Do not add features not specified in the requirements
- Keep the implementation focused and minimal`,
    };

    const tweak = modelTweaks[model] || modelTweaks["gemini-3.0-pro"];
    return baseInstruction + "\n\n---\n" + tweak;
  };

  const systemInstruction = getModelSpecificInstruction(
    baseSystemInstruction,
    selectedModel
  );

  // Format the master prompt to clearly present the JSON spec
  const formattedPrompt = `Generate FlutterFlow-compatible Dart code based on this specification:

${masterPrompt}

Remember: Output ONLY the raw Dart code. No markdown, no explanations.`;

  try {
    switch (selectedModel) {
      case "claude-4.5-opus":
        result = await callClaude(formattedPrompt, systemInstruction);
        break;
      case "gpt-5.1-codex-max":
        result = await callOpenAI(formattedPrompt, systemInstruction);
        break;
      case "gemini-3.0-pro":
      default:
        result = await callGemini(
          formattedPrompt,
          systemInstruction,
          "gemini-3.0-pro-preview"
        );
        break;
    }
    return result;
  } catch (error) {
    console.error("Code Generator failed:", error);

    // If selected model failed due to API key issues, fallback to Gemini
    if (
      error.message.includes("authentication") ||
      error.message.includes("401")
    ) {
      console.log(
        "Selected model failed due to API key issues, falling back to Gemini 3.0 Pro..."
      );
      try {
        const fallbackInstruction = getModelSpecificInstruction(
          baseSystemInstruction,
          "gemini-3.0-pro"
        );
        result = await callGemini(
          formattedPrompt,
          fallbackInstruction,
          "gemini-3.0-pro-preview"
        );
        return result;
      } catch (fallbackError) {
        console.error("Gemini fallback also failed:", fallbackError);
        throw new Error(
          `All models failed. Original error: ${error.message}. Fallback error: ${fallbackError.message}`
        );
      }
    }

    throw error;
  }
}

async function runCodeDissector(code) {
  // Code Dissector specific instructions that extend the shared template
  const dissectorSpecificInstructions = `## YOUR ROLE

You are an expert FlutterFlow Code Auditor. Your job is to ruthlessly analyze Dart code for compatibility with FlutterFlow's constrained custom code environment.

You understand the "Parser Gap" - FlutterFlow's parser is stricter than Dart itself, and valid Dart can still fail in FlutterFlow.

---

## AUDIT CHECKLIST

### CRITICAL FAILURES (Score: 0 - Will not compile)
Check for and flag:
1. \`void main()\` or \`main()\` function - TOXIC, must be removed
2. \`runApp()\` call - TOXIC, must be removed
3. \`MaterialApp\` widget - TOXIC, this is harness code
4. \`CupertinoApp\` or \`WidgetsApp\` - TOXIC
5. \`Scaffold\` widget (unless spec explicitly requires it) - Usually TOXIC
6. ANY \`import\` statements - FlutterFlow manages these
7. Custom Dart classes for data (e.g., \`class User {}\`) - Should use FF Structs
8. Missing \`width\`/\`height\` parameters for Custom Widgets
9. Generics, extensions, or function-typed params in Code Files (Parser Gap)

### SEVERE WARNINGS (Score: -20 each)
10. External package usage without noting user must add to FF Dependencies
11. Unsafe \`!\` operator usage without null check
12. Direct \`FFAppState()\` access without using \`FFAppState().update()\` for writes
13. Hardcoded \`Colors.*\` instead of \`FlutterFlowTheme.of(context).*\`
14. Wrong callback signature (should be \`Future<dynamic> Function()?\`)
15. Missing \`dispose()\` for AnimationController, StreamSubscription, etc.
16. Navigation or database writes embedded inside widget (should use Action callbacks)
17. \`ValueChanged<T>\` instead of FF-compatible callback signature

### WARNINGS (Score: -10 each)
18. Deprecated Flutter APIs (e.g., \`WillPopScope\` instead of \`PopScope\`)
19. Potential package hallucinations (non-existent or outdated package APIs)
20. No null handling for nullable parameters
21. No \`LayoutBuilder\` for size-dependent widget rendering
22. Potential overflow situations (unbounded sizes)
23. Using \`setState\` in Custom Action (should only be in Widgets)
24. Name mismatch risk (class/function name might not match FF UI expectation)

### GOOD PRACTICES (Score: +5 each)
- Uses \`FlutterFlowTheme.of(context)\` for colors
- Proper null safety with \`??\` and \`?.\` operators  
- Uses FF Struct types (e.g., \`SomeNameStruct\`)
- Proper \`dispose()\` implementation
- Uses \`LayoutBuilder\` for safe sizing
- Correct callback signature for FF Actions
- Uses \`FFAppState().update()\` for reactive state writes
- Follows inversion-of-control pattern (callbacks for actions)

---

## OUTPUT FORMAT

Return your audit in this exact markdown format:

## Overall Score: [0-100]/100
[One sentence summary of code quality for FF integration]

## Critical Issues
[List each critical failure with line reference if possible]
[For each: explain WHY it fails in FlutterFlow and HOW to fix it]

## Warnings
[List each warning with severity]
[Include specific code snippets that need changing]

## Required User Actions in FlutterFlow
[List what the user MUST do in the FlutterFlow UI before this code will work:]
- Dependencies to add (with exact versions if packages are used)
- Data Types/Structs to create (with field names and types)
- Parameters to define in the Custom Code UI (with nullability and isList flags)
- Any Configuration Files to edit (AndroidManifest, Info.plist)

## Code Transformation Needed
[Show before/after for any code that needs changing]
Example:
\`\`\`
// BEFORE (AI-generated)
final ValueChanged<double> onChanged;
// AFTER (FlutterFlow compatible)  
final Future<dynamic> Function()? onValueChanged;
\`\`\`

## Recommendations
[Prioritized list of fixes, most critical first]

---

${FF_TROUBLESHOOTING_CHECKLIST}

---

Be ruthless. FlutterFlow is unforgiving - if the code has ANY critical issue, it will not compile. Your job is to catch everything before the user wastes time debugging in FlutterFlow.`;

  const systemInstruction = `${FF_SHARED_CONSTRAINTS}

---

${dissectorSpecificInstructions}`;

  const prompt = `Perform a comprehensive FlutterFlow integration audit on this Dart code:

\`\`\`dart
${code}
\`\`\`

Check against ALL FlutterFlow constraints. Be thorough and specific.`;

  try {
    const result = await callGemini(
      prompt,
      systemInstruction,
      CODE_DISSECTOR_MODEL
    );
    return result;
  } catch (error) {
    console.error("Code Dissector failed:", error);
    throw error;
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
          language
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
    '<strong class="text-gray-900 font-semibold">$1</strong>'
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
    '<span class="text-red-600 font-bold">$1</span>'
  );
  text = text.replace(
    /\b(WARN|WARNING)\b/g,
    '<span class="text-amber-600 font-bold">$1</span>'
  );
  text = text.replace(
    /\b(PASS|SUCCESS|OK)\b/g,
    '<span class="text-green-600 font-bold">$1</span>'
  );

  return text;
}

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
    3: "Code Dissector",
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
  // Model info display removed in new UI - function kept for compatibility
  const modelNames = {
    "gemini-3.0-pro": "Gemini 3.0 Pro",
    "claude-4.5-opus": "Claude 4.5 Opus",
    "gpt-5.1-codex-max": "GPT-5.1-Codex-Max",
  };
  console.log(`Using model: ${modelNames[selectedModel] || selectedModel}`);
}

// --- MAIN PIPELINE ---

async function runThinkingPipeline() {
  console.log("runThinkingPipeline called");
  if (pipelineState.isRunning) return;

  const userInput = document.getElementById("pipeline-input").value;
  const selectedModel = document.getElementById("code-generator-model").value;

  if (!userInput.trim()) {
    alert("Please describe your FlutterFlow widget first.");
    return;
  }

  // Check for image references in non-Gemini models
  if (
    selectedModel !== "gemini-3.0-pro" &&
    (userInput.toLowerCase().includes("screenshot") ||
      userInput.toLowerCase().includes("image") ||
      userInput.toLowerCase().includes("picture") ||
      userInput.toLowerCase().includes(".png") ||
      userInput.toLowerCase().includes(".jpg") ||
      userInput.toLowerCase().includes(".jpeg") ||
      userInput.toLowerCase().includes(".gif") ||
      userInput.toLowerCase().includes("Screenshot"))
  ) {
    const proceed = confirm(
      "⚠️ Your request mentions images.\n\n" +
        `${selectedModel} doesn't support image input.\n\n` +
        "Use Gemini 3.0 Pro for image-based requests,\n" +
        "or remove image references and continue.\n\n" +
        "Continue anyway?"
    );
    if (!proceed) return;
  }

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

  // Update model info
  updateModelInfo(selectedModel);

  try {
    // Dismiss welcome video and hide ready state, show step 1
    dismissWelcomeVideo();
    const readyState = document.getElementById("ready-state");
    if (readyState) readyState.classList.add("hidden");

    // Step 1: Prompt Architect
    selectWorkflowStep(1);
    showStepLoading(1, true);

    pipelineState.step1Result = await runPromptArchitect(userInput);

    const step1Output = document.getElementById("step1-output");
    const cleanStep1 = extractCodeFromMarkdown(pipelineState.step1Result);
    step1Output.innerHTML = highlightCode(cleanStep1);
    step1Output.dataset.raw = cleanStep1; // Store raw for copy
    showStepLoading(1, false);

    // Step 2: Code Generator
    selectWorkflowStep(2);
    showStepLoading(2, true);

    pipelineState.step2Result = await runCodeGenerator(
      pipelineState.step1Result,
      selectedModel
    );

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.innerHTML = highlightCode(cleanStep2);
    step2Output.dataset.raw = cleanStep2; // Store raw for copy
    showStepLoading(2, false);

    // Step 3: Code Audit
    selectWorkflowStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeDissector(
      pipelineState.step2Result
    );

    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result);

    showStepLoading(3, false);
  } catch (error) {
    console.error("Pipeline failed:", error);

    // Determine which step failed based on the error context
    let errorStep = 1; // Default to step 1
    if (
      error.message.includes("Claude") ||
      error.message.includes("OpenAI") ||
      error.message.includes("Code Generator")
    ) {
      errorStep = 2;
    } else if (error.message.includes("Code Dissector")) {
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
      // Format error message based on type
      let errorMessage = error.message;
      if (error.message.includes("image input")) {
        errorMessage =
          "This model doesn't support image input. Please use Gemini 3.0 Pro for image-based requests or remove image references from your prompt.";
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
    Run Pipeline`;
  }
}

function retryWithDifferentModel() {
  // Show model selection dialog
  const currentModel = document.getElementById("code-generator-model").value;
  const otherModels = [
    "gemini-3.0-pro",
    "claude-4.5-opus",
    "gpt-5.1-codex-max",
  ].filter((model) => model !== currentModel);

  const selectedModel = prompt(
    `Retry with different model?\n\nCurrent: ${currentModel}\n\nOptions:\n1. ${otherModels[0]}\n2. ${otherModels[1]}\n\nEnter 1 or 2:`
  );

  if (selectedModel === "1") {
    document.getElementById("code-generator-model").value = otherModels[0];
    runThinkingPipeline();
  } else if (selectedModel === "2") {
    document.getElementById("code-generator-model").value = otherModels[1];
    runThinkingPipeline();
  }
}

// --- SYNTAX HIGHLIGHTING ---

// Extract code from markdown code blocks (strips ```dart ... ```)
function extractCodeFromMarkdown(text) {
  if (!text) return text;

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
  if (!code) return "";
  try {
    // Strip markdown code fences before highlighting
    const cleanCode = extractCodeFromMarkdown(code);
    return hljs.highlight(cleanCode, { language: language }).value;
  } catch (error) {
    console.warn("Syntax highlighting failed:", error);
    return extractCodeFromMarkdown(code) || "";
  }
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

  // Initialize API keys and check connection
  await checkConnection();
});

// --- WELCOME VIDEO FUNCTIONS ---
function initializeWelcomeVideo() {
  // Always show the welcome video - remove sessionStorage check

  // Ensure video plays when page loads
  const video = document.getElementById("welcome-video-player");
  if (video) {
    // Try to play video, handling autoplay policies
    video.play().catch((e) => {
      console.log(
        "Autoplay prevented, video will play on first user interaction"
      );
      // Add click listener to start video if autoplay blocked
      video.addEventListener(
        "click",
        () => {
          video.play();
        },
        { once: true }
      );
    });
  }
}

function handleWelcomeVideoEnd() {
  // Keep video on final frame until user interaction
  // Video stays paused on last frame
  const video = document.getElementById("welcome-video-player");
  if (video) {
    video.pause();
    // Add click listener to dismiss video
    video.addEventListener("click", dismissWelcomeVideo);
    document.addEventListener("keydown", dismissWelcomeVideo);
  }
}

function dismissWelcomeVideo() {
  const welcomeVideo = document.getElementById("welcome-video");
  const readyState = document.getElementById("ready-state");

  if (welcomeVideo) welcomeVideo.classList.add("hidden");
  if (readyState) readyState.classList.remove("hidden");

  // Clean up event listeners
  const video = document.getElementById("welcome-video-player");
  if (video) {
    video.removeEventListener("click", dismissWelcomeVideo);
  }
  document.removeEventListener("keydown", dismissWelcomeVideo);
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
window.saveApiKeys = saveApiKeys;
window.clearAllApiKeys = clearAllApiKeys;
window.toggleKeyVisibility = toggleKeyVisibility;
window.handleWelcomeVideoEnd = handleWelcomeVideoEnd;
window.dismissWelcomeVideo = dismissWelcomeVideo;
