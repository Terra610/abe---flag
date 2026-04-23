// ciri/runner.js
// CIRI -> Constitutional Integrity Risk Index
// Canonical formulas:
//   R_T = (C_a * C̄) + F_e + (C_a * D_j * J) + (P_e * Ē) + (H_r * M̄ * t̄_a)
//       + (C_a * P_e * w̄ * t̄_a) + (L_e * P̄ * λ) - T_c
//   CIRI = 1 - e^(-R_T / K)
//   ROI_case = R_T / C_a

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function firstNum(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function round(v, d = 4) {
  return Number(num(v).toFixed(d));
}

function getPrior(ctx, name) {
  return ctx?.priorCore?.[name]?.artifact || null;
}

function getExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

function deriveInputs(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const cdi = getPrior(ctx, "CDI");
  const cff = getExpansion(ctx, "CFF");
  const ccri = getExpansion(ctx, "CCRI");
  const cae = getExpansion(ctx, "CAE");
  const cda = getExpansion(ctx, "CDA");

  const defaults = model.defaults || {};

  const C_a = firstNum(
    scenario.C_a,
    scenario.case_count,
    scenario.cases_affected,
    scenario.ca,
    defaults.C_a,
    1
  );

  const C_bar = firstNum(
    scenario.C_bar,
    scenario.avg_constitutional_loss,
    scenario.avg_case_loss,
    scenario.avg_loss_per_case,
    defaults.C_bar,
    0
  );

  const F_e = firstNum(
    scenario.F_e,
    scenario.enforcement_cost,
    scenario.direct_enforcement_cost,
    cff?.aggregate?.total_flagged_funds,
    defaults.F_e,
    0
  );

  const D_j = firstNum(
    scenario.D_j,
    scenario.jurisdiction_divergence,
    cdi?.scores?.divergence_score,
    cdi?.scores?.constitutional_divergence_index,
    cdi?.aggregate?.average_divergence_index,
    defaults.D_j,
    0
  );

  const J = firstNum(
    scenario.J,
    scenario.jurisdiction_factor,
    scenario.j_valid,
    defaults.J,
    1
  );

  const P_e = firstNum(
    scenario.P_e,
    scenario.population_exposed,
    scenario.exposed_population,
    ccri?.aggregate?.total_impacted_population,
    defaults.P_e,
    0
  );

  const E_bar = firstNum(
    scenario.E_bar,
    scenario.avg_economic_harm,
    scenario.avg_household_loss,
    scenario.avg_earnings_loss,
    defaults.E_bar,
    0
  );

  const H_r = firstNum(
    scenario.H_r,
    scenario.housing_risk,
    scenario.household_risk,
    defaults.H_r,
    0
  );

  const M_bar = firstNum(
    scenario.M_bar,
    scenario.mobility_loss,
    scenario.avg_mobility_loss,
    defaults.M_bar,
    0
  );

  const t_bar_a = firstNum(
    scenario.t_bar_a,
    scenario.avg_time_affected,
    scenario.avg_time_to_recovery,
    scenario.avg_time,
    defaults.t_bar_a,
    0
  );

  const w_bar = firstNum(
    scenario.w_bar,
    scenario.avg_wage_loss,
    scenario.avg_work_loss,
    defaults.w_bar,
    0
  );

  const L_e = firstNum(
    scenario.L_e,
    scenario.legal_exposure,
    scenario.legal_cost,
    defaults.L_e,
    0
  );

  const P_bar = firstNum(
    scenario.P_bar,
    scenario.avg_probability_of_liability,
    scenario.liability_probability,
    defaults.P_bar,
    0
  );

  const lambda = firstNum(
    scenario.lambda,
    scenario.lambda_factor,
    scenario.multiplier,
    defaults.lambda,
    0
  );

  const T_c = firstNum(
    scenario.T_c,
    scenario.corrective_offset,
    scenario.corrective_credit,
    defaults.T_c,
    0
  );

  const K = firstNum(
    scenario.K,
    scenario.normalization_constant,
    model.normalization_constant,
    defaults.K,
    1000000
  );

  const authorityAlignment = firstNum(
    cae?.summary?.average_alignment,
    cae?.aggregate?.average_alignment,
    cae?.scores?.constitutional_alignment,
    1
  );

  const definitionIntegrity = firstNum(
    cda?.scores?.definition_integrity,
    cda?.aggregate?.definition_integrity,
    1
  );

  return {
    C_a, C_bar, F_e, D_j, J, P_e, E_bar, H_r, M_bar, t_bar_a, w_bar, L_e, P_bar, lambda, T_c, K,
    authorityAlignment,
    definitionIntegrity
  };
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const inputs = deriveInputs(scenario, ctx);

  const RT =
    (inputs.C_a * inputs.C_bar) +
    inputs.F_e +
    (inputs.C_a * inputs.D_j * inputs.J) +
    (inputs.P_e * inputs.E_bar) +
    (inputs.H_r * inputs.M_bar * inputs.t_bar_a) +
    (inputs.C_a * inputs.P_e * inputs.w_bar * inputs.t_bar_a) +
    (inputs.L_e * inputs.P_bar * inputs.lambda) -
    inputs.T_c;

  const RTclamped = Math.max(0, RT);
  const Ksafe = inputs.K > 0 ? inputs.K : 1;

  const ciri = 1 - Math.exp(-(RTclamped / Ksafe));
  const roiCase = inputs.C_a > 0 ? RTclamped / inputs.C_a : 0;

  const riskClass =
    ciri >= 0.8 ? "HIGH" :
    ciri >= 0.45 ? "MODERATE" :
    "LOW";

  const artifact = {
    module: "CIRI",
    title: "Constitutional Integrity Risk Index",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      RT: "R_T = (C_a*C̄) + F_e + (C_a*D_j*J) + (P_e*Ē) + (H_r*M̄*t̄_a) + (C_a*P_e*w̄*t̄_a) + (L_e*P̄*λ) - T_c",
      CIRI: "CIRI = 1 - e^(-R_T / K)",
      ROI_case: "ROI_case = R_T / C_a"
    },
    inputs: {
      C_a: round(inputs.C_a, 4),
      C_bar: round(inputs.C_bar, 4),
      F_e: round(inputs.F_e, 4),
      D_j: round(inputs.D_j, 4),
      J: round(inputs.J, 4),
      P_e: round(inputs.P_e, 4),
      E_bar: round(inputs.E_bar, 4),
      H_r: round(inputs.H_r, 4),
      M_bar: round(inputs.M_bar, 4),
      t_bar_a: round(inputs.t_bar_a, 4),
      w_bar: round(inputs.w_bar, 4),
      L_e: round(inputs.L_e, 4),
      P_bar: round(inputs.P_bar, 4),
      lambda: round(inputs.lambda, 4),
      T_c: round(inputs.T_c, 4),
      K: round(inputs.K, 4)
    },
    scores: {
      overall_risk_class: riskClass,
      constitutional_risk_index: round(ciri, 6),
      ciri: round(ciri, 6),
      roi_case: round(roiCase, 6),
      divergence_dependency: round(inputs.D_j, 6),
      authority_alignment: round(inputs.authorityAlignment, 6),
      definition_integrity: round(inputs.definitionIntegrity, 6)
    },
    aggregate: {
      RT: round(RTclamped, 6),
      normalization_constant: round(Ksafe, 6),
      case_count: round(inputs.C_a, 6),
      exposed_population: round(inputs.P_e, 6),
      corrective_offset: round(inputs.T_c, 6)
    },
    narrative:
      riskClass === "HIGH"
        ? "High constitutional integrity risk detected. Recovery pressure and structural harm are materially elevated."
        : riskClass === "MODERATE"
        ? "Moderate constitutional integrity risk detected. Targeted correction should materially reduce cumulative harm."
        : "Low constitutional integrity risk detected. Current aggregate harm remains bounded.",
    trace: {
      prior_core: Object.keys(ctx?.priorCore || {}),
      expansions_seen: Object.keys(ctx?.expansions || {})
    }
  };

  return artifact;
}
