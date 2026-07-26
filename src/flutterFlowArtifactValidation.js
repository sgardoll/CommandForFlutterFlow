const SUPPORTED_TYPES = new Set([
  "CustomWidget",
  "CustomAction",
  "CustomFunction",
  "CustomClass",
  "CodeFile",
]);

const TYPE_FILE_HINTS = {
  CustomWidget: "custom_widgets/",
  CustomAction: "actions/",
  CustomFunction: "custom_functions/",
  CustomClass: "custom_code/",
  CodeFile: "custom_code/",
};

// Types FlutterFlow exposes in the Custom Action "Return Value" selector
// (Integer, Double, Boolean, String, Image/Video/Audio Path, Color, Document,
// Document Reference, JSON, DateTime, TimestampRange, plus the List option).
// Importing a package class does not make it selectable, so anything else -
// an imported package class, a Code File class, a CustomEnum - is rejected by
// FlutterFlow at push time and must be caught before deploy.
const SUPPORTED_RETURN_TYPES = new Set([
  "void",
  "dynamic",
  "String", // also Image Path, Video Path, Audio Path
  "int",
  "double",
  "num",
  "bool",
  "Color",
  "DateTime",
  "DateTimeRange", // TimestampRange
  "LatLng",
  "FFPlace",
  "FFUploadedFile",
  "DocumentReference",
  "Map",
  "List",
]);

// Data Types generate as "<Name>Struct" and Firestore Documents as
// "<Collection>Record", so both suffixes are selectable return values.
const SUPPORTED_RETURN_TYPE_SUFFIXES = ["Struct", "Record"];

function createFinding(artifact, severity, message) {
  return {
    artifactId: artifact.id,
    artifactName: artifact.artifactName,
    artifactType: artifact.artifactType,
    severity,
    message,
  };
}

/**
 * Removes comments and string literals so type detection never matches a name
 * that only appears in prose or in a quoted string.
 * @param {string} code - Dart source
 * @returns {string} Source with comments and string bodies blanked out
 */
function stripCommentsAndStrings(code) {
  let out = "";
  let i = 0;

  while (i < code.length) {
    const pair = code.slice(i, i + 2);

    if (pair === "//") {
      while (i < code.length && code[i] !== "\n") i++;
      out += " ";
    } else if (pair === "/*") {
      i += 2;
      while (i < code.length && code.slice(i, i + 2) !== "*/") i++;
      i += 2;
      out += " ";
    } else if (code[i] === "'" || code[i] === '"') {
      const quote = code[i];
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      out += '""';
    } else {
      out += code[i];
      i++;
    }
  }

  return out;
}

/**
 * Reads a balanced generic argument list starting at an opening angle bracket.
 * Handles arbitrary nesting, which a regex cannot.
 * @param {string} code - Source to scan
 * @param {number} start - Index of the opening "<"
 * @returns {{inner: string, end: number}|null} Inner text and index past the ">"
 */
function readBalancedGeneric(code, start) {
  let depth = 0;

  for (let i = start; i < code.length; i++) {
    if (code[i] === "<") depth++;
    else if (code[i] === ">") {
      depth--;
      if (depth === 0) return { inner: code.slice(start + 1, i), end: i + 1 };
    }
  }

  return null;
}

/**
 * Finds every `Future<...> name(` signature in already-stripped Dart source.
 * @param {string} code - Source with comments and strings removed
 * @returns {Array<{functionName: string, returnType: string|null}>}
 */
function findFutureSignatures(code) {
  const signatures = [];
  const futureMatches = code.matchAll(/\bFuture\b/g);

  for (const match of futureMatches) {
    let i = match.index + "Future".length;
    let returnType = null;

    const beforeSpace = i;
    while (i < code.length && /\s/.test(code[i])) i++;
    const hadSpaceAfterFuture = i > beforeSpace;

    if (code[i] === "<") {
      const generic = readBalancedGeneric(code, i);
      if (!generic) continue;
      returnType = generic.inner.replace(/\s+/g, " ").trim();
      i = generic.end;

      // A generic return type must still be separated from the name.
      if (!/\s/.test(code[i] || "")) continue;
      while (i < code.length && /\s/.test(code[i])) i++;
    } else if (!hadSpaceAfterFuture) {
      continue;
    }

    const nameMatch = /^([A-Za-z_]\w*)\s*\(/.exec(code.slice(i));
    if (!nameMatch) continue;

    signatures.push({ functionName: nameMatch[1], returnType });
  }

  return signatures;
}

// Artifact names reach us as display names ("Write NFC Tag") as often as Dart
// identifiers ("writeNfcTag"), so names are compared loosely.
function normalizeFunctionName(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Picks the signature FlutterFlow will treat as the action entry point.
 * Prefers the function matching the artifact name, else the first Future found.
 * @param {string} code - Dart source
 * @param {string} functionName - Artifact name (display name or identifier)
 * @returns {{functionName: string, returnType: string|null}|null}
 */
export function getCustomActionSignature(code = "", functionName = "") {
  const signatures = findFutureSignatures(stripCommentsAndStrings(code));
  if (signatures.length === 0) return null;

  const wanted = normalizeFunctionName(functionName);
  const named = signatures.find(
    (signature) => normalizeFunctionName(signature.functionName) === wanted,
  );
  if (named) return named;

  // Without a name match, a private helper is never the entry point
  // FlutterFlow calls, so it must not be mistaken for the action's signature.
  const isPublic = (signature) => !signature.functionName.startsWith("_");
  return signatures.find(isPublic) || signatures[0];
}

export function getDeclaredDartTypes(code = "") {
  return Array.from(
    stripCommentsAndStrings(code).matchAll(/\b(?:class|enum)\s+([A-Za-z_]\w*)/g),
    (match) => match[1],
  );
}

export function getCustomActionReturnType(code = "", functionName = "") {
  return getCustomActionSignature(code, functionName)?.returnType || null;
}

function hasCustomActionFutureFunction(code = "", functionName = "") {
  return getCustomActionSignature(code, functionName) !== null;
}

/**
 * Returns the identifiers in a return type FlutterFlow cannot accept.
 * Data Types (*Struct) and Documents (*Record) are accepted when they exist in
 * the project.
 * @param {string|null} returnType - Return type text, e.g. "List<NfcTag>"
 * @returns {string[]} Unsupported type identifiers
 */
export function getUnsupportedReturnTypeIdentifiers(returnType) {
  const identifiers = returnType?.match(/[A-Za-z_]\w*/g) || [];

  return identifiers.filter(
    (identifier) =>
      !SUPPORTED_RETURN_TYPES.has(identifier)
      && !SUPPORTED_RETURN_TYPE_SUFFIXES.some((suffix) =>
        identifier.endsWith(suffix),
      ),
  );
}

export function getCustomActionReturnTypeError(
  code,
  { functionName = "", declaredTypes = new Set() } = {},
) {
  const returnType = getCustomActionReturnType(code, functionName);
  const unsupported = getUnsupportedReturnTypeIdentifiers(returnType);
  if (unsupported.length === 0) return null;

  const [offending] = unsupported;
  let detail;
  if (declaredTypes.has(offending)) {
    detail = `uses Code File type "${offending}", which FlutterFlow cannot process as an Action Return Value`;
  } else if (returnType === offending) {
    detail = "is not a FlutterFlow Action Return Value";
  } else {
    detail = `uses type "${offending}", which is not a FlutterFlow Action Return Value`;
  }

  return `CustomAction return type "${returnType}" ${detail}. Return JSON (Future<dynamic> or Future<Map<String, dynamic>>) or an existing FlutterFlow Data Type (*Struct) instead.`;
}

export function validateArtifactCompatibility(artifact, options = {}) {
  const findings = [];
  const fileName = artifact.fileName || "";
  const code = artifact.code || "";

  if (!SUPPORTED_TYPES.has(artifact.artifactType)) {
    findings.push(createFinding(
      artifact,
      "error",
      `Unsupported artifact type "${artifact.artifactType}".`,
    ));
  }

  if (!fileName.endsWith(".dart")) {
    findings.push(createFinding(artifact, "error", "FlutterFlow custom code artifacts must use .dart files."));
  }

  if (!code.trim()) {
    findings.push(createFinding(artifact, "warning", "Generated artifact has no Dart code yet."));
    return findings;
  }

  if (artifact.artifactType === "CustomWidget" && !/class\s+\w+\s+extends\s+(StatelessWidget|StatefulWidget)/.test(code)) {
    findings.push(createFinding(
      artifact,
      "warning",
      "CustomWidget code should declare a widget class extending StatelessWidget or StatefulWidget.",
    ));
  }

  if (
    artifact.artifactType === "CustomAction"
    && !hasCustomActionFutureFunction(code, artifact.artifactName)
  ) {
    findings.push(createFinding(
      artifact,
      "warning",
      "CustomAction code should expose an async Future function callable from FlutterFlow.",
    ));
  }

  if (artifact.artifactType === "CustomAction") {
    const declaredTypes = options.declaredTypes || new Set(getDeclaredDartTypes(code));
    const returnTypeError = getCustomActionReturnTypeError(code, {
      functionName: artifact.artifactName,
      declaredTypes,
    });
    if (returnTypeError) {
      findings.push(createFinding(artifact, "error", returnTypeError));
    }
  }

  if (artifact.artifactType === "CustomFunction" && /class\s+\w+\s+extends\s+(StatelessWidget|StatefulWidget)/.test(code)) {
    findings.push(createFinding(
      artifact,
      "warning",
      "CustomFunction should be a callable function, not a widget class.",
    ));
  }

  return findings;
}

export function validateBundleCompatibility(bundle) {
  const artifacts = Array.isArray(bundle?.artifacts) ? bundle.artifacts : [];
  const declaredTypes = new Set(
    artifacts.flatMap((artifact) => getDeclaredDartTypes(artifact.code || "")),
  );
  const findings = artifacts.flatMap((artifact) => validateArtifactCompatibility(
    artifact,
    { declaredTypes },
  ));
  const deployHints = artifacts.map((artifact) => ({
    artifactId: artifact.id,
    fileName: artifact.fileName,
    pathHint: TYPE_FILE_HINTS[artifact.artifactType] || TYPE_FILE_HINTS.CodeFile,
  }));

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
    deployHints,
  };
}
