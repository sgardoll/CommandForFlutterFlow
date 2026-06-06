const DEFAULT_ARTIFACT_TYPE = "CustomWidget";
const DEFAULT_ARTIFACT_NAME = "GeneratedWidget";

const ARTIFACT_TYPE_TO_CODE_TYPE = {
  CustomAction: "A",
  CustomWidget: "W",
  CustomFunction: "F",
  CustomClass: "O",
  CodeFile: "O",
};

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function slugify(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createArtifactId(artifact = {}, index = 0) {
  const type = slugify(artifact.artifactType || artifact.type || DEFAULT_ARTIFACT_TYPE);
  const name = slugify(
    artifact.artifactName ||
      artifact.name ||
      artifact.fileName ||
      `${DEFAULT_ARTIFACT_NAME}-${index + 1}`,
  );
  return `${type || "artifact"}-${name || index + 1}`;
}

export function normalizeArtifact(rawArtifact = {}, index = 0) {
  const artifact = toObject(rawArtifact);
  const artifactType = artifact.artifactType || artifact.type || DEFAULT_ARTIFACT_TYPE;
  const artifactName = artifact.artifactName || artifact.name || DEFAULT_ARTIFACT_NAME;
  const fileName = artifact.fileName || `${artifactName}.dart`;
  const normalizedProvidedId = slugify(artifact.id);

  return {
    id: normalizedProvidedId || createArtifactId({ ...artifact, artifactType, artifactName, fileName }, index),
    artifactType,
    artifactName,
    fileName,
    description: artifact.description || "",
    code: artifact.code || artifact.content || "",
    dependencies: normalizeDependencies(artifact.dependencies),
    imports: Array.isArray(artifact.imports) ? artifact.imports : [],
    relationships: normalizeRelationships(artifact.relationships),
    deployStatus: artifact.deployStatus || "pending",
    review: artifact.review || null,
    metadata: toObject(artifact.metadata),
    codeType: artifact.codeType || ARTIFACT_TYPE_TO_CODE_TYPE[artifactType] || "O",
  };
}

export function normalizeDependencies(rawDependencies) {
  if (!rawDependencies) return [];

  if (Array.isArray(rawDependencies)) {
    return rawDependencies
      .map((dependency) => {
        if (typeof dependency === "string") {
          return { name: dependency, version: null, inferred: false };
        }
        const dep = toObject(dependency);
        const name = dep.name || dep.package;
        if (!name) return null;
        return {
          name,
          version: dep.version || null,
          inferred: Boolean(dep.inferred),
        };
      })
      .filter(Boolean);
  }

  return Object.entries(toObject(rawDependencies)).map(([name, version]) => ({
    name,
    version: version || null,
    inferred: false,
  }));
}

export function normalizeRelationships(rawRelationships) {
  if (!rawRelationships) return [];

  return (Array.isArray(rawRelationships) ? rawRelationships : [rawRelationships])
    .map((relationship) => {
      const rel = toObject(relationship);
      if (!rel.from && !rel.to) return null;
      return {
        from: rel.from || null,
        to: rel.to || null,
        type: rel.type || "uses",
        description: rel.description || "",
      };
    })
    .filter(Boolean);
}

export function parseJsonLike(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced) return null;
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return null;
    }
  }
}

export function normalizeArtifactBundle(input, options = {}) {
  const warnings = [];
  const parsed = typeof input === "string" ? parseJsonLike(input) : input;
  const source = parsed || {};
  const bundleLike = toObject(source);

  if (!parsed && typeof input === "string") {
    warnings.push("Structured bundle parse failed; using legacy single-artifact fallback.");
  }

  const rawArtifacts = Array.isArray(bundleLike.artifacts)
    ? bundleLike.artifacts
    : [
        {
          artifactType: bundleLike.artifactType || options.artifactType,
          artifactName: bundleLike.artifactName || options.artifactName,
          fileName: bundleLike.fileName || options.fileName,
          description: bundleLike.description,
          code: bundleLike.code || options.code || (typeof input === "string" ? input : ""),
          dependencies: bundleLike.dependencies || options.dependencies,
          relationships: bundleLike.relationships || options.relationships,
        },
      ];

  const artifacts = rawArtifacts.map((artifact, index) => normalizeArtifact(artifact, index));
  const idMap = new Map(
    rawArtifacts
      .map((artifact, index) => [toObject(artifact).id, artifacts[index]?.id])
      .filter(([rawId, normalizedId]) => rawId && normalizedId),
  );
  const remapId = (id) => idMap.get(id) || id;
  const relationships = normalizeRelationships(bundleLike.relationships || options.relationships)
    .map((relationship) => ({
      ...relationship,
      from: relationship.from ? remapId(relationship.from) : relationship.from,
      to: relationship.to ? remapId(relationship.to) : relationship.to,
    }));

  return {
    id: bundleLike.id || options.id || "bundle-current",
    title: bundleLike.title || bundleLike.name || options.title || "Generated artifact bundle",
    description: bundleLike.description || options.description || "",
    artifacts,
    dependencies: normalizeDependencies(bundleLike.dependencies || options.dependencies),
    relationships,
    deployOrder: Array.isArray(bundleLike.deployOrder)
      ? bundleLike.deployOrder.map(remapId)
      : artifacts.map((artifact) => artifact.id),
    warnings: [...warnings, ...(Array.isArray(bundleLike.warnings) ? bundleLike.warnings : [])],
    metadata: toObject(bundleLike.metadata),
  };
}

export function getPrimaryArtifact(bundle) {
  const normalized = normalizeArtifactBundle(bundle);
  return normalized.artifacts[0] || normalizeArtifact();
}
