import csv
from pathlib import Path

def money(x):
    """Format a number like 1234567.89 -> $1,234,567.89"""
    return "${:,.2f}".format(x)

def load_inputs(csv_path):
    """Read the first row from inputs.csv and return numeric values."""
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            return {k: float(v) for k, v in row.items()}
    raise RuntimeError("No data rows found in inputs.csv")

def compute_metrics(data):
    """Apply the A.B.E. CIRI math and return results."""

    direct_savings = (
        data["cases_avoided"] * data["avg_cost_per_case"]
        + data["jail_days_avoided"] * data["cost_per_jail_day"]
        + data["fees_canceled_total"]
    )

    productivity_gain = (
        data["licenses_restored"]
        * data["avg_monthly_wage"]
        * data["employment_probability"]
        * (data["months_effective"] / 12.0)
    )

    restitution_avoided = data["expected_lawsuits"] * data["avg_payout"]

    secondary_gdp_uplift = data["multiplier"] * (direct_savings + productivity_gain)

    transition_costs = data["transition_costs_one_time"]

    total_impact = (
        direct_savings
        + productivity_gain
        + restitution_avoided
        + secondary_gdp_uplift
        - transition_costs
    )

    return {
        "direct_savings": direct_savings,
        "productivity_gain": productivity_gain,
        "restitution_avoided": restitution_avoided,
        "secondary_gdp_uplift": secondary_gdp_uplift,
        "transition_costs": transition_costs,
        "total_impact": total_impact,
    }

def print_report(results):
    """Display results in readable format."""
    print("=== CIRI ECONOMIC IMPACT REPORT ===\n")
    print("Direct Savings:        ", money(results["direct_savings"]))
    print("Productivity Gain:     ", money(results["productivity_gain"]))
    print("Restitution Avoided:   ", money(results["restitution_avoided"]))
    print("Secondary GDP Uplift:  ", money(results["secondary_gdp_uplift"]))
    print("Transition Costs:      ", "-" + money(results["transition_costs"]))
    print("-----------------------------------------------")
    print("TOTAL IMPACT (Recovery Pool):", money(results["total_impact"]))
    print("\nFeed this number into the CIBS model for reinvestment.\n")

def write_cibs_seed(results, out_path):
    """Generate a draft allocation table for CIBS."""
    total_pool = results["total_impact"]
    buckets = [
        ("Housing Stabilization / Emergency Housing", 0.25),
        ("Youth Support / Re-entry / Aftercare", 0.20),
        ("Veterans & Emergency Relief", 0.10),
        ("Legal Defense / Rights Protection", 0.15),
        ("Mental Health / Stability Access", 0.15),
        ("Civic Compliance & Admin (Audit / Reporting)", 0.15)
    ]
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["program", "percent", "allocated_usd"])
        for name, pct in buckets:
            writer.writerow([name, pct, f"{total_pool * pct:.2f}"])
    return out_path

def main():
    base_dir = Path(__file__).resolve().parent
    data = load_inputs(base_dir / "inputs.csv")
    results = compute_metrics(data)
    print_report(results)

    # Auto-generate a CIBS seed table
    out_path = base_dir.parent / "cibs" / "auto_budget.csv"
    out_path.parent.mkdir(exist_ok=True)
    write_cibs_seed(results, out_path)
    print(f"Draft CIBS allocation saved to: {out_path}")

if __name__ == "__main__":
    main()
