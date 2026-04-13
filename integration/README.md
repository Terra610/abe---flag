# Integration Layer — Public KPIs & Integrity Receipts

The Integration Layer is the **evidence desk** of A.B.E.  
It connects the outputs of CIRI and CIBS, verifies data integrity, hashes artifacts, and produces **tamper-evident receipts**.

This is where A.B.E. stops being “a calculator” and becomes **auditable evidence**.

---

# 🔥 What It Does  
- Reads CIRI and CIBS outputs  
- Recomputes KPIs to confirm consistency  
- Loads CDI + CAE for context  
- Runs integrity checks:  
  - presence  
  - parse  
  - plausibility  
  - hash  
- Produces an audit packet:  
  - JSON report  
  - SHA-256 hashes  
  - timestamp  
  - all displayed on-screen  
- Visitor can download the audit as:  
  - `abe_audit_<id>.json`  
  - optional PDF (if enabled)

---

# 🔥 Constitutional Purpose  
Accountability requires chain-of-custody.  
Without receipts, government can hand-wave anything away.

The Integration Layer ensures:

- the math is auditable  
- the data is consistent  
- the evidence is self-contained  
- nothing relies on trust  
- no one can alter or deny the outputs later  

This is how you create a **public, constitutional audit trail** for communities reclaiming their rights.

---

# 🦋 How User Upload Affects It  
If a visitor uploads a custom CIRI CSV:

- Integration uses **their** numbers  
- All KPIs update  
- The audit report reflects their scenario  
- No data is saved or transmitted  
- They alone control the receipt

This gives every person, attorney, or jurisdiction a **court-ready snapshot** with no server involved.

---

# 📄 Files   - `/system/map.json` → canonical data chain reference

2. **Process**
   - Compares **declared budgets (CIBS)** to **received funds (Integration Receipts)**  
   - Validates signatures or hashes (e.g. `sha256`, `timestamp`, `issuer_id`)  
   - Flags discrepancies or missing confirmations  
   - Cross-checks each record against A.B.E.’s **Constitutional Alignment Matrix (CAE/CDI)** to confirm lawful spending purpose.

3. **Output**
   - Publishes a transparent audit table: verified, pending, flagged  
   - Updates public KPIs:
     - Total verified allocation
     - Percent delivered
     - Mismatch Δ
     - Last verified date

---

### 🔐 Verification Controls

| Control | Description | Evidence Source |
|----------|--------------|-----------------|
| **receipt_verification** | Confirms payment receipt matches allocation entry | `integration/logs.json` |
| **recipient_match** | Ensures funds reached intended entity | `recipient_id` field |
| **retaliation_zero** | Confirms no retaliation or suppression tied to recipient | `public_reports.json` |
| **public_audit_attestation** | Certifies audit completed and published | `system/index.html` |

All controls log pass/fail results that feed into the **System Ledger** (`/system/map.json`).

---

### 📁 Key Files

| File | Purpose |
|------|----------|
| `index.html` | Main KPI dashboard for audit and verification |
| `logs.json` | Machine-readable verification records |
| `integration_report.csv` | Optional human-readable audit log |
| `README.md` | Documentation (this file) |

---

### 🧮 Log Schema (logs.json)
```json
{
  "version": "1.0",
  "entries": [
    {
      "id": "TX2025-0001",
      "category": "Community Housing Support",
      "allocated_usd": 2500000,
      "received_usd": 2500000,
      "recipient_id": "HSG_CommunityFund_IA",
      "verified_by": "Integration Layer Bot",
      "timestamp": "2025-11-14T18:00:00Z",
      "status": "verified",
      "receipt_hash": "sha256-abc123..."
    }
  ]
}- `ciri/inputs.csv` — Local data input source  
- `cibs/budget_template.csv` — Reinvestment distribution table  
- `cibs/model.md` — Category logic  
- `integration/README.md` — System link (you are here)

---

## ⚙️ Automation Roadmap
- Phase 1: Manual data swap between CIRI and CIBS  
- Phase 2: JSON-based dynamic input flow  
- Phase 3: Auto-generated dashboards with live metrics  

---

### 🦋 Author Note
This integration represents the **core heartbeat of A.B.E.** — proof that truth and accountability are not ideals, but measurable forces in a living economy.
