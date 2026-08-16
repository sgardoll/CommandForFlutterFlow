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

export function buildArchitectPrompt(userInput, images = []) {
  const payload = {
    task: "architect",
    userRequest: String(userInput ?? ""),
  };
  if (Array.isArray(images) && images.length) {
    payload.images = images;
  }
  return stringifyPipelinePayload(payload);
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
      bundleReview: ["status", "score", "summary", "manualActions", "findings"],
      scoreRange: [0, 100],
      eachArtifact: ["id", "review.status", "review.findings"],
      // Without this the review volunteers "next steps" that FlutterFlow
      // already handles - telling the user to create the very action the
      // deploy creates, or to declare parameters read off the signature.
      manualActions: {
        definition: "Setup the developer must perform by hand in the FlutterFlow editor that FlutterFlow will NOT do for them.",
        exclude: [
          "creating the Custom Action, Widget or Code File itself - deploying the code creates it",
          "declaring parameters or return values FlutterFlow derives from the function signature",
          "anything that resolves as a side effect of using the action or widget in the editor",
          "generic advice such as testing, reviewing or rebuilding the app",
        ],
        preferEmpty: "Return an empty array when nothing qualifies - an empty list is the expected result for most bundles.",
      },
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
