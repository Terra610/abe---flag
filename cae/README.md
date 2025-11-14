# CAE — Constitutional Alignment Engine  
*(American Butterfly Effect — Core Module)*

### 🧭 Purpose
The **Constitutional Alignment Engine (CAE)** quantifies how closely federal and state laws, regulations, or administrative practices align with their **constitutional intent**.  
It is the *ground truth* layer of the A.B.E. ecosystem — feeding directly into the **CDI (Constitutional Divergence Index)**, which in turn drives CIRI → CIBS → CII self-correcting recovery flows.

CAE doesn’t judge people — it measures systems.  
Every dataset you add here is a mirror held up to the law itself, showing how far we’ve drifted and how close we can realign.

---

### 🧩 File Overview
| File | Description |
|------|--------------|
| `model.json` | Contains the active alignment dataset (clauses, constitutional anchors, statutes, scores). |
| `schema.json` | JSON schema validating structure and field types for `model.json`. |
| `README.md` | You’re reading it. |

---

### 🧮 Scoring Rules
Each clause in `model.json` includes an `alignment_score` between **0.00** and **1.00**:
| Range | Meaning | Example |
|--------|----------|---------|
| `0.90–1.00` | Fully aligned | Clause faithfully limited to constitutional scope. |
| `0.70–0.89` | Mostly aligned | Minor ambiguity or mixed enforcement patterns. |
| `0.50–0.69` | Moderate divergence | Jurisdiction drift or vague statutory overlap. |
| `<0.50` | High divergence | Clear overreach or conflicting authority. |

Each clause also includes a **confidence** score (0–1) representing certainty of evidence and clarity of source material.

---

### ⚙️ Updating the Model
1. Open `/cae/model.json`.
2. Find the clause block you want to update:
   ```json
   {
     "clause_id": "CFR40_13h_DOT_Testing_SafetySensitiveOnly",
     "alignment_score": 0.91,
     "confidence": 0.78
   }
