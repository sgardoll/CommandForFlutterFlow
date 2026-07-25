import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSnapshotCommitMessage,
  deriveSnapshotEndpoint,
  evaluateSnapshotOutcome,
} from "./preDeployBackup.js";

test("derives the snapshot endpoint from the deploy endpoint", () => {
  assert.equal(
    deriveSnapshotEndpoint("https://runner-abc.a.run.app/deployCustomClasses"),
    "https://runner-abc.a.run.app/commitSnapshot",
  );
  // Any configured path lands on the snapshot route, and query/fragment are dropped.
  assert.equal(
    deriveSnapshotEndpoint("https://runner-abc.a.run.app/other?x=1#y"),
    "https://runner-abc.a.run.app/commitSnapshot",
  );
  assert.equal(
    deriveSnapshotEndpoint("http://localhost:8080/deployCustomClasses"),
    "http://localhost:8080/commitSnapshot",
  );
});

test("treats a missing or malformed endpoint as unconfigured", () => {
  assert.equal(deriveSnapshotEndpoint(""), "");
  assert.equal(deriveSnapshotEndpoint("   "), "");
  assert.equal(deriveSnapshotEndpoint(undefined), "");
  assert.equal(deriveSnapshotEndpoint("not-a-url"), "");
});

test("an unconfigured runner does not block deploys", () => {
  // Existing builds have no runner configured; they must keep working.
  const result = evaluateSnapshotOutcome({ configured: false });
  assert.equal(result.proceed, true);
  assert.equal(result.severity, "warning");
  assert.match(result.message, /not configured/);
});

test("a failed backup blocks the deploy", () => {
  const result = evaluateSnapshotOutcome({
    configured: true,
    ok: false,
    error: "exit code 1",
  });
  assert.equal(result.proceed, false);
  assert.equal(result.severity, "error");
  assert.match(result.message, /exit code 1/);
  assert.match(result.message, /restore point/);
});

test("a successful commit proceeds and says so", () => {
  const result = evaluateSnapshotOutcome({
    configured: true,
    ok: true,
    committed: true,
  });
  assert.equal(result.proceed, true);
  assert.equal(result.severity, "ok");
  assert.match(result.message, /backup commit/);
});

test("an unconfirmed commit blocks the deploy rather than assuming a clean project", () => {
  // A clean exit with no commit recorded could mean the project had nothing to
  // capture, or that the no-op run never commits and there is no restore point.
  // The CLI output cannot tell them apart, so this must fail closed: guessing
  // the benign reading would look identical to a failsafe that protects nothing
  // on every deploy.
  const result = evaluateSnapshotOutcome({
    configured: true,
    ok: true,
    committed: false,
  });
  assert.equal(result.proceed, false);
  assert.equal(result.severity, "error");
  assert.match(result.message, /version history/);
});

test("the only outcome that permits a push is a confirmed commit", () => {
  // Enumerated so a future edit cannot quietly reintroduce a fail-open path.
  const permitted = [
    { configured: true, ok: true, committed: true },
    // An unconfigured runner is opting out of backups entirely, not a failure.
    { configured: false },
  ];
  const blocked = [
    { configured: true, ok: true, committed: false },
    { configured: true, ok: true, committed: undefined },
    { configured: true, ok: false, error: "boom" },
    { configured: true, ok: false },
  ];

  for (const outcome of permitted) {
    assert.equal(evaluateSnapshotOutcome(outcome).proceed, true, JSON.stringify(outcome));
  }
  for (const outcome of blocked) {
    assert.equal(evaluateSnapshotOutcome(outcome).proceed, false, JSON.stringify(outcome));
  }
});

test("commit message identifies the deploy and fits the runner's limit", () => {
  const message = buildSnapshotCommitMessage("AgentTimeline");
  assert.match(message, /^Custom Code Connect backup before deploying AgentTimeline \(/);
  assert.match(message, /\dZ\)$/);

  assert.match(buildSnapshotCommitMessage(""), /deploying custom code/);
  assert.match(buildSnapshotCommitMessage(undefined), /deploying custom code/);
  assert.ok(buildSnapshotCommitMessage("x".repeat(500)).length <= 300);
});
