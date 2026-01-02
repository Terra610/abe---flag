// ciri/runner.js
// CIRI → economic recovery output (stub, stable shape)
// Reads derived.divergence (required) and derived.ccri (optional)
// Later can read inputs.ciri_inputs or parse from intake.

export async function run(scenario, ctx = {}) {
  const divergence = scenario?.derived?.divergence;
  if (!divergence) {
    throw new Error("Missing derived.divergence (CDA must run first).");
  }

  const ccri = scenario?.derived?.ccri || null;

  // Stable shape; values are placeholders until you wire real math + inputs.
  const out = {
    module: "CIRI",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      divergence_present: true,
      ccri_present: !!ccri
    },
    components: {
      direct_case_cost_savings: 0,
      detention_cost_savings: 0,
      enforcement_cost_savings: 0,
      market_access_uplift: 0,
      employment_wage_uplift: 0,
      litigation_risk_avoided: 0,
      transition_costs: 0
    },
    total_recovery: 0,
    ciri_index: 0,
    roi_per_case: 0,
    notes:
      "CIRI runner stub is live. Wire inputs + math next; keep this output shape stable."
  };

  return out;
}
