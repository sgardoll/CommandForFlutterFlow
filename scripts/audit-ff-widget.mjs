#!/usr/bin/env node
/**
 * audit-ff-widget.mjs - compile-level conformance audit for FlutterFlow custom
 * widgets, for use during development.
 *
 * Adapted from ff_widget_audit.mjs by DanLika
 * (https://gist.github.com/DanLika/1b775045a4869bddc09a014cec7cfd1d).
 *
 * src/flutterFlowArtifactValidation.js can only pattern-match. This harness adds
 * the two things a pattern cannot do:
 *
 *   Stage 1 COMPILE   drops the widget into a real FlutterFlow export and runs
 *                     `flutter analyze` against real FF scaffolding, so the
 *                     verdict is the analyzer's rather than a regex's.
 *   Stage 2 NULL-CALL synthesises the constructor calls FlutterFlow actually
 *                     emits and compiles THOSE, turning "parameters must be
 *                     nullable" into a quoted compiler error or into silence.
 *
 * Stage 3 deliberately imports the shipped rules instead of restating them:
 * two copies of a rule set drift, and a stale copy here would disagree with
 * what actually gates a deploy.
 *
 * Usage:
 *   node scripts/audit-ff-widget.mjs <file.dart|dir>... --export <generated_code>
 *   node scripts/audit-ff-widget.mjs --self-test        --export <generated_code>
 *
 * Run `flutter pub get` in the export once before the first audit. Audit files
 * go into an isolated symlink worktree under os.tmpdir(), so the live export is
 * never written to and FlutterFlow Desktop cannot race the harness.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync,
  statSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  calibrateWidgetRules,
  getWidgetRuleFindings,
} from "../src/flutterFlowArtifactValidation.js";

const FF_HEADER_TEMPLATE = `// Automatic FlutterFlow imports
import '/backend/schema/structs/index.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/custom_code/widgets/index.dart'; // Imports other custom widgets
import '/custom_code/actions/index.dart'; // Imports custom actions
import '/flutter_flow/custom_functions.dart'; // Imports custom functions
import 'package:flutter/material.dart';
// Begin custom widget code
// DO NOT REMOVE OR MODIFY THE CODE ABOVE!
`;

// FlutterFlow only emits a header line for scaffolding the project actually
// has: an export with no Data Types has no /backend/schema/structs/index.dart.
// Pasting the full template into such an export makes the harness produce its
// own `uri_does_not_exist` error and report it against the widget. Measured on
// a real export - the self-test refused to go green until this was filtered.
let FF_HEADER = FF_HEADER_TEMPLATE;

function configureHeader(exportDir) {
  FF_HEADER = FF_HEADER_TEMPLATE
    .split("\n")
    .filter((line) => {
      const uri = (/^\s*import\s+['"]\/([^'"]+)['"]/.exec(line) || [])[1];
      return uri === undefined || existsSync(join(exportDir, "lib", uri));
    })
    .join("\n");
}

// FlutterFlow's OWN shipped widgets produce these against this header, so they
// are the instrument's noise floor, not a finding about the widget.
const BOILERPLATE_NOISE = /unused_import|unnecessary_import/;

const COLOR = {
  red: "\x1b[31m", yellow: "\x1b[33m", green: "\x1b[32m",
  dim: "\x1b[2m", bold: "\x1b[1m", off: "\x1b[0m",
};

const paint = (severity, text) =>
  (severity === "error" ? COLOR.red : severity === "warning" ? COLOR.yellow : COLOR.dim)
  + text + COLOR.off;

/** Blanks comments and string bodies so patterns never match prose. */
function strip(code) {
  let out = "";
  let i = 0;

  while (i < code.length) {
    const pair = code.slice(i, i + 2);

    if (pair === "//") {
      while (i < code.length && code[i] !== "\n") i++;
      out += " ";
    } else if (pair === "/*") {
      i += 2;
      while (i < code.length && code.slice(i, i + 2) !== "*/") i++;
      i += 2;
      out += " ";
    } else if (code[i] === "'" || code[i] === '"') {
      const quote = code[i];
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === "\\") i++;
        i++;
      }
      i++;
      out += '""';
    } else {
      out += code[i];
      i++;
    }
  }

  return out;
}

/**
 * [A-Z] is deliberate: a private helper (`_Row extends StatelessWidget`) is not
 * placeable from the FlutterFlow panel and must never become the audit subject.
 */
function readWidgetClassName(code) {
  const match = /class\s+([A-Z]\w*)\s+extends\s+Stat(?:eless|eful)Widget/.exec(strip(code));
  return match ? match[1] : null;
}

function readClassSpan(code, className) {
  const header = new RegExp(`class\\s+${className}\\b[^{]*\\{`).exec(code);
  if (!header) return null;

  let depth = 0;

  for (let i = header.index + header[0].length - 1; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}" && --depth === 0) return code.slice(header.index, i + 1);
  }

  return null;
}

/**
 * Reads the widget's OWN constructor parameters - the only names FlutterFlow's
 * Define Parameters panel can emit. Collecting `final` fields off the whole file
 * instead pushes helper-class fields into the synthesized call and manufactures
 * "isn't defined" errors that belong to the harness, not the widget.
 */
function readConstructorParams(code, className) {
  const body = readClassSpan(strip(code), className);
  if (!body) return { named: [] };

  const ctor = new RegExp(`(?:const\\s+)?${className}\\s*\\(`).exec(body);
  if (!ctor) return { named: [] };

  let depth = 0;
  let i = ctor.index + ctor[0].length - 1;
  const start = i + 1;

  for (; i < body.length; i++) {
    if (body[i] === "(") depth++;
    else if (body[i] === ")" && --depth === 0) break;
  }

  const source = body.slice(start, i);
  const braceStart = source.indexOf("{");
  if (braceStart === -1) return { named: [] };

  const namedSource = source.slice(braceStart + 1, source.lastIndexOf("}"));
  const parts = [];
  let nesting = 0;
  let current = "";

  for (const char of namedSource) {
    if ("({[<".includes(char)) nesting++;
    else if (")}]>".includes(char)) nesting--;

    if (char === "," && nesting === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);

  const named = parts.map((part) => part.trim()).filter(Boolean).flatMap((part) => {
    if (/\bsuper\.key\b|Key\?\s*key/.test(part)) return [];
    const name = (/this\.(\w+)/.exec(part) || /(\w+)\s*(?:=|$)/.exec(part) || [])[1];
    return name ? [name] : [];
  });

  return { named };
}

const hasFfHeader = (code) => /DO NOT REMOVE OR MODIFY THE CODE ABOVE/.test(code);

/**
 * Prepends FlutterFlow's real header, dropping imports it already provides.
 * Matching on the import URI rather than the whole line matters: FF's header
 * carries trailing comments that generated files omit, so a line-equality
 * filter leaves duplicates behind and the harness reports its own noise as a
 * defect of the widget.
 */
function withFfHeader(code) {
  if (hasFfHeader(code)) return code;

  const readUri = (line) => (/^\s*import\s+['"]([^'"]+)['"]/.exec(line) || [])[1];
  const headerUris = new Set((FF_HEADER.match(/^import .*$/gm) || []).map(readUri));
  const body = code
    .split("\n")
    .filter((line) => !headerUris.has(readUri(line)))
    .join("\n")
    .replace(/^\s*\/\/ Automatic FlutterFlow imports\s*$/m, "");

  return `${FF_HEADER}\n${body}`;
}

/**
 * Builds an isolated analyze root: symlink the live export, but keep
 * lib/custom_code/widgets/ a REAL directory so `_audit_*` files never land in
 * the project FlutterFlow Desktop is watching. package_config.json is copied
 * rather than symlinked so its `rootUri: "../"` resolves to this worktree.
 */
function openWorktree(exportDir) {
  const root = mkdtempSync(join(tmpdir(), "ffaudit-wt-"));

  for (const name of readdirSync(exportDir)) {
    if (name === "lib" || name === ".dart_tool" || name === "build") continue;
    symlinkSync(join(exportDir, name), join(root, name));
  }

  const walkLib = (rel) => {
    for (const name of readdirSync(join(exportDir, rel))) {
      const source = join(exportDir, rel, name);
      const relPath = join(rel, name);
      const destination = join(root, relPath);

      if (statSync(source).isDirectory()) {
        mkdirSync(destination, { recursive: true });
        if (relPath.replace(/\\/g, "/") === "lib/custom_code/widgets") {
          for (const file of readdirSync(source)) {
            symlinkSync(join(source, file), join(destination, file));
          }
        } else {
          walkLib(relPath);
        }
      } else {
        mkdirSync(dirname(destination), { recursive: true });
        symlinkSync(source, destination);
      }
    }
  };

  walkLib("lib");
  mkdirSync(join(root, ".dart_tool"), { recursive: true });
  writeFileSync(
    join(root, ".dart_tool/package_config.json"),
    readFileSync(join(exportDir, ".dart_tool/package_config.json")),
  );

  for (const name of readdirSync(join(exportDir, ".dart_tool"))) {
    if (name === "package_config.json") continue;
    symlinkSync(join(exportDir, ".dart_tool", name), join(root, ".dart_tool", name));
  }

  return root;
}

function runAnalyzer(workDir, relPaths) {
  try {
    execFileSync("flutter", ["analyze", ...relPaths], {
      cwd: workDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
    return [];
  } catch (error) {
    const text = `${error.stdout || ""}${error.stderr || ""}`;

    if (/Unable to find|No such file|command not found/.test(text) && !/•/.test(text)) {
      throw new Error(`flutter analyze could not run:\n${text.trim()}`);
    }

    return text.split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(error|warning|info)\s+•/.test(line))
      .map((line) => {
        const [severity, ...rest] = line.split("•").map((part) => part.trim());
        return { severity, message: rest[0] || "", where: rest[1] || "", code: rest[2] || "" };
      });
  }
}

/** Stage 1: compile the widget against real FlutterFlow scaffolding. */
function stageCompile(workDir, code, tag) {
  const rel = `lib/custom_code/widgets/_audit_${tag}.dart`;
  writeFileSync(join(workDir, rel), withFfHeader(code));

  try {
    const all = runAnalyzer(workDir, [rel]);
    return {
      errors: all.filter((d) => d.severity === "error"),
      warnings: all.filter((d) => d.severity === "warning" && !BOILERPLATE_NOISE.test(d.code)),
      suppressed: all.filter((d) => BOILERPLATE_NOISE.test(d.code)).length,
    };
  } finally {
    try { unlinkSync(join(workDir, rel)); } catch { /* already gone */ }
  }
}

/**
 * Stage 2: compile the two constructor calls FlutterFlow emits, in SEPARATE
 * files so a failure attributes by construction rather than by guessing at
 * error codes.
 *
 *   A  nothing set - `Cls()`, what FF emits when every Define Parameters field
 *      is left blank. Unset parameters are omitted, not passed as null. An
 *      error here is a hard fail: the widget cannot be placed at all.
 *   B  all null    - `Cls(a: null, ...)`, what a parameter bound to a nullable
 *      value degenerates to. An error only here is a warning: defaults rescue
 *      the blank panel, but any null binding breaks it.
 *
 * Merging the two shapes reports a defaulted non-nullable widget - which
 * FlutterFlow instantiates fine - as "cannot instantiate". Hence the split.
 *
 * The import is prefixed `as aud` because the audited class often also arrives
 * via the header's index.dart export, and an unprefixed name is ambiguous.
 */
function stageNullCall(workDir, code, tag) {
  const className = readWidgetClassName(code);
  if (!className) return { skipped: "no widget class found" };

  const widgetRel = `lib/custom_code/widgets/_audit_${tag}.dart`;
  const callARel = `lib/custom_code/widgets/_audit_call_a_${tag}.dart`;
  const callBRel = `lib/custom_code/widgets/_audit_call_b_${tag}.dart`;
  const allNull = readConstructorParams(code, className).named
    .map((name) => `${name}: null`)
    .join(", ");

  writeFileSync(join(workDir, widgetRel), withFfHeader(code));
  writeFileSync(join(workDir, callARel),
    `${FF_HEADER}\nimport '_audit_${tag}.dart' as aud;\n\nWidget ffEmitsNothingSet() => aud.${className}();\n`);
  writeFileSync(join(workDir, callBRel),
    `${FF_HEADER}\nimport '_audit_${tag}.dart' as aud;\n\nWidget ffEmitsEveryFieldNull() => aud.${className}(${allNull});\n`);

  try {
    const diagnostics = runAnalyzer(workDir, [callARel, callBRel])
      .filter((d) => d.severity === "error");
    const inFile = (rel) => diagnostics.filter((d) => d.where.includes(basename(rel)));

    return {
      exercisedFields: readConstructorParams(code, className).named.length,
      hard: inFile(callARel),
      soft: inFile(callBRel),
    };
  } finally {
    for (const rel of [widgetRel, callARel, callBRel]) {
      try { unlinkSync(join(workDir, rel)); } catch { /* already gone */ }
    }
  }
}

function auditFile(path, workDir) {
  const raw = readFileSync(path, "utf8");
  const tag = basename(path).replace(/\W/g, "_").toLowerCase();
  const className = readWidgetClassName(raw);
  const compile = stageCompile(workDir, raw, tag);

  // Stage 1 errors make a blank-panel call meaningless; reporting "compiles"
  // there greenwashes a broken widget.
  let nullCall;
  if (!className) {
    nullCall = { skipped: "no widget class found" };
  } else if (compile.errors.length > 0) {
    nullCall = {
      blocked: `stage 1 has ${compile.errors.length} compile error(s) - blank-panel call not meaningful until the widget itself compiles`,
      hard: [], soft: [], exercisedFields: 0,
    };
  } else {
    nullCall = stageNullCall(workDir, raw, tag);
  }

  return { path, className, findings: getWidgetRuleFindings(raw), compile, nullCall };
}

function printReport(report) {
  const subject = report.className ? `(${report.className})` : "(no widget class)";
  console.log(`\n${COLOR.bold}=== ${basename(report.path)} ${subject} ===${COLOR.off}`);

  console.log(`\n  ${COLOR.bold}1. COMPILE${COLOR.off} - flutter analyze against a real FlutterFlow export`);
  const diagnostics = [...report.compile.errors, ...report.compile.warnings];
  if (diagnostics.length === 0) {
    console.log(`     ${COLOR.green}clean${COLOR.off}  ${COLOR.dim}(${report.compile.suppressed} boilerplate import notices suppressed)${COLOR.off}`);
  }
  for (const d of diagnostics) {
    console.log(`     ${paint(d.severity, d.severity.padEnd(7))} ${d.message}  ${COLOR.dim}${d.code}${COLOR.off}`);
  }

  console.log(`\n  ${COLOR.bold}2. NULL-CALL${COLOR.off} - the constructor calls FlutterFlow actually emits`);
  if (report.nullCall.skipped) {
    console.log(`     ${COLOR.dim}skipped: ${report.nullCall.skipped}${COLOR.off}`);
  } else if (report.nullCall.blocked) {
    console.log(`     ${COLOR.dim}blocked: ${report.nullCall.blocked}${COLOR.off}`);
  } else if (report.nullCall.hard.length > 0) {
    console.log(`     ${COLOR.red}HARD FAIL${COLOR.off} - the blank-panel call \`${report.className}()\` does not compile; the widget cannot be placed at all:`);
    for (const d of report.nullCall.hard.slice(0, 6)) console.log(`       ${COLOR.red}error${COLOR.off} ${d.message}`);
  } else if (report.nullCall.soft.length > 0) {
    console.log(`     ${COLOR.green}blank panel OK${COLOR.off} (defaults rescue it), ${COLOR.yellow}but any parameter bound to a null value fails:${COLOR.off}`);
    for (const d of report.nullCall.soft.slice(0, 6)) console.log(`       ${COLOR.yellow}warning${COLOR.off} ${d.message}`);
  } else {
    console.log(`     ${COLOR.green}compiles${COLOR.off} blank and with all ${report.nullCall.exercisedFields} parameters explicitly null`);
  }

  console.log(`\n  ${COLOR.bold}3. RULES${COLOR.off} - the same rules that gate a deploy`);
  if (report.findings.length === 0) console.log(`     ${COLOR.green}none triggered${COLOR.off}`);
  for (const finding of report.findings) {
    console.log(`     ${paint(finding.severity, finding.severity.padEnd(7))} ${COLOR.bold}${finding.id}${COLOR.off}`);
    console.log(`             ${finding.message}`);
  }
}

const SELF_TEST_WIDGETS = {
  // required param -> blank-panel call must not compile
  "hard_required.dart": `class HardRequired extends StatefulWidget {
  const HardRequired({Key? key, required this.value}) : super(key: key);
  final double value;
  @override State<HardRequired> createState() => _HardRequiredState();
}
class _HardRequiredState extends State<HardRequired> {
  @override Widget build(BuildContext context) => Text('\${widget.value}');
}`,
  // defaulted non-nullable -> blank panel fine, explicit null fails
  "soft_defaulted.dart": `class SoftDefaulted extends StatefulWidget {
  const SoftDefaulted({Key? key, this.value = 1.0}) : super(key: key);
  final double value;
  @override State<SoftDefaulted> createState() => _SoftDefaultedState();
}
class _SoftDefaultedState extends State<SoftDefaulted> {
  @override Widget build(BuildContext context) => Text('\${widget.value}');
}`,
  // fully nullable -> compiles both ways
  "clean_nullable.dart": `class CleanNullable extends StatefulWidget {
  const CleanNullable({Key? key, this.width, this.height}) : super(key: key);
  final double? width;
  final double? height;
  @override State<CleanNullable> createState() => _CleanNullableState();
}
class _CleanNullableState extends State<CleanNullable> {
  @override Widget build(BuildContext context) => SizedBox(width: widget.width, height: widget.height);
}`,
  // does not compile -> stage 2 must be blocked, never greenwashed
  "blocked_garbage.dart": `class BlockedGarbage extends StatefulWidget {
  const BlockedGarbage({Key? key}) : super(key: key);
  @override State<BlockedGarbage> createState() => _BlockedGarbageState();
}
class _BlockedGarbageState extends State<BlockedGarbage> {
  @override Widget build(BuildContext context) => ThisTypeDoesNotExist();
}`,
};

const SELF_TEST_CONTROLS = [
  {
    id: "hard-required",
    file: "hard_required.dart",
    check: (r) => !r.nullCall.blocked && r.nullCall.hard.length > 0,
    fail: "a required param must HARD FAIL the blank-panel call",
  },
  {
    id: "soft-defaulted",
    file: "soft_defaulted.dart",
    check: (r) => !r.nullCall.blocked && r.nullCall.hard.length === 0 && r.nullCall.soft.length > 0,
    fail: "a defaulted non-nullable must be blank-OK but fail the null binding",
  },
  {
    id: "clean-nullable",
    file: "clean_nullable.dart",
    check: (r) => r.compile.errors.length === 0 && !r.nullCall.blocked
      && r.nullCall.hard.length === 0 && r.nullCall.soft.length === 0,
    fail: "an all-nullable widget must compile blank and with explicit nulls",
  },
  {
    id: "blocked-garbage",
    file: "blocked_garbage.dart",
    check: (r) => r.compile.errors.length > 0 && Boolean(r.nullCall.blocked),
    fail: "stage-1 errors must block stage 2 (no greenwashed 'compiles')",
  },
];

function runSelfTest(workDir) {
  const scratch = mkdtempSync(join(tmpdir(), "ffaudit-controls-"));
  let failed = 0;

  for (const [name, source] of Object.entries(SELF_TEST_WIDGETS)) {
    writeFileSync(join(scratch, name), source);
  }

  for (const control of SELF_TEST_CONTROLS) {
    const report = auditFile(join(scratch, control.file), workDir);
    printReport(report);
    const ok = control.check(report);
    console.log(`\n  control ${control.id}: ${ok ? `${COLOR.green}PASS${COLOR.off}` : `${COLOR.red}FAIL - ${control.fail}${COLOR.off}`}`);
    if (!ok) failed++;
  }

  rmSync(scratch, { recursive: true, force: true });
  return failed;
}

function main() {
  const argv = process.argv.slice(2);
  const exportIndex = argv.indexOf("--export");
  const exportDir = exportIndex !== -1 ? resolve(argv[exportIndex + 1]) : process.env.FF_EXPORT;
  const targets = argv.filter((arg, i) => !arg.startsWith("--") && i !== exportIndex + 1);
  const selfTest = argv.includes("--self-test");

  if (!exportDir) {
    console.error("Need --export <path to a FlutterFlow generated_code dir> (or $FF_EXPORT).");
    console.error("Run `flutter pub get` in it once before the first audit.");
    process.exit(2);
  }
  if (!existsSync(join(exportDir, ".dart_tool/package_config.json"))) {
    console.error(`No package_config in ${exportDir} - run \`flutter pub get\` there first.`);
    process.exit(2);
  }

  // A rule that cannot flag its own positive control reports nothing, and its
  // silence would read as a clean widget. Surface that before any verdict.
  const voided = calibrateWidgetRules().filter((result) => !result.usable);
  console.log(`${COLOR.bold}Rule calibration${COLOR.off} - a rule reports only after flagging its positive control and staying silent on its negative one.`);
  console.log(`  usable ${calibrateWidgetRules().length - voided.length}/${calibrateWidgetRules().length}`);
  for (const result of voided) {
    console.log(`  ${COLOR.red}VOID${COLOR.off} ${result.id} - positive:${result.positiveOk ? "ok" : "FAILED"} negative:${result.negativeOk ? "ok" : "FAILED"} (suppressed, will not report)`);
  }

  configureHeader(exportDir);

  const liveWidgets = join(exportDir, "lib/custom_code/widgets");
  const liveBefore = new Set(existsSync(liveWidgets) ? readdirSync(liveWidgets) : []);
  const workDir = openWorktree(exportDir);

  try {
    let failures = 0;

    if (selfTest) {
      failures = runSelfTest(workDir);
    } else {
      const files = targets.flatMap((target) => statSync(target).isDirectory()
        ? readdirSync(target)
          .filter((name) => name.endsWith(".dart") && name !== "index.dart")
          .map((name) => join(target, name))
        : [target]);

      if (files.length === 0) {
        console.error("\nNo .dart files given. Pass files or a directory, or --self-test.");
        process.exit(2);
      }

      for (const file of files) {
        const report = auditFile(file, workDir);
        printReport(report);
        failures += report.compile.errors.length
          + (report.nullCall.hard?.length || 0)
          + report.findings.filter((finding) => finding.severity === "error").length;
      }
    }

    const liveAfter = new Set(existsSync(liveWidgets) ? readdirSync(liveWidgets) : []);
    const leaked = [...liveAfter].filter((name) => !liveBefore.has(name));

    console.log(`\n${COLOR.bold}--- verdict ---${COLOR.off}`);
    console.log(`  isolation (live export untouched): ${leaked.length === 0 ? `${COLOR.green}PASS${COLOR.off}` : `${COLOR.red}FAIL - leaked ${leaked.join(", ")}${COLOR.off}`}`);
    console.log(`  ${failures} error-level finding(s)`);
    if (voided.length > 0) {
      console.log(`${COLOR.red}  ${voided.length} rule(s) VOID - their silence proves nothing.${COLOR.off}`);
    }

    process.exit(failures > 0 || leaked.length > 0 ? 1 : 0);
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

main();
