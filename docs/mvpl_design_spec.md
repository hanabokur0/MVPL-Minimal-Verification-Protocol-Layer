# MVPL Design Specification
## Minimal Verification Protocol Layer — v1.0.0

---

## Core Philosophy

> **Minimum Identification Set:**  
> sufficient to verify identity,  
> insufficient to reconstruct personal data.

The engine does not see personal information.  
It only verifies structured equality.  
Personal data is transformed before it reaches the engine. Always.

---

## Architecture

```
Raw Data
  ↓
[Transform Layer]   ← adapter per domain. only layer that changes.
  ↓
[Common Schema]     ← 6 fields maximum. hashed. split. numeric only.
  ↓
[Match Engine]      ← compares fields. returns score. invariant.
  ↓
[Protocol Router]   ← AUTO / REVIEW / ESCALATE / UNKNOWN
  ↓
Existing Systems    ← your APIs, CRM, RPA, workflow tools
```

---

## Common Schema

```json
{
  "first_name_hash":  "",   // SHA-256. raw name never transmitted.
  "last_name_hash":   "",   // SHA-256. raw name never transmitted.
  "address_numeric":  "",   // numeric portion only. e.g. "2-8-1"
  "id_upper4":        "",   // first 4 digits of identifier
  "id_lower4":        "",   // last 4 digits of identifier
  "request_id":       ""    // transaction anchor. not personal data.
}
```

---

## Field Design

| Field | Transform | Engine receives |
|-------|-----------|-----------------|
| first_name_hash | SHA-256 | 64-char hex. name never transmitted. |
| last_name_hash | SHA-256 | 64-char hex. name never transmitted. |
| address_numeric | extract digits | "2-8-1". prefecture/city never transmitted. |
| id_upper4 | split first 4 | partial ID. full number unrecoverable. |
| id_lower4 | split last 4 | partial ID. engine holds no complete number. |
| request_id | pass-through | transaction ID. not personal data. |

---

## Field Count is Configurable

Engine is invariant. Field count adapts per domain.

```
Net cafe:    first_name_hash, last_name_hash, id_upper4, id_lower4         (4 fields)
Hotel:       + address_numeric + request_id                                 (6 fields)
Healthcare:  insurance_type, hospital_code, patient_token, date ...        (custom)
Logistics:   warehouse, sku, destination, order_id ...                     (custom)
```

---

## Match Engine

Compares two schemas field by field.  
Returns per-field boolean and total score.  
No LLM. No business logic. No personal data interpretation.

```json
{
  "fields": {
    "first_name_hash": true,
    "last_name_hash":  true,
    "address_numeric": false,
    "id_upper4":       true,
    "id_lower4":       true,
    "request_id":      true
  },
  "score": 5,
  "total": 6,
  "critical_fail": false
}
```

---

## Protocol Routing

| Condition | Route | Action |
|-----------|-------|--------|
| All fields match | AUTO | continue process |
| Partial mismatch | REVIEW | send to human |
| Critical field mismatch | ESCALATE | stop process |
| Unknown pattern | UNKNOWN | retain for learning |

**Critical fields:** `id_upper4`, `id_lower4`  
One critical mismatch triggers ESCALATE regardless of total score.

---

## Transform Layer — Responsibility

The Transform Layer owns all personal data handling.  
This is the only layer that changes per domain.

Responsibilities:
- Hash name fields before passing to engine
- Extract numeric portion from addresses
- Split identifiers into upper4 / lower4
- Map domain-specific fields to common schema

```
adapters/
  template/     ← copy this to build your own
  netcafe/      ← reference implementation
```

---

## UX Flow — Net Cafe (No Member Card)

```
1. Customer arrives
2. "お名前をどうぞ" (state your name)
3. "番号の下4桁を見せてください" (show last 4 digits of ID)
4. Match Engine runs
5. AUTO → entry permitted
   REVIEW → staff confirms
   ESCALATE → entry denied
```

Staff never sees full ID.  
No card issued. No card required. No card lost.

---

## Why This Works

**Privacy by design**  
Personal data never reaches the engine.  
Legal and compliance teams can approve this.

**No infrastructure change**  
Keep your OCR, KYC, CRM, SAP.  
Add only a Transform adapter.

**Explainable**  
No black box. Every decision traces to a field match result.  
"Which field mismatched" is always answerable.

**Self-evolving**  
UNKNOWN patterns become future protocols.  
Exceptions improve the system automatically.

---

## What This Is NOT

- Not an AI agent
- Not an OCR company
- Not a KYC company
- Not another enterprise SaaS

**Verification infrastructure + protocol routing layer.**

---

## Responsibility Separation

| Layer | Owner | MVPL involvement |
|-------|-------|-----------------|
| Identity verification | MVPL | ✅ |
| Room / seat assignment | Venue | ❌ |
| Entry / exit management | Venue | ❌ |
| Payment | Payment service | ❌ |
| Legal recordkeeping | Venue | ❌ |

MVPL does one thing.  
Everything else is yours.

---

## Runtime Core

Protocol Engine (execution + learning layer):  
→ [hanabokur0/Protocol-Engine-LoPAS-Runtime-Core-](https://github.com/hanabokur0/Protocol-Engine-LoPAS-Runtime-Core-)

---

## Version

v1.0.0 — initial specification
