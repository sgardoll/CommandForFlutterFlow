import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArchitectPrompt,
  buildGeneratorPrompt,
  buildReviewPrompt,
  createBuildShipContext,
} from "./pipelineContracts.js";

test("architect prompt asks for generic multi-artifact bundle JSON", () => {
  const prompt = buildArchitectPrompt("Build code that uses a package");

  assert.match(prompt, /artifact-bundle\/v1/);
  assert.match(prompt, /one or more FlutterFlow custom code artifacts/);
  assert.match(prompt, /examples and dependencies, not hardcoded product templates/);
  assert.match(prompt, /"artifacts"/);
  assert.match(prompt, /"relationships"/);
});

test("generator prompt preserves ids and asks for code per artifact", () => {
  const prompt = buildGeneratorPrompt('{"artifacts":[{"id":"widget-a"}]}');

  assert.match(prompt, /Preserve artifact ids/);
  assert.match(prompt, /complete Dart code/);
  assert.match(prompt, /"code"/);
  assert.match(prompt, /widget-a/);
});

test("review prompt requests artifact and bundle level findings", () => {
  const prompt = buildReviewPrompt('{"artifacts":[{"id":"action-a"}]}');

  assert.match(prompt, /Review every generated artifact/);
  assert.match(prompt, /"bundleReview"/);
  assert.match(prompt, /"findings"/);
  assert.match(prompt, /action-a/);
});

test("BuildShip context declares multi-artifact contract support", () => {
  const context = createBuildShipContext("generator", { id: "bundle-a" });

  assert.equal(context.contract, "artifact-bundle/v1");
  assert.equal(context.stage, "generator");
  assert.equal(context.supportsMultipleArtifacts, true);
  assert.deepEqual(context.bundle, { id: "bundle-a" });
  assert.ok(context.supportedArtifactTypes.includes("CustomWidget"));
  assert.ok(context.supportedArtifactTypes.includes("CustomAction"));
});
