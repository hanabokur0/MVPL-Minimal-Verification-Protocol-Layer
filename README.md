# MVPL — Minimal Verification Protocol Layer

> **No member card. No personal data. Just verify.**

---

## What it does

Minimal verification infrastructure for identity, contract, and workflow routing. 
The engine never sees personal information.

```
Raw Data
  ↓
Transform Layer   ← only layer you customize
  ↓
Match Engine      ← compares 6 fields, returns true/false
  ↓
Protocol Router   ← AUTO / REVIEW / ESCALATE / UNKNOWN
```

---

## Why it exists

Most businesses that need identity verification already have:

- OCR APIs
- KYC APIs
- CRM systems
- Internal databases

The bottleneck is not the APIs.  
It is **connecting them safely, without exposing personal data**.

MVPL sits above your existing systems.  
You keep everything. You add one layer.

---

## Core Schema

```json
{
  "first_name_hash": "",
  "last_name_hash": "",
  "address_numeric": "",
  "id_upper4": "",
  "id_lower4": "",
  "request_id": ""
}
```

The engine receives only this.  
Names are hashed. Address is numeric only. ID is split.  
**Personal data never reaches the engine.**

---

## Field count is configurable

Not every use case needs 6 fields.

```
Net cafe:      first_name_hash, last_name_hash, id_upper4, id_lower4
Hotel:         + address_numeric + request_id
Healthcare:    insurance_type, hospital_code, patient_token, date ...
Logistics:     warehouse, sku, destination, order_id ...
```

**Engine is invariant. Field count adapts per domain.**

---

## Match Output

```json
{
  "first_name_hash": true,
  "last_name_hash": true,
  "address_numeric": false,
  "id_upper4": true,
  "id_lower4": true,
  "request_id": true,
  "score": 5
}
```

| Score | Route |
|-------|-------|
| All match | AUTO |
| Partial mismatch | HUMAN REVIEW |
| Critical field mismatch | ESCALATE |
| Unknown pattern | LEARN |

---

## Adapters

Transform Layer converts your data into common schema.  
One adapter per domain. Engine never changes.

```
adapters/
  netcafe/        ← first implementation
  template/       ← start here
```

→ See `adapters/template/transform.js` to build your own.

---

## Use cases

| Domain | What changes |
|--------|-------------|
| Net cafe / Manga cafe | Member card → not needed |
| Capsule hotel | Check-in card → not needed |
| Guest house | Registration form → simplified |
| Karaoke (late night) | ID check → automated |
| Contract verification | Manual review → routed |
| Logistics | Order matching → structured |

---

## Privacy Model

MVPL does not store raw personal data.

Example transformation:

Taro → SHA-256 hash
Yamada → SHA-256 hash

Tokyo 2-8-1 Nakacho
→ 281

ID: AB12345678
→ upper4: 1234
→ lower4: 5678

Raw data is discarded after transformation.

---

## What this is NOT

- Not an AI agent
- Not an OCR company
- Not a KYC company
- Not another enterprise SaaS

**Verification infrastructure + protocol routing layer.**

---

## Runtime Core

Protocol Engine (execution + learning layer):  
→ [hanabokur0/Protocol-Engine-LoPAS-Runtime-Core-](https://github.com/hanabokur0/Protocol-Engine-LoPAS-Runtime-Core-)

---

## License

MIT
