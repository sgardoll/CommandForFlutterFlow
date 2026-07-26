import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(
  new URL("../cloud-run/ffai-runner/Dockerfile", import.meta.url),
  "utf8",
);
const runnerSource = readFileSync(
  new URL("../cloud-run/ffai-runner/bin/server.dart", import.meta.url),
  "utf8",
);
const deployScript = readFileSync(
  new URL("../scripts/deploy_cloud_run_ffai.sh", import.meta.url),
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

test("Cloud Run upserts custom classes in one authoritative write", () => {
  assert.match(
    runnerSource,
    /if \(findCustomClass\(project, name: \$name\) == null\)[\s\S]*addCustomClass\([\s\S]*else \{[\s\S]*updateCustomClass\(/,
  );
});

test("Cloud Run deployment reserves enough memory and serializes provisioning", () => {
  assert.match(deployScript, /MEMORY="\$\{MEMORY:-4Gi\}"/);
  assert.match(deployScript, /CONCURRENCY="\$\{CONCURRENCY:-1\}"/);
  assert.match(deployScript, /--memory "\$MEMORY"/);
  assert.match(deployScript, /--concurrency "\$CONCURRENCY"/);
});
