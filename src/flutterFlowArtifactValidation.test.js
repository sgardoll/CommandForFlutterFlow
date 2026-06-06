import assert from "node:assert/strict";
import test from "node:test";
import {
  validateArtifactCompatibility,
  validateBundleCompatibility,
} from "./flutterFlowArtifactValidation.js";

test("validates widget class shape", () => {
  const findings = validateArtifactCompatibility({
    id: "custom-widget-status-card",
    artifactName: "StatusCard",
    artifactType: "CustomWidget",
    fileName: "status_card.dart",
    code: "class StatusCard extends StatelessWidget { const StatusCard({super.key}); }",
  });

  assert.deepEqual(findings, []);
});

test("flags unsupported artifact type and non-dart file", () => {
  const findings = validateArtifactCompatibility({
    id: "unknown",
    artifactName: "Unknown",
    artifactType: "Screen",
    fileName: "screen.txt",
    code: "void main() {}",
  });

  assert.equal(findings.length, 2);
  assert.equal(findings[0].severity, "error");
  assert.equal(findings[1].severity, "error");
});

test("flags action code without async Future API", () => {
  const findings = validateArtifactCompatibility({
    id: "custom-action-parse",
    artifactName: "parseThing",
    artifactType: "CustomAction",
    fileName: "parse_thing.dart",
    code: "String parseThing(String input) => input;",
  });

  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Future function/);
});

test("validates a bundle and emits deploy path hints", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "custom-function-format",
        artifactName: "formatThing",
        artifactType: "CustomFunction",
        fileName: "format_thing.dart",
        code: "String formatThing(String input) => input;",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.deployHints, [
    {
      artifactId: "custom-function-format",
      fileName: "format_thing.dart",
      pathHint: "custom_functions/",
    },
  ]);
});
