const BUNDLE_SCHEMA_INSTRUCTIONS = `
Return JSON only. Do not wrap the response in Markdown.
Use this top-level shape:
{
  "schemaVersion": "artifact-bundle/v1",
  "id": "stable-bundle-id",
  "title": "Short bundle title",
  "description": "What the bundle implements",
  "artifacts": [
    {
      "id": "stable-artifact-id",
      "artifactType": "CustomWidget | CustomAction | CustomFunction | CustomClass | CodeFile",
      "artifactName": "PascalCaseOrFlutterFlowName",
      "fileName": "flutter_flow_file_name.dart",
      "description": "What this artifact does",
      "dependencies": [{ "package": "package_name", "version": "^1.0.0", "reason": "Why it is needed" }],
      "imports": ["package:flutter/material.dart"],
      "publicApi": ["constructor, function signature, callable method, or builder parameter"],
      "code": "Generated Dart code when this stage is producing code",
      "deployStatus": "pending"
    }
  ],
  "relationships": [
    {
      "from": "artifact-id",
      "to": "artifact-id",
      "type": "imports | calls | builds | depends_on",
      "description": "How the artifacts relate"
    }
  ],
  "deployOrder": ["artifact-id"]
}
`.trim();

export function buildArchitectPrompt(userInput) {
  return `
You are the Prompt Architect for a FlutterFlow custom-code generation product.
Convert the user's request into a structured artifact bundle specification for one or more FlutterFlow custom code artifacts.

Product scope:
- Generate custom widgets, custom actions, custom functions, custom classes, and support code files.
- Preserve each artifact as an individually reviewable, refinable, regenerable, and deployable unit.
- Package or library names in the user request are examples and dependencies, not hardcoded product templates.
- Include dependency metadata, import guidance, public APIs, cross-artifact relationships, and deploy order.

${BUNDLE_SCHEMA_INSTRUCTIONS}

User request:
${userInput}
`.trim();
}

export function buildGeneratorPrompt(bundleSpec) {
  return `
You are the Code Generator for a FlutterFlow custom-code generation product.
Generate FlutterFlow-ready Dart code for every artifact in the provided bundle specification.

Rules:
- Return one artifact entry per requested artifact.
- Preserve artifact ids, artifact types, artifact names, file names, relationships, dependencies, and deploy order.
- Put complete Dart code in each artifact's "code" field.
- Keep FlutterFlow constraints in mind: no unsupported imports, no private project paths, and code must match the declared custom-code surface.
- If only one artifact is needed, still return a one-artifact bundle.

${BUNDLE_SCHEMA_INSTRUCTIONS}

Bundle specification:
${bundleSpec}
`.trim();
}

export function buildReviewPrompt(generatedBundle) {
  return `
You are the Code Review stage for a FlutterFlow custom-code generation product.
Review every generated artifact and the bundle integration.

Return JSON only. Do not wrap the response in Markdown.
Use this top-level shape:
{
  "schemaVersion": "artifact-bundle/v1",
  "id": "same-bundle-id-if-known",
  "title": "Review title",
  "artifacts": [
    {
      "id": "artifact-id",
      "artifactType": "CustomWidget | CustomAction | CustomFunction | CustomClass | CodeFile",
      "artifactName": "ArtifactName",
      "review": {
        "status": "pass | warn | fail",
        "findings": [
          {
            "severity": "info | warning | error",
            "message": "Specific finding",
            "suggestion": "Concrete fix when needed"
          }
        ]
      }
    }
  ],
  "bundleReview": {
    "status": "pass | warn | fail",
    "findings": [
      {
        "severity": "info | warning | error",
        "message": "Cross-artifact or deployment finding",
        "suggestion": "Concrete fix when needed"
      }
    ]
  }
}

Generated bundle:
${generatedBundle}
`.trim();
}

export function createBuildShipContext(stage, bundle = null) {
  return {
    contract: "artifact-bundle/v1",
    stage,
    supportsMultipleArtifacts: true,
    supportedArtifactTypes: [
      "CustomWidget",
      "CustomAction",
      "CustomFunction",
      "CustomClass",
      "CodeFile",
    ],
    bundle,
  };
}

export function buildArtifactRegenerationPrompt({ bundleSpec, artifactBundle, bundleReview, artifactId, userFeedback }) {
  return `
This is a targeted artifact regeneration task for a FlutterFlow artifact bundle.

Regenerate only artifact "${artifactId}" unless the requested fix requires updating direct dependents.
Preserve all artifact ids, artifact types, file names, relationships, deploy order, and unchanged sibling artifact code.
Return the full artifact-bundle/v1 JSON bundle, not a single Dart file.

Original bundle specification:
${bundleSpec || ""}

Current generated bundle:
${artifactBundle || ""}

Current review:
${bundleReview || ""}

Requested change or error report:
${userFeedback || ""}
`.trim();
}

export function buildBundleRegenerationPrompt({ bundleSpec, artifactBundle, bundleReview, userFeedback }) {
  return `
This is a full bundle regeneration task for a FlutterFlow artifact bundle.

Regenerate the bundle from the provided review feedback or FlutterFlow build errors.
Preserve stable artifact ids where the same artifact still exists.
Return the full artifact-bundle/v1 JSON bundle with code per artifact.

Original bundle specification:
${bundleSpec || ""}

Current generated bundle:
${artifactBundle || ""}

Current review:
${bundleReview || ""}

Requested change or error report:
${userFeedback || ""}
`.trim();
}
