// Generation is not deterministic about the FlutterFlow header: the same
// prompt returns a full "// Automatic FlutterFlow imports" block on one run and
// a bare `import 'package:flutter/material.dart';` on the next. Both are valid
// Dart, so nothing downstream notices - but prepending our header to code that
// already carries one produces two DO-NOT-REMOVE blocks with real code between
// them, which is not what FlutterFlow's paste path expects.
//
// Normalizing here makes the deployed file identical for both shapes.

const HEADER_END_MARKER = "// DO NOT REMOVE OR MODIFY THE CODE ABOVE!";

/**
 * Reads the URI out of an import line, e.g. "package:flutter/material.dart".
 * Matching on the URI rather than the whole line is deliberate: FlutterFlow's
 * real header carries trailing comments ("// Imports other custom widgets")
 * that generated code omits, so a line-equality filter leaves duplicates behind.
 * @param {string} line - A single source line
 * @returns {string|null} Import URI, or null when the line is not an import
 */
function readImportUri(line) {
  return (/^\s*import\s+['"]([^'"]+)['"]/.exec(line) || [])[1] || null;
}

/**
 * Drops a FlutterFlow header the generator already emitted, so the caller can
 * apply exactly one.
 * @param {string} code - Dart source
 * @returns {string} Source with any leading FlutterFlow header removed
 */
export function stripFlutterFlowHeader(code = "") {
  const markerIndex = code.indexOf(HEADER_END_MARKER);
  if (markerIndex === -1) return code;

  // The blank lines separating header from body belong to the header, so the
  // caller controls that spacing when it reapplies one.
  return code.slice(markerIndex + HEADER_END_MARKER.length).replace(/^\s*\n/, "");
}

/**
 * Applies exactly one FlutterFlow header to generated code, whether or not the
 * generator emitted one, and removes body imports the header already provides.
 * @param {string} code - Dart source
 * @param {string} header - The FlutterFlow header for this code type
 * @returns {string} Header followed by the deduplicated body
 */
export function applyFlutterFlowHeader(code = "", header = "") {
  const body = stripFlutterFlowHeader(code);
  const headerUris = new Set(
    (header.match(/^\s*import .*$/gm) || []).map(readImportUri).filter(Boolean),
  );

  const dedupedBody = body
    .split("\n")
    .filter((line) => {
      const uri = readImportUri(line);
      return uri === null || !headerUris.has(uri);
    })
    .join("\n")
    .replace(/^\s*\/\/ Automatic FlutterFlow imports\s*$/m, "")
    .replace(/^\s*\n+/, "");

  return header + dedupedBody;
}
