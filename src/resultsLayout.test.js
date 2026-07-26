import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("hides the prompt sidebar above mobile Results", () => {
  assert.match(
    html,
    /@media \(max-width: 768px\)[\s\S]*?body\.results-fullscreen \.sidebar,[\s\S]*?body\.results-fullscreen\.results-with-sidebar \.sidebar \{\s*display: none;/,
  );
});
