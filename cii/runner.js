// cii/runner.js
// CII → portfolio output (stub)

export async function run(scenario, ctx = {}) {
  const cibs = scenario?.derived?.cibs;
  if (!cibs) throw new Error("Missing derived.cibs (run CIBS first).");

  const allocations = Array.isArray(cibs.allocations) ? cibs.allocations : [];

  // Minimal portfolio: one project per allocation line
  const portfolio = allocations.map((a, idx) => ({
    project_id: `P-${idx + 1}`,
    category: a.category,
    name: `${a.category} project`,
    amount_usd: Number(a.amount_usd || 0),
    coverage: null,
    notes: "Stub portfolio line. Replace with your CII model/portfolio logic."
  }));

  return {
    module: "CII",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    inputs_used: { cibs_present: true },
    portfolio,
    notes:
      "CII runner stub is live. Replace with real portfolio modeling; keep shape stable."
  };
}
