import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedWidgetClassFromFileName,
  findUnbalancedBracketError,
  getDeclaredWidgetClasses,
  sanitizeGeneratedDart,
  widgetFileNameForClass,
} from "./flutterFlowCodeSanitizer.js";

const SIMPLE_WIDGET = [
  "class LiquidGlassOrbs extends StatefulWidget {",
  "  const LiquidGlassOrbs({super.key});",
  "  @override",
  "  State<LiquidGlassOrbs> createState() => _LiquidGlassOrbsState();",
  "}",
].join("\n");

test("sanitizeGeneratedDart leaves plain Dart untouched apart from edge padding", () => {
  assert.equal(sanitizeGeneratedDart(`\n\n${SIMPLE_WIDGET}\n\n`), SIMPLE_WIDGET);
});

test("sanitizeGeneratedDart strips dart-fenced responses", () => {
  assert.equal(
    sanitizeGeneratedDart("```dart\n" + SIMPLE_WIDGET + "\n```"),
    SIMPLE_WIDGET,
  );
});

test("sanitizeGeneratedDart strips bare fences and surrounding prose", () => {
  const raw = [
    "Here is your widget:",
    "",
    "```",
    SIMPLE_WIDGET,
    "```",
    "Let me know if you need changes!",
  ].join("\n");

  assert.equal(sanitizeGeneratedDart(raw), SIMPLE_WIDGET);
});

test("sanitizeGeneratedDart removes interior fence lines from multi-block responses", () => {
  const raw = [
    "```dart",
    "class A extends StatelessWidget {}",
    "```",
    "And another:",
    "```dart",
    "class B extends StatelessWidget {}",
    "```",
  ].join("\n");
  const result = sanitizeGeneratedDart(raw);

  assert.equal(result.includes("```"), false);
  assert.match(result, /class A extends/);
  assert.match(result, /class B extends/);
});

test("sanitizeGeneratedDart keeps the code side of a single truncated fence", () => {
  assert.equal(sanitizeGeneratedDart("```\n" + SIMPLE_WIDGET), SIMPLE_WIDGET);
  assert.equal(sanitizeGeneratedDart(SIMPLE_WIDGET + "\n```"), SIMPLE_WIDGET);
});

test("sanitizeGeneratedDart strips a BOM", () => {
  assert.equal(sanitizeGeneratedDart("\uFEFF" + SIMPLE_WIDGET), SIMPLE_WIDGET);
});

test("sanitizeGeneratedDart returns empty for empty or blank input", () => {
  assert.equal(sanitizeGeneratedDart(""), "");
  assert.equal(sanitizeGeneratedDart("   \n\t "), "");
  assert.equal(sanitizeGeneratedDart(null), "");
  assert.equal(sanitizeGeneratedDart(undefined), "");
});

test("getDeclaredWidgetClasses finds public Stateless and Stateful widgets in order", () => {
  const code = [
    "class First extends StatelessWidget {}",
    "class _Private extends StatelessWidget {}",
    "class NotAWidget extends Object {}",
    "class Second extends StatefulWidget {}",
  ].join("\n");

  assert.deepEqual(getDeclaredWidgetClasses(code), ["First", "Second"]);
});

test("getDeclaredWidgetClasses accepts transitive Widget superclasses", () => {
  const code = "class Consumer extends ConsumerStatefulWidget {}";

  assert.deepEqual(getDeclaredWidgetClasses(code), ["Consumer"]);
});

test("getDeclaredWidgetClasses ignores class-shaped prose in comments and strings", () => {
  const code = [
    "// class Fake extends StatelessWidget should not count.",
    "final hint = 'class FakeToo extends StatefulWidget';",
    "class Real extends StatelessWidget {}",
  ].join("\n");

  assert.deepEqual(getDeclaredWidgetClasses(code), ["Real"]);
});

test("findUnbalancedBracketError accepts healthy widget code", () => {
  const code = [
    "class W extends StatelessWidget {",
    "  // braces } in a comment { don't count",
    "  final label = 'text with ) and (';",
    "  @override",
    "  Widget build(BuildContext context) {",
    "    return Text('${user['name']}: {literal}');",
    "  }",
    "}",
  ].join("\n");

  assert.equal(findUnbalancedBracketError(code), null);
});

test("findUnbalancedBracketError reports the line of an unclosed bracket", () => {
  const code = "\n{\n  x();\n";

  const error = findUnbalancedBracketError(code);
  assert.match(error, /"\{" opened on line 2 is never closed/);
});

test("findUnbalancedBracketError reports an extra closer", () => {
  const error = findUnbalancedBracketError("void a() {}\n}");

  assert.match(error, /line 2.*unexpected "\}"/);
});

test("findUnbalancedBracketError reports mismatched pairs precisely", () => {
  const error = findUnbalancedBracketError("void a() {\n]");

  assert.match(error, /"\]" closes nothing - "\{" opened on line 1/);
});

test("findUnbalancedBracketError ignores brackets inside triple-quoted strings", () => {
  const code = [
    "/// Docs:",
    'const doc = """',
    "unclosed { [ ( stuff",
    '""";',
    "void main() {}",
  ].join("\n");

  assert.equal(findUnbalancedBracketError(code), null);
});

test("findUnbalancedBracketError reports an unterminated triple-quoted string", () => {
  const error = findUnbalancedBracketError("const doc = '''\nnever ended {");

  assert.match(error, /unclosed triple-quoted string/);
});

test("findUnbalancedBracketError lets a runaway quote self-heal at end of line", () => {
  // A stray single quote cannot legally span lines in Dart; swallowing the
  // rest of the file would misattribute every later bracket, so the scan ends
  // the string at the newline instead of reporting it.
  const code = "final x = 'oops;\nvoid main() {}";

  assert.equal(findUnbalancedBracketError(code), null);
});

test("findUnbalancedBracketError handles nested interpolation strings", () => {
  // items[0]'s brackets sit inside the ${...} interpolation of a string; the
  // nested ['...'] quotes must not terminate the outer string early.
  assert.equal(findUnbalancedBracketError("f('${items[0]}');"), null);
  assert.equal(findUnbalancedBracketError("t('${m['k']} v');"), null);

  // A quote left open inside an interpolation is still a real defect.
  const error = findUnbalancedBracketError("f('${a[');");
  assert.match(error, /unclosed string/);
});

test("widget file naming round-trips through FlutterFlow's naive snake_case", () => {
  assert.equal(widgetFileNameForClass("LiquidGlassOrbs"), "liquid_glass_orbs.dart");
  assert.equal(expectedWidgetClassFromFileName("liquid_glass_orbs.dart"), "LiquidGlassOrbs");

  // Acronyms: FF's naive stem puts an underscore before EVERY capital, so the
  // inverse must rebuild "QAReport" from "q_a_report".
  assert.equal(widgetFileNameForClass("QAReport"), "q_a_report.dart");
  assert.equal(expectedWidgetClassFromFileName("q_a_report.dart"), "QAReport");
});

test("STU-147 scenario: fenced response with display-name artifact resolves cleanly", () => {
  // The reported failure: LLM output wrapped in fences, artifact named
  // "Liquid Glass Orbs" (display form), class declared as LiquidGlassOrbs.
  const generated = [
    "```dart",
    SIMPLE_WIDGET,
    "```",
  ].join("\n");
  const artifactName = "Liquid Glass Orbs";

  const code = sanitizeGeneratedDart(generated);
  const [declared] = getDeclaredWidgetClasses(code);
  const fileName = widgetFileNameForClass(declared);

  assert.equal(declared, "LiquidGlassOrbs");
  assert.equal(fileName, "liquid_glass_orbs.dart");
  // The committed name is exactly what FF derives from its own side.
  assert.equal(expectedWidgetClassFromFileName(fileName), declared);
  assert.equal(findUnbalancedBracketError(code), null);
});
