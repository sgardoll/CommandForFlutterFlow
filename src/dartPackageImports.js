// Flutter SDK packages FlutterFlow's default pubspec.yaml always provides.
// Importing these needs no dependency entry.
const FLUTTER_SDK_PACKAGES = new Set([
  "flutter",
  "flutter_test",
  "flutter_driver",
  "flutter_localizations",
]);

/**
 * Scans Dart source for `package:name/...` imports and returns the
 * third-party pub.dev packages it references, in first-seen order.
 *
 * This is what a generated action's real dependencies are - not whatever an
 * AI-authored spec declared alongside it. A declared dependency list can miss
 * a package the code actually imports (a manual edit, a regeneration cycle
 * that added an import without updating the spec), and FlutterFlow rejects a
 * push whose pubspec.yaml omits a package the code imports.
 *
 * @param {string} code - Dart source
 * @returns {string[]} Package names, deduplicated
 */
export function extractPackageImports(code = "") {
  const names = [];
  const seen = new Set();
  const importRegex = /\bimport\s+['"]package:([a-zA-Z0-9_]+)\//g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const name = match[1];
    if (FLUTTER_SDK_PACKAGES.has(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}
