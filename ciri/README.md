# CIRI — Constitutional Integrity Recovery Index

CIRI is where the math begins.  
It measures how much measurable economic harm was **prevented or repaired** when a system returns to constitutional alignment.

---

## Step 1. Prepare Your Inputs

Open `ciri/inputs.csv`.

Each row represents a measurable civic-economic factor such as:
- cases_avoided  
- avg_cost_per_case  
- jail_days_avoided  
- cost_per_jail_day  
- policy_corrections  
- households_restored  
- avg_monthly_wage  
- etc.

Every field translates to a real, documentable number.  
Example sources: court data, agency reports, payroll records, municipal budgets.

---

## Step 2. Run the Calculation

Run the GitHub Action **Run ABE Batch (MVP)** or execute locally:

```bash
python scripts/abe_batch.py
