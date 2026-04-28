/**
 * MVPL Transform Adapter — Net Cafe / Manga Cafe
 * ------------------------------------------------
 * Domain profile: 4-field verification
 * Required: first_name_hash, last_name_hash, id_upper4, id_lower4
 *
 * Legal basis: 風営法 (Entertainment Business Act)
 * Identity verification required at entry.
 *
 * UX flow:
 *   1. Customer states name at counter
 *   2. Staff asks for last 4 digits of ID
 *   3. System verifies — no card needed, no full ID stored
 */

import crypto from "crypto";

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────

const PROFILE = "netcafe";

const REQUIRED_FIELDS = [
  "first_name_hash",
  "last_name_hash",
  "id_upper4",
  "id_lower4",
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

function hashField(value) {
  if (!value) return "";
  const normalized = String(value).toLowerCase().trim().replace(/\s+/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function splitId(id) {
  if (!id) return { upper4: "", lower4: "" };
  const digits = String(id).replace(/\D/g, "");
  if (digits.length < 4) return { upper4: "", lower4: "" };
  return {
    upper4: digits.slice(0, 4),
    lower4: digits.slice(-4),
  };
}

// ─────────────────────────────────────────
// TRANSFORM
// ─────────────────────────────────────────

/**
 * transform(rawData) → CommonSchema
 *
 * Accepts any of the following raw input formats:
 *
 * Format A — Japanese driver's license / My Number card
 * {
 *   first_name: "太郎",
 *   last_name:  "山田",
 *   id_number:  "123456789012",   // 12-digit my number
 *   session_id: "REQ-001"
 * }
 *
 * Format B — Staff manual entry (customer states name + shows last 4)
 * {
 *   first_name: "Taro",
 *   last_name:  "Yamada",
 *   id_lower4:  "5678",           // staff enters only last 4
 *   session_id: "REQ-002"
 * }
 */
export function transform(rawData) {

  // Handle both full ID and partial entry (last 4 only)
  let upper4 = "";
  let lower4 = "";

  if (rawData.id_number) {
    const split = splitId(rawData.id_number);
    upper4 = split.upper4;
    lower4 = split.lower4;
  } else {
    // Staff entered last 4 digits only (returning customer flow)
    lower4 = String(rawData.id_lower4 ?? "").replace(/\D/g, "").slice(-4);
  }

  return {
    first_name_hash:  hashField(rawData.first_name ?? ""),
    last_name_hash:   hashField(rawData.last_name ?? ""),
    address_numeric:  "",           // not required for netcafe profile
    id_upper4:        upper4,
    id_lower4:        lower4,
    request_id:       rawData.session_id ?? rawData.request_id ?? "",
  };

}

// ─────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────

export function validate(schema) {
  const missing = REQUIRED_FIELDS.filter((f) => !schema[f]);
  return {
    valid:   missing.length === 0,
    missing,
    profile: PROFILE,
  };
}

// ─────────────────────────────────────────
// PIPELINE ENTRY POINT
// ─────────────────────────────────────────

/**
 * run(rawData) → { schema, validation }
 *
 * Example output:
 * {
 *   schema: {
 *     first_name_hash: "a3f1c2...",
 *     last_name_hash:  "b7e4d1...",
 *     address_numeric: "",
 *     id_upper4:       "",
 *     id_lower4:       "5678",
 *     request_id:      "REQ-002"
 *   },
 *   validation: {
 *     valid:   true,
 *     missing: [],
 *     profile: "netcafe"
 *   }
 * }
 */
export function run(rawData) {
  const schema = transform(rawData);
  const validation = validate(schema);
  return { schema, validation };
}
