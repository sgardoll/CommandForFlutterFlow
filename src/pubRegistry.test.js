import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveLatestCompatibleVersion,
  resolveLatestCompatibleVersions,
  selectCompatibleVersion,
} from "./pubRegistry.js";

// Trimmed from the real pub.dev response for `record`, which is exactly the
// case that exposed the bug: its current release needs a newer Dart than a
// long-lived FlutterFlow project declares.
const RECORD_PACKAGE = {
  name: "record",
  versions: [
    { version: "5.1.2", pubspec: { environment: { sdk: ">=3.0.0 <4.0.0", flutter: ">=3.10.0" } } },
    { version: "6.2.1", pubspec: { environment: { sdk: "^3.5.0", flutter: ">=3.24.0" } } },
    { version: "7.0.0", pubspec: { environment: { sdk: "^3.12.0", flutter: ">=3.44.0" } } },
    { version: "7.1.1", pubspec: { environment: { sdk: "^3.12.0", flutter: ">=3.44.0" } } },
  ],
};

function stubFetch(responses) {
  return async (url) => {
    const name = decodeURIComponent(url.split("/").pop());
    const entry = responses[name];
    if (!entry) return { ok: false, status: 404 };
    if (entry.throws) throw new Error(entry.throws);
    return { ok: true, status: 200, json: async () => entry };
  };
}

test("picks the newest release the project's Dart floor can build", () => {
  assert.deepEqual(
    selectCompatibleVersion(RECORD_PACKAGE, { dartSdkFloor: "3.5.0" }),
    { version: "6.2.1", constraint: "^6.2.1" },
  );
  assert.deepEqual(
    selectCompatibleVersion(RECORD_PACKAGE, { dartSdkFloor: "3.12.0" }),
    { version: "7.1.1", constraint: "^7.1.1" },
  );
});

test("takes the newest release when the project declares no SDK floor", () => {
  assert.equal(selectCompatibleVersion(RECORD_PACKAGE, {}).version, "7.1.1");
});

test("honours a Flutter floor as well as a Dart floor", () => {
  assert.equal(
    selectCompatibleVersion(RECORD_PACKAGE, {
      dartSdkFloor: "3.12.0",
      flutterSdkFloor: "3.24.0",
    }).version,
    "6.2.1",
  );
});

test("skips retracted and prerelease versions", () => {
  const document = {
    versions: [
      { version: "1.0.0", pubspec: { environment: { sdk: "^3.0.0" } } },
      { version: "2.0.0", retracted: true, pubspec: { environment: { sdk: "^3.0.0" } } },
      { version: "3.0.0-beta.1", pubspec: { environment: { sdk: "^3.0.0" } } },
    ],
  };
  assert.equal(selectCompatibleVersion(document, { dartSdkFloor: "3.5.0" }).version, "1.0.0");
});

test("accepts a version that declares no SDK range", () => {
  const document = { versions: [{ version: "0.9.0", pubspec: {} }] };
  assert.equal(selectCompatibleVersion(document, { dartSdkFloor: "3.5.0" }).version, "0.9.0");
});

test("reports rather than guesses when nothing fits", () => {
  assert.equal(selectCompatibleVersion(RECORD_PACKAGE, { dartSdkFloor: "2.12.0" }), null);
  assert.equal(selectCompatibleVersion({ versions: [] }, {}), null);
});

test("resolves a package over the registry API", async () => {
  const result = await resolveLatestCompatibleVersion("record", {
    dartSdkFloor: "3.5.0",
    fetchImpl: stubFetch({ record: RECORD_PACKAGE }),
  });
  assert.deepEqual(result, {
    name: "record",
    version: "6.2.1",
    constraint: "^6.2.1",
    error: null,
  });
});

test("gives the lookup a deadline so a stalled registry cannot hang a deploy", async () => {
  let seenSignal = null;
  await resolveLatestCompatibleVersion("record", {
    fetchImpl: async (_url, init) => {
      seenSignal = init?.signal;
      return { ok: true, status: 200, json: async () => RECORD_PACKAGE };
    },
  });
  assert.ok(seenSignal instanceof AbortSignal);
});

test("returns an error instead of throwing when a lookup fails", async () => {
  const missing = await resolveLatestCompatibleVersion("nope", {
    fetchImpl: stubFetch({}),
  });
  assert.equal(missing.constraint, null);
  assert.match(missing.error, /not found on pub\.dev/);

  const offline = await resolveLatestCompatibleVersion("record", {
    fetchImpl: stubFetch({ record: { throws: "network down" } }),
  });
  assert.equal(offline.constraint, null);
  assert.match(offline.error, /could not reach pub\.dev/);

  const unsupported = await resolveLatestCompatibleVersion("record", {
    dartSdkFloor: "2.12.0",
    fetchImpl: stubFetch({ record: RECORD_PACKAGE }),
  });
  assert.equal(unsupported.constraint, null);
  assert.match(unsupported.error, /supports Dart 2\.12\.0/);
});

test("resolves several packages into a lookup map", async () => {
  const resolved = await resolveLatestCompatibleVersions(["record", "ghost"], {
    dartSdkFloor: "3.5.0",
    fetchImpl: stubFetch({ record: RECORD_PACKAGE }),
  });
  assert.equal(resolved.get("record").constraint, "^6.2.1");
  assert.equal(resolved.get("ghost").constraint, null);
});
