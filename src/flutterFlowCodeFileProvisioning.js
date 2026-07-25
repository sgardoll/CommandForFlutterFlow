function firstDeclaredClassName(content) {
  return String(content || "").match(/\bclass\s+([A-Z][A-Za-z0-9_]*)\b/)?.[1];
}

function classNameFromFileName(fileName) {
  return String(fileName || "")
    .split("/")
    .pop()
    .replace(/\.dart$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function resolveClassName(fileName, info) {
  const candidates = [
    classNameFromFileName(fileName),
    firstDeclaredClassName(info.content),
    info.artifactName,
  ];
  const className = candidates.find((candidate) =>
    /^[A-Z][A-Za-z0-9_]*$/.test(String(candidate || "")),
  );
  if (!className) {
    throw new Error(
      `Cannot derive a FlutterFlow custom class name for ${fileName}.`,
    );
  }
  return className;
}

export function findMissingCodeFiles(fileMap, remoteFiles = new Map()) {
  const missing = [];

  for (const [fileName, info] of fileMap.entries()) {
    if (info.type !== "C" || remoteFiles.has(info.path)) continue;
    missing.push({
      artifactId: info.artifactId || fileName,
      className: resolveClassName(fileName, info),
      content: info.content,
      fileName,
      path: info.path,
    });
  }

  return missing;
}

export function excludeProvisionedCodeFiles(fileMap, entries) {
  const provisionedPaths = new Set(entries.map((entry) => entry.path));
  return new Map(
    Array.from(fileMap.entries()).filter(
      ([, info]) => !provisionedPaths.has(info.path),
    ),
  );
}
