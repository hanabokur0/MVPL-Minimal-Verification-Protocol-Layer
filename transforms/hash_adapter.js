/**
 * MVPL Transform Utility — Hash Adapter
 * ---------------------------------------
 * Converts personal name strings to SHA-256 hashes.
 * Raw names never leave this function.
 *
 * Normalization rules (applied before hashing):
 *   1. Lowercase
 *   2. Trim whitespace
 *   3. Remove internal spaces
 *   4. Normalize full-width to half-width (Japanese)
 *   5. Normalize katakana to hiragana (optional)
 *
 * Why normalization matters:
 *   "山田 太郎" and "山田太郎" must produce the same hash.
 *   "YAMADA" and "yamada" must produce the same hash.
 */

import crypto from "crypto";

// ─────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────

/**
 * Normalize full-width ASCII to half-width.
 * "Ａ" → "A", "１" → "1"
 */
function normalizeFullWidth(str) {
  return str.replace(/[\uff01-\uff5e]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

/**
 * Normalize katakana to hiragana.
 * "タロウ" → "たろう"
 * Ensures consistent hashing regardless of kana type.
 */
function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/**
 * Full normalization pipeline.
 * Applied to every name before hashing.
 */
function normalize(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")           // remove all spaces
    .toLowerCase()
    |> normalizeFullWidth(%)       // full-width → half-width
    |> katakanaToHiragana(%);      // katakana → hiragana
}

// Fallback for environments without pipeline operator
function normalizeSafe(value) {
  const step1 = String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
  const step2 = normalizeFullWidth(step1);
  const step3 = katakanaToHiragana(step2);
  return step3;
}

// ─────────────────────────────────────────
// MAIN EXPORTS
// ─────────────────────────────────────────

/**
 * hashName(value) → string
 *
 * SHA-256 hash of a normalized name string.
 * Returns empty string for empty input.
 *
 * @param {string} value — raw name (first or last)
 * @returns {string} 64-char hex string or ""
 *
 * @example
 * hashName("山田")        // → "a3f1c2..."
 * hashName("山 田")       // → "a3f1c2..."  (same — spaces removed)
 * hashName("YAMADA")      // → "b7e4d1..."
 * hashName("yamada")      // → "b7e4d1..."  (same — lowercased)
 * hashName("")            // → ""
 */
export function hashName(value) {
  const normalized = normalizeSafe(value);
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * hashPair(firstName, lastName) → { first_name_hash, last_name_hash }
 *
 * Convenience function for transform adapters.
 *
 * @example
 * hashPair("太郎", "山田")
 * // → { first_name_hash: "a3f1...", last_name_hash: "b7e4..." }
 */
export function hashPair(firstName, lastName) {
  return {
    first_name_hash: hashName(firstName),
    last_name_hash:  hashName(lastName),
  };
}
