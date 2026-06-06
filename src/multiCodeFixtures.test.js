import assert from "node:assert/strict";
import test from "node:test";
import { normalizeArtifactBundle } from "./artifactBundle.js";
import { buildBundleDeployPlan } from "./bundleDeployPlanner.js";
import {
  buildArtifactRegenerationPrompt,
  buildBundleRegenerationPrompt,
} from "./pipelineContracts.js";

test("single-artifact fixture stays deployable as one bundle", () => {
  const bundle = normalizeArtifactBundle({
    artifacts: [
      {
        id: "custom-widget-counter-card",
        artifactType: "CustomWidget",
        artifactName: "CounterCard",
        fileName: "counter_card.dart",
        code: "class CounterCard extends StatelessWidget {}",
      },
    ],
  });

  assert.equal(bundle.artifacts.length, 1);
  assert.equal(buildBundleDeployPlan(bundle).fileEntries.length, 1);
});

test("mixed widget action function and class fixture preserves all artifact types", () => {
  const bundle = normalizeArtifactBundle({
    artifacts: [
      { id: "model-a", artifactType: "CustomClass", artifactName: "ModelA", code: "class ModelA {}" },
      { id: "action-a", artifactType: "CustomAction", artifactName: "loadA", code: "Future loadA() async {}" },
      { id: "function-a", artifactType: "CustomFunction", artifactName: "formatA", code: "String formatA() => '';" },
      { id: "widget-a", artifactType: "CustomWidget", artifactName: "WidgetA", code: "class WidgetA extends StatelessWidget {}" },
    ],
  });

  assert.deepEqual(bundle.artifacts.map((artifact) => artifact.artifactType), [
    "CustomClass",
    "CustomAction",
    "CustomFunction",
    "CustomWidget",
  ]);
});

test("package-backed fixture treats agent_kit as dependency metadata", () => {
  const bundle = normalizeArtifactBundle({
    artifacts: [
      {
        id: "custom-widget-agent-view",
        artifactType: "CustomWidget",
        artifactName: "AgentView",
        fileName: "agent_view.dart",
        dependencies: [{ package: "agent_kit", version: "^0.1.0" }],
        code: "class AgentView extends StatelessWidget {}",
      },
    ],
  });

  const plan = buildBundleDeployPlan(bundle);
  assert.deepEqual(plan.dependencies, { agent_kit: "^0.1.0" });
  assert.equal(plan.fileEntries[0].path, "lib/custom_code/widgets/agent_view.dart");
});

test("regeneration fixtures preserve selected artifact and full bundle output contract", () => {
  const artifactPrompt = buildArtifactRegenerationPrompt({
    bundleSpec: '{"id":"agent-ui"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"},{"id":"class-a"}]}',
    bundleReview: '{"artifacts":[]}',
    artifactId: "widget-a",
    userFeedback: "Fix overflow",
  });
  const bundlePrompt = buildBundleRegenerationPrompt({
    bundleSpec: '{"id":"agent-ui"}',
    artifactBundle: '{"artifacts":[{"id":"widget-a"},{"id":"class-a"}]}',
    bundleReview: '{"artifacts":[]}',
    userFeedback: "Build failed",
  });
  const artifactPayload = JSON.parse(artifactPrompt);
  const bundlePayload = JSON.parse(bundlePrompt);

  assert.equal(artifactPayload.task, "regenerate_artifact");
  assert.equal(artifactPayload.artifactId, "widget-a");
  assert.equal(artifactPayload.artifactBundle.artifacts[1].id, "class-a");
  assert.equal(bundlePayload.task, "regenerate_bundle");
  assert.equal(bundlePayload.userFeedback, "Build failed");
  assert.doesNotMatch(artifactPrompt, /Regenerate only artifact/);
  assert.doesNotMatch(bundlePrompt, /full artifact-bundle\/v1 JSON bundle/);
});

test("deploy payload fixture separates custom-code files from custom-class DSL", () => {
  const bundle = normalizeArtifactBundle({
    deployOrder: ["class-a", "widget-a"],
    artifacts: [
      { id: "class-a", artifactType: "CustomClass", artifactName: "AgentEvent", fileName: "agent_event.dart", code: "class AgentEvent {}" },
      { id: "widget-a", artifactType: "CustomWidget", artifactName: "AgentView", fileName: "agent_view.dart", code: "class AgentView extends StatelessWidget {}" },
    ],
  });
  const plan = buildBundleDeployPlan(bundle);

  assert.deepEqual(plan.dslEntries.map((entry) => entry.fileName), [
    "agent_event.dart",
  ]);
  assert.deepEqual(plan.dslEntries.map((entry) => entry.operation), [
    "addCustomClass",
  ]);
  assert.deepEqual(plan.fileEntries.map((entry) => entry.fileName), [
    "agent_view.dart",
  ]);
  assert.deepEqual(plan.fileEntries.map((entry) => entry.path), [
    "lib/custom_code/widgets/agent_view.dart",
  ]);
});
