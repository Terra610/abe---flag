// macro/runner.js
export async function run(scenario, ctx = {}) {
  const ciri = scenario?.derived?.ciri || { total_recovery: 0 };
  const total = Number(ciri.total_recovery || 0);

  return {
    module: "MACRO",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    gdp_uplift: 0,
    jobs_created: 0,
    wage_uplift: 0,
    notes: `Macro stub computed from total_recovery=${total} (no multipliers applied yet).`
  };
}
