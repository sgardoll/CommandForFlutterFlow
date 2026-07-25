import assert from "node:assert/strict";
import test from "node:test";
import {
  detectLanguage,
  extractCodeFromMarkdown,
  highlightCode,
  processInlineFormatting,
  renderMarkdownAudit,
} from "./auditRenderer.js";

// Audit markdown is model output. It reaches the DOM via innerHTML, so a
// payload in any branch of the renderer would execute.
const PAYLOAD = '<img src=x onerror="alert(1)">';

// Every structural branch the renderer has, each carrying the payload.
const INJECTION_POINTS = {
  "h1 heading": `# ${PAYLOAD}`,
  "h2 heading": `## ${PAYLOAD}`,
  paragraph: PAYLOAD,
  "bulleted item": `- ${PAYLOAD}`,
  "starred item": `* ${PAYLOAD}`,
  "numbered item": `1. ${PAYLOAD}`,
  "inline code": `see \`${PAYLOAD}\` here`,
  bold: `**${PAYLOAD}**`,
  italic: `*${PAYLOAD}*`,
  "code block": `\`\`\`dart\n${PAYLOAD}\n\`\`\``,
  "closing tag breakout": `# </h2><script>alert(1)</script>`,
  "svg onload": `<svg onload=alert(1)>`,
  "iframe srcdoc": `<iframe srcdoc="<script>alert(1)</script>">`,
  "event handler attribute": `- x" onmouseover="alert(1)`,
};

// The only tags the renderer ever emits. Anything else in the output came from
// the input, which means it was not escaped.
const RENDERER_TAGS = new Set([
  "div", "h2", "h3", "span", "p", "strong", "em", "code", "pre",
]);

// Splits output into real tags. Escaped payloads contain no "<", so they cannot
// appear here — which is exactly the property under test. Substring matching
// would not do: escaped text legitimately contains the characters `onerror=`.
function parseTags(html) {
  const tags = [];
  const tagPattern = /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (const match of html.matchAll(tagPattern)) {
    tags.push({ name: match[1].toLowerCase(), attributes: match[2] || "" });
  }
  return tags;
}

test("no injection point can emit a tag the renderer did not author", () => {
  for (const [name, markdown] of Object.entries(INJECTION_POINTS)) {
    const tags = parseTags(renderMarkdownAudit(markdown, { highlighter: null }));
    assert.ok(tags.length > 0, `${name}: parsed no tags at all`);

    for (const tag of tags) {
      assert.ok(
        RENDERER_TAGS.has(tag.name),
        `${name}: emitted unexpected <${tag.name}>`,
      );
      assert.doesNotMatch(
        tag.attributes,
        /\bon\w+\s*=/i,
        `${name}: <${tag.name}> carries an event handler`,
      );
      assert.doesNotMatch(
        tag.attributes,
        /javascript:/i,
        `${name}: <${tag.name}> carries a javascript: URL`,
      );
    }
  }
});

test("escapes the payload rather than dropping it", () => {
  // Silently discarding input would also pass the assertions above, so confirm
  // the text still reaches the reader — just inert.
  const html = renderMarkdownAudit(`# ${PAYLOAD}`, { highlighter: null });
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("still renders the markdown it is supposed to render", () => {
  const html = renderMarkdownAudit(
    [
      "# Integration Audit Report",
      "## Critical Issues",
      "- **CRITICAL** missing `width` parameter",
      "1. first step",
      "plain paragraph",
    ].join("\n"),
    { highlighter: null },
  );

  assert.match(html, /<h2[^>]*>/);
  assert.match(html, /Integration Audit Report/);
  assert.match(html, /📋/); // section icon still resolves
  assert.match(html, /❌/); // subsection icon still resolves
  // Bold wraps the word, then the keyword highlighter colours it inside.
  assert.match(
    html,
    /<strong class="text-gray-900 font-semibold"><span class="text-red-600 font-bold">CRITICAL<\/span><\/strong>/,
  );
  assert.match(html, /<code class="[^"]*">width<\/code>/);
  assert.match(html, /first step/);
  assert.match(html, /<p class="text-gray-700 text-sm mb-2">plain paragraph<\/p>/);
  assert.match(html, /Live Audit Report/);
});

test("inline formatting escapes before adding markup", () => {
  assert.equal(
    processInlineFormatting("<b>x</b>"),
    "&lt;b&gt;x&lt;/b&gt;",
  );
  // Delimiters still work on escaped text.
  assert.match(processInlineFormatting("**bold**"), /<strong[^>]*>bold<\/strong>/);
});

test("highlightCode escapes when the highlighter is unavailable", () => {
  // hljs comes from a CDN; if the script is blocked every call throws and the
  // fallback must not hand raw model output to innerHTML.
  assert.equal(highlightCode(PAYLOAD, "dart", null), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(highlightCode(PAYLOAD, "dart", undefined), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");

  // A working highlighter's output is passed through as trusted markup.
  const stub = { highlight: (code) => ({ value: `<span class="hljs">${code}</span>` }) };
  assert.equal(highlightCode("var x;", "dart", stub), '<span class="hljs">var x;</span>');
});

test("handles empty and non-string input without throwing", () => {
  assert.match(renderMarkdownAudit("", { highlighter: null }), /Live Audit Report/);
  assert.match(renderMarkdownAudit(null, { highlighter: null }), /Live Audit Report/);
  assert.match(renderMarkdownAudit(undefined, { highlighter: null }), /Live Audit Report/);
});

test("preserves the existing language detection and code extraction behavior", () => {
  assert.equal(detectLanguage("class A extends B {}"), "dart");
  assert.equal(detectLanguage("def f(): print(1)"), "python");
  assert.equal(detectLanguage("nothing recognizable"), "dart");
  assert.equal(extractCodeFromMarkdown("```dart\nvar x;\n```"), "var x;");
  assert.equal(extractCodeFromMarkdown("  bare  "), "bare");
  assert.equal(extractCodeFromMarkdown(""), "");
});
