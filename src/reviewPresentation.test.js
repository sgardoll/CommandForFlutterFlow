import assert from "node:assert/strict";
import test from "node:test";
import { buildReviewPresentation, normalizeReviewStatus } from "./reviewPresentation.js";

const bundle = {
  title: "NFC bundle",
  description: "Connect NFC scans to a webhook.",
  artifacts: [
    {
      id: "format-payload",
      artifactName: "formatPayload",
      artifactType: "CustomFunction",
      fileName: "format_payload.dart",
      code: "String formatPayload() => '';",
      dependencies: [],
      imports: ["dart:convert"],
    },
    {
      id: "execute-webhook",
      artifactName: "executeWebhook",
      artifactType: "CustomAction",
      fileName: "execute_webhook.dart",
      code: "Future<bool> executeWebhook() async => true;",
      dependencies: [{ name: "http", version: "^1.2.0" }],
      imports: ["package:http/http.dart"],
    },
  ],
  relationships: [
    { from: "execute-webhook", to: "format-payload", type: "calls" },
  ],
  deployOrder: ["format-payload", "execute-webhook"],
  warnings: [],
  metadata: {
    compatibility: {
      valid: true,
      findings: [],
      deployHints: [
        { artifactId: "execute-webhook", pathHint: "actions/" },
      ],
    },
  },
};

test("normalizes common review verdict vocabulary", () => {
  assert.equal(normalizeReviewStatus("approved"), "pass");
  assert.equal(normalizeReviewStatus("needs attention"), "warning");
  assert.equal(normalizeReviewStatus("blocked"), "fail");
  assert.equal(normalizeReviewStatus("unknown"), null);
});

test("builds an overarching summary and status-bearing file presentations", () => {
  const presentation = buildReviewPresentation({
    bundle,
    reviewResult: JSON.stringify({
      overallReview: {
        status: "warning",
        score: 88,
        summary: "Safe to deploy after one FlutterFlow setup step.",
        manualActions: [
          {
            title: "Confirm the http dependency",
            location: "Settings > Project Dependencies",
          },
        ],
      },
      artifacts: [
        {
          id: "format_payload",
          review: { status: "pass", findings: [] },
        },
        {
          fileName: "execute_webhook.dart",
          review: {
            status: "warn",
            findings: [
              { severity: "warning", message: "Confirm endpoint authentication." },
            ],
          },
        },
      ],
    }),
  });

  assert.equal(presentation.status, "warning");
  assert.equal(presentation.score, 88);
  assert.equal(presentation.summary, "Safe to deploy after one FlutterFlow setup step.");
  assert.deepEqual(presentation.counts, { pass: 1, warning: 1, fail: 0 });
  assert.equal(presentation.manualSteps[0].title, "Confirm the http dependency");
  assert.equal(presentation.artifacts[1].pathHint, "actions/");
  assert.equal(presentation.artifacts[1].relationships.length, 1);
});

test("treats missing file review evidence as warning rather than pass", () => {
  const presentation = buildReviewPresentation({
    bundle,
    reviewResult: {
      status: "pass",
      summary: "Bundle compatibility passed.",
      artifacts: [],
    },
  });

  assert.equal(presentation.status, "warning");
  assert.equal(presentation.reviewCoverage.reviewed, 0);
  assert.equal(presentation.counts.warning, 2);
  assert.match(presentation.artifacts[0].statusReason, /No file-level verdict/);
});

test("unwraps a message content envelope and preserves explicit manual steps", () => {
  const presentation = buildReviewPresentation({
    bundle,
    reviewResult: {
      role: "assistant",
      content: JSON.stringify({
        overallSummary: "One blocking issue.",
        status: "fail",
        flutterFlowSteps: ["Create the required App State variable."],
        artifacts: [
          {
            id: "execute_webhook",
            review: {
              status: "fail",
              criticalIssues: ["Missing callback wiring."],
            },
          },
        ],
      }),
    },
  });

  assert.equal(presentation.status, "fail");
  assert.equal(presentation.manualSteps.length, 1);
  assert.equal(presentation.manualSteps[0].source, "Code Review");
  assert.equal(presentation.artifacts[1].findings[0].severity, "fail");
});

test("extracts a prominent score from legacy markdown reviews", () => {
  const presentation = buildReviewPresentation({
    bundle,
    reviewResult: "# Code Review\n\nScore: 74/100\n\nReview completed with warnings.",
  });

  assert.equal(presentation.score, 74);
});
