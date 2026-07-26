import assert from "node:assert/strict";
import test from "node:test";
import {
  getCustomActionReturnType,
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

test("extracts nested JSON action return types", () => {
  assert.equal(
    getCustomActionReturnType(
      "Future<Map<String, dynamic>> executeRoutine() async => {};",
      "executeRoutine",
    ),
    "Map<String, dynamic>",
  );
});

test("rejects a CustomAction that returns a generated Code File class", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "routine-result",
        artifactName: "RoutineExecutionResult",
        artifactType: "CodeFile",
        fileName: "routine_execution_result.dart",
        code: "class RoutineExecutionResult { Map<String, dynamic> toJson() => {}; }",
      },
      {
        id: "execute-routine",
        artifactName: "executeNfcRoutine",
        artifactType: "CustomAction",
        fileName: "execute_nfc_routine.dart",
        code: "Future<RoutineExecutionResult> executeNfcRoutine() async => RoutineExecutionResult();",
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "error");
  assert.match(result.findings[0].message, /Return JSON/);
});

test("allows a CustomAction to return JSON instead of a generated class", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "routine-result",
        artifactName: "RoutineExecutionResult",
        artifactType: "CodeFile",
        fileName: "routine_execution_result.dart",
        code: "class RoutineExecutionResult { Map<String, dynamic> toJson() => {}; }",
      },
      {
        id: "execute-routine",
        artifactName: "executeNfcRoutine",
        artifactType: "CustomAction",
        fileName: "execute_nfc_routine.dart",
        code: "Future<Map<String, dynamic>> executeNfcRoutine() async => RoutineExecutionResult().toJson();",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.findings, []);
});

test("rejects a CustomAction that returns an imported package type", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "write-nfc-tag",
        artifactName: "writeNfcTag",
        artifactType: "CustomAction",
        fileName: "write_nfc_tag.dart",
        code: [
          "import 'package:nfc_manager/nfc_manager.dart';",
          "Future<NfcTag> writeNfcTag(String payload) async => throw UnimplementedError();",
        ].join("\n"),
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "error");
  assert.match(result.findings[0].message, /NfcTag/);
});

test("rejects a forbidden type nested two generics deep", () => {
  const findings = validateArtifactCompatibility({
    id: "scan-tags",
    artifactName: "scanTags",
    artifactType: "CustomAction",
    fileName: "scan_tags.dart",
    code: "Future<List<NdefMessage>> scanTags() async => [];",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /NdefMessage/);
});

test("matches the action function when the artifact name is a display name", () => {
  const findings = validateArtifactCompatibility({
    id: "write-nfc-tag",
    artifactName: "Write NFC Tag",
    artifactType: "CustomAction",
    fileName: "write_nfc_tag.dart",
    code: "Future<NfcTag> writeNfcTag(String payload) async => throw UnimplementedError();",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /NfcTag/);
});

test("ignores a private helper when the artifact name does not match", () => {
  const findings = validateArtifactCompatibility({
    id: "write-nfc-tag",
    artifactName: "GeneratedCode",
    artifactType: "CustomAction",
    fileName: "write_nfc_tag.dart",
    code: [
      "Future<NfcTag> _readTag() async => throw UnimplementedError();",
      "Future<Map<String, dynamic>> writeNfcTag() async => {};",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("allows FlutterFlow Data Type structs and supported primitives", () => {
  const supported = [
    "Future<ProductStruct> loadProduct() async => ProductStruct();",
    "Future<List<ProductStruct>> loadProducts() async => [];",
    "Future<String> loadName() async => '';",
    "Future<Map<String, dynamic>> loadJson() async => {};",
    "Future<FFUploadedFile> loadFile() async => throw UnimplementedError();",
    "Future<void> doThing() async {}",
    "Future doBareThing() async {}",
  ];

  for (const code of supported) {
    const findings = validateArtifactCompatibility({
      id: "supported",
      artifactName: "supported",
      artifactType: "CustomAction",
      fileName: "supported.dart",
      code,
    });

    assert.deepEqual(findings, [], `expected no findings for: ${code}`);
  }
});

test("allows a struct bundled alongside the action that returns it", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "product-struct",
        artifactName: "ProductStruct",
        artifactType: "CodeFile",
        fileName: "product_struct.dart",
        code: "class ProductStruct { const ProductStruct(); }",
      },
      {
        id: "load-product",
        artifactName: "loadProduct",
        artifactType: "CustomAction",
        fileName: "load_product.dart",
        code: "Future<ProductStruct> loadProduct() async => const ProductStruct();",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.findings, []);
});

test("ignores type names that only appear in comments or strings", () => {
  const findings = validateArtifactCompatibility({
    id: "load-json",
    artifactName: "loadJson",
    artifactType: "CustomAction",
    fileName: "load_json.dart",
    code: [
      "/// Mirrors class RoutineResult in the backend.",
      "// returns class LegacyPayload data as JSON",
      "Future<Map<String, dynamic>> loadJson() async => {'kind': 'class Fake'};",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
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

test("emits custom code file deploy hint for custom classes", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "custom-class-user",
        artifactName: "UserProfile",
        artifactType: "CustomClass",
        fileName: "user_profile.dart",
        code: "class UserProfile { const UserProfile(); }",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.deployHints, [
    {
      artifactId: "custom-class-user",
      fileName: "user_profile.dart",
      pathHint: "custom_code/",
    },
  ]);
});
