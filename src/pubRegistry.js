// Resolves the version of a pub.dev package to add to a project's pubspec.
//
// The alternative — writing a fixed constraint like `^1.0.0` — pins every new
// package to whatever shipped under its first major, which is how a project
// ends up depending on record 1.0.0 instead of a current release. The version
// has to come from the registry, measured against what the project can build.

import { compareVersions, constraintContains, isPrerelease } from "./pubVersions.js";

export const PUB_API_BASE = "https://pub.dev/api/packages/";

// A registry lookup sits in the middle of a deploy the user is watching.
// Falling back to an unconstrained dependency beats stalling the push.
const LOOKUP_TIMEOUT_MS = 8000;

/**
 * Picks the newest release a project can actually build.
 *
 * Compatibility is judged against the SDK floor the project's own pubspec
 * declares, not against the newest SDK that pub.dev knows about: a project
 * whose `environment:` says `>=3.5.0` may well be built on a 3.5.x toolchain,
 * and a package needing `^3.12.0` would not resolve there.
 *
 * @param {Object} packageDocument - A pub.dev `/api/packages/<name>` response
 * @param {Object} sdk
 * @param {string|null} sdk.dartSdkFloor - Project's minimum Dart SDK
 * @param {string|null} sdk.flutterSdkFloor - Project's minimum Flutter SDK
 * @returns {{version: string, constraint: string}|null} null when no published
 *   release fits, so the caller can say so rather than invent a pin.
 */
export function selectCompatibleVersion(packageDocument, sdk = {}) {
  const { dartSdkFloor = null, flutterSdkFloor = null } = sdk;
  const versions = Array.isArray(packageDocument?.versions)
    ? packageDocument.versions
    : [];

  let best = null;
  for (const entry of versions) {
    const version = entry?.version;
    if (!version || entry.retracted || isPrerelease(version)) continue;

    const environment = entry.pubspec?.environment || {};
    // A package that declares no SDK range cannot be shown incompatible, and
    // being older it only ever wins when nothing newer fits.
    if (
      dartSdkFloor &&
      environment.sdk &&
      !constraintContains(environment.sdk, dartSdkFloor)
    ) {
      continue;
    }
    if (
      flutterSdkFloor &&
      environment.flutter &&
      !constraintContains(environment.flutter, flutterSdkFloor)
    ) {
      continue;
    }

    if (!best || compareVersions(version, best) > 0) best = version;
  }

  return best ? { version: best, constraint: `^${best}` } : null;
}

/**
 * Looks up the constraint to write for a package the project does not have.
 *
 * @param {string} name - Package name
 * @param {Object} options
 * @param {string|null} options.dartSdkFloor - Project's minimum Dart SDK
 * @param {string|null} options.flutterSdkFloor - Project's minimum Flutter SDK
 * @param {Function} options.fetchImpl - fetch, injectable for tests
 * @returns {Promise<{name: string, constraint: string|null, version: string|null, error: string|null}>}
 *   Never throws: one unreachable package must not fail a deploy whose other
 *   packages resolved.
 */
export async function resolveLatestCompatibleVersion(name, options = {}) {
  const {
    dartSdkFloor = null,
    flutterSdkFloor = null,
    fetchImpl = fetch,
  } = options;

  let packageDocument;
  try {
    const response = await fetchImpl(`${PUB_API_BASE}${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        name,
        constraint: null,
        version: null,
        error:
          response.status === 404
            ? `"${name}" was not found on pub.dev`
            : `pub.dev returned ${response.status} for "${name}"`,
      };
    }
    packageDocument = await response.json();
  } catch (error) {
    return {
      name,
      constraint: null,
      version: null,
      error: `could not reach pub.dev for "${name}" (${error.message})`,
    };
  }

  const selected = selectCompatibleVersion(packageDocument, {
    dartSdkFloor,
    flutterSdkFloor,
  });
  if (!selected) {
    return {
      name,
      constraint: null,
      version: null,
      error: dartSdkFloor
        ? `no published "${name}" release supports Dart ${dartSdkFloor}`
        : `no published "${name}" release could be read`,
    };
  }

  return { name, ...selected, error: null };
}

/**
 * Resolves several packages at once.
 * @param {string[]} names - Package names
 * @param {Object} options - Same options as resolveLatestCompatibleVersion
 * @returns {Promise<Map<string, {constraint: string|null, version: string|null, error: string|null}>>}
 */
export async function resolveLatestCompatibleVersions(names, options = {}) {
  const results = await Promise.all(
    names.map((name) => resolveLatestCompatibleVersion(name, options)),
  );
  return new Map(results.map(({ name, ...rest }) => [name, rest]));
}
