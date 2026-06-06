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
  CustomClass: "dsl:addCustomClass",
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

export function validateArtifactCompatibility(artifact) {
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

  if (artifact.artifactType === "CustomAction" && !/Future(?:<[^>]+>)?\s+\w+\s*\(|Future\s+\w+\s*\(/.test(code)) {
    findings.push(createFinding(
      artifact,
      "warning",
      "CustomAction code should expose an async Future function callable from FlutterFlow.",
    ));
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
  const findings = artifacts.flatMap(validateArtifactCompatibility);
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
