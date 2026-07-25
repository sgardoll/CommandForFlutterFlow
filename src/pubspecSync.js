// Merges generated package requirements into a project's real pubspec.yaml.
//
// The FlutterFlow VS Code extension pushes the project's actual pubspec.yaml
// verbatim as `serialized_yaml`, and the backend treats that text as the
// complete dependency set. Anything the pushed file omits is dropped from the
// project, so a merge has to start from the file already in the project and
// edit it in place rather than rebuild it.
//
// The edit is textual on purpose: it keeps comments, ordering, SDK constraints,
// hosted/git/path dependency forms, and every other section byte-for-byte
// intact, which a parse-and-reserialize round trip would not.

const DEPENDENCY_NAME_PATTERN = /^([A-Za-z_][A-Za-z0-9_-]*):/;

function isBlankOrComment(line) {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

function indentOf(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Locates the top-level `dependencies:` block.
 * @param {string[]} lines - pubspec.yaml split into lines
 * @returns {{headerIndex: number, endIndex: number, childIndent: string}|null}
 *   endIndex is exclusive and excludes trailing blank/comment lines.
 */
function findDependenciesBlock(lines) {
  const headerIndex = lines.findIndex((line) => /^dependencies:\s*$/.test(line));
  if (headerIndex === -1) return null;

  let endIndex = headerIndex + 1;
  let lastContentIndex = headerIndex;
  let childIndent = null;

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (isBlankOrComment(line)) {
      endIndex = i + 1;
      continue;
    }
    // A non-indented line starts the next top-level section.
    if (indentOf(line) === 0) break;
    if (childIndent === null) childIndent = line.match(/^(\s*)/)[1];
    lastContentIndex = i;
    endIndex = i + 1;
  }

  return {
    headerIndex,
    endIndex: lastContentIndex + 1,
    childIndent: childIndent ?? "  ",
  };
}

/**
 * Extracts the names of the packages already declared under `dependencies:`.
 * @param {string} yamlContent - Raw pubspec.yaml content
 * @returns {string[]} Declared dependency names, in file order
 */
export function parseExistingDependencyNames(yamlContent) {
  const lines = String(yamlContent || "").split("\n");
  const block = findDependenciesBlock(lines);
  if (!block) return [];

  const names = [];
  for (let i = block.headerIndex + 1; i < block.endIndex; i += 1) {
    const line = lines[i];
    if (isBlankOrComment(line)) continue;
    // Only direct children are dependency names; deeper lines describe a
    // dependency's own keys (sdk:, git:, version:, ...).
    if (indentOf(line) !== block.childIndent.length) continue;
    const match = line.trim().match(DEPENDENCY_NAME_PATTERN);
    if (match) names.push(match[1]);
  }
  return names;
}

function formatDependencyLine(indent, name, version) {
  const constraint = String(version || "").trim();
  // A bare `name:` parses as null, which pub reads as "any". Say it explicitly
  // so the pushed file is unambiguous to FlutterFlow's yaml validation.
  return `${indent}${name}: ${constraint || "any"}`;
}

/**
 * Adds any missing packages to an existing pubspec.yaml without disturbing
 * what is already there.
 *
 * Packages already declared in the project are left exactly as-is — the
 * project's own version constraint wins over a generated one, since the user
 * (or FlutterFlow) may have pinned it deliberately.
 *
 * @param {string} yamlContent - The project's current pubspec.yaml
 * @param {Object<string, string>} newDependencies - name -> version constraint
 * @returns {{yaml: string, added: string[], alreadyPresent: string[]}}
 */
export function mergeDependenciesIntoYaml(yamlContent, newDependencies = {}) {
  const original = String(yamlContent || "");
  const requested = Object.entries(newDependencies).filter(
    // The Flutter SDK entry is always present and is never a pub package.
    ([name]) => name && name !== "flutter",
  );

  if (requested.length === 0) {
    return { yaml: original, added: [], alreadyPresent: [] };
  }

  const lines = original.split("\n");
  const existingNames = new Set(parseExistingDependencyNames(original));

  const added = [];
  const alreadyPresent = [];
  for (const [name, version] of requested) {
    if (existingNames.has(name)) {
      alreadyPresent.push(name);
    } else {
      added.push([name, version]);
      existingNames.add(name);
    }
  }

  if (added.length === 0) {
    return { yaml: original, added: [], alreadyPresent };
  }

  const block = findDependenciesBlock(lines);
  if (block) {
    const insertions = added.map(([name, version]) =>
      formatDependencyLine(block.childIndent, name, version),
    );
    lines.splice(block.endIndex, 0, ...insertions);
  } else {
    // No dependencies section at all: append one rather than guess at a slot.
    if (lines.length > 0 && lines[lines.length - 1].trim() !== "") lines.push("");
    lines.push("dependencies:");
    added.forEach(([name, version]) => {
      lines.push(formatDependencyLine("  ", name, version));
    });
  }

  return {
    yaml: lines.join("\n"),
    added: added.map(([name]) => name),
    alreadyPresent,
  };
}

/**
 * Checks that a pubspec.yaml looks like a real Flutter project manifest before
 * it is pushed back. Guards against sending a truncated or unrelated file,
 * which the backend would apply as a dependency wipe.
 * @param {string} yamlContent - pubspec.yaml content
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProjectPubspec(yamlContent) {
  const content = String(yamlContent || "");
  const errors = [];

  if (!content.trim()) {
    errors.push("pubspec.yaml is empty");
    return { valid: false, errors };
  }
  if (!/^name:\s*\S+/m.test(content)) {
    errors.push("pubspec.yaml missing name field");
  }
  if (!/^dependencies:\s*$/m.test(content)) {
    errors.push("pubspec.yaml missing dependencies section");
  }
  if (!parseExistingDependencyNames(content).includes("flutter")) {
    errors.push("pubspec.yaml missing Flutter SDK dependency");
  }

  return { valid: errors.length === 0, errors };
}
