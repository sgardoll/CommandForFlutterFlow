function stripDartComments(source) {
  return String(source || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

export function extractTopLevelFunctionNames(source) {
  const excludedPrefixes =
    /^(import|export|part|library|class|enum|extension|typedef|mixin|abstract|const|final|var|late)\b/;
  const names = [];

  for (const line of stripDartComments(source).split("\n")) {
    if (!/^[A-Za-z_$]/.test(line) || excludedPrefixes.test(line)) continue;
    const match = line.match(
      /^[\w$<>,?\s[\]]+?\s([a-zA-Z_$][\w$]*)\s*\(/,
    );
    if (match) names.push(match[1]);
  }

  return names;
}

/**
 * Derives the identifier FlutterFlow uses to find a file's declaration from the
 * file name. FlutterFlow's own snake_case is naive - one underscore before
 * every capital - so `initQAAnalytics` is filed as `init_q_a_analytics.dart`,
 * not the human-idiomatic `init_qa_analytics.dart`. Only the naive form
 * round-trips back to the identifier FlutterFlow looks for.
 * @param {string} fileName - Bare file name, e.g. "init_q_a_analytics.dart"
 * @param {string} codeType - Code type (A, W, F, C)
 * @returns {string} Identifier sent as old/new_identifier_name
 */
export function deriveIdentifierName(fileName, codeType) {
  const baseName = fileName.replace(/\.dart$/, "");
  if (codeType === "W") {
    return baseName.replace(/(^|_)(\w)/g, (_, __, character) =>
      character.toUpperCase(),
    );
  }
  if (codeType === "A") {
    const pascalName = baseName.replace(
      /(^|_)(\w)/g,
      (_, __, character) => character.toUpperCase(),
    );
    return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
  }
  if (codeType === "F") return "CustomFunctions";
  if (codeType === "C") {
    return fileName.endsWith(".dart") ? fileName : `${fileName}.dart`;
  }
  return baseName;
}

async function sha256Hex(content) {
  const bytes = new TextEncoder().encode(String(content || ""));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function buildFlutterFlowSyncMetadata(
  fileMap,
  remoteFiles = new Map(),
) {
  const wireFileMap = {};
  const generatedFunctionNames = new Set();

  for (const [fileName, info] of fileMap.entries()) {
    if (info.type === "D" || info.type === "O") continue;

    const identifierName = deriveIdentifierName(fileName, info.type);
    const wireInfo = {
      old_identifier_name: identifierName,
      new_identifier_name: identifierName,
      type: info.type,
      is_deleted: false,
      current_checksum: await sha256Hex(info.content),
    };
    const remoteContent = remoteFiles.get(info.path);
    if (remoteContent !== undefined) {
      wireInfo.original_checksum = await sha256Hex(remoteContent);
    }
    wireFileMap[fileName] = wireInfo;

    if (info.type === "F") {
      const parsedNames = extractTopLevelFunctionNames(info.content);
      const names = parsedNames.length > 0
        ? parsedNames
        : [info.functionName].filter(Boolean);
      names.forEach((name) => generatedFunctionNames.add(name));
    }
  }

  const remoteFunctionNames = new Set(
    extractTopLevelFunctionNames(
      remoteFiles.get("lib/flutter_flow/custom_functions.dart") || "",
    ),
  );
  const functionChanges = {
    functions_to_rename: [],
    functions_to_delete: [],
    functions_to_add: Array.from(generatedFunctionNames).filter(
      (name) => !remoteFunctionNames.has(name),
    ),
  };

  return {
    fileMapContents: JSON.stringify(wireFileMap),
    functionsMapContents: JSON.stringify(functionChanges),
  };
}
