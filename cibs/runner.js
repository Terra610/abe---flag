// cibs/runner.js
// CIBS → budget allocation output (stub)

export async function run(scenario, ctx = {}) {
  const ciri = scenario?.derived?.ciri;
  if (!ciri) throw new Error("Missing derived.ciri (run CIRI first).");

  const total = Number(ciri.total_recovery || 0);

  // Simple default allocations (can be replaced later with your template logic)
  const allocations = [
    { category: "housing", amount_usd: Math.round(total * 0.25) },
    { category: "clinics", amount_usd: Math.round(total * 0.15) },
    { category: "food", amount_usd: Math.round(total * 0.10) },
    { category: "mobility", amount_usd: Math.round(total * 0.20) },
    { category: "workforce", amount_usd: Math.round(total * 0.15) },
    { category: "legal_aid", amount_usd: Math.round(total * 0.05) },
    { category: "admin_ops", amount_usd: Math.round(total * 0.10) }
  ];

  return {
    module: "CIBS",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: { ciri_present: true },
    total_recovery: total,
    allocations,
    notes:
      "CIBS runner stub is live. Replace allocation logic with your budget template; keep shape stable."
  };
}
