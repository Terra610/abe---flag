# CIBS — Community Integrity Budget System

This document shows how to turn the savings / impact number from CIRI into tracked reinvestment dollars on a schedule.

---

## Step 1. Get the Available Recovery Pool

Take the **Total Impact** from the CIRI Engine.

From `ciri/calc.md`, our worked example:

- Total Impact (Example County, 2025) = **$5,201,525**

We treat that as:

- `available_pool = $5,201,525`

You can rename it if you want (`Recovery Pool`, `Integrity Dividend`, etc). The math stays the same.

---

## Step 2. Apply Category Weights

From `cibs/budget_template.csv`, each row has:
- `category`
- `percent_of_pool`

For each category:

`category_amount = available_pool × percent_of_pool`

Example using the defaults:

- **Community Housing Support (25%)**  
  $5,201,525 × 0.25 = **$1,300,381.25**

- **Youth / Education / Aftercare (20%)**  
  $5,201,525 × 0.20 = **$1,040,305.00**

- **Veterans & Emergency Relief (10%)**  
  $5,201,525 × 0.10 = **$520,152.50**

…and so on, until 100% of the pool is allocated.

---

## Step 3. Schedule It

These dollars aren’t “theoretical.” They’re tracked and scheduled.

For each category, we assign:
- `monthly_amount`
- `start_month`
- `end_month`
- `recipient / program / partner`

This creates a public, auditable reinvestment schedule.

---

## Why This Matters

CIBS is not charity.  
CIBS is structured reinvestment funded by preventing unlawful harm.

Every dollar is:
- tied back to a prevented violation (CIRI math),  
- allocated transparently,  
- and published so communities can verify:  
  “Did that money actually get where it was supposed to go?”

This is how abuse stops being profitable.
This is how communities become whole on purpose, not by accident.
