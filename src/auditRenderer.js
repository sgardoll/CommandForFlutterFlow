// Renders the Code Review step's markdown into the HTML shown in the audit
// panel.
//
// The input is model output, so it is untrusted: it reaches the DOM through
// innerHTML, and a payload in a heading, list item, paragraph, or inline span
// would otherwise execute. Every interpolation here must therefore pass through
// escapeHtmlText, and the only markup in the result is the markup this module
// adds itself.

import { escapeHtmlText } from "./htmlEscape.js";

export function getSectionIcon(title) {
  const icons = {
    "Integration Audit Report": "📋",
    "Critical Issues": "❌",
    Warnings: "⚠️",
    Recommendations: "✅",
    "Overall Score": "📊",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return "📄";
}

export function getSubsectionIcon(title) {
  const icons = {
    critical: "❌",
    warning: "⚠️",
    recommendation: "✅",
    score: "📊",
    issue: "🔍",
    fix: "🔧",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (title.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return "📝";
}

export function detectLanguage(code) {
  // Simple language detection based on code content
  if (
    (code.includes("class ") && code.includes("extends ")) ||
    code.includes("StatelessWidget") ||
    code.includes("StatefulWidget") ||
    code.includes("import 'package:flutter/")
  ) {
    return "dart";
  }
  if (
    code.includes("def ") ||
    code.includes("import ") ||
    code.includes("print(")
  ) {
    return "python";
  }
  if (
    code.includes("function ") ||
    code.includes("const ") ||
    code.includes("console.")
  ) {
    return "javascript";
  }
  return "dart"; // Default to dart for this use case
}

export function extractCodeFromMarkdown(text) {
  if (!text) return "";
  if (typeof text !== "string") return String(text);

  // Match ```language\n...code...\n``` pattern
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  // If no code block found, return original text trimmed
  return text.trim();
}

/**
 * Applies inline markdown to a single line of untrusted text.
 * @param {string} text - One line of model output
 * @returns {string} HTML-safe fragment
 */
export function processInlineFormatting(text) {
  // Escape before any markup is added, so only the tags added below can reach
  // the DOM. Escaping leaves the markdown delimiters matched here untouched.
  text = escapeHtmlText(text);

  // Bold text **text**
  text = text.replace(
    /\*\*(.*?)\*\*/g,
    '<strong class="text-gray-900 font-semibold">$1</strong>',
  );

  // Italic text *text*
  text = text.replace(/\*(.*?)\*/g, '<em class="text-blue-600">$1</em>');

  // Inline code `code`
  text = text.replace(
    /`(.*?)`/g,
    '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono border border-gray-200">$1</code>',
  );

  // Highlight important terms
  text = text.replace(
    /\b(FAIL|ERROR|CRITICAL)\b/g,
    '<span class="text-red-600 font-bold">$1</span>',
  );
  text = text.replace(
    /\b(WARN|WARNING)\b/g,
    '<span class="text-amber-600 font-bold">$1</span>',
  );
  text = text.replace(
    /\b(PASS|SUCCESS|OK)\b/g,
    '<span class="text-green-600 font-bold">$1</span>',
  );

  return text;
}

/**
 * Highlights a code block for display.
 *
 * Returns HTML, because the caller assigns it to innerHTML. highlight.js
 * escapes what it emits, but the fallbacks must escape themselves: hljs is
 * loaded from a CDN, so an unreachable script makes every call throw and take
 * the fallback path with unescaped model output.
 *
 * @param {string} code - Code to highlight
 * @param {string} [language] - Language hint for highlight.js
 * @param {Object} [highlighter] - highlight.js instance; defaults to the global
 * @returns {string} HTML-safe markup
 */
export function highlightCode(code, language = "dart", highlighter = globalThis.hljs) {
  if (!code) return "";
  const cleanCode = extractCodeFromMarkdown(code);
  try {
    return highlighter.highlight(cleanCode, { language }).value;
  } catch (error) {
    console.warn("Syntax highlighting failed:", error);
    try {
      return highlighter.highlight(cleanCode, { language: "json" }).value;
    } catch {
      return escapeHtmlText(cleanCode);
    }
  }
}

/**
 * Converts audit markdown into the HTML for the audit panel.
 * @param {string} markdown - Model-authored markdown (untrusted)
 * @param {Object} [options]
 * @param {Object} [options.highlighter] - highlight.js instance
 * @returns {string} HTML-safe markup
 */
export function renderMarkdownAudit(markdown, options = {}) {
  const { highlighter = globalThis.hljs } = options;
  let html = `<div class="audit-report space-y-4">`;

  const lines = String(markdown ?? "").split("\n");
  let inCodeBlock = false;
  let codeBlockContent = "";

  for (const line of lines) {
    // Handle code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const language = detectLanguage(codeBlockContent);
        const highlightedCode = highlightCode(
          codeBlockContent.trim(),
          language,
          highlighter,
        );
        html += `<div class="bg-gray-900 rounded-lg p-3 border border-gray-200">
          <pre class="text-xs font-mono overflow-x-auto text-gray-100"><code class="language-${language}">${highlightedCode}</code></pre>
        </div>`;
        codeBlockContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + "\n";
      continue;
    }

    // Handle headers
    if (line.startsWith("# ")) {
      const title = line.substring(2).trim();
      html += `<div class="audit-header mb-4">
        <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>${getSectionIcon(title)}</span>
          <span>${escapeHtmlText(title)}</span>
        </h2>
      </div>`;
      continue;
    }

    if (line.startsWith("## ")) {
      const title = line.substring(3).trim();
      html += `<div class="audit-subsection mb-3 mt-4">
        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>${getSubsectionIcon(title)}</span>
          <span>${escapeHtmlText(title)}</span>
        </h3>
      </div>`;
      continue;
    }

    // Handle bulleted and numbered lists
    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const item = line.replace(/^([-*+]|\d+\.)\s+/, "").trim();
      html += `<div class="audit-list-item flex items-start gap-2 mb-2">
        <span class="text-blue-600 mt-1">•</span>
        <span class="text-gray-700 text-sm">${processInlineFormatting(item)}</span>
      </div>`;
      continue;
    }

    // Handle empty lines
    if (line.trim() === "") {
      continue;
    }

    // Handle regular paragraphs
    html += `<p class="text-gray-700 text-sm mb-2">${processInlineFormatting(line)}</p>`;
  }

  html += `</div>`;

  // Wrap in styled container
  return `
    <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-xs font-bold text-green-600 uppercase tracking-wider">Live Audit Report</span>
      </div>
      ${html}
    </div>
  `;
}
