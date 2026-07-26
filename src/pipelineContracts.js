function parseJsonIfPossible(value) {
  if (typeof value !== "string") return value ?? "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function stringifyPipelinePayload(payload) {
  return JSON.stringify(payload, null, 2);
}

export function buildArchitectPrompt(userInput) {
  return stringifyPipelinePayload({
    task: "architect",
    userRequest: String(userInput ?? ""),
  });
}

export function buildGeneratorPrompt(bundleSpec) {
  const input = parseJsonIfPossible(bundleSpec);
  if (input && typeof input === "object" && typeof input.task === "string") {
    return stringifyPipelinePayload(input);
  }

  return stringifyPipelinePayload({
    task: "generate_bundle",
    bundleSpec: input,
  });
}

export function buildReviewPrompt(generatedBundle) {
  return stringifyPipelinePayload({
    task: "review_bundle",
    generatedBundle: parseJsonIfPossible(generatedBundle),
    outputRequirements: {
      overall: ["status", "score", "summary", "findings"],
      scoreRange: [0, 100],
      eachArtifact: ["id", "review.status", "review.findings"],
    },
  });
}

export function createBuildShipContext(stage, bundle = null) {
  const context = { stage };
  if (bundle !== null && bundle !== undefined) {
    context.bundle = parseJsonIfPossible(bundle);
  }
  return context;
}

export function buildArtifactRegenerationPrompt({ bundleSpec, artifactBundle, bundleReview, artifactId, userFeedback }) {
  return stringifyPipelinePayload({
    task: "regenerate_artifact",
    artifactId,
    bundleSpec: parseJsonIfPossible(bundleSpec),
    artifactBundle: parseJsonIfPossible(artifactBundle),
    bundleReview: parseJsonIfPossible(bundleReview),
    userFeedback: String(userFeedback ?? ""),
  });
}

export function buildBundleRegenerationPrompt({ bundleSpec, artifactBundle, bundleReview, userFeedback }) {
  return stringifyPipelinePayload({
    task: "regenerate_bundle",
    bundleSpec: parseJsonIfPossible(bundleSpec),
    artifactBundle: parseJsonIfPossible(artifactBundle),
    bundleReview: parseJsonIfPossible(bundleReview),
    userFeedback: String(userFeedback ?? ""),
  });
}
