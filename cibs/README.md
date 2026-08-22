# CIBS — Constitutional Integrity Baseline Schema  
**Where recovery value becomes reinvestment.**

CIBS takes the total recovery from CIRI and allocates it into public-good categories using a transparent, auditable budget schema.  
No politics.  
No lobbying.  
Just math, values, and constitutional fidelity.

---

# 🔥 What This Module Does  
- Loads `auto_budget.csv`  
- Sums the total public allocation pool  
- Displays all categories with dollar amounts and percentages  
- Draws a simple proportional bar chart  
- Provides a preview table for auditors and citizens  
- Pushes its KPIs to Integration for final receipts

---

# 🔥 Constitutional Purpose  
A community harmed by unconstitutional overreach deserves to be restored — not symbolically, but materially.

CIBS is where restitution becomes investment.  
It shows leaders and citizens exactly where recovered value can go:

- housing  
- clinics  
- mobility  
- food systems  
- education  
- justice reform  
- community infrastructure  

And it does this **without letting anyone hide behind black-box budgets**.

CIBS makes recovery money visible, auditable, and future-facing.

---

# 🦋 How It Connects  
CIRI computes recovery → CIBS turns it into community investment.

The values in CIBS inform CII projects and appear in the Integration Layer for verification.

---

# 🧩 Files
2. **Process:**  
   - Allocates recovery value into categories such as housing, education, small business, defense of rights, etc.  
   - Displays these allocations in both **tabular and visual** (SVG chart) form via `/cibs/index.html`.  
   - Produces key public metrics: total pool, category count, allocation percentage, and timestamp.

3. **Output:**  
   - Creates the **official public budget ledger** for A.B.E.  
   - Feeds totals to:
     - `/integration/` for verification and audit,
     - `/cii/` for project-level investment tracking.

---

### 🧮 CSV Format
| Column | Description | Example |
|--------|--------------|----------|
| `category` | Name of the investment area | `Community Housing Support` |
| `value` | Amount allocated in USD | `2500000` |
| `% of Pool` | Computed automatically | `12.5` |

---

### 🧩 Allocation Logic
Each CIBS category is defined in the budgeting model and weighted by **constitutional priority** — meaning:
> The closer a spending category is to fulfilling constitutional duty,  
> the higher its allocation weight.

Default categories include:

| Category | Description |
|-----------|-------------|
| Community Housing Support | Stabilizing family units & homelessness prevention |
| Youth / Education / Aftercare | Training, tutoring, and reintegration systems |
| Veterans & Emergency Relief | Rapid response funds for displaced or underserved veterans |
| Small Business / Job Recovery | Microloans, workforce rebuilding |
| Digital Access / Connectivity | Broadband, devices, open-data infrastructure |
| Legal Defense / Rights Enforcement | Independent public defenders, case audits |
| Data Transparency / Public Dashboard | Hosting, documentation, and audit costs |
| Administration & Compliance | Operational integrity and reporting |

---

### 📊 Example
```csv
category,value
Community Housing Support,2500000
Education & Aftercare,1200000
Veterans Relief,950000
Digital Access,800000
Legal Defense,600000
Administration,300000
Example using the defaults:

- Community Housing Support (25%)
  - 5,201,525 × 0.25 = **$1,300,381.25**

- Youth / Education / Aftercare (20%)
  - 5,201,525 × 0.20 = **$1,040,305.00**

- Veterans & Emergency Relief (10%)
  - 5,201,525 × 0.10 = **$520,152.50**

- Local Small Business / Job Recovery (15%)
  - 5,201,525 × 0.15 = **$780,228.75**

- Digital Access / Connectivity (5%)
  - 5,201,525 × 0.05 = **$260,076.25**

- Legal Defense / Rights Enforcement (10%)
  - 5,201,525 × 0.10 = **$520,152.50**

- Data Transparency / Public Dashboard (5%)
  - 5,201,525 × 0.05 = **$260,076.25**

- Administration & Compliance (10%)
  - 5,201,525 × 0.10 = **$520,152.50`

Check: sum of all category_amounts ≈ total pool (rounding differences are normal).

This gives you a spend plan that can be shown to the public as:
> “We recovered $5.2M by ending abusive practices, and here’s where every dollar goes.”

---

## Step 3. Time-Phase It (Quarterly Schedule)

You can break each category_amount across quarters, like this:

`Q1 = 0.25 × category_amount`
`Q2 = 0.25 × category_amount`
`Q3 = 0.25 × category_amount`
`Q4 = 0.25 × category_amount`

Simple equal quarters is fine for MVP.
Later we can weight Q1/Q2 heavier for crisis items like housing.

This gives:
`qX_allocation[category] = category_amount × quarter_fraction`

This is how you produce a quarterly spend ledger.
Anyone can audit those numbers and ask:
- “Did you pay it?”
- “Who got it?”

---

## Step 4. Accountability Hooks

For each category, CIBS expects:
- a named accountable entity (“Office of Housing Integrity,” “Community Youth Trust,” etc.)
- a published contact
- receipts

Those receipts (redacted where needed) become part of the public dashboard spend log.

---

## Why this scares corrupt actors

1. The dollar pool is math, not politics. It’s derived directly from documented harm/waste.
2. The splits are public.
3. The timeline is public.
4. The custodians are named.
5. The receipts are traceable.

If someone diverts the funds (“oops, it got absorbed into general operations”), that diversion is obvious.

---

## How to use this TODAY

1. Put your own jurisdiction into `ciri/inputs.csv`.
2. Re-run the CIRI math to compute `available_pool`.
3. Apply the percentages from `cibs/budget_template.csv`.
4. Publish:
   - total per bucket
   - quarterly plan
   - who’s responsible.

Congratulations: you now have a living reparations / recovery budget backed by math, not begging.

This is how A.B.E. goes from “we see abuse” to “we heal it and track it.”
