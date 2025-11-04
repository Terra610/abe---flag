# CIRI Calculation Notes

**Primary Inputs (from `inputs.csv`)**
- `cases_avoided`, `avg_cost`, `fees_calc`, `jail_day_cost`, `licenses`,
- `employment_rate`, `months_employed`, `expected_wage`, `pay_multiplier`, `transport_weight`

**Assumptions (UI)**
- `jailDays` (default 5), `K` risk scaling (default 1,000,000,000)

**Formulas**
direct_case  = cases_avoided * (avg_cost + fees_calc)
detention    = cases_avoided * jail_day_cost * jailDays
licensing    = licenses * transport_weight
per_worker   = expected_wage * (months_employed/12) * employment_rate * pay_multiplier
employment   = per_worker * cases_avoided
Total        = direct_case + detention + licensing + employment
CIRI         = 1 - exp(- Total / K)
CII          = 1 - CIRI
ROI per case = Total / cases_avoided
