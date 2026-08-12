import assert from "node:assert/strict";
import test from "node:test";
import {
  calibrateWidgetRules,
  getBlockingWidgetErrors,
  getCustomActionReturnType,
  getWidgetRuleFindings,
  validateArtifactCompatibility,
  validateBundleCompatibility,
} from "./flutterFlowArtifactValidation.js";

test("validates widget class shape", () => {
  const findings = validateArtifactCompatibility({
    id: "custom-widget-status-card",
    artifactName: "StatusCard",
    artifactType: "CustomWidget",
    fileName: "status_card.dart",
    code: "class StatusCard extends StatelessWidget { const StatusCard({super.key}); }",
  });

  assert.deepEqual(findings, []);
});

test("flags unsupported artifact type and non-dart file", () => {
  const findings = validateArtifactCompatibility({
    id: "unknown",
    artifactName: "Unknown",
    artifactType: "Screen",
    fileName: "screen.txt",
    code: "void main() {}",
  });

  assert.equal(findings.length, 2);
  assert.equal(findings[0].severity, "error");
  assert.equal(findings[1].severity, "error");
});

test("flags action code without async Future API", () => {
  const findings = validateArtifactCompatibility({
    id: "custom-action-parse",
    artifactName: "parseThing",
    artifactType: "CustomAction",
    fileName: "parse_thing.dart",
    code: "String parseThing(String input) => input;",
  });

  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Future function/);
});

test("extracts nested JSON action return types", () => {
  assert.equal(
    getCustomActionReturnType(
      "Future<Map<String, dynamic>> executeRoutine() async => {};",
      "executeRoutine",
    ),
    "Map<String, dynamic>",
  );
});

test("rejects a CustomAction that returns a generated Code File class", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "routine-result",
        artifactName: "RoutineExecutionResult",
        artifactType: "CodeFile",
        fileName: "routine_execution_result.dart",
        code: "class RoutineExecutionResult { Map<String, dynamic> toJson() => {}; }",
      },
      {
        id: "execute-routine",
        artifactName: "executeNfcRoutine",
        artifactType: "CustomAction",
        fileName: "execute_nfc_routine.dart",
        code: "Future<RoutineExecutionResult> executeNfcRoutine() async => RoutineExecutionResult();",
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "error");
  assert.match(result.findings[0].message, /Return JSON/);
});

test("allows a CustomAction to return JSON instead of a generated class", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "routine-result",
        artifactName: "RoutineExecutionResult",
        artifactType: "CodeFile",
        fileName: "routine_execution_result.dart",
        code: "class RoutineExecutionResult { Map<String, dynamic> toJson() => {}; }",
      },
      {
        id: "execute-routine",
        artifactName: "executeNfcRoutine",
        artifactType: "CustomAction",
        fileName: "execute_nfc_routine.dart",
        code: "Future<dynamic> executeNfcRoutine() async => RoutineExecutionResult().toJson();",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.findings, []);
});

test("rejects Future<Map<String, dynamic>> - FlutterFlow's push-time parser cannot process it despite JSON being a documented return category", () => {
  const findings = validateArtifactCompatibility({
    id: "execute-pipedream-action",
    artifactName: "executePipedreamAction",
    artifactType: "CustomAction",
    fileName: "execute_pipedream_action.dart",
    code: "Future<Map<String, dynamic>> executePipedreamAction(String apiKey) async => {'success': true};",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /Map<String, dynamic>/);
  assert.match(findings[0].message, /Future<dynamic>/);
});

test("rejects a CustomAction that returns an imported package type", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "write-nfc-tag",
        artifactName: "writeNfcTag",
        artifactType: "CustomAction",
        fileName: "write_nfc_tag.dart",
        code: [
          "import 'package:nfc_manager/nfc_manager.dart';",
          "Future<NfcTag> writeNfcTag(String payload) async => throw UnimplementedError();",
        ].join("\n"),
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "error");
  assert.match(result.findings[0].message, /NfcTag/);
});

test("rejects a forbidden type nested two generics deep", () => {
  const findings = validateArtifactCompatibility({
    id: "scan-tags",
    artifactName: "scanTags",
    artifactType: "CustomAction",
    fileName: "scan_tags.dart",
    code: "Future<List<NdefMessage>> scanTags() async => [];",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /NdefMessage/);
});

test("matches the action function when the artifact name is a display name", () => {
  const findings = validateArtifactCompatibility({
    id: "write-nfc-tag",
    artifactName: "Write NFC Tag",
    artifactType: "CustomAction",
    fileName: "write_nfc_tag.dart",
    code: "Future<NfcTag> writeNfcTag(String payload) async => throw UnimplementedError();",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /NfcTag/);
});

test("ignores a private helper when the artifact name does not match", () => {
  const findings = validateArtifactCompatibility({
    id: "write-nfc-tag",
    artifactName: "GeneratedCode",
    artifactType: "CustomAction",
    fileName: "write_nfc_tag.dart",
    code: [
      "Future<NfcTag> _readTag() async => throw UnimplementedError();",
      "Future<dynamic> writeNfcTag() async => {};",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("allows FlutterFlow Data Type structs and supported primitives", () => {
  const supported = [
    "Future<ProductStruct> loadProduct() async => ProductStruct();",
    "Future<List<ProductStruct>> loadProducts() async => [];",
    "Future<String> loadName() async => '';",
    "Future<dynamic> loadJson() async => {};",
    "Future<FFUploadedFile> loadFile() async => throw UnimplementedError();",
    "Future<UsersRecord> loadUser() async => throw UnimplementedError();",
    "Future<List<UsersRecord>> loadUsers() async => [];",
    "Future<DateTimeRange> loadRange() async => throw UnimplementedError();",
    "Future<DocumentReference> loadRef() async => throw UnimplementedError();",
    "Future<void> doThing() async {}",
    "Future doBareThing() async {}",
  ];

  for (const code of supported) {
    const findings = validateArtifactCompatibility({
      id: "supported",
      artifactName: "supported",
      artifactType: "CustomAction",
      fileName: "supported.dart",
      code,
    });

    assert.deepEqual(findings, [], `expected no findings for: ${code}`);
  }
});

test("allows an action to return an existing project Struct not declared in the push", () => {
  const findings = validateArtifactCompatibility({
    id: "load-product",
    artifactName: "loadProduct",
    artifactType: "CustomAction",
    fileName: "load_product.dart",
    code: "Future<ProductStruct> loadProduct() async => throw UnimplementedError();",
  });

  assert.deepEqual(findings, []);
});

test("rejects a Code File class named like a Struct bundled alongside the action that returns it", () => {
  // A real FlutterFlow Data Type is never declared via `class` in a pushed
  // Code File - it already exists in the project. A `class ...Struct` in the
  // same push is a local Dart class wearing the naming convention, and
  // FlutterFlow still cannot process it as a return value.
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "product-struct",
        artifactName: "ProductStruct",
        artifactType: "CodeFile",
        fileName: "product_struct.dart",
        code: "class ProductStruct { const ProductStruct(); }",
      },
      {
        id: "load-product",
        artifactName: "loadProduct",
        artifactType: "CustomAction",
        fileName: "load_product.dart",
        code: "Future<ProductStruct> loadProduct() async => const ProductStruct();",
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "error");
  assert.match(result.findings[0].message, /ProductStruct/);
});

test("ignores type names that only appear in comments or strings", () => {
  const findings = validateArtifactCompatibility({
    id: "load-json",
    artifactName: "loadJson",
    artifactType: "CustomAction",
    fileName: "load_json.dart",
    code: [
      "/// Mirrors class RoutineResult in the backend.",
      "// returns class LegacyPayload data as JSON",
      "Future<dynamic> loadJson() async => {'kind': 'class Fake'};",
    ].join("\n"),
  });

  assert.deepEqual(findings, []);
});

test("rejects a CustomClass file name with a word not in the declared class", () => {
  const findings = validateArtifactCompatibility({
    id: "pipedream-integration",
    artifactName: "PipedreamIntegration",
    artifactType: "CustomClass",
    fileName: "pipedream_integration_model.dart",
    code: "class PipedreamIntegration { const PipedreamIntegration(); }",
  });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, "error");
  assert.match(findings[0].message, /pipedream_integration_model\.dart/);
  assert.match(findings[0].message, /PipedreamIntegration/);
  assert.match(findings[0].message, /pipedream_integration\.dart/);
});

test("allows a CustomClass file name that is the exact snake_case of its class", () => {
  const findings = validateArtifactCompatibility({
    id: "pipedream-integration",
    artifactName: "PipedreamIntegration",
    artifactType: "CustomClass",
    fileName: "pipedream_integration.dart",
    code: "class PipedreamIntegration { const PipedreamIntegration(); }",
  });

  assert.deepEqual(findings, []);
});

test("allows a CodeFile name matching any declared type, not just the first", () => {
  const findings = validateArtifactCompatibility({
    id: "user-profile",
    artifactName: "UserProfile",
    artifactType: "CodeFile",
    fileName: "user_profile.dart",
    code: "enum ProfileStatus { active, inactive }\nclass UserProfile { const UserProfile(); }",
  });

  assert.deepEqual(findings, []);
});

test("validates a bundle and emits deploy path hints", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "custom-function-format",
        artifactName: "formatThing",
        artifactType: "CustomFunction",
        fileName: "format_thing.dart",
        code: "String formatThing(String input) => input;",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.deployHints, [
    {
      artifactId: "custom-function-format",
      fileName: "format_thing.dart",
      pathHint: "flutter_flow/custom_functions.dart",
    },
  ]);
});

test("emits custom code file deploy hint for custom classes", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "custom-class-user",
        artifactName: "UserProfile",
        artifactType: "CustomClass",
        fileName: "user_profile.dart",
        code: "class UserProfile { const UserProfile(); }",
      },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.deployHints, [
    {
      artifactId: "custom-class-user",
      fileName: "user_profile.dart",
      pathHint: "custom_code/",
    },
  ]);
});

test("every widget rule flags its positive control and stays silent on its negative one", () => {
  const broken = calibrateWidgetRules().filter((result) => !result.usable);

  assert.deepEqual(
    broken,
    [],
    `VOID rule(s) - their silence proves nothing: ${broken.map((r) => r.id).join(", ")}`,
  );
});

test("flags a required widget parameter FlutterFlow can leave unset", () => {
  const findings = getWidgetRuleFindings(`
    class AnimatedCustomSlider extends StatefulWidget {
      const AnimatedCustomSlider({
        super.key,
        this.width,
        this.height,
        required this.value,
      });
      final double? width;
      final double? height;
      final double value;
      @override
      State<AnimatedCustomSlider> createState() => _AnimatedCustomSliderState();
    }
  `);

  assert.deepEqual(
    findings.map((finding) => finding.id).sort(),
    ["non-nullable-public-field", "required-public-param"],
  );
  assert.ok(findings.every((finding) => finding.severity === "error"));
});

test("accepts a non-nullable widget field that has a constructor default", () => {
  const findings = getWidgetRuleFindings(`
    class QuantityStepper extends StatefulWidget {
      const QuantityStepper({super.key, this.width, this.height, this.step = 1});
      final double? width;
      final double? height;
      final int step;
      @override
      State<QuantityStepper> createState() => _QuantityStepperState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("ignores required on private helpers and non-widget classes", () => {
  const findings = getWidgetRuleFindings(`
    class _RingPainter extends CustomPainter {
      const _RingPainter({required this.progress});
      final double progress;
    }
    class _Row extends StatelessWidget {
      const _Row({required this.label});
      final String label;
      @override
      Widget build(BuildContext context) => Text(label);
    }
    class ProgressRing extends StatefulWidget {
      const ProgressRing({super.key, this.width, this.height, this.progress});
      final double? width;
      final double? height;
      final double? progress;
      @override
      State<ProgressRing> createState() => _ProgressRingState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("does not mistake required in a comment or string for a real parameter", () => {
  const findings = getWidgetRuleFindings(`
    class NoteCard extends StatefulWidget {
      // const NoteCard({required this.title});
      const NoteCard({super.key, this.title});
      final String? title;
      final String hint = "required this.title";
      @override
      State<NoteCard> createState() => _NoteCardState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("flags Image.asset fed by a String path parameter", () => {
  const findings = getWidgetRuleFindings(`
    class FadeInRoundedImage extends StatefulWidget {
      const FadeInRoundedImage({super.key, this.width, this.height, this.imagePath});
      final double? width;
      final double? height;
      final String? imagePath;
      @override
      State<FadeInRoundedImage> createState() => _FadeInRoundedImageState();
    }
    class _FadeInRoundedImageState extends State<FadeInRoundedImage> {
      @override
      Widget build(BuildContext context) => Image.asset(widget.imagePath!);
    }
  `);

  assert.deepEqual(findings.map((finding) => finding.id), ["asset-without-anchor"]);
  assert.equal(findings[0].severity, "warning");
});

test("does not flag a network image fed by a String path parameter", () => {
  const findings = getWidgetRuleFindings(`
    class RemoteImage extends StatefulWidget {
      const RemoteImage({super.key, this.imagePath});
      final String? imagePath;
      @override
      State<RemoteImage> createState() => _RemoteImageState();
    }
    class _RemoteImageState extends State<RemoteImage> {
      @override
      Widget build(BuildContext context) => Image.network(widget.imagePath!);
    }
  `);

  assert.deepEqual(findings, []);
});

test("surfaces widget rule findings as artifact errors that block a bundle", () => {
  const result = validateBundleCompatibility({
    artifacts: [
      {
        id: "custom-widget-slider",
        artifactName: "AnimatedCustomSlider",
        artifactType: "CustomWidget",
        fileName: "animated_custom_slider.dart",
        code: `class AnimatedCustomSlider extends StatefulWidget {
          const AnimatedCustomSlider({super.key, required this.value});
          final double value;
          @override
          State<AnimatedCustomSlider> createState() => _AnimatedCustomSliderState();
        }`,
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => /`required`/.test(finding.message)));
});

test("leaves non-widget artifacts untouched by the widget rules", () => {
  const findings = validateArtifactCompatibility({
    id: "custom-class-config",
    artifactName: "AppConfig",
    artifactType: "CustomClass",
    fileName: "app_config.dart",
    code: "class AppConfig { const AppConfig({required this.token}); final String token; }",
  });

  assert.deepEqual(findings, []);
});

test("accepts a non-nullable field supplied by a constructor initializer list", () => {
  const findings = getWidgetRuleFindings(`
    class StepBadge extends StatefulWidget {
      const StepBadge({super.key, this.width, this.height}) : value = 1;
      final double? width;
      final double? height;
      final int value;
      @override
      State<StepBadge> createState() => _StepBadgeState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("accepts an initializer list that derives a non-nullable field from a nullable parameter", () => {
  const findings = getWidgetRuleFindings(`
    class RatingStars extends StatefulWidget {
      const RatingStars({super.key, double? rating, this.width})
          : value = rating ?? 0.0;
      final double? width;
      final double value;
      @override
      State<RatingStars> createState() => _RatingStarsState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("still flags a non-nullable field no constructor supplies", () => {
  const findings = getWidgetRuleFindings(`
    class BrokenBadge extends StatefulWidget {
      const BrokenBadge({super.key, this.width}) : other = 1;
      final double? width;
      final int other;
      final double value;
      @override
      State<BrokenBadge> createState() => _BrokenBadgeState();
    }
  `);

  assert.deepEqual(findings.map((finding) => finding.id), ["non-nullable-public-field"]);
});

test("a sibling widget's default does not rescue another widget's unsupplied field", () => {
  const findings = getWidgetRuleFindings(`
    class PriceTag extends StatefulWidget {
      const PriceTag({super.key, this.width});
      final double? width;
      final double value;
      @override
      State<PriceTag> createState() => _PriceTagState();
    }
    class PriceSlider extends StatefulWidget {
      const PriceSlider({super.key, this.value = 1.0});
      final double value;
      @override
      State<PriceSlider> createState() => _PriceSliderState();
    }
  `);

  assert.deepEqual(findings.map((finding) => finding.id), ["non-nullable-public-field"]);
});

test("a sibling widget's initializer list does not rescue another widget's field either", () => {
  const findings = getWidgetRuleFindings(`
    class BadgeA extends StatefulWidget {
      const BadgeA({super.key});
      final int count;
      @override
      State<BadgeA> createState() => _BadgeAState();
    }
    class BadgeB extends StatefulWidget {
      const BadgeB({super.key}) : count = 3;
      final int count;
      @override
      State<BadgeB> createState() => _BadgeBState();
    }
  `);

  assert.deepEqual(findings.map((finding) => finding.id), ["non-nullable-public-field"]);
});

test("two public widgets that are each individually sound stay clean", () => {
  const findings = getWidgetRuleFindings(`
    class PriceTag extends StatefulWidget {
      const PriceTag({super.key, this.value = 0.0});
      final double value;
      @override
      State<PriceTag> createState() => _PriceTagState();
    }
    class PriceSlider extends StatefulWidget {
      const PriceSlider({super.key, this.value});
      final double? value;
      @override
      State<PriceSlider> createState() => _PriceSliderState();
    }
  `);

  assert.deepEqual(findings, []);
});

test("required in one public widget is flagged even when a sibling is clean", () => {
  const findings = getWidgetRuleFindings(`
    class CleanOne extends StatefulWidget {
      const CleanOne({super.key, this.width});
      final double? width;
      @override
      State<CleanOne> createState() => _CleanOneState();
    }
    class BrokenOne extends StatefulWidget {
      const BrokenOne({super.key, required this.label});
      final String label;
      @override
      State<BrokenOne> createState() => _BrokenOneState();
    }
  `);

  assert.deepEqual(findings.map((finding) => finding.id).sort(), [
    "non-nullable-public-field",
    "required-public-param",
  ]);
});

test("a widget FlutterFlow cannot construct blocks the deploy, not just the review", () => {
  // The reported case: one placeable widget and one with `required this.value`
  // in the same file. The review called it blocking while the deploy gate,
  // which reads these errors, still let the file through.
  const errors = getBlockingWidgetErrors(`
    class BrandBadge extends StatelessWidget {
      const BrandBadge({super.key, this.width, this.value = 0.0});
      final double? width;
      final double value;
    }
    class BrandBanner extends StatelessWidget {
      const BrandBanner({super.key, this.width, required this.value});
      final double? width;
      final double value;
    }
  `);

  assert.equal(errors.length, 2);
  assert.ok(errors.every((message) => typeof message === "string" && message.length > 0));
});

test("a placeable widget carrying only a warning still deploys", () => {
  const errors = getBlockingWidgetErrors(`
    class Banner extends StatelessWidget {
      const Banner({super.key, this.imagePath});
      final String? imagePath;
      @override
      Widget build(BuildContext context) => Image.asset(imagePath ?? "");
    }
  `);

  assert.deepEqual(errors, []);
});
