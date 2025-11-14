# System Ledger — A.B.E. Chain of Custody & Evidence Map  
*(American Butterfly Effect — Public Integrity Layer)*

### 🧭 Purpose
The **System Ledger** is the *root record* of the A.B.E. ecosystem.  
It permanently documents how lawful recovery moves through every stage — from divergence correction to tangible prosperity.

Each file, dataset, and verification record across A.B.E. ties back to this ledger for authenticity and audit continuity.

---

### ⚙️ Core Function
The ledger maintains an **immutable, chronological map** of all modules:

| Step | Module | Function |
|------|---------|-----------|
| 1️⃣ | **CAE / CDI** | Analyze constitutional alignment and divergence |
| 2️⃣ | **CIRI** | Quantify recovery value of lawful correction |
| 3️⃣ | **CIBS** | Allocate recovery into auditable budgets |
| 4️⃣ | **Integration** | Verify delivery and public attestation |
| 5️⃣ | **CII** | Execute investments at community level |
| 6️⃣ | **System Ledger** | Record and hash all above for verification |

Each transaction or record has a *cryptographic hash*, timestamp, and origin signature.  
The ledger acts like a “chain of constitutional custody.”

---

### 🗂️ Key Files
| File | Purpose |
|------|----------|
| `map.json` | Canonical system map of module interconnections |
| `ledger.json` | Chronological record of published artifacts and hashes |
| `index.html` | Public visual dashboard for map and evidence tree |
| `README.md` | Documentation (this file) |

---

### 📜 Example `ledger.json`
```json
{
  "version": "1.0",
  "project": "American Butterfly Effect",
  "updated": "2025-11-14T00:00:00Z",
  "entries": [
    {
      "module": "CIRI",
      "file": "/ciri/inputs.csv",
      "sha256": "9c2b6d4f9eeb72d9b7c8741e8a0d8f6c...",
      "verified": true,
      "timestamp": "2025-11-13T21:04:00Z"
    },
    {
      "module": "CIBS",
      "file": "/cibs/auto_budget.csv",
      "sha256": "b74a21b2b0a75e0a9446da51d29d702a...",
      "verified": true,
      "timestamp": "2025-11-13T21:05:30Z"
    },
    {
      "module": "Integration",
      "file": "/integration/logs.json",
      "sha256": "fa88cbe3b74e92135c4ac55fa4cf3cc1...",
      "verified": true,
      "timestamp": "2025-11-13T21:07:00Z"
    }
  ]
}
