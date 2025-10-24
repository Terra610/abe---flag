# CIRI – Constitutional Integrity ROI Engine (MVP)

This page shows the **transparent math** for the CIRI engine using the example inputs in [`ciri/inputs.csv`](inputs.csv).

## Inputs (Example County, 2025)
- cases_avoided = **1,200**
- avg_cost_per_case = **$950**
- jail_days_avoided = **3,800**
- cost_per_jail_day = **$98**
- fees_canceled_total = **$420,000**
- licenses_restored = **850**
- avg_monthly_wage = **$3,800**
- employment_probability = **0.62**
- months_effective = **9**
- expected_lawsuits = **6**
- avg_payout = **$75,000**
- multiplier = **0.50**
- transition_costs_one_time = **$250,000**
- transition_costs_annual = **$150,000**
## Formulas (MVP)

## Calculations
## Calculations (with example values)
- **Direct Savings**  
  = (1,200 × $950) + (3,800 × $98) + $420,000  
  = **$1,932,400**

- **Productivity Gain**  
  = 850 × $3,800 × 0.62 × (9/12)  
  = **$1,501,950**

- **Restitution Avoided**  
  = 6 × $75,000  
  = **$450,000**

- **Secondary GDP Uplift**  
  = 0.50 × ( $1,932,400 + $1,501,950 )  
  = **$1,717,175**

- **Transition Costs**  
  = $250,000 + $150,000  
  = **$400,000**

### **Total Impact (Example County, 2025)**
= $1,932,400 + $1,501,950 + $450,000 + $1,717,175 – $400,000  
= **$5,201,525**

---

### Notes
- Multiplier defaults to **0.50**. Adjust per jurisdictional macro model.
- All terms are additive and independently auditable.
- Replace the row in `ciri/inputs.csv` with real local data to recompute.
