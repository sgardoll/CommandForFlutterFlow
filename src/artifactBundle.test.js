import test from "node:test";
import assert from "node:assert/strict";
import {
  createArtifactId,
  getPrimaryArtifact,
  normalizeArtifactBundle,
} from "./artifactBundle.js";

test("normalizes a single widget fixture into a one-artifact bundle", () => {
  const bundle = normalizeArtifactBundle({
    artifacts: [
      {
        artifactType: "CustomWidget",
        artifactName: "ToolCallCard",
        dependencies: [{ name: "agent_kit", version: "^0.1.2" }],
      },
    ],
  });

  assert.equal(bundle.artifacts.length, 1);
  assert.equal(bundle.artifacts[0].id, "custom-widget-tool-call-card");
  assert.equal(bundle.artifacts[0].codeType, "W");
  assert.deepEqual(bundle.deployOrder, ["custom-widget-tool-call-card"]);
  assert.deepEqual(bundle.artifacts[0].dependencies, [
    { name: "agent_kit", version: "^0.1.2", versionRequired: false, inferred: false },
  ]);
});

test("preserves mixed-artifact metadata, relationships, and deploy order", () => {
  const bundle = normalizeArtifactBundle({
    id: "agent-view-bundle",
    artifacts: [
      { id: "model-event", artifactType: "CodeFile", artifactName: "AgentEvent" },
      { id: "action-parse", artifactType: "CustomAction", artifactName: "parseAgentEvent" },
      { id: "widget-view", artifactType: "CustomWidget", artifactName: "AgentView" },
    ],
    relationships: [
      { from: "widget-view", to: "model-event", type: "imports" },
      { from: "action-parse", to: "model-event", type: "creates" },
    ],
    deployOrder: ["model-event", "action-parse", "widget-view"],
  });

  assert.equal(bundle.id, "agent-view-bundle");
  assert.equal(bundle.artifacts.length, 3);
  assert.equal(bundle.artifacts[0].codeType, "C");
  assert.equal(bundle.artifacts[1].codeType, "A");
  assert.equal(bundle.artifacts[2].codeType, "W");
  assert.deepEqual(bundle.relationships, [
    { from: "widget-view", to: "model-event", type: "imports", description: "" },
    { from: "action-parse", to: "model-event", type: "creates", description: "" },
  ]);
  assert.deepEqual(bundle.deployOrder, ["model-event", "action-parse", "widget-view"]);
});

test("falls back to a warning-backed legacy single artifact for raw code", () => {
  const bundle = normalizeArtifactBundle("class GeneratedWidget extends StatelessWidget {}", {
    artifactType: "CustomWidget",
    artifactName: "GeneratedWidget",
  });

  assert.equal(bundle.artifacts.length, 1);
  assert.equal(bundle.artifacts[0].artifactName, "GeneratedWidget");
  assert.match(bundle.artifacts[0].code, /GeneratedWidget/);
  assert.equal(bundle.warnings.length, 1);
  assert.match(bundle.warnings[0], /legacy single-artifact fallback/);
});

test("creates deterministic ids from type and name", () => {
  assert.equal(
    createArtifactId({ artifactType: "CustomAction", artifactName: "Parse Agent Event" }),
    "custom-action-parse-agent-event",
  );
});

test("returns primary artifact with metadata fallback", () => {
  const primary = getPrimaryArtifact({
    artifacts: [{ artifactType: "CustomFunction", artifactName: "formatTrace" }],
  });

  assert.equal(primary.artifactType, "CustomFunction");
  assert.equal(primary.fileName, "formatTrace.dart");
});

test("normalizes supplied artifact ids and remaps bundle references", () => {
  const unsafeId = `Widget'"><img src=x onerror=alert(1)>`;
  const bundle = normalizeArtifactBundle({
    artifacts: [
      {
        id: unsafeId,
        artifactType: "CustomWidget",
        artifactName: "UnsafeWidget",
      },
      {
        id: "helper class",
        artifactType: "CustomClass",
        artifactName: "HelperClass",
      },
    ],
    relationships: [
      {
        from: unsafeId,
        to: "helper class",
        type: "imports",
      },
    ],
    deployOrder: [unsafeId, "helper class"],
  });

  assert.match(bundle.artifacts[0].id, /^[a-z0-9-]+$/);
  assert.equal(bundle.relationships[0].from, bundle.artifacts[0].id);
  assert.equal(bundle.relationships[0].to, "helper-class");
  assert.deepEqual(bundle.deployOrder, [bundle.artifacts[0].id, "helper-class"]);
});
