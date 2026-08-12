import assert from "node:assert/strict";
import test from "node:test";
import { resolvePipelineErrorStep } from "./pipelineErrors.js";

const STEP_MAP = { architect: 1, generator: 2, review: 3 };

test("uses the structured pipelineStep when present", () => {
  const error = new Error("anything");
  error.pipelineStep = "review";
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 3);
});

test("identifies a generator error from app.js' own prefix", () => {
  const error = new Error("Code Generator failed: primary (x): boom");
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 2);
});

test("identifies a review error from app.js' own prefix", () => {
  const error = new Error("Code Review failed: boom");
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 3);
});

test("defaults an unknown error to step 1 (Architect)", () => {
  const error = new Error("Prompt Architect failed: boom");
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 1);
});

test("does not misattribute a message that merely quotes a provider name", () => {
  // A Gemini error that mentions "Claude" must not be bumped to step 2.
  const error = new Error('Your prompt mentions "Claude" as a reference model');
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 1);
});

test("defaults to step 1 for an empty message", () => {
  assert.equal(resolvePipelineErrorStep(new Error(""), STEP_MAP), 1);
  assert.equal(resolvePipelineErrorStep(null, STEP_MAP), 1);
  assert.equal(resolvePipelineErrorStep(undefined, STEP_MAP), 1);
});

test("falls back to step 1 when the message mentions a product but not a step marker", () => {
  // "OpenAI" alone is not a reliable generator signal.
  const error = new Error("OpenAI rate limit exceeded");
  assert.equal(resolvePipelineErrorStep(error, STEP_MAP), 1);
});
