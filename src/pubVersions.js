// Semantic version and pub constraint arithmetic.
//
// Enough of pub's constraint grammar to answer the two questions the pubspec
// merge asks: "does this constraint admit that version?" and "can this
// constraint ever reach that version?". Deliberately not a full solver — no
// union constraints (`>=1.0.0 <2.0.0 || >=3.0.0`), which pub itself only
// accepts in dependency_overrides and which FlutterFlow never emits.

const VERSION_PATTERN =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * @param {string} value - A semantic version, e.g. "3.12.0" or "2.0.0-beta.1"
 * @returns {{major: number, minor: number, patch: number, prerelease: string[]}|null}
 */
export function parseVersion(value) {
  const match = String(value || "").trim().match(VERSION_PATTERN);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function comparePrerelease(a, b) {
  // A release outranks any prerelease of the same version.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      if (Number(left) !== Number(right)) return Number(left) < Number(right) ? -1 : 1;
      continue;
    }
    // Numeric identifiers always sort below alphanumeric ones.
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

/**
 * Orders two versions. Build metadata is ignored, per semver.
 * @param {string} a
 * @param {string} b
 * @returns {number} -1, 0, or 1; 0 when either side is unparseable
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return comparePrerelease(left.prerelease, right.prerelease);
}

export function isPrerelease(version) {
  const parsed = parseVersion(version);
  return Boolean(parsed && parsed.prerelease.length > 0);
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

// `^1.2.3` allows <2.0.0, but `^0.1.2` only allows <0.2.0 — below 1.0.0 the
// minor position carries the breaking-change signal.
function caretUpperBound(version) {
  const parsed = parseVersion(version);
  if (!parsed) return null;
  if (parsed.major > 0) return `${parsed.major + 1}.0.0`;
  return `0.${parsed.minor + 1}.0`;
}

/**
 * Parses a pub version constraint into an explicit range.
 *
 * @param {string} constraint - e.g. "^3.12.0", ">=2.17.0 <4.0.0", "1.2.3", "any"
 * @returns {{min: string|null, minInclusive: boolean, max: string|null, maxInclusive: boolean}|null}
 *   null when the text is not a constraint this understands. An unbounded end
 *   is represented by a null bound.
 */
export function parseConstraint(constraint) {
  let text = String(constraint ?? "").trim();
  if (text.startsWith("'") || text.startsWith('"')) {
    text = text.slice(1, -1).trim();
  }
  if (text === "" || text === "any" || text === "*") {
    return { min: null, minInclusive: false, max: null, maxInclusive: false };
  }

  if (text.startsWith("^")) {
    const min = text.slice(1).trim();
    if (!parseVersion(min)) return null;
    return {
      min,
      minInclusive: true,
      max: caretUpperBound(min),
      maxInclusive: false,
    };
  }

  // An exact version is a range of one.
  if (parseVersion(text)) {
    return { min: text, minInclusive: true, max: text, maxInclusive: true };
  }

  const range = {
    min: null,
    minInclusive: false,
    max: null,
    maxInclusive: false,
  };
  const clausePattern = /(>=|<=|>|<)\s*([0-9][0-9A-Za-z.+-]*)/g;
  let matched = false;
  let match;
  while ((match = clausePattern.exec(text)) !== null) {
    const [, operator, version] = match;
    if (!parseVersion(version)) return null;
    matched = true;
    if (operator === ">=" || operator === ">") {
      range.min = version;
      range.minInclusive = operator === ">=";
    } else {
      range.max = version;
      range.maxInclusive = operator === "<=";
    }
  }

  return matched ? range : null;
}

/**
 * Tests whether a constraint admits a specific version.
 * @param {string} constraint - Pub version constraint
 * @param {string} version - Version to test
 * @returns {boolean} False when either side is unparseable, so an unreadable
 *   constraint never silently counts as a match.
 */
export function constraintContains(constraint, version) {
  const range = parseConstraint(constraint);
  if (!range || !parseVersion(version)) return false;

  if (range.min !== null) {
    const order = compareVersions(version, range.min);
    if (order < 0) return false;
    if (order === 0 && !range.minInclusive) return false;
  }
  if (range.max !== null) {
    const order = compareVersions(version, range.max);
    if (order > 0) return false;
    if (order === 0 && !range.maxInclusive) return false;
  }
  return true;
}

/**
 * Tests whether a constraint can resolve to *some* version at or above a
 * floor. This is the question that decides whether an already-declared
 * dependency needs overriding: `^2.0.0` already reaches 2.4.0, so a
 * requirement of 2.4.0 does not justify rewriting the project's constraint.
 *
 * @param {string} constraint - The constraint already in the pubspec
 * @param {string} minVersion - The lowest version the new code needs
 * @returns {boolean} False when either side is unparseable, so an unreadable
 *   constraint is reported as needing review rather than assumed adequate.
 */
export function constraintCanReach(constraint, minVersion) {
  const range = parseConstraint(constraint);
  if (!range || !parseVersion(minVersion)) return false;
  if (range.max === null) return true;

  const order = compareVersions(range.max, minVersion);
  if (order > 0) return true;
  return order === 0 && range.maxInclusive;
}

/**
 * The lowest version a constraint permits, used to read a project's Dart SDK
 * floor out of its `environment:` block.
 * @param {string} constraint - Pub version constraint
 * @returns {string|null} Version string, or null when unbounded/unreadable
 */
export function constraintLowerBound(constraint) {
  const range = parseConstraint(constraint);
  return range ? range.min : null;
}
