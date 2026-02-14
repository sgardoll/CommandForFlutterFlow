// --- CONFIGURATION ---
// Environment keys (fallback)
const envGeminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const envAnthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const envOpenaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
const envOpenRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Model Configuration
const PROMPT_ARCHITECT_MODEL = "gemini-3-pro-preview";
const CODE_DISSECTOR_MODEL = "gemini-3-pro-preview";
const FALLBACK_MODEL = "gemini-3-flash-preview";

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

const FF_TYPE_SYSTEM = `## FLUTTERFLOW TYPE SYSTEM (Parameters)

Only these parameter types work in FlutterFlow's Custom Code UI. **ALWAYS Use Simple Types.**

- **Primitives:** String, bool, int, double, Color (nullable), DateTime
- **Lists:** List<String>, List<int>, List<double>, List<bool>, List<ProductStruct>
- **FlutterFlow Structs:** \`SomeNameStruct\` (UpperCamelCase, must exist in FF Data Types)
- **Special types:** DocumentReference, LatLng, FFPlace, FFUploadedFile, Uint8List (Bytes), dynamic (JSON)
- **Action callbacks:** \`Future Function()?\` or \`Future Function(T)?\`
- **Widget Builder:** \`Widget Function(BuildContext)\`

**FORBIDDEN COMPLEX TYPES:**
- ❌ EdgeInsets (use individual doubles: paddingLeft, paddingRight...)
- ❌ Duration (use int milliseconds)
- ❌ TextStyle (break into properties)

**IMPORTANT:** Custom Dart classes for data exchange are now allowed via "Code Files", but Structs are still preferred for parameters visible in the UI builder.`;

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

const FF_FORBIDDEN_PATTERNS = `## FORBIDDEN PATTERNS (Will cause build failures)

- \`void main()\` or \`main()\` function
- \`runApp()\` call
- \`MaterialApp\` or \`Scaffold\` (except rarely)
- Modifying the mandatory header comments or imports ABOVE the "DO NOT REMOVE" line.
- Importing packages without adding them to Project Dependencies (in UI).
- Adding custom imports to Custom Functions (strictly forbidden).
- Using complex parameter types (EdgeInsets, Duration, TextStyle) in Widgets/Actions.
- Using generics or function-typed fields in Code Files.`;

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

function getFlutterFlowEndpoint() {
  return localStorage.getItem('flutterflow_api_endpoint') || 'production';
}

function setFlutterFlowEndpoint(endpoint) {
  if (FF_API_ENDPOINTS[endpoint]) {
    localStorage.setItem('flutterflow_api_endpoint', endpoint);
    return true;
  }
  return false;
}

function hasStoredKey(provider) {
  // Check if we actually have a usable (decrypted) key, not just encrypted data
  const keys = {
    gemini: geminiApiKey,
    anthropic: anthropicApiKey,
    openai: openaiApiKey,
    openrouter: openRouterApiKey,
    flutterflow: flutterflowApiKey,
    flutterflow_project_id: flutterflowProjectId
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
let openRouterApiKey = "";
let flutterflowApiKey = "";
let flutterflowProjectId = "";

async function initializeApiKeys() {
  geminiApiKey = await getApiKey("gemini");
  anthropicApiKey = await getApiKey("anthropic");
  openaiApiKey = await getApiKey("openai");
  openRouterApiKey = await getApiKey("openrouter");
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

function updateWalkthroughUI() {
  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`walkthrough-step${i}`);
    if (stepEl) {
      if (i === walkthroughStep) {
        stepEl.classList.remove("opacity-60", "bg-gray-50", "border-gray-200");
        stepEl.classList.add("bg-blue-50", "border-blue-200");
        const numEl = stepEl.querySelector("div:first-child");
        if (numEl) {
          numEl.classList.remove("bg-gray-400");
          numEl.classList.add("bg-blue-500");
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
        stepEl.classList.remove("bg-blue-50", "border-blue-200", "bg-green-50", "border-green-200");
        const numEl = stepEl.querySelector("div:first-child");
        if (numEl) {
          numEl.classList.remove("bg-blue-500", "bg-green-500");
          numEl.classList.add("bg-gray-400");
          numEl.innerHTML = i;
        }
      }
    }
  }
}

function advanceWalkthrough() {
  if (walkthroughStep < 4) {
    walkthroughStep++;
    updateWalkthroughUI();
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
  const geminiInput = document.getElementById("gemini-api-key-input");
  const anthropicInput = document.getElementById("anthropic-api-key-input");
  const openaiInput = document.getElementById("openai-api-key-input");
  const openRouterInput = document.getElementById("openrouter-api-key-input");
  const flutterflowInput = document.getElementById("flutterflow-api-key-input");
  const projectIdInput = document.getElementById("flutterflow-project-id-input");

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

  if (openRouterApiKey) {
    openRouterInput.value = "";
    openRouterInput.placeholder = "Key saved (enter new to replace)";
  } else {
    openRouterInput.placeholder = "Enter your OpenRouter API key";
  }

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
  updateKeyStatus("gemini", "gemini-key-status");
  updateKeyStatus("anthropic", "anthropic-key-status");
  updateKeyStatus("openai", "openai-key-status");
  updateKeyStatus("openrouter", "openrouter-key-status");
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
  const deploySection = document.getElementById("deploy-section");
  if (!deploySection) return;

  const flutterFlowConfigured = hasStoredKey("flutterflow") && hasStoredKey("flutterflow_project_id");
  const hasGeneratedCode = pipelineState.step2Result && pipelineState.step2Result.length > 0;

  if (flutterFlowConfigured && hasGeneratedCode) {
    deploySection.classList.remove("hidden");
  } else {
    deploySection.classList.add("hidden");
  }
}

function updateApiKeyStatusIndicators() {
  const container = document.getElementById("api-keys-status");
  if (!container) return;

  const dots = container.querySelectorAll(".key-status-dot");
  const providers = ["gemini", "anthropic", "openai", "openrouter", "flutterflow"];
  
  dots.forEach((dot, index) => {
    const provider = providers[index];
    if (provider === "flutterflow") {
      // For FlutterFlow, check both API key and Project ID
      if (hasStoredKey("flutterflow") && hasStoredKey("flutterflow_project_id")) {
        dot.className = "key-status-dot configured";
        dot.title = "FlutterFlow (Fully configured)";
      } else if (hasStoredKey("flutterflow") || hasStoredKey("flutterflow_project_id")) {
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
  const geminiInput = document.getElementById("gemini-api-key-input");
  const anthropicInput = document.getElementById("anthropic-api-key-input");
  const openaiInput = document.getElementById("openai-api-key-input");
  const openRouterInput = document.getElementById("openrouter-api-key-input");
  const flutterflowInput = document.getElementById("flutterflow-api-key-input");
  const projectIdInput = document.getElementById("flutterflow-project-id-input");

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
  if (openRouterInput.value.trim()) {
    await saveApiKey("openrouter", openRouterInput.value);
  }
  // Validate FlutterFlow credentials if entered
  if (flutterflowInput.value.trim()) {
    if (!validateFlutterFlowApiKey(flutterflowInput.value)) {
      alert("Invalid FlutterFlow API Key format. API keys should be at least 20 characters and contain only letters, numbers, underscores, and dashes.");
      flutterflowInput.focus();
      return;
    }
    await saveApiKey("flutterflow", flutterflowInput.value);
  }
  if (projectIdInput.value.trim()) {
    if (!validateFlutterFlowProjectId(projectIdInput.value)) {
      alert("Invalid FlutterFlow Project ID format. Project IDs should be at least 5 characters and contain only letters, numbers, and dashes.");
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

  localStorage.removeItem(STORAGE_KEY_PREFIX + "gemini");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "anthropic");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "openai");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "openrouter");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow");
  localStorage.removeItem(STORAGE_KEY_PREFIX + "flutterflow_project_id");

  // Reinitialize keys (will fall back to env keys)
  await initializeApiKeys();

  // Update UI
  loadApiKeyInputs();
}

// --- FLUTTERFLOW CREDENTIAL VALIDATION ---

function validateFlutterFlowApiKey(key) {
  // FF API keys are typically long alphanumeric strings
  // Basic validation: non-empty, reasonable length (min 20 chars), no spaces
  if (!key || key.trim().length < 20) return false;
  if (key.includes(' ')) return false;
  return /^[a-zA-Z0-9_-]+$/.test(key);
}

function validateFlutterFlowProjectId(projectId) {
  // FF Project IDs are alphanumeric with dashes, typically format: name-1234-abcd
  if (!projectId || projectId.trim().length < 5) return false;
  if (projectId.includes(' ')) return false;
  return /^[a-zA-Z0-9-]+$/.test(projectId);
}

function updateInputValidationState(inputId, isValid) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (!input.value) {
    input.style.borderColor = ''; // Reset to default
  } else if (isValid) {
    input.style.borderColor = '#22c55e'; // Green
  } else {
    input.style.borderColor = '#ef4444'; // Red
  }
}

function showValidationError(errorId, show) {
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.style.display = show ? 'block' : 'none';
  }
}

function setupFlutterFlowValidation() {
  const apiKeyInput = document.getElementById('flutterflow-api-key-input');
  const projectIdInput = document.getElementById('flutterflow-project-id-input');
  
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', (e) => {
      const isValid = validateFlutterFlowApiKey(e.target.value);
      updateInputValidationState('flutterflow-api-key-input', isValid);
      showValidationError('flutterflow-api-key-error', e.target.value && !isValid);
    });
    // Add blur event to fetch projects when key is valid
    apiKeyInput.addEventListener('blur', debounce(async (e) => {
      const key = e.target.value.trim();
      if (key && validateFlutterFlowApiKey(key)) {
        await fetchProjects(key);
      }
    }, 500));
  }
  
  if (projectIdInput) {
    projectIdInput.addEventListener('input', (e) => {
      const isValid = validateFlutterFlowProjectId(e.target.value);
      updateInputValidationState('flutterflow-project-id-input', isValid);
      showValidationError('flutterflow-project-id-error', e.target.value && !isValid);
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
  const container = document.getElementById('flutterflow-projects-container');
  const select = document.getElementById('flutterflow-projects-select');
  const errorElement = document.getElementById('flutterflow-projects-error');
  
  if (!container || !select) {
    console.error('Projects dropdown elements not found');
    return;
  }
  
  // Show loading state
  container.classList.remove('hidden');
  select.innerHTML = '<option value="">Loading projects...</option>';
  if (errorElement) errorElement.classList.add('hidden');
  
  try {
    // Create temporary client instance (no project ID needed)
    const client = new FlutterFlowApiClient(apiKey, '');
    const projects = await client.listProjects();
    
    if (!projects || projects.length === 0) {
      select.innerHTML = '<option value="">No projects found</option>';
      return;
    }
    
    // Populate dropdown
    select.innerHTML = '<option value="">Select a project...</option>';
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id || project.projectId || '';
      option.textContent = project.name || project.projectName || `Project ${project.id}`;
      select.appendChild(option);
    });
    
    // Connect selection to Project ID input
    select.addEventListener('change', () => {
      const projectIdInput = document.getElementById('flutterflow-project-id-input');
      if (projectIdInput && select.value) {
        projectIdInput.value = select.value;
        // Trigger validation
        projectIdInput.dispatchEvent(new Event('input'));
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    select.innerHTML = '<option value="">Error loading projects</option>';
    if (errorElement) {
      errorElement.textContent = `Failed to load projects: ${error.message}`;
      errorElement.classList.remove('hidden');
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

async function callOpenRouter(prompt, systemInstruction, modelId) {
  if (!openRouterApiKey) {
    throw new Error("OpenRouter API key not found");
  }

  // Handle model mapping
  let actualModel = "openrouter/auto"; // Default for auto-router
  
  if (modelId === "openrouter-free") {
    actualModel = "google/gemma-2-9b-it:free";
  } else if (modelId === "openrouter-auto") {
    actualModel = "openrouter/auto";
  } else if (modelId.startsWith("openrouter/")) {
    actualModel = modelId;
  }

  const url = "https://openrouter.ai/api/v1/chat/completions";
  
  const payload = {
    model: actualModel,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ],
    max_tokens: 16384,
    temperature: 0.7,
    // Add HTTP referer and X-Title for OpenRouter rankings/stats
    // These are recommended by OpenRouter
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": window.location.href, // Site URL for rankings
        "X-Title": "FlutterFlow Custom Code Command", // Site title for rankings
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", response.status, errorText);

      if (response.status === 401) {
        throw new Error(
          "OpenRouter API authentication failed. Please check your OpenRouter API key."
        );
      }

      throw new Error(`OpenRouter API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenRouter call failed:", error);
    throw error;
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
  production: 'https://api.flutterflow.io/v1',
  staging: 'https://api.flutterflow.io/v1-staging',
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
  constructor(apiKey, projectId, branchName = 'main', endpoint = 'production') {
    this.apiKey = apiKey;
    this.baseUrl = FF_API_ENDPOINTS[endpoint] || FF_API_ENDPOINTS.production;
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
    return this._branchName === 'main' ? '' : this._branchName;
  }

  /**
   * Pulls code from FlutterFlow and returns it as a structured object.
   * @returns {Promise<Object>} Object containing file contents mapped by path
   */
  async pullCode() {
    console.log(`Pulling code from FlutterFlow project: ${this.projectId}, branch: ${this.branchName || 'main'}`);

    try {
      const response = await fetch(`${this.baseUrl}/exportCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
      console.error('Error pulling code from FlutterFlow:', error);
      throw error;
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
    const endpoints = ['production', 'staging'];
    const startEndpoint = Math.max(0, endpoints.indexOf(this._endpoint));
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      for (let ei = startEndpoint; ei < endpoints.length; ei++) {
        const endpoint = endpoints[ei];
        const baseUrl = FF_API_ENDPOINTS[endpoint];
        
        try {
          console.log(`Push attempt ${attempt + 1} to ${endpoint}: ${baseUrl}/syncCustomCodeChanges`);
          console.log('Request:', JSON.stringify(pushCodeRequest, null, 2));
          const response = await fetch(`${baseUrl}/syncCustomCodeChanges`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(pushCodeRequest),
          });
          
          if (response.ok) {
            console.log(`Push to ${endpoint} succeeded!`);
            return response;
          }
          
          const responseText = await response.text();
          console.log(`Push to ${endpoint} returned ${response.status}: ${responseText}`);
          
          if (response.status === 500) {
            console.warn(`Endpoint ${endpoint} returned 500, trying next...`);
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          
          // For other errors, return the response to be handled by caller
          return response;
        } catch (error) {
          console.warn(`Push to ${endpoint} failed: ${error.message}, trying next...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw new Error('All API endpoints failed after retries');
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
        const response = await fetch('https://api.flutterflow.io/v2/l/listProjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            project_type: 'ALL',
            deserialize_response: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`List projects failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Handle the specific FlutterFlow API wrapper format:
        // { success: true, value: "{\"entries\": [...]}" }
        if (data.success && typeof data.value === 'string') {
          try {
            const parsedValue = JSON.parse(data.value);
            if (parsedValue && Array.isArray(parsedValue.entries)) {
              // Map to standard format: { id, name }
              return parsedValue.entries.map(entry => ({
                id: entry.id,
                name: entry.project?.name || entry.id
              }));
            }
          } catch (parseError) {
            console.error('Failed to parse stringified project value:', parseError);
          }
        }

        // Fallback for other potential formats
        const projects = data.projects || data.items || data.entries || (Array.isArray(data) ? data : []);
        return Array.isArray(projects) ? projects : [];
      } catch (error) {
        console.error('Error listing projects:', error);
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
    // API returned error status
    return {
      success: false,
      responseCode: response.status,
      errorMessage: jsonResult.message || `HTTP ${response.status}`,
      errorMap: jsonResult.errors ? new Map(Object.entries(jsonResult.errors)) : new Map(),
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
    401: 'Authentication failed. Please check your FlutterFlow API key.',
    403: 'Access denied. You may not have permission to modify this project.',
    404: 'Project not found. Please check your Project ID.',
    409: 'Conflict detected. The project may have been modified elsewhere.',
    422: `Validation failed: ${message || 'Invalid request format'}`,
    429: 'Rate limit exceeded. Please try again in a few minutes.',
    500: 'FlutterFlow server error. Please try again later.',
    503: 'FlutterFlow service temporarily unavailable.',
  };
  
  return errorMessages[statusCode] || `FlutterFlow API error: ${message || `HTTP ${statusCode}`}`;
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
  ACTION: 'A',
  WIDGET: 'W',
  FUNCTION: 'F',
  DEPENDENCIES: 'D',
  OTHER: 'O',
};

/**
 * Detects the type of custom code based on file name and content.
 * @param {string} fileName - Name of the file
 * @param {string} [content] - Optional file content for additional detection
 * @returns {string} Code type (A, W, F, D, or O)
 */
function detectCodeType(fileName, content = '') {
  if (fileName === 'pubspec.yaml') {
    return CodeType.DEPENDENCIES;
  }
  
  if (!fileName.endsWith('.dart') || fileName.endsWith('index.dart')) {
    return CodeType.OTHER;
  }
  
  if (fileName === 'custom_functions.dart') {
    return CodeType.FUNCTION;
  }
  
  if (content) {
    if (content.includes('extends State') || content.includes('StatefulWidget')) {
      if (content.includes('Future') && content.includes('BuildContext')) {
        return CodeType.ACTION;
      }
      return CodeType.WIDGET;
    }
    
    if (content.match(/^\s*(String|int|double|bool|List|Map|dynamic|void)\s+\w+\s*\(/m)) {
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
      return 'lib/flutter_flow/custom_functions.dart';
    case CodeType.DEPENDENCIES:
      return 'pubspec.yaml';
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
  const baseName = fileName.replace(/\.dart$/, '')
  if (codeType === CodeType.WIDGET) {
    // PascalCase - first letter of each word uppercase
    return baseName.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())
  }
  if (codeType === CodeType.ACTION) {
    // camelCase - first word lowercase, rest uppercase
    const pascal = baseName.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }
  if (codeType === CodeType.FUNCTION) {
    return 'CustomFunctions'
  }
  if (codeType === CodeType.DEPENDENCIES) {
    return 'pubspec.yaml'
  }
  return baseName
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
  const apiFileMap = {}
  for (const [name, info] of fileMap.entries()) {
    // Skip pubspec.yaml - the VS Code extension filters out DEPENDENCIES type
    if (info.type === CodeType.DEPENDENCIES) continue
    const identifierName = deriveIdentifierName(name, info.type)
    apiFileMap[name] = {
      old_identifier_name: identifierName,
      new_identifier_name: identifierName,
      type: info.type,
      is_deleted: false,
    }
  }
  return JSON.stringify(apiFileMap)
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
  return filePath.split('/').pop();
}

// --- PUBSPEC.YAML UTILITIES ---

/**
 * Creates a default pubspec.yaml structure for FlutterFlow.
 * @returns {Object} Default pubspec.yaml structure
 */
function createDefaultPubspec() {
  const pubspec = {
    name: 'flutter_flow_custom_code',
    description: 'Custom code for FlutterFlow project',
    version: '1.0.0',
    environment: {
      sdk: '>=3.0.0 <4.0.0',
    },
    dependencies: {
      flutter: {
        sdk: 'flutter',
      },
    },
    dev_dependencies: {
      flutter_test: {
        sdk: 'flutter',
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

  const lines = yamlContent.split('\n');

  for (const line of lines) {
    // Check if we're entering dependencies section
    if (line.trim() === 'dependencies:') {
      inDependencies = true;
      currentIndent = line.search(/\S/);
      continue;
    }

    // Check if we're leaving dependencies section (new section at same or lower indent)
    if (inDependencies) {
      const indent = line.search(/\S/);
      if (line.trim() && indent <= currentIndent && line.trim().endsWith(':')) {
        inDependencies = false;
        continue;
      }

      // Parse dependency line
      if (line.trim() && !line.trim().startsWith('#')) {
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
    if (name === 'flutter') continue;
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
  lines.push('');

  // Add environment
  lines.push('environment:');
  for (const [key, value] of Object.entries(pubspec.environment)) {
    lines.push(`  ${key}: ${value}`);
  }
  lines.push('');

  // Add dependencies
  lines.push('dependencies:');
  for (const [name, value] of Object.entries(pubspec.dependencies)) {
    if (typeof value === 'object' && value !== null) {
      lines.push(`  ${name}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`    ${k}: ${v}`);
      }
    } else {
      lines.push(`  ${name}: ${value || ''}`);
    }
  }
  lines.push('');

  // Add dev_dependencies if present
  if (pubspec.dev_dependencies) {
    lines.push('dev_dependencies:');
    for (const [name, value] of Object.entries(pubspec.dev_dependencies)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`  ${name}:`);
        for (const [k, v] of Object.entries(value)) {
          lines.push(`    ${k}: ${v}`);
        }
      } else {
        lines.push(`  ${name}: ${value || ''}`);
      }
    }
    lines.push('');
  }

  // Add flutter section
  if (pubspec.flutter) {
    lines.push('flutter:');
    for (const [key, value] of Object.entries(pubspec.flutter)) {
      if (typeof value === 'boolean') {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }

  return lines.join('\n');
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
    warnings.push('Code file is large (>50KB). This may take longer to commit.');
  }
  if (codeInfo.content.length > 100000) {
    issues.push('Code file is too large (>100KB). Consider splitting into smaller components.');
  }
  
  const lineCount = codeInfo.content.split('\n').length;
  if (lineCount > 500) {
    warnings.push(`Code has ${lineCount} lines. Consider breaking it into smaller widgets.`);
  }
  
  if (codeInfo.content.includes('setState') && codeInfo.codeType === CodeType.ACTION) {
    warnings.push('Using setState in a Custom Action may not work as expected. Consider using a Custom Widget.');
  }
  
  if (codeInfo.content.includes('dynamic') && !codeInfo.content.includes('?')) {
    warnings.push('Code uses "dynamic" types. Consider adding explicit types for better null safety.');
  }
  
  if (codeInfo.content.match(/Color\(0xFF[0-9A-Fa-f]{6}\)/)) {
    warnings.push('Code contains hardcoded colors. Consider using FlutterFlowTheme.of(context) for theme consistency.');
  }
  
  const printMatches = codeInfo.content.match(/print\s*\(/g);
  if (printMatches && printMatches.length > 3) {
    warnings.push(`Code contains ${printMatches.length} print statements. Consider removing debug prints before committing.`);
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
          Lines: <strong>${codeInfo.content.split('\n').length}</strong>
        </p>
      </div>
  `;
  
  if (checks.warnings.length > 0) {
    summaryHtml += `
      <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
        <h4 class="font-medium text-yellow-800 text-sm">Warnings (${checks.warnings.length})</h4>
        <ul class="text-xs text-yellow-700 mt-2 space-y-1">
          ${checks.warnings.map(w => `<li>• ${w}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (checks.issues.length > 0) {
    summaryHtml += `
      <div class="bg-red-50 border border-red-200 rounded p-3">
        <h4 class="font-medium text-red-800 text-sm">Issues (${checks.issues.length})</h4>
        <ul class="text-xs text-red-700 mt-2 space-y-1">
          ${checks.issues.map(i => `<li>• ${i}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  summaryHtml += '</div>';
  
  console.log('Pre-commit summary:', summaryHtml);
  
  if (!checks.canProceed) {
    return false;
  }
  
  if (checks.warnings.length > 0) {
    return confirm(`Found ${checks.warnings.length} warning(s). Proceed with commit?\n\n${checks.warnings.join('\n')}`);
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
  const { artifactType = 'CustomWidget', artifactName = 'GeneratedCode' } = options;
  
  // Clean up the code
  let cleanedCode = rawCode.trim();
  
  // Remove markdown code fences if present
  if (cleanedCode.startsWith('```dart')) {
    cleanedCode = cleanedCode.replace(/^```dart\n/, '');
  } else if (cleanedCode.startsWith('```')) {
     cleanedCode = cleanedCode.replace(/^```\n/, '');
  }
  
  if (cleanedCode.endsWith('```')) {
    cleanedCode = cleanedCode.replace(/\n```$/, '');
  }
  
  // Ensure proper class/function naming
  let fileName = artifactName;
  if (!fileName.endsWith('.dart')) {
    fileName += '.dart';
  }
  
  // Determine code type from artifact type
  let codeType = CodeType.OTHER;
  switch (artifactType) {
    case 'CustomAction':
      codeType = CodeType.ACTION;
      break;
    case 'CustomWidget':
      codeType = CodeType.WIDGET;
      break;
    case 'CustomFunction':
      codeType = CodeType.FUNCTION;
      fileName = 'custom_functions.dart';
      break;
    case 'CodeFile':
      // Code Files are treated as Actions for file structure purposes
      // They live in lib/custom_code/actions/
      codeType = CodeType.ACTION;
      break;
  }
  
  // Add mandatory FlutterFlow header (matching VS-Code-Extension pattern)
  let header = '';
  if (codeType === CodeType.WIDGET) {
    header = `// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'index.dart';
import '/custom_code/actions/index.dart';
import '/flutter_flow/custom_functions.dart';
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!

`;
  } else if (codeType === CodeType.ACTION) {
    header = `// Automatic FlutterFlow imports
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'index.dart';
import '/flutter_flow/custom_functions.dart';
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
import '/flutter_flow/custom_functions.dart';

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
    { name: 'flutter_animate', pattern: /flutter_animate/ },
    { name: 'google_fonts', pattern: /google_fonts/ },
    { name: 'flutter_svg', pattern: /flutter_svg/ },
    { name: 'http', pattern: /package:http\b/ },
    { name: 'intl', pattern: /package:intl\b/ },
    { name: 'collection', pattern: /package:collection\b/ },
    { name: 'rxdart', pattern: /package:rxdart\b/ },
    { name: 'timeago', pattern: /package:timeago\b/ },
    { name: 'url_launcher', pattern: /package:url_launcher\b/ },
    { name: 'cloud_firestore', pattern: /package:cloud_firestore\b/ },
    { name: 'firebase_auth', pattern: /package:firebase_auth\b/ },
    { name: 'flutter_tts', pattern: /package:flutter_tts\b/ },
    { name: 'percent_indicator', pattern: /package:percent_indicator\b/ },
    { name: 'fl_chart', pattern: /package:fl_chart\b/ },
    { name: 'cached_network_image', pattern: /package:cached_network_image\b/ },
    { name: 'image_picker', pattern: /package:image_picker\b/ },
    { name: 'file_picker', pattern: /package:file_picker\b/ },
    { name: 'shared_preferences', pattern: /package:shared_preferences\b/ },
    { name: 'sqflite', pattern: /package:sqflite\b/ },
    { name: 'path_provider', pattern: /package:path_provider\b/ },
    { name: 'uuid', pattern: /package:uuid\b/ },
    { name: 'xml', pattern: /package:xml\b/ },
    { name: 'html', pattern: /package:html\b/ },
    { name: 'csv', pattern: /package:csv\b/ },
    { name: 'pdf', pattern: /package:pdf\b/ },
    { name: 'printing', pattern: /package:printing\b/ },
    { name: 'flutter_local_notifications', pattern: /package:flutter_local_notifications\b/ },
    { name: 'geolocator', pattern: /package:geolocator\b/ },
    { name: 'geocoding', pattern: /package:geocoding\b/ },
    { name: 'firebase_core', pattern: /package:firebase_core\b/ },
    { name: 'firebase_storage', pattern: /package:firebase_storage\b/ },
    { name: 'firebase_messaging', pattern: /package:firebase_messaging\b/ },
    { name: 'cloud_functions', pattern: /package:cloud_functions\b/ },
    { name: 'firebase_analytics', pattern: /package:firebase_analytics\b/ },
    { name: 'stripe_checkout', pattern: /package:stripe_checkout\b/ },
    { name: 'pay', pattern: /package:pay\b/ },
    { name: 'in_app_purchase', pattern: /package:in_app_purchase\b/ },
    { name: 'audioplayers', pattern: /package:audioplayers\b/ },
    { name: 'just_audio', pattern: /package:just_audio\b/ },
    { name: 'video_player', pattern: /package:video_player\b/ },
    { name: 'chewie', pattern: /package:chewie\b/ },
    { name: 'flutter_rating_bar', pattern: /package:flutter_rating_bar\b/ },
    { name: 'shimmer', pattern: /package:shimmer\b/ },
    { name: 'carousel_slider', pattern: /package:carousel_slider\b/ },
    { name: 'flutter_staggered_grid_view', pattern: /package:flutter_staggered_grid_view\b/ },
    { name: 'smooth_page_indicator', pattern: /package:smooth_page_indicator\b/ },
    { name: 'qr_flutter', pattern: /package:qr_flutter\b/ },
    { name: 'barcode_widget', pattern: /package:barcode_widget\b/ },
    { name: 'qr_code_scanner', pattern: /package:qr_code_scanner\b/ },
    { name: 'lottie', pattern: /package:lottie\b/ },
    { name: 'rive', pattern: /package:rive\b/ },
  ];
  
  for (const { name, pattern } of packagePatterns) {
    if (pattern.test(code)) {
      deps[name] = '^1.0.0';
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
    generatedFrom: pipelineResult.step1Result ? 'pipeline' : 'direct',
    model: pipelineResult.selectedModel || 'unknown',
    codeSize: codeInfo.content.length,
  };
}

/**
 * Validates a Dart file for FlutterFlow compatibility.
 * @param {string} fileName - Name of the file
 * @param {string} content - File content
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateDartFile(fileName, content) {
  const errors = [];
  
  // Check for forbidden patterns in FlutterFlow
  const forbiddenPatterns = [
    { pattern: /void\s+main\s*\(/, message: 'Contains main() function - not allowed in FlutterFlow' },
    { pattern: /runApp\s*\(/, message: 'Contains runApp() - not allowed in FlutterFlow' },
    { pattern: /MaterialApp\s*\(/, message: 'Contains MaterialApp - not allowed in FlutterFlow' },
    { pattern: /Scaffold\s*\(/, message: 'Contains Scaffold - usually not needed in FlutterFlow widgets' },
  ];
  
  // Validate imports based on artifact type
  const isCustomFunction = fileName.includes('custom_functions') || fileName.includes('functions');
  const importRegex = /^\s*import\s+['"]([^'"]+)['"]/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const isAllowedFFImport = 
      importPath.startsWith('/flutter_flow/') ||
      importPath.startsWith('/backend/') ||
      importPath.startsWith('/custom_code/') ||
      importPath === 'index.dart' ||
      importPath === 'package:flutter/material.dart' ||
      importPath === 'package:flutter/services.dart';
    const isDartSdkImport = 
      importPath.startsWith('dart:') ||
      importPath.startsWith('package:');
    
    if (isCustomFunction) {
      // Custom Functions: only dart: imports allowed (no external packages)
      if (!importPath.startsWith('dart:')) {
        errors.push(`Custom Functions cannot use '${importPath}' - only Dart SDK imports allowed`);
      }
    } else {
      // Widgets/Actions: allow FF imports + dart: + flutter packages
      if (!isAllowedFFImport && !isDartSdkImport) {
        errors.push(`Unknown import '${importPath}' - use FlutterFlow managed imports`);
      }
    }
  }
  
  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(message);
    }
  }
  
  // Check for required patterns in widgets
  if (fileName.endsWith('.dart') && !fileName.includes('functions')) {
    // Check for null safety
    if (content.includes('!') && !content.includes('??')) {
      // Has bang operator but no null coalescing - potential null safety issue
      // This is just a warning, not an error
    }
  }
  
  // Check for class definition
  if (!content.match(/class\s+\w+/)) {
    errors.push('No class definition found');
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
  if (!content.includes('name:')) {
    errors.push('pubspec.yaml missing name field');
  }
  
  if (!content.includes('dependencies:')) {
    errors.push('pubspec.yaml missing dependencies section');
  }
  
  // Check for Flutter SDK
  if (!content.includes('flutter:') && !content.includes('sdk: flutter')) {
    errors.push('pubspec.yaml missing Flutter SDK dependency');
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
    errors.push('No files to commit');
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
    if (path.endsWith('.dart')) {
      const result = validateDartFile(path, fileInfo.content);
      if (!result.valid) {
        errors.push(...result.errors.map(e => `${path}: ${e}`));
      }
    }
    
    // Validate pubspec
    if (path === 'pubspec.yaml') {
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
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  VALIDATING: 'VALIDATING',
  PUSHING: 'PUSHING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
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
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('commitStateChange', { 
        detail: { state, commitState: this } 
      }));
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
    return this.currentState === CommitState.PREPARING ||
           this.currentState === CommitState.VALIDATING ||
           this.currentState === CommitState.PUSHING;
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
  let { codeType = 'W' } = options;
  const { pubspecDeps = {} } = options;

  // Validate/fix codeType if passed as full string
  if (codeType === 'CustomWidget') codeType = CodeType.WIDGET;
  if (codeType === 'CustomAction') codeType = CodeType.ACTION;
  if (codeType === 'CustomFunction') codeType = CodeType.FUNCTION;
  if (codeType === 'CodeFile') codeType = CodeType.ACTION;
  
  // Reset and start
  commitState.reset();
  commitState.setState(CommitState.PREPARING);
  
  try {
    // Get credentials
    const apiKey = await getApiKey('flutterflow');
    const projectId = await getApiKey('flutterflow_project_id');
    
    if (!apiKey || !projectId) {
      throw new Error('FlutterFlow credentials not configured. Please set your API key and Project ID in the API Keys settings.');
    }
    
    // Validate format
    if (!validateFlutterFlowApiKey(apiKey)) {
      throw new Error('Invalid FlutterFlow API Key format.');
    }
    if (!validateFlutterFlowProjectId(projectId)) {
      throw new Error('Invalid FlutterFlow Project ID format.');
    }
    
    // Create API client with endpoint
    const endpoint = getFlutterFlowEndpoint();
    const apiClient = new FlutterFlowApiClient(apiKey, projectId, 'main', endpoint);
    
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
      throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
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
    fileMapWithPubspec.set('pubspec.yaml', {
      content: serializedYaml,
      type: 'D',
      path: 'pubspec.yaml'
    });
    
    const zippedCustomCode = await createZipFromFileMap(fileMapWithPubspec);
    
    const pushRequest = {
      project_id: projectId,
      zipped_custom_code: zippedCustomCode,
      uid: `web_${Date.now()}`,
      branch_name: apiClient.branchName,
      serialized_yaml: serializedYaml,
      file_map: fileMapContents,
      functions_map: '{}',
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
        warnings: result.errorMap && result.errorMap.size > 0 
          ? Array.from(result.errorMap.entries()) 
          : [],
      });
    } else {
      const errorMsg = result.errorMessage || getFlutterFlowErrorMessage(result.responseCode);
      throw new Error(errorMsg);
    }
    
    return {
      success: true,
      message: `Successfully committed ${fileName} to FlutterFlow project ${projectId}`,
      warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
    };
    
  } catch (error) {
    console.error('Commit failed:', error);
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
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    return zipBuffer;
  } catch (error) {
    console.error('Error creating zip:', error);
    return '';
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
    console.log('Detected dependencies:', deps);
    
    // Step 3: Validate FlutterFlow credentials
    commitState.setState(CommitState.VALIDATING);
    const apiKey = await getApiKey('flutterflow');
    const projectId = await getApiKey('flutterflow_project_id');
    
    if (!apiKey) {
      throw new Error('FlutterFlow API Key not configured. Please add it in API Keys settings.');
    }
    if (!projectId) {
      throw new Error('FlutterFlow Project ID not configured. Please add it in API Keys settings.');
    }
    
    // Step 4: Validate API key format
    if (!validateFlutterFlowApiKey(apiKey)) {
      throw new Error('Invalid FlutterFlow API Key format.');
    }
    if (!validateFlutterFlowProjectId(projectId)) {
      throw new Error('Invalid FlutterFlow Project ID format.');
    }
    
    // Step 5: Prepare file map
    const fileMap = new Map();
    fileMap.set(codeInfo.fileName, {
      content: codeInfo.content,
      type: codeInfo.codeType,
      path: getFilePathForCodeType(codeInfo.fileName, codeInfo.codeType),
    });
    
    commitState.setProgress(0, fileMap.size);
    
    // Step 6: Validate files
    const validation = validateFileMap(fileMap);
    if (!validation.valid) {
      throw new Error(`File validation failed:\n${validation.errors.join('\n')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Validation warnings:', validation.warnings);
    }
    
    // Step 7: Prepare pubspec with dependencies
    // createDefaultPubspec returns an object, no need to JSON.parse
    let pubspec = createDefaultPubspec();
    
    // Add default flutter dependency
    if (!pubspec.dependencies) pubspec.dependencies = {};
    if (!pubspec.dependencies.flutter) pubspec.dependencies.flutter = { sdk: 'flutter' };
    
    if (Object.keys(deps).length > 0) {
      pubspec = mergeDependencies(pubspec, deps);
    }
    const serializedYaml = serializePubspecToYaml(pubspec);
    
    const fileMapContents = buildApiFileMap(fileMap);
    
    const fileMapWithPubspec = new Map(fileMap);
    fileMapWithPubspec.set('pubspec.yaml', {
      content: serializedYaml,
      type: 'D',
      path: 'pubspec.yaml'
    });
    
    commitState.setState(CommitState.PUSHING);
    const endpoint = getFlutterFlowEndpoint();
    const apiClient = new FlutterFlowApiClient(apiKey, projectId, 'main', endpoint);
    
    const zippedCustomCode = await createZipFromFileMap(fileMapWithPubspec);
    
    const pushRequest = {
      project_id: projectId,
      zipped_custom_code: zippedCustomCode,
      uid: `web_${Date.now()}`,
      branch_name: apiClient.branchName,
      serialized_yaml: serializedYaml,
      file_map: fileMapContents,
      functions_map: '{}',
    };
    
    commitState.setProgress(1, fileMap.size);
    
    const response = await apiClient.pushCode(pushRequest);
    const result = await parsePushCodeResponse(response);
    
    // Step 10: Handle result
    if (result.success) {
      const metadata = buildCommitMetadata(codeInfo, pipelineResult);
      
      commitState.setSuccess({
        ...metadata,
        fileCount: fileMap.size,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
      });
      
      return {
        success: true,
        message: `Successfully committed ${codeInfo.fileName} to FlutterFlow`,
        metadata,
        warnings: result.errorMap ? Array.from(result.errorMap.entries()) : [],
        elapsedTime: commitState.getElapsedTime(),
      };
    } else {
      const errorMsg = result.errorMessage || getFlutterFlowErrorMessage(result.responseCode);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('Commit execution failed:', error);
    commitState.setError(error);
    
    return {
      success: false,
      error: error.message,
      state: commitState.currentState,
      elapsedTime: commitState.getElapsedTime(),
    };
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

### Import Rules
- **External packages (package:xxx)**: MUST be included in generated code - user needs these to add to FF Dependencies
- **FlutterFlow-managed imports**: Do NOT include these - they are added automatically at commit time:
  - /flutter_flow/flutter_flow_theme.dart
  - /flutter_flow/flutter_flow_util.dart
  - index.dart (relative)
  - /custom_code/actions/index.dart
  - /flutter_flow/custom_functions.dart
  - package:flutter/material.dart
- Do NOT include comments like "// Automatic FlutterFlow imports" or "// Do not edit above"
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

      "openrouter-auto": `
ADDITIONAL GUIDANCE FOR OPENROUTER AUTO:
- Focus on efficient, clean code
- Follow best practices for Flutter performance`,

      "openrouter-free": `
ADDITIONAL GUIDANCE FOR FREE MODELS:
- Keep implementations simple and standard
- Avoid experimental features unless necessary`,

      "gemini-3-pro-preview": `
ADDITIONAL GUIDANCE FOR THIS MODEL:
- Strictly follow the JSON specification structure
- Do not add features not specified in the requirements
- Keep the implementation focused and minimal`,
    };

    const tweak = modelTweaks[model] || modelTweaks["gemini-3-pro-preview"];
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
      case "openrouter-auto":
        result = await callOpenRouter(formattedPrompt, systemInstruction, "openrouter-auto");
        break;
      case "openrouter-free":
        result = await callOpenRouter(formattedPrompt, systemInstruction, "openrouter-free");
        break;
      case "gemini-3-pro-preview":
      default:
        result = await callGemini(
          formattedPrompt,
          systemInstruction,
          "gemini-3-pro-preview"
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
          "Selected model failed due to API key issues, falling back to Gemini 3.0 Flash..."
        );
      try {
        const fallbackInstruction = getModelSpecificInstruction(
          baseSystemInstruction,
          "gemini-3-flash-preview"
        );
        result = await callGemini(
          formattedPrompt,
          fallbackInstruction,
          "gemini-3-flash-preview"
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
6. (Removed - imports are now added automatically at commit time)
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
    "gemini-3-pro-preview": "Gemini 3.0 Pro",
    "claude-4.5-opus": "Claude 4.5 Opus",
    "gpt-5.1-codex-max": "GPT-5.1-Codex-Max",
    "openrouter-auto": "OpenRouter: Auto",
    "openrouter-free": "OpenRouter: Free Models",
  };
  console.log(`Using model: ${modelNames[selectedModel] || selectedModel}`);
}

async function runRefinement() {
  console.log("runRefinement called");
  
  if (pipelineState.isRunning) return;
  
  // Get current model
  const selectedModel = document.getElementById("code-generator-model").value;
  
  // Set running state
  pipelineState.isRunning = true;
  const btns = document.querySelectorAll(".btn-refine-action");
  
  btns.forEach(btn => {
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

    // Step 2: Code Generator (Refinement)
    selectWorkflowStep(2);
    showStepLoading(2, true);
    
    // We use the same runCodeGenerator function but with the refinement prompt
    pipelineState.step2Result = await runCodeGenerator(
      refinementPrompt,
      selectedModel
    );

    const step2Output = document.getElementById("step2-output");
    const cleanStep2 = extractCodeFromMarkdown(pipelineState.step2Result);
    step2Output.innerHTML = highlightCode(cleanStep2);
    step2Output.dataset.raw = cleanStep2;
    showStepLoading(2, false);

    // Step 3: Code Audit (Re-audit)
    selectWorkflowStep(3);
    showStepLoading(3, true);

    pipelineState.step3Result = await runCodeDissector(
      pipelineState.step2Result
    );

    const auditOutput = document.getElementById("step3-output");
    auditOutput.innerHTML = renderMarkdownAudit(pipelineState.step3Result);

    showStepLoading(3, false);
    
  } catch (error) {
    console.error("Refinement failed:", error);
    alert("Refinement failed: " + error.message);
    
    // If it failed, we might want to stay on the step where it failed or go back to 3
    // For now, let's just re-enable the button if we are still on step 3 or visible
  } finally {
    pipelineState.isRunning = false;
    btns.forEach(btn => {
        btn.disabled = false;
        
        let btnText = "Refine & Regenerate Code";
        if (btn.id === "btn-refine-top") {
            btnText = "Auto-Fix & Regenerate";
        }
        
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        ${btnText}`;
    });
    updateDeployButtonVisibility();
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
    alert("Please describe your FlutterFlow widget first.");
    return;
  }

  // Check for image references in non-Gemini models
  if (
    selectedModel !== "gemini-3-pro-preview" &&
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
    
    updateDeployButtonVisibility();
  }
}

function retryWithDifferentModel() {
  // Show model selection dialog
  const currentModel = document.getElementById("code-generator-model").value;
  const otherModels = [
    "gemini-3-pro-preview",
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

/**
 * Initiates the commit to FlutterFlow process from the UI.
 * Called when user clicks the "Commit to FlutterFlow" button.
 */
async function initiateCommitToFlutterFlow() {
  if (!pipelineState.step2Result) {
    alert('No code to commit. Please run the pipeline first to generate code.');
    return;
  }
  
  const apiKey = await getApiKey('flutterflow');
  const projectId = await getApiKey('flutterflow_project_id');
  
  if (!apiKey || !projectId) {
    alert('FlutterFlow credentials not configured. Please add your API Key and Project ID in the API Keys settings.');
    openApiKeysModal();
    return;
  }
  
  const code = pipelineState.step2Result;
  
  let artifactType = 'CustomWidget';
  let artifactName = 'GeneratedWidget';
  
  if (pipelineState.step1Result) {
    try {
      const spec = JSON.parse(pipelineState.step1Result);
      artifactType = spec.artifactType || 'CustomWidget';
      artifactName = spec.artifactName || 'GeneratedWidget';
    } catch (e) {
      console.warn('Could not parse step 1 result:', e);
    }
  }
  
  const codeInfo = prepareCodeForCommit(code, { artifactType, artifactName });
  
  const checks = runPreCommitChecks(codeInfo);
  
  const shouldProceed = await showPreCommitSummary(codeInfo, checks);
  
  if (!shouldProceed) {
    console.log('User cancelled commit');
    return;
  }
  
  const result = await executeCommit(code, {
    artifactType,
    artifactName,
    pipelineResult: {
      step1Result: pipelineState.step1Result,
      selectedModel: document.getElementById('code-generator-model')?.value,
    },
  });
  
  if (result.success) {
    alert(`Success! ${result.message}\n\nTime: ${(result.elapsedTime / 1000).toFixed(1)}s`);
  } else {
    alert(`Commit failed: ${result.error}`);
  }
}

/**
 * Updates the FlutterFlow credential status indicator in Step 3.
 */
async function updateFlutterFlowCredentialStatus() {
  const statusDot = document.getElementById('ff-status-dot');
  const statusText = document.getElementById('ff-status-text');
  
  if (!statusDot || !statusText) return;
  
  const apiKey = await getApiKey('flutterflow');
  const projectId = await getApiKey('flutterflow_project_id');
  
  if (apiKey && projectId) {
    statusDot.className = 'w-2 h-2 rounded-full bg-green-500';
    statusText.textContent = 'FlutterFlow credentials configured';
    statusText.className = 'text-green-600';
  } else if (apiKey || projectId) {
    statusDot.className = 'w-2 h-2 rounded-full bg-yellow-500';
    statusText.textContent = 'FlutterFlow credentials incomplete';
    statusText.className = 'text-yellow-600';
  } else {
    statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
    statusText.textContent = 'FlutterFlow credentials not configured';
    statusText.className = 'text-red-600';
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
  
  // Setup FlutterFlow credential validation
  setupFlutterFlowValidation();

  // Initialize endpoint selector
  const endpointSelect = document.getElementById('flutterflow-endpoint-select');
  if (endpointSelect) {
    const savedEndpoint = getFlutterFlowEndpoint();
    endpointSelect.value = savedEndpoint;
  }

  showWalkthroughIfNeeded();

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

  const modelSelect = document.getElementById("code-generator-model");
  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      if (walkthroughStep === 3) {
        advanceWalkthrough();
        updateWalkthroughUI();
      }
    });
  }
  
  window.addEventListener('commitStateChange', (event) => {
    const { state } = event.detail;
    updateProgressFromState(state);
    
    if (state === CommitState.PREPARING || 
        state === CommitState.VALIDATING || 
        state === CommitState.PUSHING) {
      showCommitProgress();
    } else if (state === CommitState.SUCCESS || state === CommitState.ERROR) {
      setTimeout(hideCommitProgress, 1000);
    }
  });
});

// --- WELCOME VIDEO FUNCTIONS ---
function initializeWelcomeVideo() {
  // Always show the welcome video - remove sessionStorage check

  // YouTube iframe doesn't support play() method - it autoplays via URL params
  // Just ensure the video container is visible
  const welcomeVideo = document.getElementById("welcome-video");
  if (welcomeVideo) {
    welcomeVideo.classList.remove("hidden");
  }
}

function handleWelcomeVideoEnd() {
  // For YouTube iframe, add click/keyboard listeners to dismiss video
  const iframe = document.getElementById("welcome-video-player");
  if (iframe) {
    // Add click listener to dismiss video
    iframe.addEventListener("click", dismissWelcomeVideo);
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

  // Show walkthrough after video is dismissed
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
  
  document.getElementById('confirm-file-name').textContent = codeInfo.fileName;
  document.getElementById('confirm-artifact-type').textContent = codeInfo.artifactType;
  document.getElementById('confirm-file-size').textContent = `${(codeInfo.content.length / 1024).toFixed(1)} KB`;
  document.getElementById('confirm-line-count').textContent = codeInfo.content.split('\n').length;
  
  getApiKey('flutterflow_project_id').then(projectId => {
    document.getElementById('confirm-project-id').textContent = projectId || 'Not configured';
  });
  
  const depsList = document.getElementById('confirm-deps-list');
  const depsSection = document.getElementById('confirm-deps-section');
  if (deps && Object.keys(deps).length > 0) {
    depsList.innerHTML = Object.entries(deps)
      .map(([name, version]) => `<li>• ${name}: ${version}</li>`)
      .join('');
    depsSection.classList.remove('hidden');
  } else {
    depsSection.classList.add('hidden');
  }
  
  const warningsList = document.getElementById('confirm-warnings-list');
  const warningsSection = document.getElementById('confirm-warnings-section');
  if (checks.warnings && checks.warnings.length > 0) {
    warningsList.innerHTML = checks.warnings.map(w => `<li>• ${w}</li>`).join('');
    warningsSection.classList.remove('hidden');
  } else {
    warningsSection.classList.add('hidden');
  }
  
  document.getElementById('confirm-code-preview').textContent = codeInfo.content;
  
  document.getElementById('code-preview-content').classList.add('hidden');
  document.getElementById('code-preview-chevron').style.transform = 'rotate(0deg)';
  
  const modal = document.getElementById('commit-confirm-modal');
  if (modal) {
    modal.classList.add('open');
  }
}

/**
 * Closes the commit confirmation modal.
 * @param {Event} [event] - Optional click event
 */
function closeCommitConfirmModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('commit-confirm-modal');
  if (modal) {
    modal.classList.remove('open');
  }
  pendingCommitData = null;
}

/**
 * Toggles the code preview section.
 */
function toggleCodePreview() {
  const content = document.getElementById('code-preview-content');
  const chevron = document.getElementById('code-preview-chevron');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(90deg)';
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
  }
}

/**
 * Shows the commit progress overlay.
 */
function showCommitProgress() {
  const overlay = document.getElementById('commit-progress-overlay');
  if (overlay) {
    overlay.classList.add('open');
    updateCommitProgress(0, 'Initializing...', 'Step 0 of 4');
  }
}

/**
 * Hides the commit progress overlay.
 */
function hideCommitProgress() {
  const overlay = document.getElementById('commit-progress-overlay');
  if (overlay) {
    overlay.classList.remove('open');
  }
}

/**
 * Updates the commit progress UI.
 * @param {number} percent - Progress percentage (0-100)
 * @param {string} message - Status message
 * @param {string} detail - Detailed step info
 */
function updateCommitProgress(percent, message, detail) {
  const progressBar = document.getElementById('commit-progress-bar');
  const progressMessage = document.getElementById('progress-message');
  const progressDetail = document.getElementById('progress-detail');
  
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
    [CommitState.IDLE]: { percent: 0, message: 'Ready', detail: '' },
    [CommitState.PREPARING]: { percent: 25, message: 'Preparing code...', detail: 'Step 1 of 4' },
    [CommitState.VALIDATING]: { percent: 50, message: 'Validating...', detail: 'Step 2 of 4' },
    [CommitState.PUSHING]: { percent: 75, message: 'Pushing to FlutterFlow...', detail: 'Step 3 of 4' },
    [CommitState.SUCCESS]: { percent: 100, message: 'Complete!', detail: 'Step 4 of 4' },
    [CommitState.ERROR]: { percent: 100, message: 'Failed', detail: 'Error occurred' },
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
    console.error('No pending commit data');
    return;
  }
  
  showCommitProgress();
  
  const { codeInfo } = pendingCommitData;
  
  let artifactType = 'CustomWidget';
  let artifactName = 'GeneratedWidget';
  
  if (pipelineState.step1Result) {
    try {
      const spec = JSON.parse(pipelineState.step1Result);
      artifactType = spec.artifactType || 'CustomWidget';
      artifactName = spec.artifactName || 'GeneratedWidget';
    } catch (e) {
      console.warn('Could not parse step 1 result:', e);
    }
  }
  
  const result = await executeCommit(codeInfo.content, {
    artifactType,
    artifactName,
    pipelineResult: {
      step1Result: pipelineState.step1Result,
      selectedModel: document.getElementById('code-generator-model')?.value,
    },
  });
  
  if (result.success) {
    alert(`Success! ${result.message}`);
  } else {
    alert(`Commit failed: ${result.error}`);
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
window.advanceWalkthrough = advanceWalkthrough;
window.commitToFlutterFlow = commitToFlutterFlow;

function focusPromptInput() {
  const input = document.getElementById("pipeline-input");
  if (input) {
    input.focus();
  }
}

function openModelSelector() {
  const select = document.getElementById("code-generator-model");
  if (select) {
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
window.toggleCodePreview = toggleCodePreview;
window.confirmCommitToFlutterFlow = confirmCommitToFlutterFlow;
window.runRefinement = runRefinement;
window.setFlutterFlowEndpoint = setFlutterFlowEndpoint;
window.getFlutterFlowEndpoint = getFlutterFlowEndpoint;
