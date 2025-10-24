# CIBS Model — Turning Integrity Into Budget

This document shows how to turn the savings/impact number from CIRI into tracked reinvestment dollars on a schedule.

---

## Step 1. Get the Available Recovery Pool

Take the **Total Impact** from the CIRI Engine.

From `ciri/calc.md`, our worked example:

Total Impact (Example County, 2025) = **$5,201,525**

We treat that as:
`available_pool = 5,201,525`

You can rename it if you want (Recovery Pool, Integrity Dividend, etc). The math stays the same.

---

## Step 2. Apply Category Weights

From `cibs/budget_template.csv`, each row has:
- `category`
- `percent_of_pool`

For each category:
`category_amount = available_pool × percent_of_pool`

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
