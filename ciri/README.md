# CIRI — Constitutional Integrity ROI Engine

CIRI is the financial heart of the A.B.E. system.  
It turns constitutional overreach — wrongful detention, misapplied statutes, unlawful enforcement — into **measurable economic recovery** for any jurisdiction.

CIRI answers one blunt question:  
**“What did this divergence cost your people, and what do you gain by fixing it?”**

---

# 🔥 What CIRI Does  
- Reads a single-row CSV (`inputs.csv`)  
- Computes six categories of recovered value:  
  - direct case costs  
  - detention  
  - fees/fines  
  - employment and wage restoration  
  - household spending  
  - litigation avoided  
- Subtracts transition cost  
- Outputs:  
  - **Total Recovery**  
  - **CIRI Index**  
  - **CII Index**  
  - **ROI per case**  
  - **Bar charts**  
  - **Receipts**

---

# 🦋 Upload Your Own Data  
Visitors can upload their own CSV.  

**Everything runs entirely in-browser.**  
The uploaded file is never sent anywhere.

After upload you get:

- recalculated KPIs  
- source indicator (“Using your uploaded file — private”)  
- downloadable report  
- optional PDF receipt  
- optional scenario export (`ABE_CIRI_SCENARIO_V2.csv`)

If no file is uploaded, CIRI loads the repo’s `inputs.csv`.

---

# 🔥 Constitutional Purpose  
Government overreach isn’t “just unconstitutional.”  
It has a price tag.

CIRI exposes the financial damage caused when agencies apply the wrong laws, stretch statutory authority, or treat private citizens as commercial operators.  
Every dollar in the Recovery metric is **proof of harm**, and every positive change is **proof of what fidelity restores**.

This flips the narrative:

> *“Rights violations are abstract”* → **No, they are quantifiable losses your community has been paying for.**

---

# 📄 Files   - References **CDI’s** current divergence to scale national recovery potential.

2. **Process:**  
   - Computes *recoverable economic value* by reversing the costs of divergence:
     - wrongful detentions  
     - coerced fees  
     - lost employment  
     - suppressed markets  
     - administrative inefficiencies  

3. **Output:**  
   - Produces *total recovery pool* value.  
   - Feeds that figure into **CIBS** (budget allocator).  
   - Generates **live KPIs** for CII (community-level implementation).

---

### 🧮 Default Inputs (`inputs.csv`)
Each row represents one measurable recovery vector.  

| Field | Description | Example |
|--------|--------------|---------|
| `cases_avoided` | Number of unlawful or unnecessary prosecutions prevented | `1240` |
| `avg_cost_per_case` | Typical cost per case (court + admin + defense) | `$5,200` |
| `jail_days_avoided` | Detention time eliminated by lawful compliance | `9,800` |
| `cost_per_jail_day` | Average incarceration cost per day | `$210` |
| `fees_canceled_total` | Total rescinded unlawful fines | `$480,000` |
| `households_restored` | Families restored to stability | `280` |
| `avg_monthly_market_spend` | Economic value per stable household per month | `$2,800` |
| `months_effective` | Recovery period in months | `12` |

---

### 💰 Recovery Calculation
CIRI sums these lawful restorations into one **Total Recovery Value**:

\[
R = (c*C + F) + (D*J) + (H*M*m) + ((H*pe)*W*m) + (P*E) - T
\]

Where each term corresponds to a form of *restored activity or cost prevention*, such as employment, spending, and litigation avoidance.

Each module’s equation can be tuned for region, sector, or population.

---

### 📊 Outputs
| Output | Description |
|--------|-------------|
| `Total Recovery` | Aggregate lawful value restored |
| `Direct Case Savings` | Avoided prosecutorial and court cost |
| `Detention Savings` | Eliminated incarceration cost |
| `Employment Restoration` | Jobs regained through lawful compliance |
| `Household Spending` | Consumer and housing recovery impact |
| `Policy Efficiency Gain` | Fiscal and administrative savings |

---

### 🔗 Integration Path
| Flow | From | To |
|------|------|----|
| **Legal Basis** | CAE → CDI | Constitutional alignment scores |
| **Economic Model** | CIRI | Converts restored legality into financial metrics |
| **Budgeting** | CIBS | Allocates recovery pool funds by category |
| **Implementation** | CII | Tracks real-world community projects |
| **Audit** | Integration Layer | Verifies delivery and transparency |

---

### 🧠 Interpretation
CIRI shows the **economic gravity of justice**.  
When laws are aligned, coercive structures dissolve, and organic economic energy reappears — people work, build, buy, and heal.  
It’s the quantifiable proof that justice and prosperity are not separate forces.

---

### 🧩 Example Summary
| Metric | Value | Source |
|---------|--------|--------|
| CDI (Divergence) | 0.12 | `/cdi/index.html` |
| Average Alignment | 0.88 | `/cae/model.json` |
| Total Recovery | $12.4M | `/ciri/index.html` |

This data then becomes the **input pool** for CIBS to distribute as transparent community investment.

---

### 📎 Notes
- All calculations should remain **reproducible** — equations and CSV data are open.  
- No external dependencies: native JS only.  
- Every update should cite its input sources (e.g., DOJ budget, BJS data, or state-level justice stats).  

---

### ✨ Ethos
> “The Constitution is not an expense — it’s the source of all profit.”  
> — *Terra Dawn Shouse*

By quantifying constitutional fidelity as an economic force, CIRI completes the A.B.E. feedback loop:  
**Alignment → Recovery → Reinvestment → Prosperity.**

---

**American Butterfly Effect — Turning Lawfulness into Living Prosperity.**
Run the GitHub Action **Run ABE Batch (MVP)** or execute locally:

```bash
python scripts/abe_batch.py
