// ciri/runner.js
// ABE CIRI — Deterministic Recovery Engine
// Consumes CDA + CDI outputs (not legacy divergence)

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

async function loadRepoDefaults() {
  const res = await fetch("./default_inputs.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load ciri/default_inputs.json");
  return await res.json();
}

export async function run(scenario, ctx = {}) {

  const cda = scenario?.derived?.cda;
  const cdi = scenario?.derived?.cdi;

  if (!cda) throw new Error("Missing derived.cda (CDA must run first).");
  if (!cdi) throw new Error("Missing derived.cdi (CDI must run after CDA).");

  const divergenceScore = num(cda.divergence_score, 0);
  const weightedDivergence = num(cdi.weighted_divergence || cdi.score || divergenceScore);

  const determinations = cda?.determinations || {};
  const fundingMisuse = determinations?.funding_misuse ? 1 : 0;

  // Load inputs
  let inp = scenario?.inputs?.ciri_inputs;
  let source = "user";

  if (!inp || Object.keys(inp).length === 0) {
    try {
      inp = await loadRepoDefaults();
      source = "repo_default";
    } catch {
      inp = {};
      source = "empty_fallback";
    }
  }

  const cases_avoided = num(inp.cases_avoided);
  const cost_per_case = num(inp.cost_per_case);

  const jail_days_avoided = num(inp.jail_days_avoided);
  const cost_per_jail_day = num(inp.cost_per_jail_day);

  const enforcement_hours_avoided = num(inp.enforcement_hours_avoided);
  const cost_per_hour = num(inp.cost_per_hour);

  // 🔥 Core ABE recovery math (deterministic)

  const caseSavings = cases_avoided * cost_per_case;
  const jailSavings = jail_days_avoided * cost_per_jail_day;
  const enforcementSavings = enforcement_hours_avoided * cost_per_hour;

  const baseRecovery =
    caseSavings +
    jailSavings +
    enforcementSavings;

  // Apply constitutional divergence multiplier
  const divergenceMultiplier = weightedDivergence;

  // Apply funding misuse amplification
  const fundingMultiplier = fundingMisuse ? 1.25 : 1;

  const totalRecovery =
    baseRecovery *
    divergenceMultiplier *
    fundingMultiplier;

  return {
    total_recovery: totalRecovery,
    base_recovery: baseRecovery,
    divergence_multiplier: divergenceMultiplier,
    funding_multiplier: fundingMultiplier,
    source,
    inputs_used: inp,
    upstream: {
      cda_divergence: divergenceScore,
      cdi_weighted: weightedDivergence,
      funding_misuse: fundingMisuse
    }
  };
}
