import assert from "node:assert/strict";
import test from "node:test";
import { escapeAttr, escapeHtml, escapeHtmlText } from "./htmlEscape.js";

test("neutralizes the characters that let text become markup", () => {
  assert.equal(
    escapeHtmlText('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  assert.equal(escapeHtmlText("</script><script>alert(1)</script>"),
    "&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtmlText("a & b"), "a &amp; b");
  assert.equal(escapeHtmlText("it's"), "it&#39;s");
});

test("escapes each character once, never double-encoding", () => {
  // A single pass matters: escaping & after < would turn &lt; into &amp;lt;.
  assert.equal(escapeHtmlText("<&>"), "&lt;&amp;&gt;");
  assert.equal(escapeHtmlText("&amp;"), "&amp;amp;");
});

test("preserves whitespace exactly for pre and code contexts", () => {
  assert.equal(escapeHtmlText("a\n  b\tc"), "a\n  b\tc");
});

test("coerces non-strings without throwing", () => {
  assert.equal(escapeHtmlText(null), "");
  assert.equal(escapeHtmlText(undefined), "");
  assert.equal(escapeHtmlText(0), "0");
  assert.equal(escapeHtmlText(false), "false");
});

test("escapeHtml renders newlines as breaks but still escapes markup", () => {
  assert.equal(escapeHtml("line1\nline2"), "line1<br>line2");
  assert.equal(escapeHtml("<b>x</b>\ny"), "&lt;b&gt;x&lt;/b&gt;<br>y");
  assert.equal(escapeHtml(""), "");
  assert.equal(escapeHtml(null), "");
});

test("escapeAttr cannot break out of a quoted attribute", () => {
  // Both quote styles must be encoded, and newlines flattened, so the value
  // cannot terminate the attribute or inject a second one.
  assert.equal(
    escapeAttr('" onmouseover="alert(1)'),
    "&quot; onmouseover=&quot;alert(1)",
  );
  assert.equal(escapeAttr("' onfocus='alert(1)"), "&#39; onfocus=&#39;alert(1)");
  assert.equal(escapeAttr("a\nb\r\nc"), "a b c");

  const escaped = escapeAttr('x" autofocus onfocus="alert(1)');
  assert.ok(!/[<>"']/.test(escaped), "no raw quote or angle bracket survives");
});
