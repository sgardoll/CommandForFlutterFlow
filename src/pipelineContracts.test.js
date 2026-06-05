import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArchitectPrompt,
  buildGeneratorPrompt,
  buildReviewPrompt,
  buildArtifactRegenerationPrompt,
  buildBundleRegenerationPrompt,
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

test("artifact regeneration prompt preserves siblings and stable ids", () => {
  const prompt = buildArtifactRegenerationPrompt({
    bundleSpec: '{"id":"bundle-a"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"},{"id":"action-a"}]}',
    bundleReview: '{"artifacts":[]}',
    artifactId: "widget-a",
    userFeedback: "Fix widget layout",
  });

  assert.match(prompt, /Regenerate only artifact "widget-a"/);
  assert.match(prompt, /unchanged sibling artifact code/);
  assert.match(prompt, /full artifact-bundle\/v1 JSON bundle/);
});

test("bundle regeneration prompt asks for full bundle output", () => {
  const prompt = buildBundleRegenerationPrompt({
    bundleSpec: '{"id":"bundle-a"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"}]}',
    bundleReview: '{"status":"warn"}',
    userFeedback: "FlutterFlow build error",
  });

  assert.match(prompt, /full bundle regeneration task/);
  assert.match(prompt, /Preserve stable artifact ids/);
  assert.match(prompt, /code per artifact/);
});
