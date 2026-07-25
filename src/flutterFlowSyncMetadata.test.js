import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildFlutterFlowSyncMetadata,
  extractTopLevelFunctionNames,
} from "./flutterFlowSyncMetadata.js";

test("extracts top-level custom function names using the extension-compatible shape", () => {
  const names = extractTopLevelFunctionNames(`
// ignoredFunction() {}
import 'dart:convert';

String? parseNfcIdentifier(String? value) {
  return value;
}
`);

  assert.deepEqual(names, ["parseNfcIdentifier"]);
});

test("marks a new standalone code file with a current checksum only", async () => {
  const content = "class PipedreamIntegration {}";
  const fileMap = new Map([
    [
      "pipedream_integration.dart",
      {
        content,
        type: "C",
        path: "lib/custom_code/pipedream_integration.dart",
      },
    ],
  ]);

  const result = await buildFlutterFlowSyncMetadata(fileMap);
  const wireMap = JSON.parse(result.fileMapContents);
  const fileInfo = wireMap["pipedream_integration.dart"];

  assert.equal(fileInfo.old_identifier_name, "pipedream_integration.dart");
  assert.equal(fileInfo.new_identifier_name, "pipedream_integration.dart");
  assert.equal(fileInfo.type, "C");
  assert.equal(
    fileInfo.current_checksum,
    createHash("sha256").update(content).digest("hex"),
  );
  assert.equal("original_checksum" in fileInfo, false);
});

test("includes an original checksum when the custom code file already exists", async () => {
  const path = "lib/custom_code/pipedream_integration.dart";
  const fileMap = new Map([
    [
      "pipedream_integration.dart",
      {
        content: "class PipedreamIntegration { final String id = 'new'; }",
        type: "C",
        path,
      },
    ],
  ]);
  const remoteContent =
    "class PipedreamIntegration { final String id = 'old'; }";

  const result = await buildFlutterFlowSyncMetadata(
    fileMap,
    new Map([[path, remoteContent]]),
  );
  const fileInfo =
    JSON.parse(result.fileMapContents)["pipedream_integration.dart"];

  assert.equal(
    fileInfo.original_checksum,
    createHash("sha256").update(remoteContent).digest("hex"),
  );
});

test("reports a new custom function in functions_to_add", async () => {
  const fileMap = new Map([
    [
      "custom_functions.dart",
      {
        content:
          "String? parseNfcIdentifier(String? value) => value?.trim();",
        type: "F",
        path: "lib/flutter_flow/custom_functions.dart",
      },
    ],
  ]);

  const result = await buildFlutterFlowSyncMetadata(fileMap);

  assert.deepEqual(JSON.parse(result.functionsMapContents), {
    functions_to_rename: [],
    functions_to_delete: [],
    functions_to_add: ["parseNfcIdentifier"],
  });
});

test("does not re-add a custom function that already exists remotely", async () => {
  const path = "lib/flutter_flow/custom_functions.dart";
  const fileMap = new Map([
    [
      "custom_functions.dart",
      {
        content:
          "String? parseNfcIdentifier(String? value) => value?.trim();",
        type: "F",
        path,
      },
    ],
  ]);

  const result = await buildFlutterFlowSyncMetadata(
    fileMap,
    new Map([
      [
        path,
        "String? parseNfcIdentifier(String? value) => value?.toUpperCase();",
      ],
    ]),
  );

  assert.deepEqual(JSON.parse(result.functionsMapContents).functions_to_add, []);
});
