/**
 * MVPL Transform Utility — Japanese Address Parser
 * -------------------------------------------------
 * Extracts numeric portion from Japanese address strings.
 *
 * Rule: Only numbers are passed to the engine.
 * Prefecture, city, town names are never transmitted.
 *
 * Examples:
 *   "東京都新宿区西新宿2-8-1"        → "2-8-1"
 *   "大阪府大阪市北区梅田1丁目2番3号" → "1-2-3"
 *   "神奈川県横浜市中区山下町1-1"     → "1-1"
 *   "埼玉県朝霞市膝折町2-5-10-305"   → "2-5-10-305"
 */

// ─────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────

/**
 * Normalize Japanese number characters to ASCII.
 * "２－８－１" → "2-8-1"
 */
function normalizeJpNumbers(str) {
  return str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－−―]/g, "-")
    .replace(/番地|番|号|丁目|丁/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/g, "");
}

// ─────────────────────────────────────────
// EXTRACTION STRATEGIES
// ─────────────────────────────────────────

/**
 * Strategy 1: Extract hyphenated numeric pattern.
 * Matches: "2-8-1", "1-2-3-405"
 */
function extractHyphenated(address) {
  const match = address.match(/\d+(?:-\d+)+/);
  return match ? match[0] : null;
}

/**
 * Strategy 2: Extract first standalone number.
 * Fallback for addresses without hyphens.
 */
function extractFirstNumber(address) {
  const match = address.match(/\d+/);
  return match ? match[0] : null;
}

// ─────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────

/**
 * parseJpAddress(address) → string
 *
 * @param {string} address — full Japanese address string
 * @returns {string} numeric portion only, safe for engine
 *
 * @example
 * parseJpAddress("東京都新宿区西新宿2-8-1")  // → "2-8-1"
 * parseJpAddress("埼玉県朝霞市膝折町2-5-10") // → "2-5-10"
 * parseJpAddress("")                          // → ""
 */
export function parseJpAddress(address) {
  if (!address) return "";

  const normalized = normalizeJpNumbers(String(address));

  return (
    extractHyphenated(normalized) ||
    extractFirstNumber(normalized) ||
    ""
  );
}
