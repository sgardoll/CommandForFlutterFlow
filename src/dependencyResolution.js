// Decides the version constraint to write for every package generated code
// needs, given what the project's pubspec.yaml already declares.
//
// Three rules, in order:
//
//   1/2. The package is already declared — by FlutterFlow's own base pubspec
//        or by the user's custom dependencies. Keep their constraint. An
//        exported pubspec draws no line between the two, and either way the
//        project's own choice outranks a generated one.
//        The single exception: the generated code declares a minimum the
//        existing constraint provably cannot resolve. Then the constraint is
//        rewritten, because the alternative is code that cannot compile.
//
//   3.   The package is absent. Add the newest release that the project's
//        declared Dart/Flutter SDK floor can build, read live from pub.dev.
//
// The rule this replaces wrote `^1.0.0` for every package, which pinned new
// dependencies to their first major release.

import {
  parseEnvironmentConstraints,
  parseExistingDependencies,
} from "./pubspecSync.js";
import { constraintCanReach, constraintLowerBound } from "./pubVersions.js";
import { resolveLatestCompatibleVersions } from "./pubRegistry.js";

/**
 * @typedef {Object} DependencyPlan
 * @property {Object<string, string>} additions - name -> constraint to add
 * @property {Object<string, string>} overrides - name -> constraint to rewrite
 * @property {Array<{name: string, constraint: string}>} kept - left as declared
 * @property {string[]} warnings - what the deploying user needs to know
 * @property {{dartSdkFloor: string|null, flutterSdkFloor: string|null}} sdk
 */

/**
 * Works out what each requested package's constraint should be.
 *
 * @param {string} yamlContent - The project's current pubspec.yaml
 * @param {Object<string, string>} requestedDependencies - name -> the minimum
 *   version the generated code genuinely requires, or "" when it has no
 *   opinion and simply needs the package present
 * @param {Object} options
 * @param {Function} options.resolveVersions - Injectable registry lookup
 * @returns {Promise<DependencyPlan>}
 */
export async function planDependencyChanges(
  yamlContent,
  requestedDependencies = {},
  options = {},
) {
  const { resolveVersions = resolveLatestCompatibleVersions } = options;

  const requested = Object.entries(requestedDependencies).filter(
    // The Flutter SDK entry is always present and is never a pub package.
    ([name]) => name && name !== "flutter",
  );

  const environment = parseEnvironmentConstraints(yamlContent);
  const sdk = {
    dartSdkFloor: constraintLowerBound(environment.sdk),
    flutterSdkFloor: constraintLowerBound(environment.flutter),
  };

  const plan = {
    additions: {},
    overrides: {},
    kept: [],
    warnings: [],
    sdk,
  };
  if (requested.length === 0) return plan;

  const declared = parseExistingDependencies(yamlContent);
  const missing = [];

  for (const [name, requiredMinimum] of requested) {
    const existing = declared.get(name);
    if (!existing) {
      missing.push(name);
      continue;
    }

    // Rules 1 and 2: the project's own constraint stands.
    //
    // The requirement may arrive as a bare version or as a constraint
    // (`^5.1.2`); either way only its floor matters. Anything unreadable is
    // treated as "no opinion" rather than as grounds to rewrite a working pin.
    const minimum = constraintLowerBound(requiredMinimum);
    if (!minimum) {
      plan.kept.push({ name, constraint: existing.constraint });
      continue;
    }

    // Checked before the constraint itself: a block-form entry has no scalar
    // constraint, and an empty one would read as `any` and look satisfiable.
    if (!existing.isScalar) {
      plan.warnings.push(
        `"${name}" is declared in your project from a git, path, or SDK source, but the generated code needs at least ${minimum}. ` +
          "Left as-is — update it yourself if the build fails.",
      );
      plan.kept.push({ name, constraint: existing.constraint });
      continue;
    }

    if (constraintCanReach(existing.constraint, minimum)) {
      plan.kept.push({ name, constraint: existing.constraint });
      continue;
    }

    plan.overrides[name] = `^${minimum}`;
    plan.warnings.push(
      `"${name}" was pinned to ${existing.constraint} in your project, which cannot resolve the ${minimum} the generated code needs. ` +
        `Raising it to ^${minimum} — this changes a dependency the rest of your app also uses.`,
    );
  }

  // Rule 3: everything the project does not have yet.
  if (missing.length > 0) {
    const resolved = await resolveVersions(missing, sdk);
    for (const name of missing) {
      const result = resolved.get(name);
      if (result?.constraint) {
        plan.additions[name] = result.constraint;
        continue;
      }
      // Never invent a pin. `any` lets pub pick a version that fits the
      // project's SDK, which is strictly better than a guessed number.
      plan.additions[name] = "";
      plan.warnings.push(
        `Could not determine a version for "${name}" (${result?.error || "lookup failed"}). ` +
          "Added without a version constraint — set one in FlutterFlow if the build picks the wrong release.",
      );
    }
  }

  return plan;
}
