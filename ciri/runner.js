// ciri/runner.js
// CIRI → economic recovery output (real math-ready, local-only)
// Reads derived.divergence (required) + derived.ccri (optional)
// Reads inputs.ciri_inputs (optional object). If missing, outputs remain zero but shape is stable.

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export async function run(scenario, ctx = {}) {
  const divergence = scenario?.derived?.divergence;
  if (!divergence) throw new Error("Missing derived.divergence (CDA must run first).");

  const ccri = scenario?.derived?.ccri || null;
  const inp = scenario?.inputs?.ciri_inputs || {}; // optional

  // --------- Inputs (safe defaults) ----------
  const cases_avoided = num(inp.cases_avoided);
  const cost_per_case = num(inp.cost_per_case);

  const jail_days_avoided = num(inp.jail_days_avoided);
  const cost_per_jail_day = num(inp.cost_per_jail_day);

  const enforcement_hours_avoided = num(inp.enforcement_hours_avoided);
  const cost_per_enforcement_hour = num(inp.cost_per_enforcement_hour);

  const fees_canceled_total = num(inp.fees_canceled_total);

  const households_restored = num(inp.households_restored);
  const market_access_value_per_household = num(inp.market_access_value_per_household);

  const employment_probability = num(inp.employment_probability); // 0..1
  const wage_uplift_per_person = num(inp.wage_uplift_per_person);
  const people_impacted = num(inp.people_impacted);

  const litigation_risk_avoided = num(inp.litigation_risk_avoided);

  const transition_costs = num(inp.transition_costs);

  // K is the scale constant for the CIRI index curve. Default is 1,000,000 if not provided.
  const K = Math.max(1, num(inp.K, 1_000_000));

  // --------- Component Calculations ----------
  const direct_case_cost_savings = cases_avoided * cost_per_case;
  const detention_cost_savings = jail_days_avoided * cost_per_jail_day;
  const enforcement_cost_savings = enforcement_hours_avoided * cost_per_enforcement_hour;

  const market_access_uplift = households_restored * market_access_value_per_household;

  // Employment uplift is modeled as expected value: impacted * probability * uplift.
  const employment_wage_uplift = people_impacted * employment_probability * wage_uplift_per_person;

  // Fees canceled is direct recovery
  const fees_savings = fees_canceled_total;

  // Total recovery pool
  const R_T =
    direct_case_cost_savings +
    detention_cost_savings +
    enforcement_cost_savings +
    market_access_uplift +
    employment_wage_uplift +
    fees_savings +
    litigation_risk_avoided -
    transition_costs;

  // Ensure non-negative total recovery unless you explicitly want negatives
  const total_recovery = Math.max(0, R_T);

  // CIRI index curve (bounded 0..1)
  const ciri_index = 1 - Math.exp(-total_recovery / K);

  // Optional: ROI per case (avoid divide by zero)
  const roi_per_case = cases_avoided > 0 ? total_recovery / cases_avoided : 0;

  return {
    module: "CIRI",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      divergence_present: true,
      ccri_present: !!ccri,
      ciri_inputs_present: Object.keys(inp).length > 0
    },
    components: {
      direct_case_cost_savings,
      detention_cost_savings,
      enforcement_cost_savings,
      market_access_uplift,
      employment_wage_uplift,
      fees_savings,
      litigation_risk_avoided,
      transition_costs
    },
    total_recovery,
    K,
    ciri_index,
    roi_per_case,
    notes:
      "CIRI runner is live with stable math. Provide inputs.ciri_inputs to compute real recovery; otherwise outputs remain zero but schema stays stable."
  };
}
