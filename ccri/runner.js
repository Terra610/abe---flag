// ccri/runner.js
// CCRI -> produces a constitutional capital recovery artifact for downstream CIRI use.

export async function run(scenario, ctx = {}) {
  const model = ctx.model || {};
  const penalties = (model.scoring_rules && model.scoring_rules.penalties) || {};
  const thresholds = (model.scoring_rules && model.scoring_rules.thresholds) || {
    high_risk: 40,
    moderate_risk: 70,
    low_risk: 85
  };

  const pop = scenario.population_impact || {};
  const ds = scenario.data_sources_used || {};
  const dmv = scenario.dmv_usage_details || {};
  const dot = scenario.dot_or_fmcsa_usage_details || {};
  const lic = scenario.license_requirements || {};
  const ap = scenario.appeal_process || {};

  const upstream = ctx.upstream || {};
  const authorityCompliance =
    typeof upstream.authorityCompliance === "number"
      ? upstream.authorityCompliance
      : (scenario.authority_compliance === false ? 0 : 1);

  const definitionIntegrity =
    typeof upstream.definitionIntegrity === "number"
      ? upstream.definitionIntegrity
      : (scenario.definition_integrity_zero === false ? 0 : 1);

  const fundingAlignment =
    typeof upstream.fundingAlignment === "number"
      ? upstream.fundingAlignment
      : (scenario.funding_alignment === false ? 0 : 1);

  const deltaDef = 1 - Math.max(0, Math.min(1, definitionIntegrity));
  const jValid = authorityCompliance * (1 - deltaDef);

  let score = typeof model?.scoring_rules?.base_score === "number"
    ? model.scoring_rules.base_score
    : 100;

  if (authorityCompliance === 0) score -= penalties.authority_failure || 35;
  if (definitionIntegrity < 1) score -= Math.round((1 - definitionIntegrity) * (penalties.definition_drift || 30));
  if (fundingAlignment < 1) score -= Math.round((1 - fundingAlignment) * (penalties.funding_misalignment || 20));

  if (ds.dmv_records && dmv.used_in_underwriting_decisions) {
    score -= penalties.uses_dmv_in_underwriting || 25;
  }

  if (ds.dmv_records && dmv.used_for_pricing_or_interest_rate) {
    score -= penalties.uses_dmv_for_pricing || 20;
  }

  if (lic.requires_valid_license_to_apply) {
    score -= penalties.requires_valid_license_to_apply || 15;
  }

  if (lic.requires_valid_license_to_fund_loan) {
    score -= penalties.requires_valid_license_to_fund || 15;
  }

  if (lic.requires_valid_license_to_test_drive) {
    score -= penalties.requires_valid_license_to_test_drive || 10;
  }

  const drOverall = typeof pop.denial_rate_overall === "number" ? pop.denial_rate_overall : 0;
  const drNoLic = typeof pop.denial_rate_for_suspended_or_no_license === "number"
    ? pop.denial_rate_for_suspended_or_no_license
    : drOverall;

  if (drNoLic > drOverall + 0.15) {
    score -= penalties.denial_rate_high_for_no_license || 20;
  }

  if (ap.has_appeal_mechanism === false || ap.human_review_available === false) {
    score -= penalties.no_appeal_process || 10;
  }

  if (ds.dot_or_fmcsa_records && dot.is_dot_regulated_population === false) {
    score -= penalties.uses_dot_or_fmcsa_records_for_consumers || 30;
  }

  score = Math.max(0, Math.min(100, score));

  let divergenceClass = "LOW";
  if (score <= thresholds.high_risk) divergenceClass = "HIGH";
  else if (score <= thresholds.moderate_risk) divergenceClass = "MODERATE";

  const constitutionalDivergenceIndex = 1 - (score / 100);
  const applications = typeof pop.applications_per_year === "number" ? pop.applications_per_year : 0;
  const affectedPopulation =
    typeof pop.estimated_noncommercial_applicants_affected === "number"
      ? pop.estimated_noncommercial_applicants_affected
      : Math.round(applications * (drNoLic || drOverall));

  const recoveryScalar =
    typeof scenario.average_constitutional_capital_per_case_usd === "number"
      ? scenario.average_constitutional_capital_per_case_usd
      : (typeof model.average_constitutional_capital_per_case_usd === "number"
          ? model.average_constitutional_capital_per_case_usd
          : 2500);

  const constitutionalCapitalRecoveryUsd =
    constitutionalDivergenceIndex *
    (2 - jValid) *
    affectedPopulation *
    recoveryScalar *
    ((fundingAlignment + definitionIntegrity) / 2);

  return {
    module: "CCRI",
    module_version: "1.0",
    title: "Constitutional Capital Recovery Index",
    generated_at: new Date().toISOString(),
    scores: {
      overall_risk_class:
        divergenceClass === "HIGH" ? "HIGH_DIVERGENCE" :
        divergenceClass === "MODERATE" ? "MODERATE_DIVERGENCE" :
        "LOW_DIVERGENCE",
      constitutional_integrity_score: Number(score.toFixed(2)),
      constitutional_divergence_index: Number(constitutionalDivergenceIndex.toFixed(4)),
      access_fairness: Number((lic.requires_valid_license_to_apply || lic.requires_valid_license_to_fund_loan ? 0.2 : 1.0).toFixed(4)),
      economic_impact: Number((affectedPopulation > 0 ? constitutionalCapitalRecoveryUsd : 0).toFixed(2))
    },
    aggregate: {
      j_valid: Number(jValid.toFixed(4)),
      definition_integrity: Number(definitionIntegrity.toFixed(4)),
      funding_alignment: Number(fundingAlignment.toFixed(4)),
      affected_population: affectedPopulation,
      constitutional_capital_recovery_usd: Math.round(constitutionalCapitalRecoveryUsd)
    },
    narrative:
      divergenceClass === "HIGH"
        ? "High constitutional divergence detected. Recoverable constitutional capital is materially suppressed by unlawful gatekeeping."
        : divergenceClass === "MODERATE"
        ? "Moderate constitutional divergence detected. Partial recovery is available through targeted realignment."
        : "Low constitutional divergence detected. Remaining gains are incremental.",
    signals: [
      { key: "authority_compliance", value: authorityCompliance },
      { key: "definition_integrity", value: definitionIntegrity },
      { key: "funding_alignment", value: fundingAlignment },
      { key: "j_valid", value: jValid },
      { key: "constitutional_divergence_index", value: constitutionalDivergenceIndex }
    ],
    notes: "CCRI runner active and aligned to Constitutional Capital Recovery Index semantics."
  };
}
