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

test("architect prompt sends user request data without system instructions", () => {
  const prompt = buildArchitectPrompt("Build code that uses a package");
  const payload = JSON.parse(prompt);

  assert.equal(payload.task, "architect");
  assert.equal(payload.userRequest, "Build code that uses a package");
  assert.doesNotMatch(prompt, /You are the Prompt Architect/);
  assert.doesNotMatch(prompt, /Top-level shape/);
  assert.doesNotMatch(prompt, /CustomWidget \| CustomAction/);
});

test("generator prompt sends bundle data without system instructions", () => {
  const prompt = buildGeneratorPrompt('{"artifacts":[{"id":"widget-a"}]}');
  const payload = JSON.parse(prompt);

  assert.equal(payload.task, "generate_bundle");
  assert.equal(payload.bundleSpec.artifacts[0].id, "widget-a");
  assert.doesNotMatch(prompt, /Preserve artifact ids/);
  assert.doesNotMatch(prompt, /complete Dart code/);
});

test("review prompt sends generated bundle data without system instructions", () => {
  const prompt = buildReviewPrompt('{"artifacts":[{"id":"action-a"}]}');
  const payload = JSON.parse(prompt);

  assert.equal(payload.task, "review_bundle");
  assert.equal(payload.generatedBundle.artifacts[0].id, "action-a");
  assert.deepEqual(payload.outputRequirements.bundleReview, [
    "status",
    "score",
    "summary",
    "manualActions",
    "findings",
  ]);
  assert.deepEqual(payload.outputRequirements.scoreRange, [0, 100]);
  assert.deepEqual(payload.outputRequirements.eachArtifact, [
    "id",
    "review.status",
    "review.findings",
  ]);
  assert.doesNotMatch(prompt, /Review every generated artifact/);
});

test("BuildShip context only sends runtime state", () => {
  const context = createBuildShipContext("generator", { id: "bundle-a" });

  assert.deepEqual(context, {
    stage: "generator",
    bundle: { id: "bundle-a" },
  });
});

test("artifact regeneration prompt sends target and bundle data", () => {
  const prompt = buildArtifactRegenerationPrompt({
    bundleSpec: '{"id":"bundle-a"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"},{"id":"action-a"}]}',
    bundleReview: '{"artifacts":[]}',
    artifactId: "widget-a",
    userFeedback: "Fix widget layout",
  });
  const payload = JSON.parse(prompt);

  assert.equal(payload.task, "regenerate_artifact");
  assert.equal(payload.artifactId, "widget-a");
  assert.equal(payload.bundleSpec.id, "bundle-a");
  assert.equal(payload.artifactBundle.artifacts[1].id, "action-a");
  assert.equal(payload.userFeedback, "Fix widget layout");
  assert.doesNotMatch(prompt, /Regenerate only artifact/);
  assert.doesNotMatch(prompt, /full artifact-bundle\/v1 JSON bundle/);
});

test("bundle regeneration prompt sends bundle and feedback data", () => {
  const prompt = buildBundleRegenerationPrompt({
    bundleSpec: '{"id":"bundle-a"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"}]}',
    bundleReview: '{"status":"warn"}',
    userFeedback: "FlutterFlow build error",
  });
  const payload = JSON.parse(prompt);

  assert.equal(payload.task, "regenerate_bundle");
  assert.equal(payload.bundleSpec.id, "bundle-a");
  assert.equal(payload.artifactBundle.artifacts[0].id, "widget-a");
  assert.equal(payload.bundleReview.status, "warn");
  assert.equal(payload.userFeedback, "FlutterFlow build error");
  assert.doesNotMatch(prompt, /full bundle regeneration task/);
  assert.doesNotMatch(prompt, /Preserve stable artifact ids/);
});
