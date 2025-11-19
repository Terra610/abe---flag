# CAE — Constitutional Alignment Engine  
**The legal intelligence core of A.B.E.**

CAE parses statutes, regulations, clauses, memos, and scope notes to map whether government actions align with constitutional limits.  
It’s effectively your *fidelity compass*.

No speculation.  
No political spin.  
Just structured legal analysis.

---

# 🔥 What This Module Does  
- Loads `model.json` (clauses, weights, scopes, evidence)  
- Validates via schema  
- Shows:
  - each clause  
  - alignment score  
  - confidence  
  - statutory anchors  
  - scope notes  
- Provides the legal basis for CDI  
- Acts as the “law layer” of A.B.E.

---

# 🔥 Constitutional Purpose  
A government cannot claim lawful authority if:

- the statute doesn’t apply,  
- the scope doesn’t reach the citizen,  
- or the regulation was lifted from the wrong context entirely.

CAE exposes these mismatches clearly and structurally.

This solves a critical national problem:

> **People are being regulated as if they were commercial operators when they are not.**

The CAE model makes the distinction undeniable, using the government’s own statutes, CFR sections, memos, and intent notes.

---

# 🦋 How It Connects  
CAE → CDI → CIRI → CIBS → CII → Integration → Receipts

Everything downstream relies on CAE’s fidelity.

---

# 🧩 Files| `schema.json` | JSON schema validating structure and field types for `model.json`. |
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
