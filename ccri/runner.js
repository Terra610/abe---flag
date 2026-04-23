// ccri/runner.js
// CCRI -> Constitutional Capital Recovery Index

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round(v, d = 6) {
  return Number(num(v).toFixed(d));
}

function firstNum(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const penalties = model?.scoring_rules?.penalties || {};
  const thresholds = model?.scoring_rules?.thresholds || {};
  const baseScore = num(model?.scoring_rules?.base_score, 100);

  const cae = readExpansion(ctx, "CAE");
  const cda = readExpansion(ctx, "CDA");
  const cff = readExpansion(ctx, "CFF");

  const pop = scenario.population_impact || {};
  const ds = scenario.data_sources_used || {};
  const dmv = scenario.dmv_usage_details || {};
  const dot = scenario.dot_or_fmcsa_usage_details || {};
  const lic = scenario.license_requirements || {};
  const ap = scenario.appeal_process || {};

  const authorityCompliance =
    firstNum(
      cae?.summary?.average_alignment != null
        ? (num(cae.summary.average_alignment, 0) >= 0.8 ? 1 : 0)
        : null,
      scenario.authority_compliance === false ? 0 : 1
    ) ?? 1;

  const definitionIntegrity =
    firstNum(
      cda?.scores?.definition_integrity,
      cda?.aggregate?.definition_integrity,
      scenario.definition_integrity_zero === false ? 0 : 1
    ) ?? 1;

  const fundingAlignment =
    firstNum(
      cff?.scores?.funding_alignment,
      cff?.aggregate?.funding_alignment,
      scenario.funding_alignment === false ? 0 : 1
    ) ?? 1;

  const deltaDef = 1 - clamp(definitionIntegrity, 0, 1);
  const jValid = authorityCompliance * (1 - deltaDef);

  let score = baseScore;

  if (authorityCompliance === 0) score -= num(penalties.authority_failure, 35);
  if (definitionIntegrity < 1) score -= Math.round((1 - definitionIntegrity) * num(penalties.definition_drift, 30));
  if (fundingAlignment < 1) score -= Math.round((1 - fundingAlignment) * num(penalties.funding_misalignment, 20));

  if (ds.dmv_records && dmv.used_in_underwriting_decisions) {
    score -= num(penalties.uses_dmv_in_underwriting, 25);
  }

  if (ds.dmv_records && dmv.used_for_pricing_or_interest_rate) {
    score -= num(penalties.uses_dmv_for_pricing, 20);
  }

  if (lic.requires_valid_license_to_apply) {
    score -= num(penalties.requires_valid_license_to_apply, 15);
  }

  if (lic.requires_valid_license_to_fund_loan) {
    score -= num(penalties.requires_valid_license_to_fund, 15);
  }

  if (lic.requires_valid_license_to_test_drive) {
    score -= num(penalties.requires_valid_license_to_test_drive, 10);
  }

  const drOverall = num(pop.denial_rate_overall, 0);
  const drNoLic = firstNum(pop.denial_rate_for_suspended_or_no_license, drOverall) ?? drOverall;

  if (drNoLic > drOverall + 0.15) {
    score -= num(penalties.denial_rate_high_for_no_license, 20);
  }

  if (ap.has_appeal_mechanism === false || ap.human_review_available === false) {
    score -= num(penalties.no_appeal_process, 10);
  }

  if (ds.dot_or_fmcsa_records && dot.is_dot_regulated_population === false) {
    score -= num(penalties.uses_dot_or_fmcsa_records_for_consumers, 30);
  }

  score = clamp(score, 0, 100);

  const divergenceClass =
    score <= num(thresholds.high_risk, 40) ? "HIGH" :
    score <= num(thresholds.moderate_risk, 70) ? "MODERATE" :
    "LOW";

  const constitutionalDivergenceIndex = 1 - (score / 100);

  const applications = num(pop.applications_per_year, 0);
  const affectedPopulation =
    firstNum(
      pop.estimated_noncommercial_applicants_affected,
      Math.round(applications * (drNoLic || drOverall))
    ) ?? 0;

  const recoveryScalar =
    firstNum(
      scenario.average_constitutional_capital_per_case_usd,
      model.average_constitutional_capital_per_case_usd,
      2500
    ) ?? 2500;

  const constitutionalCapitalRecoveryUsd =
    constitutionalDivergenceIndex *
    (2 - jValid) *
    affectedPopulation *
    recoveryScalar *
    ((fundingAlignment + definitionIntegrity) / 2);

  return {
    module: "CCRI",
    title: "Constitutional Capital Recovery Index",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    scores: {
      overall_risk_class:
        divergenceClass === "HIGH" ? "HIGH_DIVERGENCE" :
        divergenceClass === "MODERATE" ? "MODERATE_DIVERGENCE" :
        "LOW_DIVERGENCE",
      constitutional_integrity_score: round(score, 6),
      constitutional_divergence_index: round(constitutionalDivergenceIndex, 6),
      access_fairness: round(
        lic.requires_valid_license_to_apply || lic.requires_valid_license_to_fund_loan ? 0.2 : 1.0,
        6
      ),
      economic_impact: round(constitutionalCapitalRecoveryUsd, 2)
    },
    aggregate: {
      j_valid: round(jValid, 6),
      definition_integrity: round(definitionIntegrity, 6),
      funding_alignment: round(fundingAlignment, 6),
      affected_population: round(affectedPopulation, 2),
      total_constitutional_capital_recovery_usd: round(constitutionalCapitalRecoveryUsd, 2),
      average_divergence_index: round(constitutionalDivergenceIndex, 6)
    },
    scenario: {
      id: scenario.id || "",
      jurisdiction: scenario.jurisdiction || "",
      institution_type: scenario.institution_type || "",
      institution_name: scenario.institution_name || ""
    },
    narrative:
      divergenceClass === "HIGH"
        ? "High constitutional divergence detected. Recoverable constitutional capital is materially suppressed by unlawful gatekeeping."
        : divergenceClass === "MODERATE"
        ? "Moderate constitutional divergence detected. Partial recovery is available through targeted realignment."
        : "Low constitutional divergence detected. Remaining gains are incremental.",
    trace: {
      cae_seen: !!cae,
      cda_seen: !!cda,
      cff_seen: !!cff
    }
  };
}
