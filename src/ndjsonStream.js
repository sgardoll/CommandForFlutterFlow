/**
 * Incremental NDJSON reader.
 *
 * The custom class deploy runner streams one JSON object per line while it
 * works, so its progress can be shown as it happens. Network chunks split
 * anywhere, including mid-line, so parsing keeps a buffer between chunks.
 */

/**
 * Parses whole lines out of a chunk, keeping any partial trailing line.
 * @param {string} buffer - Leftover text from the previous chunk
 * @param {string} chunk - Newly received text
 * @returns {{ events: Object[], buffer: string }} Parsed events and the
 *   still-incomplete tail
 */
export function readNdjsonChunk(buffer, chunk) {
  const parts = `${buffer}${chunk}`.split("\n");
  const tail = parts.pop() ?? "";
  const events = [];

  for (const line of parts) {
    const event = parseNdjsonLine(line);
    if (event) events.push(event);
  }

  return { events, buffer: tail };
}

/**
 * Parses whatever is left once the stream ends. A response that isn't streamed
 * at all arrives as a single JSON object with no trailing newline, so this is
 * what makes a non-streaming runner still work.
 * @param {string} buffer - Leftover text from the last chunk
 * @returns {Object[]} Zero or one parsed event
 */
export function flushNdjsonBuffer(buffer) {
  const event = parseNdjsonLine(buffer);
  return event ? [event] : [];
}

/**
 * @param {string} line - One candidate NDJSON line
 * @returns {Object|null} The parsed object, or null if the line is blank or
 *   isn't a JSON object
 */
function parseNdjsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
