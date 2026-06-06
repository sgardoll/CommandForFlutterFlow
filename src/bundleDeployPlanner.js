const CODE_TYPE = {
  ACTION: "A",
  WIDGET: "W",
  FUNCTION: "F",
  DEPENDENCIES: "D",
  OTHER: "O",
};

const ARTIFACT_TYPE_TO_CODE_TYPE = {
  CustomAction: CODE_TYPE.ACTION,
  CustomWidget: CODE_TYPE.WIDGET,
  CustomFunction: CODE_TYPE.FUNCTION,
  CustomClass: CODE_TYPE.OTHER,
  CodeFile: CODE_TYPE.OTHER,
};

export function getBundleFilePath(fileName, codeType) {
  switch (codeType) {
    case CODE_TYPE.ACTION:
      return `lib/custom_code/actions/${fileName}`;
    case CODE_TYPE.WIDGET:
      return `lib/custom_code/widgets/${fileName}`;
    case CODE_TYPE.FUNCTION:
      return "lib/flutter_flow/custom_functions.dart";
    case CODE_TYPE.DEPENDENCIES:
      return "pubspec.yaml";
    case CODE_TYPE.OTHER:
      // Custom classes / generic code files live directly under lib/custom_code/,
      // matching FlutterFlow's syncCustomCodeChanges contract for OTHER-type files.
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
  const fileEntries = selected.map((artifact) => {
    const codeType = artifact.codeType || ARTIFACT_TYPE_TO_CODE_TYPE[artifact.artifactType] || CODE_TYPE.OTHER;
    const fileName = toFileName(artifact);
    const content = artifact.code || "";
    if (!content.trim()) {
      warnings.push(`${artifact.artifactName || artifact.id} has no generated code.`);
    }
    return {
      artifactId: artifact.id,
      artifactName: artifact.artifactName,
      artifactType: artifact.artifactType,
      fileName,
      content,
      type: codeType,
      path: getBundleFilePath(fileName, codeType),
    };
  });

  const dependencies = {
    ...toDependencyMap(bundle?.dependencies),
    ...selected.reduce((acc, artifact) => ({
      ...acc,
      ...toDependencyMap(artifact.dependencies),
    }), {}),
  };

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
