// affe/runner.js
// AFFE — American Funding & Fidelity Explorer
// Measures post-deployment stability after RT execution

function num(v, fallback = 0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6){
  return Number(num(v).toFixed(d));
}

function clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function getPrior(ctx, name){
  return ctx?.priorCore?.[name]?.artifact || null;
}

function getExpansion(ctx, name){
  return ctx?.expansions?.[name] || null;
}

export async function run(scenario = {}, ctx = {}){

  const model = ctx.model || {};
  const K = num(model?.normalization_constant, 1000000000);

  const RT = getExpansion(ctx, "RT");
  const INTEGRATION = getExpansion(ctx, "INTEGRATION");
  const CII = getPrior(ctx, "CII");

  const RTI =
    num(RT?.scores?.rebuild_together_index, 0);

  const A_total =
    num(RT?.scores?.total_activation_usd,
    RT?.aggregate?.A_total,
    0);

  const R_T =
    num(INTEGRATION?.aggregate?.total_constitutional_capital_recovery_usd, 1);

  const eta =
    clamp(
      num(
        CII?.scores?.constitutional_integrity_index,
        CII?.scores?.cii,
        0.5
      ),
      0,
      1
    );

  // Stability Signal
  const S =
    (RTI * eta) +
    (A_total / Math.max(1, R_T));

  // Final AFFE Score
  const AFFE =
    1 - Math.exp(-(S / Math.max(1, K)));

  const risk_class =
    AFFE >= 0.8 ? "HIGH_STABILITY" :
    AFFE >= 0.45 ? "MODERATE_STABILITY" :
    "LOW_STABILITY";

  return {
    module: "AFFE",
    module_version: "1.0",
    generated_at: new Date().toISOString(),

    scores: {
      american_funding_fidelity_index: round(AFFE, 6),
      stability_signal: round(S, 6),
      overall_risk_class: risk_class
    },

    inputs: {
      RT_execution_index: round(RTI, 6),
      total_activation_usd: round(A_total, 2),
      recovery_base_usd: round(R_T, 2),
      cii_effectiveness: round(eta, 6)
    },

    narrative:
      "AFFE evaluated post-deployment system stability using RT outputs, recovery capital, and propagation effectiveness.",

    notes:
      "Higher AFFE values indicate stronger stability and successful deployment alignment."
  };
}
