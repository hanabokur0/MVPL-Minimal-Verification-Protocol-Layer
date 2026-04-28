/**
 * MVPL Worker — Cloudflare Workers Entry Point
 * ---------------------------------------------
 * Minimal Verification Protocol Layer
 *
 * Routes:
 *   POST /verify          — run verification
 *   GET  /health          — health check
 *
 * Deploy:
 *   wrangler deploy
 */

import { run as netcafeRun } from "./adapters/netcafe/transform.js";

// ─────────────────────────────────────────
// ADAPTER REGISTRY
// Add new domain adapters here.
// ─────────────────────────────────────────

const ADAPTERS = {
  netcafe: netcafeRun,
  // hotel:    hotelRun,
  // contract: contractRun,
};

// ─────────────────────────────────────────
// MATCH ENGINE
// Compares two schemas field by field.
// Returns score and per-field results.
// Engine is invariant — never modify this.
// ─────────────────────────────────────────

const CRITICAL_FIELDS = ["id_upper4", "id_lower4"];

function matchEngine(schemaA, schemaB) {
  const fields = Object.keys(schemaA).filter((k) => schemaA[k] && schemaB[k]);
  const results = {};
  let score = 0;
  let criticalFail = false;

  for (const field of fields) {
    const match = schemaA[field] === schemaB[field];
    results[field] = match;
    if (match) score++;
    if (!match && CRITICAL_FIELDS.includes(field)) {
      criticalFail = true;
    }
  }

  return {
    fields: results,
    score,
    total: fields.length,
    critical_fail: criticalFail,
  };
}

// ─────────────────────────────────────────
// PROTOCOL ROUTER
// Decides what happens after matching.
// ─────────────────────────────────────────

function protocolRouter(matchResult) {
  const { score, total, critical_fail } = matchResult;

  if (critical_fail) {
    return { route: "ESCALATE", reason: "critical_field_mismatch" };
  }

  if (total === 0) {
    return { route: "UNKNOWN", reason: "no_comparable_fields" };
  }

  if (score === total) {
    return { route: "AUTO", reason: "all_fields_match" };
  }

  if (score >= total - 1) {
    return { route: "REVIEW", reason: "partial_mismatch" };
  }

  return { route: "ESCALATE", reason: "low_match_score" };
}

// ─────────────────────────────────────────
// REQUEST HANDLER
// ─────────────────────────────────────────

async function handleVerify(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "invalid_json" });
  }

  const { domain, source, target } = body;

  // domain check
  const adapter = ADAPTERS[domain];
  if (!adapter) {
    return respond(400, {
      error: "unknown_domain",
      available: Object.keys(ADAPTERS),
    });
  }

  // validate inputs
  if (!source || !target) {
    return respond(400, { error: "source and target are required" });
  }

  // transform both inputs
  let sourceResult, targetResult;
  try {
    sourceResult = adapter(source);
    targetResult = adapter(target);
  } catch (err) {
    return respond(500, { error: "transform_failed", detail: err.message });
  }

  // validation check
  if (!sourceResult.validation.valid || !targetResult.validation.valid) {
    return respond(422, {
      error: "validation_failed",
      source_missing: sourceResult.validation.missing,
      target_missing: targetResult.validation.missing,
    });
  }

  // match
  const matchResult = matchEngine(sourceResult.schema, targetResult.schema);

  // route
  const routing = protocolRouter(matchResult);

  // response
  return respond(200, {
    domain,
    match:   matchResult,
    routing,
    request_id: source.request_id ?? source.session_id ?? null,
  });
}

function respond(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-MVPL-Version": "1.0.0",
    },
  });
}

// ─────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // health check
    if (url.pathname === "/health") {
      return respond(200, {
        status: "ok",
        version: "1.0.0",
        adapters: Object.keys(ADAPTERS),
      });
    }

    // verify
    if (url.pathname === "/verify" && request.method === "POST") {
      return handleVerify(request);
    }

    return respond(404, { error: "not_found" });
  },
};
