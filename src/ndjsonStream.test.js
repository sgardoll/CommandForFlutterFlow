import assert from "node:assert/strict";
import test from "node:test";
import { flushNdjsonBuffer, readNdjsonChunk } from "./ndjsonStream.js";

test("parses whole lines out of one chunk", () => {
  const { events, buffer } = readNdjsonChunk(
    "",
    '{"event":"phase","phase":"connected"}\n{"event":"log","message":"hi"}\n',
  );

  assert.deepEqual(events, [
    { event: "phase", phase: "connected" },
    { event: "log", message: "hi" },
  ]);
  assert.equal(buffer, "");
});

test("holds a partial line until the rest of it arrives", () => {
  const first = readNdjsonChunk("", '{"event":"phase","pha');
  assert.deepEqual(first.events, []);

  const second = readNdjsonChunk(first.buffer, 'se":"deploy_start"}\n');
  assert.deepEqual(second.events, [{ event: "phase", phase: "deploy_start" }]);
  assert.equal(second.buffer, "");
});

test("ignores blank lines and lines that aren't JSON objects", () => {
  const { events } = readNdjsonChunk(
    "",
    '\nnot json\n[1,2]\n"text"\n{"event":"log","message":"kept"}\n',
  );

  assert.deepEqual(events, [{ event: "log", message: "kept" }]);
});

test("flushes a final line that has no trailing newline", () => {
  const { events, buffer } = readNdjsonChunk(
    "",
    '{"event":"result","success":true}',
  );

  assert.deepEqual(events, []);
  assert.deepEqual(flushNdjsonBuffer(buffer), [
    { event: "result", success: true },
  ]);
});

test("reads a non-streaming runner's single JSON response", () => {
  const body = JSON.stringify({ success: true, deployed: [] });
  const { events, buffer } = readNdjsonChunk("", body);

  assert.deepEqual([...events, ...flushNdjsonBuffer(buffer)], [
    { success: true, deployed: [] },
  ]);
});

test("flushing an empty or whitespace buffer yields nothing", () => {
  assert.deepEqual(flushNdjsonBuffer(""), []);
  assert.deepEqual(flushNdjsonBuffer("  \n "), []);
});
