// affe/runner.js
// AFFE — Appropriation Fidelity & Funding Engine
// Normalizes funding fidelity signals and measures post-deployment stability.

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
  const defaults = model.defaults || {};

  const K = num(defaults.normalization_constant, num(model.normalization_constant, 1000000000));

  const RT = getExpansion(ctx, "RT");
  const INTEGRATION = getExpansion(ctx, "INTEGRATION");
  const CFF = getExpansion(ctx, "CFF");
  const FUNDING = getExpansion(ctx, "AFFE_FUNDING");
  const CII = getPrior(ctx, "CII");

  const rt_seen = !!RT;
  const integration_seen = !!INTEGRATION;
  const cii_seen = !!CII;
  const cff_seen = !!CFF;
  const funding_artifact_seen = !!FUNDING;

  const RTI =
    num(
      RT?.scores?.rebuild_together_index ??
      RT?.scores?.execution_index ??
      RT?.scores?.rt_index ??
      RT?.aggregate?.rebuild_together_index,
      0
    );

  const A_total =
    num(
      RT?.scores?.total_activation_usd ??
      RT?.aggregate?.A_total ??
      RT?.aggregate?.total_activation_usd,
      0
    );

  const R_T =
    num(
      INTEGRATION?.aggregate?.total_constitutional_capital_recovery_usd ??
      INTEGRATION?.aggregate?.recovery_capital_usd ??
      INTEGRATION?.aggregate?.RT ??
      1,
      1
    );

  const eta =
    clamp(
      num(
        CII?.scores?.constitutional_integrity_index ??
        CII?.scores?.cii ??
        CII?.aggregate?.constitutional_integrity_index ??
        0.5,
        0.5
      ),
      0,
      1
    );

  const appropriation_fidelity =
    clamp(
      num(
        scenario.appropriation_fidelity ??
        CFF?.scores?.appropriation_fidelity ??
        CFF?.scores?.funding_alignment_score ??
        defaults.appropriation_fidelity,
        1
      ),
      0,
      1
    );

  const scope_alignment =
    clamp(
      num(
        scenario.scope_alignment ??
        CFF?.scores?.scope_alignment ??
        CFF?.scores?.program_scope_score ??
        defaults.scope_alignment,
        1
      ),
      0,
      1
    );

  const program_integrity =
    clamp(
      num(
        scenario.program_integrity ??
        CFF?.scores?.program_integrity ??
        CFF?.scores?.mission_alignment_score ??
        defaults.program_integrity,
        1
      ),
      0,
      1
    );

  const funding_fidelity_signal =
    appropriation_fidelity * scope_alignment * program_integrity;

  const deployment_ratio =
    A_total / Math.max(1, R_T);

  const stability_signal =
    (RTI * eta) + deployment_ratio;

  const affe_index =
    1 - Math.exp(-(stability_signal / Math.max(1, K)));

  const appropriation_fidelity_index =
    1 - Math.exp(-(funding_fidelity_signal / Math.max(1, K)));

  const combined_signal =
    (funding_fidelity_signal + stability_signal) / 2;

  const overall_risk_class =
    combined_signal >= 1.25 ? "HIGH_STABILITY" :
    combined_signal >= 0.75 ? "MODERATE_STABILITY" :
    "LOW_STABILITY";

  const normalized_funding_artifact = FUNDING || null;

  return {
    module: "AFFE",
    module_name: "Appropriation Fidelity & Funding Engine",
    module_version: "1.0",
    generated_at: new Date().toISOString(),

    scores: {
      funding_fidelity_signal: round(funding_fidelity_signal, 6),
      appropriation_fidelity_index: round(appropriation_fidelity_index, 6),
      stability_signal: round(stability_signal, 6),
      affe_index: round(affe_index, 6),
      american_funding_fidelity_index: round(affe_index, 6),
      overall_risk_class
    },

    inputs: {
      RT_execution_index: round(RTI, 6),
      total_activation_usd: round(A_total, 2),
      recovery_base_usd: round(R_T, 2),
      cii_effectiveness: round(eta, 6),
      appropriation_fidelity: round(appropriation_fidelity, 6),
      scope_alignment: round(scope_alignment, 6),
      program_integrity: round(program_integrity, 6),
      deployment_ratio: round(deployment_ratio, 6)
    },

    trace: {
      rt_seen,
      integration_seen,
      cii_seen,
      cff_seen,
      funding_artifact_seen
    },

    normalized_funding_artifact,

    narrative:
      "AFFE evaluated appropriation fidelity, funding alignment, and post-deployment stability using available RT, CII, Integration, CFF, and local funding artifacts.",

    plain_language: {
      main_result: "AFFE checked whether funding purpose, scope, program integrity, and deployment stability stayed aligned.",
      funding_fidelity: "The funding fidelity signal reflects appropriation alignment, scope alignment, and program integrity.",
      stability: "The stability signal reflects RT activation, recovery capital, and CII effectiveness.",
      caution: "AFFE output is an analysis artifact, not a court ruling, legal guarantee, or agency determination."
    },

    notes:
      "Higher values indicate stronger funding fidelity and post-deployment stability. Missing upstream artifacts default to conservative or neutral values where needed."
  };
}
