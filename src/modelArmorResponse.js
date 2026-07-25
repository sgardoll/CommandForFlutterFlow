const FILTER_LABELS = {
  csam: "child-safety content",
  dangerous: "dangerous content",
  harassment: "harassment",
  hate_speech: "hate speech",
  maliciousUrls: "a potentially malicious URL",
  malicious_uris: "a potentially malicious URL",
  pi_and_jailbreak: "prompt-injection or jailbreak instructions",
  promptInjection: "prompt-injection or jailbreak instructions",
  rai: "restricted content",
  sdp: "sensitive personal data",
  sexually_explicit: "sexually explicit content",
  virus_scan: "potentially malicious file content",
};

const KNOWN_WRAPPERS = [
  "sanitizationResult",
  "modelArmor",
  "modelArmorResult",
  "data",
  "result",
  "error",
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasModelArmorShape(value) {
  if (!isObject(value)) return false;
  return (
    typeof value.filterMatchState === "string" ||
    typeof value.invocationResult === "string" ||
    Array.isArray(value.matchedFilters) ||
    isObject(value.filterSummary) ||
    isObject(value.filterResults)
  );
}

function findModelArmorPayload(value, depth = 0) {
  if (!isObject(value) || depth > 3) return null;
  if (hasModelArmorShape(value)) return value;

  for (const key of KNOWN_WRAPPERS) {
    const nested = value[key];
    if (isObject(nested)) {
      const match = findModelArmorPayload(nested, depth + 1);
      if (match) return match;
    }
  }
  return null;
}

function containsMatch(value) {
  if (Array.isArray(value)) return value.some(containsMatch);
  if (!isObject(value)) return false;
  if (value.matched === true || value.matchState === "MATCH_FOUND") return true;
  return Object.values(value).some(containsMatch);
}

function containsIncompleteExecution(value) {
  if (Array.isArray(value)) return value.some(containsIncompleteExecution);
  if (!isObject(value)) return false;
  if (
    typeof value.executionState === "string" &&
    value.executionState !== "EXECUTION_SUCCESS"
  ) {
    return true;
  }
  return Object.values(value).some(containsIncompleteExecution);
}

function normalizeFilterName(name) {
  const aliases = {
    csamFilterFilterResult: "csam",
    maliciousUriFilterResult: "malicious_uris",
    piAndJailbreakFilterResult: "pi_and_jailbreak",
    raiFilterResult: "rai",
    sdpFilterResult: "sdp",
    virusScanFilterResult: "virus_scan",
  };
  return aliases[name] || name;
}

function collectSummaryMatches(summary, matches) {
  if (!isObject(summary)) return;
  for (const [filterName, result] of Object.entries(summary)) {
    if (!isObject(result)) continue;
    const categories = isObject(result.categories) ? result.categories : {};
    const matchedCategories = Object.entries(categories)
      .filter(([, category]) => isObject(category) && category.matched === true)
      .map(([categoryName]) => categoryName);

    if (matchedCategories.length > 0) {
      matchedCategories.forEach((category) => matches.add(category));
    } else if (result.matched === true) {
      matches.add(normalizeFilterName(filterName));
    }
  }
}

function collectResultMatches(filterResults, matches) {
  if (!filterResults) return;
  const entries = Array.isArray(filterResults)
    ? filterResults.flatMap((item) => (isObject(item) ? Object.entries(item) : []))
    : Object.entries(filterResults);

  for (const [rawName, result] of entries) {
    if (!containsMatch(result)) continue;
    const filterName = normalizeFilterName(rawName);
    const raiCategories =
      result?.raiFilterResult?.raiFilterTypeResults ||
      (filterName === "rai" ? result?.raiFilterTypeResults : null);
    const matchedRaiCategories = isObject(raiCategories)
      ? Object.entries(raiCategories)
          .filter(([, category]) => containsMatch(category))
          .map(([categoryName]) => categoryName)
      : [];

    if (matchedRaiCategories.length > 0) {
      matchedRaiCategories.forEach((category) => matches.add(category));
    } else {
      matches.add(filterName);
    }
  }
}

function humanizeFilterName(name) {
  if (FILTER_LABELS[name]) return FILTER_LABELS[name];
  return String(name)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

function formatList(items) {
  if (items.length <= 1) return items[0] || "content that did not pass";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function inspectModelArmorResponse(responseBody) {
  const payload = findModelArmorPayload(responseBody);
  if (!payload) return null;

  const matches = new Set(
    Array.isArray(payload.matchedFilters) ? payload.matchedFilters : [],
  );
  collectSummaryMatches(payload.filterSummary, matches);
  collectResultMatches(payload.filterResults, matches);

  const blocked =
    payload.blocked === true ||
    payload.filterMatchState === "MATCH_FOUND" ||
    matches.size > 0;
  const invocationResult = payload.invocationResult || null;
  const incompleteExecution = containsIncompleteExecution(
    payload.filterSummary || payload.filterResults,
  );

  if (
    !blocked &&
    !incompleteExecution &&
    !["PARTIAL", "FAILURE"].includes(invocationResult)
  ) {
    return null;
  }

  return {
    kind: blocked ? "blocked" : "unavailable",
    invocationResult,
    matchedFilters: [...matches],
  };
}

export function createModelArmorError(responseBody, pipelineStep) {
  const outcome = inspectModelArmorResponse(responseBody);
  if (!outcome) return null;

  const labels = [...new Set(outcome.matchedFilters.map(humanizeFilterName))];
  const blocked = outcome.kind === "blocked";
  const error = new Error(
    blocked
      ? `Safety screening blocked this pipeline step for ${formatList(labels)}.`
      : "Safety screening could not be completed. Please try again.",
  );
  error.name = "ModelArmorError";
  error.code = blocked ? "MODEL_ARMOR_BLOCKED" : "MODEL_ARMOR_UNAVAILABLE";
  error.isModelArmor = true;
  error.pipelineStep = pipelineStep;
  error.userTitle = blocked
    ? "Request blocked for safety"
    : "Safety check unavailable";
  error.userMessage = blocked
    ? `The safety check detected ${formatList(labels)}. Edit your request to remove or rephrase the flagged content, then run the pipeline again.`
    : "The safety service did not finish all of its checks. Please wait a moment and run the pipeline again.";
  error.retryExplanation = blocked
    ? "Trying another model would not change this safety decision."
    : "A fallback model was not attempted because safety screening must complete first.";
  error.matchedFilters = outcome.matchedFilters;
  return error;
}
