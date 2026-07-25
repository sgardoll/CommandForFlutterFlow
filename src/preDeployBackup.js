// Pre-deploy failsafe: ask the FlutterFlow AI DSL runner to record a commit of
// the project's current state before we push custom code over it.
//
// This exists because the custom-code sync API has no commit concept — its
// request carries no commit message, so a push leaves no restore point behind.
// The DSL CLI does take --commit-message, which makes it the only lever we have
// for putting a rollback point in FlutterFlow's own version history.
//
// The open question is whether the CLI records a commit for a run that changes
// nothing. It is undocumented, and `flutterflow_ai` is not a public package, so
// the runner reports what actually happened rather than assuming, and the
// outcome is interpreted here.

/**
 * Derives the snapshot endpoint from the configured deploy endpoint, so a
 * single environment variable keeps working.
 * @param {string} deployEndpoint - Full URL of the runner's deploy endpoint
 * @returns {string} Full URL of the runner's snapshot endpoint, or "" if the
 *   deploy endpoint is unset or unparseable
 */
export function deriveSnapshotEndpoint(deployEndpoint) {
  const configured = String(deployEndpoint || "").trim();
  if (!configured) return "";
  try {
    const url = new URL(configured);
    url.pathname = "/commitSnapshot";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Decides whether a deploy may proceed given how the snapshot attempt went.
 *
 * @param {Object} outcome
 * @param {boolean} outcome.configured - Whether a runner endpoint is set
 * @param {boolean} [outcome.ok] - Whether the runner call succeeded
 * @param {boolean} [outcome.committed] - Whether a commit was actually recorded
 * @param {string} [outcome.error] - Failure detail, when ok is false
 * @returns {{proceed: boolean, severity: "ok"|"warning"|"error", message: string}}
 */
export function evaluateSnapshotOutcome({ configured, ok, committed, error } = {}) {
  if (!configured) {
    // Builds without the runner configured keep deploying as they always have.
    return {
      proceed: true,
      severity: "warning",
      message:
        "No pre-deploy backup was taken: the FlutterFlow DSL runner is not configured.",
    };
  }

  if (!ok) {
    // The backup was asked for and could not be made. Stop, rather than push
    // over a project with no restore point.
    return {
      proceed: false,
      severity: "error",
      message:
        `Could not create a pre-deploy backup commit${error ? ` (${error})` : ""}. ` +
        "Deploy was stopped so your project keeps a restore point. " +
        "Retry, or deploy without a backup by clearing the DSL runner setting.",
    };
  }

  if (!committed) {
    // A clean exit with no commit recorded is ambiguous, and the two readings
    // are far apart: either the project had nothing uncommitted to capture (its
    // last commit is already a restore point), or the no-op DSL run does not
    // create commits at all and no restore point exists. Nothing in the CLI
    // output distinguishes them.
    //
    // Fail closed. Guessing "clean project" would be indistinguishable from a
    // failsafe that silently protects nothing on every single deploy, which is
    // strictly worse than not offering one.
    return {
      proceed: false,
      severity: "error",
      message:
        "Could not confirm a backup commit was created, so the deploy was stopped " +
        "rather than overwrite your custom code with no way back. " +
        "Check the project's FlutterFlow version history: if no backup commit appears, " +
        "the snapshot mechanism is not working and needs fixing. " +
        "To deploy without a backup, clear the DSL runner setting.",
    };
  }

  return {
    proceed: true,
    severity: "ok",
    message: "Created a pre-deploy backup commit in FlutterFlow.",
  };
}

/**
 * Builds the snapshot commit message for a deploy.
 * @param {string} [label] - What is about to be deployed
 * @returns {string} Commit message, within the runner's 300-char limit
 */
export function buildSnapshotCommitMessage(label) {
  const target = String(label || "custom code").trim() || "custom code";
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return `Custom Code Connect backup before deploying ${target} (${stamp})`.slice(0, 300);
}
