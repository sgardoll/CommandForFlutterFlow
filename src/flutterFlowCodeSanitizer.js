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
 * Fence lines are paired sequentially - the first opens a block, the second
 * closes it, and so on - and only content inside completed pairs is kept. That
 * drops prose wrapped around the response AND prose sitting between multiple
 * fenced blocks, either of which left in the file guarantees FlutterFlow
 * rejects the push as unformattable (STU-148). Content after an unclosed
 * trailing fence is a truncated response and is dropped: committing cut-off
 * Dart fails formatting anyway. With exactly one fence line (a truncated
 * wrap), whichever side holds more content is kept. Blank edge lines are
 * trimmed so the header application in prepareCodeForCommit starts from clean
 * source.
 *
 * A ``` marker only delimits markdown when it sits in plain code position.
 * Lines starting with ``` inside triple-quoted strings or block comments are
 * literal Dart content (doc examples, release notes) and must survive
 * untouched, so fence recognition consults the scanner's comment/string spans
 * before pairing (STU-147).
 * @param {string} rawCode - Raw generated response text
 * @returns {string} Dart-only source, empty when the input has no content
 */
export function sanitizeGeneratedDart(rawCode) {
  const code = String(rawCode ?? "").replace(BOM_PATTERN, "");
  if (!code.trim()) return "";

  const lines = code.split("\n");
  const { commentAndStringRanges } = scanDartSource(code);
  const fenceIndexes = [];
  let lineStartOffset = 0;
  for (let index = 0; index < lines.length; index++) {
    const lineText = lines[index];
    if (FENCE_LINE_PATTERN.test(lineText)) {
      const markerOffset = lineStartOffset + lineText.match(/^\s*/)[0].length;
      if (!offsetIsInsideCommentOrString(markerOffset, commentAndStringRanges)) {
        fenceIndexes.push(index);
      }
    }
    lineStartOffset += lineText.length + 1;
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

  // Two or more fence lines: keep only what sits inside completed pairs.
  const segments = [];
  for (let index = 0; index + 1 < fenceIndexes.length; index += 2) {
    const open = fenceIndexes[index];
    const close = fenceIndexes[index + 1];
    if (close > open + 1) {
      segments.push(trimBlankEdgeLines(lines.slice(open + 1, close)));
    }
  }

  const kept = segments.filter((segment) => segment.length > 0);
  if (kept.length === 0) return "";

  return kept.join("\n\n");
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
const IDENTIFIER_TAIL = /[A-Za-z0-9_$]/;

/**
 * Single lexical pass over Dart source using a frame stack that models
 * nesting: top-level code, bracketed regions, comments, strings, and string
 * interpolations. It produces two things from one walk:
 *
 * - `error`: the first bracket-balance problem, or null when brackets balance.
 *   This is what FlutterFlow's formatter actually fails on - "Custom widget
 *   code is not formattable" - so catching it client-side turns a cryptic
 *   post-push rejection into an actionable pre-commit error.
 * - `commentAndStringRanges`: character spans occupied by comments and string
 *   literals (delimiters included). Consumers use these to tell literal Dart
 *   content apart from structural code - e.g. a ``` marker inside a doc string
 *   is content, not a markdown fence (STU-147).
 *
 * The scan tracks comments, string literals, and `${...}` interpolations so
 * brackets that belong to strings or docs never count, including nested cases
 * like `user['name']` inside an interpolation. Block comments nest the way
 * Dart defines them: every inner comment opener raises the depth and only
 * enough closers bring the span back to zero, so a lone inner closer cannot
 * terminate the comment early (STU-147). Raw strings (`r'...'`, `R'''...'''`) are
 * honored: their backslash escapes nothing and they never interpolate, so a
 * raw string ending in a backslash closes at its quote instead of being
 * misread as an escaped one (STU-148).
 *
 * Unterminated tokens never pass silently: a string frame still open at EOF,
 * or an ordinary string broken by a bare newline (illegal in Dart), is
 * reported through `error` with its opening line - triple-quoted strings stay
 * legal while open mid-source but error if never closed by EOF (STU-148).
 * Tokens still open at end of input have their span closed there, so
 * consumers always see the full extent of unterminated strings/comments even
 * though the scan flags them.
 * @param {string} src - Dart source (any text; never throws)
 * @returns {{error: string|null, commentAndStringRanges: Array<{start: number, end: number}>}}
 */
function scanDartSource(src) {
  // Frames model nesting: top-level code, bracketed regions, comments,
  // strings, and string interpolations. Every frame knows what ends it.
  const frames = [{ kind: "code", opener: null, openedLine: 0 }];
  const commentAndStringRanges = [];
  let line = 1;
  let i = 0;

  // First problem found that does not halt the scan (an unterminated ordinary
  // string broken by a newline). The scan keeps walking so ranges and later
  // bracket attribution stay correct, but this error still blocks the gate.
  let firstError = null;

  // Unterminated tokens still occupy source: close their spans at end of
  // input so consumers always see the full extent of any string/comment still
  // open when the scan stops - on an error or at EOF alike.
  const closeOpenTokenSpans = () => {
    for (const frame of frames) {
      if (
        frame.kind === "string"
        || frame.kind === "block-comment"
        || frame.kind === "line-comment"
      ) {
        commentAndStringRanges.push({ start: frame.startIndex, end: src.length });
      }
    }
  };

  while (i < src.length) {
    const ch = src[i];
    const frame = frames[frames.length - 1];

    if (frame.kind === "line-comment") {
      if (ch === "\n") {
        commentAndStringRanges.push({ start: frame.startIndex, end: i });
        frames.pop();
      } else i++;
      continue;
    }

    if (frame.kind === "block-comment") {
      // Dart block comments nest: each inner /* raises the depth, and the
      // comment only ends once enough */ closers bring it back to zero. A
      // lone inner closer must not end the span - everything up to the real
      // close stays protected content.
      if (ch === "*" && src[i + 1] === "/") {
        frame.depth--;
        if (frame.depth === 0) {
          commentAndStringRanges.push({ start: frame.startIndex, end: i + 2 });
          frames.pop();
        }
        i += 2;
      } else if (ch === "/" && src[i + 1] === "*") {
        frame.depth++;
        i += 2;
      } else {
        if (ch === "\n") line++;
        i++;
      }
      continue;
    }

    if (frame.kind === "string") {
      // A bare newline cannot appear inside a non-triple Dart string: this
      // string is unterminated. End its span at the newline so later lines
      // still scan (and fence recognition still sees them) but surface the
      // break - silently healing used to let malformed source pass the
      // pre-commit gate and fail opaquely inside FlutterFlow (STU-148).
      if (!frame.triple && ch === "\n") {
        commentAndStringRanges.push({ start: frame.startIndex, end: i });
        firstError ??= `line ${line}: string starting on line ${frame.openedLine} is never closed`;
        frames.pop();
        continue;
      }
      if (!frame.raw && ch === "\\") {
        // An escaped newline is a line continuation - keep the line count true.
        if (src[i + 1] === "\n") line++;
        i += 2;
        continue;
      }
      if (!frame.raw && ch === "$" && src[i + 1] === "{") {
        frames.push({ kind: "code", opener: null, interpolation: true });
        i += 2;
        continue;
      }
      const closerLength = frame.triple ? 3 : 1;
      if (
        ch === frame.quote
        && src.slice(i, i + closerLength) === frame.quote.repeat(closerLength)
      ) {
        commentAndStringRanges.push({
          start: frame.startIndex,
          end: i + closerLength,
        });
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
      frames.push({ kind: "line-comment", startIndex: i });
      i += 2;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      frames.push({ kind: "block-comment", startIndex: i, openedLine: line, depth: 1 });
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const triple = src.slice(i, i + 3) === ch.repeat(3);
      // r'...' / R'''...''' are raw strings: the r must not be the tail of a
      // longer identifier, or `var bar'` style code would misclassify.
      const prev = i > 0 ? src[i - 1] : "";
      const beforePrev = i > 1 ? src[i - 2] : "";
      const raw =
        (prev === "r" || prev === "R") && !IDENTIFIER_TAIL.test(beforePrev);
      frames.push({ kind: "string", quote: ch, triple, raw, startIndex: i, openedLine: line });
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
        closeOpenTokenSpans();
        return {
          error: firstError
            ?? `line ${line}: "${ch}" closes nothing - "${frame.opener}" opened on line ${frame.openedLine} is still open`,
          commentAndStringRanges,
        };
      }
      // A closer can never legitimately reach an interpolation or top-level
      // frame: whatever it closes would have to sit above it in the stack.
      closeOpenTokenSpans();
      return {
        error: firstError ?? `line ${line}: unexpected "${ch}" with no matching opener`,
        commentAndStringRanges,
      };
    }
    if (ch === "\n") line++;
    i++;
  }

  closeOpenTokenSpans();

  let error = firstError;
  if (!error) {
    const remaining = frames[frames.length - 1];
    if (!(remaining.kind === "code" && !remaining.opener && !remaining.interpolation)) {
      if (remaining.kind === "string") {
        error = `unclosed ${remaining.triple ? "triple-quoted " : ""}string starting on line ${remaining.openedLine} was never closed`;
      } else if (remaining.kind === "block-comment") {
        error = `unterminated /* comment starting on line ${remaining.openedLine}`;
      } else if (remaining.kind === "line-comment") {
        error = null; // Ends at end-of-input by definition.
      } else if (remaining.interpolation) {
        const openerFrame = frames.findLast((f) => f.opener);
        const where = openerFrame ? ` opened on line ${openerFrame.openedLine}` : "";
        error = `unclosed "\${" expression${where} was never closed`;
      } else {
        error = `"${remaining.opener}" opened on line ${remaining.openedLine} is never closed`;
      }
    }
  }

  return { error, commentAndStringRanges };
}

/**
 * Reports the first bracket-balance problem in Dart source, or null when the
 * brackets balance. See scanDartSource for the lexical rules.
 * @param {string} code - Dart source
 * @returns {string|null} Precise error message, or null when balanced
 */
export function findUnbalancedBracketError(code) {
  return scanDartSource(String(code ?? "")).error;
}

/**
 * Whether a character offset falls inside any recorded comment or string span.
 * @param {number} offset - Character offset into the scanned source
 * @param {Array<{start: number, end: number}>} ranges - Comment/string spans
 * @returns {boolean} True when the offset lies inside a span
 */
function offsetIsInsideCommentOrString(offset, ranges) {
  return ranges.some(({ start, end }) => offset >= start && offset < end);
}
