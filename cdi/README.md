# CDI — Constitutional Divergence Index  
*(American Butterfly Effect — Alignment Analytics Layer)*

### 🧭 Purpose
The **Constitutional Divergence Index (CDI)** measures how far current law, policy, or regulation has drifted from its constitutional foundation.  
It does not rely on opinions or politics — only data.  
CDI listens to the **CAE (Constitutional Alignment Engine)**, which scores each clause for its fidelity to constitutional scope.  
Then it transforms those scores into a single divergence metric:  
> **CDI = 1 − average(alignment_scores)**

---

### ⚙️ How It Works
1. **CAE** defines and updates alignment scores (`alignment_score` 0–1).  
2. **CDI** fetches `/cae/model.json`, computes the mean, and converts it into a divergence percentage.  
3. The **Realignment Δ** metric shows improvement or regression since the last update.  
   - Positive Δ → Healing (realignment)  
   - Negative Δ → Drift (divergence increase)

The process is continuous and self-correcting — the closer CAE aligns with constitutional law, the lower CDI becomes.

---

### 📊 Example

| Metric | Example | Description |
|--------|----------|-------------|
| Average Alignment | `0.88` | Mean of all clause alignment scores from CAE |
| CDI (Divergence) | `0.12` | 1 − 0.88 = 0.12 → 12% divergence |
| Realignment Δ | `+0.03` | 3% improvement since last load |

---

### 📁 Files in This Module
| File | Purpose |
|------|----------|
| `index.html` | Auto-fetches CAE model, renders the divergence dashboard. |
| `divergence.csv` | Optional static fallback if CAE model is unavailable. |
| `README.md` | Documentation (this file). |

---

### 🧮 Interpretation Guide

| CDI Range | System Health | Meaning |
|------------|---------------|---------|
| **0.00–0.10** | Excellent | Aligned with constitutional structure; self-governing integrity evident. |
| **0.11–0.25** | Good | Minor jurisdictional blur; monitoring recommended. |
| **0.26–0.50** | Moderate | Clear divergence in some areas; requires review and reform. |
| **>0.50** | Critical | Systemic misalignment; active constitutional restoration required. |

---

### 📈 Realignment Delta (Δ)
Each viewer stores its last known average alignment in `localStorage`.  
When you reload the page after CAE updates, CDI automatically shows:
- Δ > 0 → healing  
- Δ < 0 → drift  

It’s a simple but powerful indicator of whether the system is **recovering** or **deteriorating** in real time.

---

### 🔒 Data Integrity
Each clause and dataset can include:
- `source_hash` → SHA-256 of original evidence (PDF, statute, or memo)
- `evidence_links` → URLs to verified federal or state documentation

These hashes will later be integrated into the **Integration** and **System Ledger** layers to make all results independently verifiable.

---

### 🧠 How CDI Fits in A.B.E.
| Module | Function |
|--------|-----------|
| **CAE** | Defines lawful baselines (what *should* be). |
| **CDI** | Measures divergence (what *is*). |
| **CIRI** | Quantifies economic + social recovery potential from correcting divergence. |
| **CIBS** | Allocates resources transparently to areas with greatest recovery yield. |
| **CII** | Publishes the visible, community-level outcomes. |

---

### 🕊️ Ethos
> “We correct by knowing.  
> We restore by measuring.  
> We heal by aligning truthfully.”

CDI is the mirror that tells the truth gently — it doesn’t condemn; it just reflects.  
When the data is honest, everything else finds its balance.

---

**American Butterfly Effect — Restoring Constitutional Equilibrium Through Transparency.**
