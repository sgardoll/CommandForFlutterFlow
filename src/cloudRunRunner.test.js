import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(
  new URL("../cloud-run/ffai-runner/Dockerfile", import.meta.url),
  "utf8",
);

function versionParts(version) {
  return version.split(".").map(Number);
}

function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

test("Cloud Run pins a snapshot-compatible FlutterFlow CLI", () => {
  const version = dockerfile.match(
    /^ARG FLUTTERFLOW_CLI_VERSION=(\d+\.\d+\.\d+)$/m,
  )?.[1];

  assert.ok(version, "Dockerfile must explicitly pin FLUTTERFLOW_CLI_VERSION");
  assert.ok(
    compareVersions(version, "0.0.39") >= 0,
    `FlutterFlow CLI ${version} is older than the snapshot minimum 0.0.39`,
  );
  assert.match(
    dockerfile,
    /dart pub global list \| grep -F "flutterflow_cli \$FLUTTERFLOW_CLI_VERSION"/,
    "Docker build must verify the installed CLI version",
  );
});
