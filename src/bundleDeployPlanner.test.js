import assert from "node:assert/strict";
import test from "node:test";
import { buildBundleDeployPlan } from "./bundleDeployPlanner.js";

test("builds deploy file entries in deploy order", () => {
  const plan = buildBundleDeployPlan({
    id: "bundle-a",
    deployOrder: ["class-a", "widget-a"],
    artifacts: [
      {
        id: "widget-a",
        artifactType: "CustomWidget",
        artifactName: "WidgetA",
        fileName: "widget_a.dart",
        code: "class WidgetA extends StatelessWidget {}",
      },
      {
        id: "class-a",
        artifactType: "CustomClass",
        artifactName: "ModelA",
        fileName: "model_a.dart",
        code: "class ModelA {}",
      },
    ],
  });

  assert.deepEqual(plan.fileEntries.map((entry) => entry.artifactId), ["class-a", "widget-a"]);
  assert.equal(plan.fileEntries[0].path, "lib/custom_code/actions/model_a.dart");
  assert.equal(plan.fileEntries[1].path, "lib/custom_code/widgets/widget_a.dart");
});

test("merges bundle and artifact dependencies with missing-version warnings", () => {
  const plan = buildBundleDeployPlan({
    dependencies: [{ name: "intl", version: "^0.20.0" }],
    artifacts: [
      {
        id: "action-a",
        artifactType: "CustomAction",
        artifactName: "loadThing",
        fileName: "load_thing.dart",
        code: "Future loadThing() async {}",
        dependencies: [{ package: "http" }],
      },
    ],
  });

  assert.deepEqual(plan.dependencies, { intl: "^0.20.0", http: "" });
  assert.deepEqual(plan.warnings, ['loadThing dependency "http" has no explicit version.']);
});

test("uses FlutterFlow custom functions file for function artifacts", () => {
  const plan = buildBundleDeployPlan({
    artifacts: [
      {
        id: "function-a",
        artifactType: "CustomFunction",
        artifactName: "formatThing",
        code: "String formatThing() => '';",
      },
    ],
  });

  assert.equal(plan.fileEntries[0].fileName, "custom_functions.dart");
  assert.equal(plan.fileEntries[0].path, "lib/flutter_flow/custom_functions.dart");
  assert.equal(plan.fileEntries[0].type, "F");
});

test("blocks duplicate deploy targets before file map construction", () => {
  const plan = buildBundleDeployPlan({
    artifacts: [
      {
        id: "function-a",
        artifactType: "CustomFunction",
        artifactName: "formatA",
        code: "String formatA() => '';",
      },
      {
        id: "function-b",
        artifactType: "CustomFunction",
        artifactName: "formatB",
        code: "String formatB() => '';",
      },
    ],
  });

  assert.equal(plan.fileEntries.length, 2);
  assert.equal(plan.errors.length, 2);
  assert.match(plan.errors[0], /Duplicate deploy file name "custom_functions\.dart"/);
  assert.match(plan.errors[1], /Duplicate deploy path "lib\/flutter_flow\/custom_functions\.dart"/);
});
