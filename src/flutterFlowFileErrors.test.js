import assert from "node:assert/strict";
import test from "node:test";
import { formatFlutterFlowFileError } from "./flutterFlowFileErrors.js";

test("formats FlutterFlow's real per-file shape: an array of error objects", () => {
  const result = formatFlutterFlowFileError([
    { errorMessage: "Unable to process return parameter.", isCritical: true },
  ]);

  assert.equal(result, "Unable to process return parameter.");
});

test("joins multiple errors for the same file", () => {
  const result = formatFlutterFlowFileError([
    { errorMessage: "First problem.", isCritical: true },
    { errorMessage: "Second problem.", isCritical: false },
  ]);

  assert.equal(result, "First problem.; Second problem.");
});

test("passes through a plain string error", () => {
  assert.equal(formatFlutterFlowFileError("Plain message"), "Plain message");
});

test("reads errorMessage off a single error object", () => {
  assert.equal(
    formatFlutterFlowFileError({ errorMessage: "Single object shape", isCritical: true }),
    "Single object shape",
  );
});

test("falls back to JSON instead of [object Object] for unrecognized shapes", () => {
  const result = formatFlutterFlowFileError([{ isCritical: true }]);
  assert.doesNotMatch(result, /\[object Object\]/);
  assert.match(result, /isCritical/);
});

test("handles an empty array without producing [object Object]", () => {
  const result = formatFlutterFlowFileError([]);
  assert.doesNotMatch(result, /\[object Object\]/);
});
