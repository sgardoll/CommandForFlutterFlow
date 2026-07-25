import assert from "node:assert/strict";
import test from "node:test";

import {
  createModelArmorError,
  inspectModelArmorResponse,
} from "./modelArmorResponse.js";

test("recognizes BuildShip's prompt-injection block response", () => {
  const response = {
    matchedFilters: ["promptInjection"],
    filterSummary: {
      promptInjection: {
        executionState: "EXECUTION_SUCCESS",
        matched: true,
        confidence: "MEDIUM_AND_ABOVE",
      },
    },
    filterMatchState: "MATCH_FOUND",
    blocked: true,
    invocationResult: "SUCCESS",
  };

  const error = createModelArmorError(response, "architect");

  assert.equal(error.code, "MODEL_ARMOR_BLOCKED");
  assert.equal(error.pipelineStep, "architect");
  assert.match(error.userMessage, /prompt-injection or jailbreak/i);
});

test("recognizes an official nested RAI match response", () => {
  const response = {
    sanitizationResult: {
      filterMatchState: "MATCH_FOUND",
      invocationResult: "SUCCESS",
      filterResults: {
        rai: {
          raiFilterResult: {
            matchState: "MATCH_FOUND",
            raiFilterTypeResults: {
              dangerous: { matchState: "MATCH_FOUND" },
              harassment: { matchState: "NO_MATCH_FOUND" },
            },
          },
        },
      },
    },
  };

  assert.deepEqual(inspectModelArmorResponse(response), {
    kind: "blocked",
    invocationResult: "SUCCESS",
    matchedFilters: ["dangerous"],
  });
});

test("recognizes summary matches for other filter categories", () => {
  const response = {
    filterSummary: {
      maliciousUrls: { matched: true },
      rai: {
        matched: true,
        categories: {
          hate_speech: { matched: true },
          harassment: { matched: false },
        },
      },
    },
    blocked: true,
  };

  const error = createModelArmorError(response, "generator");

  assert.deepEqual(error.matchedFilters, ["maliciousUrls", "hate_speech"]);
  assert.match(error.userMessage, /malicious URL/i);
  assert.match(error.userMessage, /hate speech/i);
});

test("recognizes array-form sensitive-data filter results", () => {
  const response = {
    sanitizationResult: {
      filterMatchState: "MATCH_FOUND",
      invocationResult: "SUCCESS",
      filterResults: [
        {
          sdpFilterResult: {
            inspectResult: { matchState: "MATCH_FOUND" },
          },
        },
      ],
    },
  };

  assert.deepEqual(
    inspectModelArmorResponse(response)?.matchedFilters,
    ["sdp"],
  );
});

test("returns an unavailable error when filter execution is incomplete", () => {
  const error = createModelArmorError(
    {
      sanitizationResult: {
        filterMatchState: "NO_MATCH_FOUND",
        invocationResult: "PARTIAL",
        filterResults: {},
      },
    },
    "review",
  );

  assert.equal(error.code, "MODEL_ARMOR_UNAVAILABLE");
  assert.match(error.userMessage, /did not finish all/i);
});

test("recognizes a failed filter execution without an overall invocation result", () => {
  const error = createModelArmorError(
    {
      filterSummary: {
        maliciousUrls: {
          matched: false,
          executionState: "EXECUTION_FAILED",
        },
      },
    },
    "architect",
  );

  assert.equal(error.code, "MODEL_ARMOR_UNAVAILABLE");
});

test("ignores a successful response with no filter matches", () => {
  const response = {
    filterMatchState: "NO_MATCH_FOUND",
    invocationResult: "SUCCESS",
    filterResults: {
      csam: {
        csamFilterFilterResult: { matchState: "NO_MATCH_FOUND" },
      },
    },
  };

  assert.equal(createModelArmorError(response, "architect"), null);
});
