# A.B.E. Engine Integration — CIRI ↔ CIBS

This document links the **Constitutional Integrity ROI Engine (CIRI)** with the **Community Integrity Budget System (CIBS)** to form a closed, auditable economic feedback loop.

---

## 🔁 Data Flow Overview

1. **CIRI** computes verified savings, avoided costs, and restitution recovery from lawful reform.
2. Those results export to `cibs/budget_template.csv`.
3. **CIBS** allocates each verified dollar to community impact categories (housing, youth, veterans, etc.).
4. The combined output feeds into **A.B.E. Dashboard**, which publishes quarterly reinvestment results for transparency.

---

## 🧮 Integration Formula

---

## 📂 File Path Reference
- `ciri/calc.md` — Base math and jurisdiction examples  
- `ciri/inputs.csv` — Local data input source  
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
