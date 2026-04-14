// ciri/runner.js
// CIRI — Constitutional Integrity ROI
// STRICT canonical implementation from abe---flag-1.0.0 (DOI anchored)
// No expanded recovery logic. No AFFE passthrough. No formula drift.

function num(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

async function loadDefaults() {
  const url = new URL("./default_inputs.json", import.meta.url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not load ciri/default_inputs.json (HTTP ${res.status})`);
  }
  return await res.json();
}

function normalizeInputs(raw = {}) {
  return {
    cases_avoided: num(raw.cases_avoided),

    avg_cost: num(raw.avg_cost, num(raw.avg_cost_per_case)),
    fees_calc: num(raw.fees_calc, num(raw.fees_canceled_total)),

    jail_day_cost: num(raw.jail_day_cost, num(raw.cost_per_jail_day)),
    jailDays: num(raw.jailDays, num(raw.jail_days_avoided)),

    licenses: num(raw.licenses, num(raw.households_restored)),
    transport_weight: num(raw.transport_weight, num(raw.avg_monthly_market_spend)),

    expected_wage: num(raw.expected_wage, num(raw.avg_monthly_wage)),
    months_employed: num(raw.months_employed, num(raw.months_effective)),
    employment_rate: num(raw.employment_rate, num(raw.employment_probability)),
    pay_multiplier: num(raw.pay_multiplier, 1),

    K: num(raw.K, 50000000)
  };
}

function computeCanonicalCiri(fields) {
  const direct_case =
    fields.cases_avoided * (fields.avg_cost + fields.fees_calc);

  const detention =
    fields.cases_avoided * fields.jail_day_cost * fields.jailDays;

  const licensing =
    fields.licenses * fields.transport_weight;

  const per_worker =
    fields.expected_wage *
    (fields.months_employed / 12) *
    fields.employment_rate *
    fields.pay_multiplier;

  const employment =
    per_worker * fields.cases_avoided;

  const Total =
    direct_case +
    detention +
    licensing +
    employment;

  const safeK = Math.max(1, fields.K);
  const CIRI = 1 - Math.exp(- Total / safeK);

  const ROI_per_case =
    fields.cases_avoided > 0 ? Total / fields.cases_avoided : null;

  return {
    direct_case,
    detention,
    licensing,
    per_worker,
    employment,
    Total,
    CIRI,
    ROI_per_case,
    K: safeK
  };
}

export async function run(scenario = {}, ctx = {}) {
  const cda = scenario?.derived?.cda || null;
  const cdi = scenario?.derived?.cdi || null;

  const divergenceSignal =
    num(cdi?.result?.weighted_divergence) ||
    num(cdi?.weighted_divergence) ||
    num(cda?.result?.divergence_score) ||
    num(cda?.divergence_score) ||
    0;

  if (divergenceSignal <= 0) {
    throw new Error("Missing constitutional divergence signal (CDI or CDA must run before CIRI).");
  }

  let rawInputs = scenario?.inputs?.ciri_inputs;
  let inputSource = "user";

  if (!rawInputs || Object.keys(rawInputs).length === 0) {
    rawInputs = await loadDefaults();
    inputSource = "repo_default";
  }

  const fields = normalizeInputs(rawInputs);
  const outputs = computeCanonicalCiri(fields);

  return {
    module: "CIRI",
    module_version: "1.0.0-canonical",
    generated_at: new Date().toISOString(),
    inputs_used: {
      divergence_present: true,
      divergence_signal: divergenceSignal,
      cda_present: !!cda,
      cdi_present: !!cdi,
      ciri_inputs_source: inputSource
    },
    inputs_normalized: fields,
    outputs: {
      direct_case: outputs.direct_case,
      detention: outputs.detention,
      licensing: outputs.licensing,
      per_worker: outputs.per_worker,
      employment: outputs.employment,
      Total: outputs.Total,
      CIRI: outputs.CIRI,
      ROI_per_case: outputs.ROI_per_case
    },
    total_recovery: outputs.Total,
    K: outputs.K,
    ciri_index: outputs.CIRI,
    roi_per_case: outputs.ROI_per_case,
    notes: "Strict canonical CIRI formula from abe---flag-1.0.0. No expanded recovery terms applied."
  };
}
