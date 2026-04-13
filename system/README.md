# A.B.E. System Map  
**The chain-of-custody for constitutional and economic truth.**

The System Map shows how data flows across the entire A.B.E. engine — from legal alignment (CAE) to divergence (CDI), to recovery value (CIRI), to reinvestment (CIBS/CII), and finally to tamper-evident receipts (Integration).

Think of it as the blueprint of a transparent, accountable public system.

---

# 🔥 What This Module Does  
- Loads `map.json`  
- Displays:
  - nodes  
  - edges  
  - dependencies  
  - versioning  
  - update timestamps  
- Helps auditors and analysts verify:
  - where values came from  
  - how they moved  
  - whether each step is intact

---

# 🔥 Constitutional Purpose  
Accountability requires visibility.

Most government systems hide their internal mechanics, creating plausible deniability and making it almost impossible for citizens to prove systemic harm.

The A.B.E. System Map does the opposite:

> **It shows the whole pipeline — openly and permanently.**

This is how constitutional fidelity becomes not just a standard, but a provable workflow.

---

# 🦋 How It Connects  
Every module in A.B.E. appears as a node:| 3️⃣ | **CIBS** | Allocate recovery into auditable budgets |
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
