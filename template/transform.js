/**
 * MVPL Transform Adapter — Template
 * ----------------------------------
 * Copy this file to adapters/{your_domain}/transform.js
 * Implement each function for your data source.
 *
 * Rule: Personal data must never leave this file.
 * Everything returned by transform() is safe to send to the engine.
 */

import crypto from "crypto";

// ─────────────────────────────────────────
// UTILS
// Provided. Do not modify.
// ─────────────────────────────────────────

/**
 * SHA-256 hash of a normalized string.
 * Normalization: lowercase, trim whitespace, remove spaces.
 */
function hashField(value) {
  if (!value) return "";
  const normalized = String(value).toLowerCase().trim().replace(/\s+/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Extract numeric portion from an address string.
 * "東京都新宿区西新宿2-8-1" → "2-8-1"
 * "123 Main St Apt 4B"      → "123-4"
 */
function extractAddressNumeric(address) {
  if (!address) return "";
  const matches = address.match(/\d+[-－]\d+(?:[-－]\d+)*/);
  if (matches) return matches[0];
  const digits = address.match(/\d+/g);
  return digits ? digits.join("-") : "";
}

/**
 * Split an identifier into upper4 and lower4.
 * Strips non-numeric characters before splitting.
 * "1234-5678" → { upper4: "1234", lower4: "5678" }
 */
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
// DOMAIN PROFILE
// Define which fields are required for your domain.
// ─────────────────────────────────────────

/**
 * Available profiles:
 *   "netcafe"   — first_name_hash, last_name_hash, id_upper4, id_lower4
 *   "hotel"     — all 6 fields
 *   "contract"  — first_name_hash, last_name_hash, request_id
 *   "custom"    — define your own in REQUIRED_FIELDS below
 */
const PROFILE = "custom";

const REQUIRED_FIELDS = {
  netcafe:  ["first_name_hash", "last_name_hash", "id_upper4", "id_lower4"],
  hotel:    ["first_name_hash", "last_name_hash", "address_numeric", "id_upper4", "id_lower4", "request_id"],
  contract: ["first_name_hash", "last_name_hash", "request_id"],
  custom:   [], // ← define your required fields here
};

// ─────────────────────────────────────────
// TRANSFORM FUNCTION
// This is the only function you need to implement.
// ─────────────────────────────────────────

/**
 * transform(rawData) → CommonSchema
 *
 * Input:  your domain-specific raw data object
 * Output: MVPL common schema (safe to send to engine)
 *
 * @param {object} rawData — your raw input (CRM record, form data, API response, etc.)
 * @returns {object} MVPL common schema
 */
export function transform(rawData) {

  // ── IMPLEMENT BELOW ──────────────────────────────────────────
  //
  // Map your raw fields to MVPL schema fields.
  // Use the provided utils: hashField(), extractAddressNumeric(), splitId()
  //
  // Example (net cafe):
  //
  //   const { upper4, lower4 } = splitId(rawData.id_number);
  //   return {
  //     first_name_hash:  hashField(rawData.first_name),
  //     last_name_hash:   hashField(rawData.last_name),
  //     address_numeric:  "",
  //     id_upper4:        upper4,
  //     id_lower4:        lower4,
  //     request_id:       rawData.session_id ?? "",
  //   };
  //
  // ─────────────────────────────────────────────────────────────

  const { upper4, lower4 } = splitId(rawData.id_number ?? "");

  return {
    first_name_hash:  hashField(rawData.first_name ?? ""),
    last_name_hash:   hashField(rawData.last_name ?? ""),
    address_numeric:  extractAddressNumeric(rawData.address ?? ""),
    id_upper4:        upper4,
    id_lower4:        lower4,
    request_id:       rawData.request_id ?? "",
  };

}

// ─────────────────────────────────────────
// VALIDATION
// Checks required fields for your profile.
// ─────────────────────────────────────────

/**
 * validate(schema) → { valid: boolean, missing: string[] }
 */
export function validate(schema) {
  const required = REQUIRED_FIELDS[PROFILE] ?? [];
  const missing = required.filter((f) => !schema[f]);
  return {
    valid: missing.length === 0,
    missing,
    profile: PROFILE,
  };
}

// ─────────────────────────────────────────
// PIPELINE ENTRY POINT
// Combines transform + validate.
// ─────────────────────────────────────────

/**
 * run(rawData) → { schema, validation }
 *
 * Use this in your worker or pipeline.
 */
export function run(rawData) {
  const schema = transform(rawData);
  const validation = validate(schema);
  return { schema, validation };
}
