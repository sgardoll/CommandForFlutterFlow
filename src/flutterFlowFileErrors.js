/**
 * Formats one entry from FlutterFlow's per-file error map into a readable
 * string. A 400 from `syncCustomCodeChanges` returns
 * `{"File.dart": [{"errorMessage": "...", "isCritical": true}]}` - an array
 * of error objects per file, not a single object - so reading `.errorMessage`
 * directly off the array yields `undefined` and stringifying the array falls
 * back to "[object Object]".
 * @param {*} errorInfo - Value from the file-keyed error map
 * @returns {string} Human-readable message
 */
export function formatFlutterFlowFileError(errorInfo) {
  if (typeof errorInfo === "string") return errorInfo;

  if (Array.isArray(errorInfo)) {
    const messages = errorInfo
      .map((entry) => (typeof entry === "string" ? entry : entry?.errorMessage))
      .filter(Boolean);
    return messages.length > 0 ? messages.join("; ") : JSON.stringify(errorInfo);
  }

  if (errorInfo && typeof errorInfo === "object") {
    return errorInfo.errorMessage || JSON.stringify(errorInfo);
  }

  return String(errorInfo ?? "");
}
