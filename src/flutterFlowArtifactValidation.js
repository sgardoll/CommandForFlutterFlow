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

function createFinding(artifact, severity, message) {
  return {
    artifactId: artifact.id,
    artifactName: artifact.artifactName,
    artifactType: artifact.artifactType,
    severity,
    message,
  };
}

export function getDeclaredDartTypes(code = "") {
  return Array.from(
    code.matchAll(/\b(?:class|enum)\s+([A-Za-z_]\w*)/g),
    (match) => match[1],
  );
}

export function getCustomActionReturnType(code = "", functionName = "") {
  const returnType = String.raw`((?:[^<>]|<[^<>]*>)+)`;
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const functionPattern = escapedName || String.raw`[A-Za-z_]\w*`;
  const match = code.match(
    new RegExp(String.raw`\bFuture\s*(?:<\s*${returnType}\s*>)?\s+${functionPattern}\s*\(`),
  );

  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function hasCustomActionFutureFunction(code = "", functionName = "") {
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const functionPattern = escapedName || String.raw`[A-Za-z_]\w*`;
  return new RegExp(
    String.raw`\bFuture\s*(?:<(?:[^<>]|<[^<>]*>)+>)?\s+${functionPattern}\s*\(`,
  ).test(code);
}

function referencesDeclaredType(returnType, declaredTypes) {
  const identifiers = returnType?.match(/[A-Za-z_]\w*/g) || [];
  return identifiers.find((identifier) => declaredTypes.has(identifier)) || null;
}

export function getCustomActionReturnTypeError(
  code,
  { functionName = "", declaredTypes = new Set() } = {},
) {
  const returnType = getCustomActionReturnType(code, functionName);
  const unsupportedType = referencesDeclaredType(returnType, declaredTypes);
  if (!unsupportedType) return null;

  return `CustomAction return type "${returnType}" uses Code File type "${unsupportedType}", which FlutterFlow cannot process as an Action Return Value. Return JSON (Future<dynamic> or Future<Map<String, dynamic>>) or an existing FlutterFlow Data Type (*Struct) instead.`;
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
