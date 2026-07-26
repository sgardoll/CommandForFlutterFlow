import { extractPackageImports } from "./dartPackageImports.js";

const CODE_TYPE = {
  ACTION: "A",
  WIDGET: "W",
  FUNCTION: "F",
  // Standalone custom code file, e.g. a plain Dart class. Missing files are
  // provisioned first, then synced with actions and widgets.
  CODE_FILE: "C",
  DEPENDENCIES: "D",
  OTHER: "O",
};

const ARTIFACT_TYPE_TO_CODE_TYPE = {
  CustomAction: CODE_TYPE.ACTION,
  CustomWidget: CODE_TYPE.WIDGET,
  CustomFunction: CODE_TYPE.FUNCTION,
  CustomClass: CODE_TYPE.CODE_FILE,
  CodeFile: CODE_TYPE.CODE_FILE,
};

export function getBundleFilePath(fileName, codeType) {
  switch (codeType) {
    case CODE_TYPE.ACTION:
      return `lib/custom_code/actions/${fileName}`;
    case CODE_TYPE.WIDGET:
      return `lib/custom_code/widgets/${fileName}`;
    case CODE_TYPE.FUNCTION:
      return "lib/flutter_flow/custom_functions.dart";
    case CODE_TYPE.CODE_FILE:
      // Standalone custom code files live flat under lib/custom_code/, never in
      // a subfolder.
      return `lib/custom_code/${fileName}`;
    case CODE_TYPE.DEPENDENCIES:
      return "pubspec.yaml";
    case CODE_TYPE.OTHER:
      return `lib/custom_code/${fileName}`;
    default:
      return fileName;
  }
}

function toFileName(artifact) {
  if (artifact.artifactType === "CustomFunction") return "custom_functions.dart";
  const source = artifact.fileName || artifact.artifactName || artifact.id || "generated_code";
  return source.endsWith(".dart") ? source : `${source}.dart`;
}

function toDependencyMap(dependencies = []) {
  return dependencies.reduce((acc, dependency) => {
    const name = dependency.name || dependency.package;
    if (!name || name === "flutter") return acc;
    acc[name] = dependency.version || "";
    return acc;
  }, {});
}

function getDuplicateTargetErrors(fileEntries) {
  const seenFileNames = new Map();
  const seenPaths = new Map();
  const errors = [];

  for (const entry of fileEntries) {
    if (seenFileNames.has(entry.fileName)) {
      errors.push(`Duplicate deploy file name "${entry.fileName}" for artifacts "${seenFileNames.get(entry.fileName)}" and "${entry.artifactId}".`);
    } else {
      seenFileNames.set(entry.fileName, entry.artifactId);
    }

    if (seenPaths.has(entry.path)) {
      errors.push(`Duplicate deploy path "${entry.path}" for artifacts "${seenPaths.get(entry.path)}" and "${entry.artifactId}".`);
    } else {
      seenPaths.set(entry.path, entry.artifactId);
    }
  }

  return errors;
}

export function buildBundleDeployPlan(bundle, options = {}) {
  const artifacts = Array.isArray(bundle?.artifacts) ? bundle.artifacts : [];
  const selectedIds = options.selectedArtifactIds || bundle?.deployOrder || artifacts.map((artifact) => artifact.id);
  const selected = selectedIds
    .map((id) => artifacts.find((artifact) => artifact.id === id))
    .filter(Boolean);

  const warnings = [...(bundle?.warnings || [])];
  const fileEntries = [];

  selected.forEach((artifact) => {
    const fileName = toFileName(artifact);
    const content = artifact.code || "";
    const codeType = artifact.codeType || ARTIFACT_TYPE_TO_CODE_TYPE[artifact.artifactType] || CODE_TYPE.OTHER;
    if (!content.trim()) {
      warnings.push(`${artifact.artifactName || artifact.id} has no generated code.`);
    }
    fileEntries.push({
      artifactId: artifact.id,
      artifactName: artifact.artifactName,
      artifactType: artifact.artifactType,
      fileName,
      content,
      type: codeType,
      path: getBundleFilePath(fileName, codeType),
      deployMode: "customCodeSync",
    });
  });

  const declaredDependencies = {
    ...toDependencyMap(bundle?.dependencies),
    ...selected.reduce((acc, artifact) => ({
      ...acc,
      ...toDependencyMap(artifact.dependencies),
    }), {}),
  };

  // A declared dependency list can miss a package the code actually imports.
  // FlutterFlow rejects a push whose pubspec.yaml omits an imported package,
  // so every artifact's code is also scanned directly as a safety net.
  // Declared versions always win over this generic fallback.
  const detectedDependencies = {};
  selected.forEach((artifact) => {
    extractPackageImports(artifact.code || "").forEach((name) => {
      if (!(name in declaredDependencies)) {
        detectedDependencies[name] = "^1.0.0";
      }
    });
  });

  const dependencies = { ...detectedDependencies, ...declaredDependencies };

  selected.forEach((artifact) => {
    (artifact.dependencies || []).forEach((dependency) => {
      const name = dependency.name || dependency.package;
      if (name && !dependency.version) {
        warnings.push(`${artifact.artifactName || artifact.id} dependency "${name}" has no explicit version.`);
      }
    });
  });
  const errors = getDuplicateTargetErrors(fileEntries);

  return {
    bundleId: bundle?.id || "bundle-current",
    title: bundle?.title || "Generated artifact bundle",
    fileEntries,
    dependencies,
    relationships: bundle?.relationships || [],
    warnings,
    errors,
  };
}
