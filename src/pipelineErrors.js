/**
 * Resolves which pipeline step (1 = Architect, 2 = Generator, 3 = Review) an
 * error belongs to, so the UI can highlight the right step.
 *
 * The authoritative signal is a structured `error.pipelineStep` (a step label
 * such as "architect" | "generator" | "review"), set on model-armor errors by
 * `createModelArmorError`. We map that through `stepMap` first.
 *
 * When no structured step is present (e.g. plain network/provider errors
 * wrapped by the `run*` helpers), we fall back to the step-name prefixes that
 * app.js itself stamps onto those errors ("Prompt Architect failed:",
 * "Code Generator failed:", "Code Review failed:"). Matching only our own
 * reliable markers avoids the fragility of substring-matching raw provider
 * names (a Gemini error quoting "Claude" would otherwise be misattributed).
 *
 * @param {Error} error
 * @param {Record<string, number>} stepMap - label -> step index
 * @returns {number} 1 | 2 | 3 (defaults to 1)
 */
export function resolvePipelineErrorStep(error, stepMap = {}) {
  const pipelineStep = error?.pipelineStep;
  if (pipelineStep != null && stepMap[pipelineStep] != null) {
    return stepMap[pipelineStep];
  }

  const message = error?.message || "";
  if (message.includes("Code Generator")) return 2;
  if (message.includes("Code Review")) return 3;
  return 1;
}
