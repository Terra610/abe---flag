# CIRI — Constitutional Integrity ROI Engine

**Purpose:**  
The CIRI engine quantifies the economic impact of restoring constitutional compliance.  
It converts reduced prosecutions, avoided jail days, and restored work access into measurable financial recovery.

⚠️ **Privacy Warning**  
Do **not** include individual names, case numbers, or any personally identifiable information in `inputs.csv`.  
Use aggregated totals only.

## Required Fields in `inputs.csv`

| Column | Description | Example |
|---------|--------------|----------|
| `cases_avoided` | Number of unconstitutional or predatory cases dismissed or stopped. | 1200 |
| `avg_cost_per_case` | Avg. cost per case (court, officer, admin). | 950 |
| `jail_days_avoided` | Total jail days prevented by dismissed cases. | 3800 |
| `cost_per_jail_day` | Average daily jail cost per inmate. | 98 |
| `fees_canceled_total` | Total illegal fines/fees forgiven. | 420000 |
| `licenses_restored` | Restored driver/professional licenses. | 850 |
| `avg_monthly_wage` | Typical monthly wage for restored workers. | 3800 |
| `employment_probability` | Expected % re-employed after restoration (0–1). | 0.62 |
| `months_effective` | Months of restored earnings in current cycle. | 9 |
| `expected_lawsuits` | Estimated lawsuits avoided by compliance. | 6 |
| `avg_payout` | Average payout per civil-rights case. | 75000 |
| `multiplier` | Local economic ripple factor. | 0.50 |
| `transition_costs_one_time` | One-time reform setup cost. | 400000 |

## How to Run the Calculator

1. Edit `inputs.csv` with your local data.  
2. Run:
   ```bash
   python3 ciri/calculate.py
