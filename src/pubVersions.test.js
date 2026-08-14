import assert from "node:assert/strict";
import test from "node:test";
import {
  compareVersions,
  constraintCanReach,
  constraintContains,
  constraintLowerBound,
  isPrerelease,
  parseConstraint,
  parseVersion,
} from "./pubVersions.js";

test("parses versions and rejects non-versions", () => {
  assert.deepEqual(parseVersion("3.12.0"), {
    major: 3,
    minor: 12,
    patch: 0,
    prerelease: [],
  });
  assert.deepEqual(parseVersion("2.0.0-beta.1").prerelease, ["beta", "1"]);
  assert.equal(parseVersion("3.12.0+5").patch, 0);
  assert.equal(parseVersion("3.12"), null);
  assert.equal(parseVersion("latest"), null);
  assert.equal(parseVersion(""), null);
});

test("orders versions numerically, not lexically", () => {
  assert.equal(compareVersions("3.9.0", "3.12.0"), -1);
  assert.equal(compareVersions("7.1.1", "7.1.1"), 0);
  assert.equal(compareVersions("11.3.1", "2.1.2"), 1);
  // Build metadata is not part of precedence.
  assert.equal(compareVersions("1.2.3+9", "1.2.3+1"), 0);
});

test("orders a prerelease below its release", () => {
  assert.equal(compareVersions("2.0.0-beta.1", "2.0.0"), -1);
  assert.equal(compareVersions("2.0.0-beta.2", "2.0.0-beta.10"), -1);
  assert.equal(compareVersions("2.0.0-alpha", "2.0.0-beta"), -1);
  assert.equal(isPrerelease("2.0.0-beta.1"), true);
  assert.equal(isPrerelease("2.0.0"), false);
});

test("expands a caret constraint to its real upper bound", () => {
  assert.deepEqual(parseConstraint("^3.12.0"), {
    min: "3.12.0",
    minInclusive: true,
    max: "4.0.0",
    maxInclusive: false,
  });
  // Below 1.0.0 the minor position is the breaking one.
  assert.equal(parseConstraint("^0.19.0").max, "0.20.0");

  // Pub applies that to every zero major, with no npm-style 0.0.x special
  // case: pub_semver's nextBreaking increments the minor whenever major is 0,
  // so ^0.0.3 reaches 0.1.0, not 0.0.4.
  assert.equal(parseConstraint("^0.0.3").max, "0.1.0");
});

test("a ^0.0.x constraint still contains later 0.0.x releases", () => {
  // The npm reading (<0.0.4) would report this as unsatisfiable and make
  // dependency resolution rewrite a constraint the project can already meet.
  assert.equal(constraintContains("^0.0.3", "0.0.9"), true);
  assert.equal(constraintContains("^0.0.3", "0.0.3"), true);
  assert.equal(constraintContains("^0.0.3", "0.1.0"), false);
  assert.equal(constraintContains("^0.0.3", "0.0.2"), false);
});

test("parses range, exact, and unbounded constraints", () => {
  assert.deepEqual(parseConstraint(">=3.5.0 <4.0.0"), {
    min: "3.5.0",
    minInclusive: true,
    max: "4.0.0",
    maxInclusive: false,
  });
  assert.deepEqual(parseConstraint("1.2.3"), {
    min: "1.2.3",
    minInclusive: true,
    max: "1.2.3",
    maxInclusive: true,
  });
  assert.equal(parseConstraint("any").min, null);
  assert.equal(parseConstraint("").max, null);
  assert.equal(parseConstraint('">=2.17.0 <4.0.0"').min, "2.17.0");
  assert.equal(parseConstraint(">2.0.0").minInclusive, false);
  assert.equal(parseConstraint("<=3.0.0").maxInclusive, true);
  assert.equal(parseConstraint("not-a-constraint"), null);
});

test("tests whether a constraint admits a version", () => {
  // The case that drives dependency selection: record 7.1.1 wants Dart
  // ^3.12.0, which a project pinned at a 3.5.0 floor cannot offer.
  assert.equal(constraintContains("^3.12.0", "3.5.0"), false);
  assert.equal(constraintContains("^3.5.0", "3.5.0"), true);
  assert.equal(constraintContains(">=2.17.0 <4.0.0", "3.5.0"), true);
  assert.equal(constraintContains("any", "3.5.0"), true);
  assert.equal(constraintContains(">3.5.0", "3.5.0"), false);
  assert.equal(constraintContains("garbage", "3.5.0"), false);
});

test("does not call for an override a constraint can already satisfy", () => {
  // ^2.0.0 already resolves 2.4.0; rewriting it would be pointless churn.
  assert.equal(constraintCanReach("^2.0.0", "2.4.0"), true);
  assert.equal(constraintCanReach("^2.0.0", "3.0.0"), false);
  assert.equal(constraintCanReach(">=1.0.0", "99.0.0"), true);
  assert.equal(constraintCanReach("1.2.3", "1.2.3"), true);
  assert.equal(constraintCanReach("1.2.3", "1.2.4"), false);
  // An unreadable constraint is surfaced for review, never assumed adequate.
  assert.equal(constraintCanReach("garbage", "1.0.0"), false);
});

test("reads the lower bound out of an SDK constraint", () => {
  assert.equal(constraintLowerBound('">=3.5.0 <4.0.0"'), "3.5.0");
  assert.equal(constraintLowerBound("^3.12.0"), "3.12.0");
  assert.equal(constraintLowerBound("any"), null);
});
