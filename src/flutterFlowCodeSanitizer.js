import { deriveIdentifierName } from "./flutterFlowSyncMetadata.js";
import { identifierToFlutterFlowFileStem } from "./flutterFlowArtifactValidation.js";

// LLM responses routinely arrive wrapped in markdown code fences, with a BOM,
// or with prose before/after the Dart. FlutterFlow's push-time formatter
// rejects any of that with "Custom widget code is not formattable", so it must
// be stripped before the code is validated or committed.
const FENCE_LINE_PATTERN = /^\s*```/;
const BOM_PATTERN = /^\uFEFF/;

function trimBlankEdgeLines(lines) {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;

  return lines.slice(start, end).join("\n");
}

/**
 * Removes markdown artifacts and surrounding junk from generated Dart.
 *
 * Fence lines are dropped wherever they appear: a ``` never occurs in valid
 * widget Dart, while leaving one in guarantees FlutterFlow rejects the file as
 * unformattable. With a single fence line (a truncated response), whichever
 * side holds more content is kept. Blank edge lines are trimmed so the header
 * application in prepareCodeForCommit starts from clean source.
 * @param {string} rawCode - Raw generated response text
 * @returns {string} Dart-only source, empty when the input has no content
 */
export function sanitizeGeneratedDart(rawCode) {
  const code = String(rawCode ?? "").replace(BOM_PATTERN, "");
  if (!code.trim()) return "";

  const lines = code.split("\n");
  const fenceIndexes = [];
  for (let index = 0; index < lines.length; index++) {
    if (FENCE_LINE_PATTERN.test(lines[index])) fenceIndexes.push(index);
  }

  // No fences: still trim blank edges (prose-free but often padded).
  if (fenceIndexes.length === 0) return trimBlankEdgeLines(lines);

  // Exactly one fence line means a truncated or partial wrap; keep the side
  // that actually carries code instead of emitting an empty or doubled file.
  if (fenceIndexes.length === 1) {
    const [only] = fenceIndexes;
    const before = trimBlankEdgeLines(lines.slice(0, only));
    const after = trimBlankEdgeLines(lines.slice(only + 1));
    return after.length >= before.length ? after : before;
  }

  // Wrapped response: everything between the first and last fence line is the
  // code; prose outside the pair is dropped along with any interior fence
  // lines (multi-block responses).
  const fenced = new Set(fenceIndexes);
  return trimBlankEdgeLines(
    lines.slice(fenceIndexes[0] + 1, fenceIndexes[fenceIndexes.length - 1])
      .filter((_, index) => !fenced.has(index + fenceIndexes[0] + 1)),
  );
}

/**
 * Blanks comments and string literal bodies so name detection never matches
 * prose. Order matters: block comments first (they may contain // and quotes),
 * then line comments, then triple-quoted strings, then ordinary strings.
 * @param {string} code - Dart source
 * @returns {string} Source with comment/string content removed
 */
function stripCommentsAndStringBodies(code) {
  return String(code ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/'''[\s\S]*?'''/g, '""')
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, '""')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

/**
 * Names of the public widget classes declared in Dart source. FlutterFlow can
 * place any public class whose superclass is a Widget - not only a literal
 * `StatelessWidget`/`StatefulWidget`: `ConsumerStatefulWidget`,
 * `StatelessHookWidget`, and other transitive Widget subclasses place
 * normally, so matching "extends <something>Widget" covers them without
 * false-rejecting a healthy single-file widget. Private (underscore-prefixed)
 * helpers are excluded: FlutterFlow never places them directly.
 * @param {string} code - Dart source
 * @returns {string[]} Declared public widget class names, in declaration order
 */
export function getDeclaredWidgetClasses(code) {
  const stripped = stripCommentsAndStringBodies(code);
  return Array.from(
    stripped.matchAll(/class\s+([A-Z]\w*)\s+extends\s+[A-Za-z_]\w*Widget\b/g),
    (match) => match[1],
  );
}

/**
 * The file name FlutterFlow expects for a widget class: its naive snake_case
 * of the identifier (`LiquidGlassOrbs` -> `liquid_glass_orbs.dart`). FF reads
 * the widget's identity back out of the committed file name, so this is the
 * only name under which the class is findable.
 * @param {string} className - Public widget class name
 * @returns {string} File name to commit the class under
 */
export function widgetFileNameForClass(className) {
  return `${identifierToFlutterFlowFileStem(className)}.dart`;
}

/**
 * The widget class FlutterFlow will look for inside a committed file, derived
 * the same way FF derives it - from the file name alone.
 * @param {string} fileName - Bare file name, e.g. "liquid_glass_orbs.dart"
 * @returns {string} Class name FF resolves, e.g. "LiquidGlassOrbs"
 */
export function expectedWidgetClassFromFileName(fileName) {
  return deriveIdentifierName(fileName, "W");
}

const OPENERS = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = { ")": "(", "]": "[", "}": "{" };

/**
 * Reports the first bracket-balance problem in Dart source, or null when the
 * brackets balance. This is what FlutterFlow's formatter actually fails on -
 * "Custom widget code is not formattable" - so catching it client-side turns a
 * cryptic post-push rejection into an actionable pre-commit error.
 *
 * The scan tracks comments, string literals, and `${...}` interpolations so
 * brackets that belong to strings or docs never count, including nested cases
 * like `user['name']` inside an interpolation.
 * @param {string} code - Dart source
 * @returns {string|null} Precise error message, or null when balanced
 */
export function findUnbalancedBracketError(code) {
  const src = String(code ?? "");
  // Frames model nesting: top-level code, bracketed regions, comments,
  // strings, and string interpolations. Every frame knows what ends it.
  const frames = [{ kind: "code", opener: null, openedLine: 0 }];
  let line = 1;
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
    const frame = frames[frames.length - 1];

    if (frame.kind === "line-comment") {
      if (ch === "\n") frames.pop();
      else i++;
      continue;
    }

    if (frame.kind === "block-comment") {
      if (ch === "*" && src[i + 1] === "/") {
        frames.pop();
        i += 2;
      } else {
        if (ch === "\n") line++;
        i++;
      }
      continue;
    }

    if (frame.kind === "string") {
      // A lone newline cannot appear inside a non-triple Dart string; treat
      // the rest of the line as ended rather than swallowing the whole file.
      if (!frame.triple && ch === "\n") {
        frames.pop();
        continue;
      }
      if (ch === "\\") {
        // An escaped newline is a line continuation - keep the line count true.
        if (src[i + 1] === "\n") line++;
        i += 2;
        continue;
      }
      if (ch === "$" && src[i + 1] === "{") {
        frames.push({ kind: "code", opener: null, interpolation: true });
        i += 2;
        continue;
      }
      const closerLength = frame.triple ? 3 : 1;
      if (
        ch === frame.quote
        && src.slice(i, i + closerLength) === frame.quote.repeat(closerLength)
      ) {
        frames.pop();
        i += closerLength;
        continue;
      }
      if (ch === "\n") line++;
      i++;
      continue;
    }

    // --- code frame ---
    if (ch === "/" && src[i + 1] === "/") {
      frames.push({ kind: "line-comment" });
      i += 2;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      frames.push({ kind: "block-comment" });
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const triple = src.slice(i, i + 3) === ch.repeat(3);
      frames.push({ kind: "string", quote: ch, triple });
      i += triple ? 3 : 1;
      continue;
    }
    if (OPENERS[ch]) {
      frames.push({ kind: "code", opener: ch, openedLine: line });
      i++;
      continue;
    }
    if (CLOSERS[ch]) {
      if (frame.interpolation && ch === "}") {
        frames.pop();
        i++;
        continue;
      }
      if (frame.opener && OPENERS[frame.opener] === ch) {
        frames.pop();
        i++;
        continue;
      }
      if (frame.opener) {
        return `line ${line}: "${ch}" closes nothing - "${frame.opener}" opened on line ${frame.openedLine} is still open`;
      }
      // A closer can never legitimately reach an interpolation or top-level
      // frame: whatever it closes would have to sit above it in the stack.
      return `line ${line}: unexpected "${ch}" with no matching opener`;
    }
    if (ch === "\n") line++;
    i++;
  }

  const remaining = frames[frames.length - 1];
  if (remaining.kind === "code" && !remaining.opener && !remaining.interpolation) {
    return null;
  }
  if (remaining.kind === "string") {
    return `unclosed ${remaining.triple ? "triple-quoted " : ""}string starting on line ${line} was never closed`;
  }
  if (remaining.kind === "block-comment") {
    return "unterminated /* comment";
  }
  if (remaining.kind === "line-comment") {
    return null; // Ends at end-of-input by definition.
  }
  if (remaining.interpolation) {
    const openerFrame = frames.findLast((f) => f.opener);
    const where = openerFrame ? ` opened on line ${openerFrame.openedLine}` : "";
    return `unclosed "\${" expression${where} was never closed`;
  }
  return `"${remaining.opener}" opened on line ${remaining.openedLine} is never closed`;
}
