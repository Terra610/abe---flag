// cda/runner.js
// CDA -> Constitutional Definition Audit
// Measures integrity of applied definitions against controlling authority.

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6) {
  return Number(num(v).toFixed(d));
}

function classify(score, good, warning) {
  if (score >= good) return "LOW_DIVERGENCE";
  if (score >= warning) return "MODERATE_DIVERGENCE";
  return "HIGH_DIVERGENCE";
}

export async function run(_scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const weights = model.weights || {};
  const thresholds = model.thresholds || {};

  const wText = num(weights.textual_fidelity, 0.34);
  const wScope = num(weights.scope_fidelity, 0.33);
  const wDelegation = num(weights.delegation_fidelity, 0.33);

  const definitions = Array.isArray(model.definitions) ? model.definitions : [];

  const scored = definitions.map(def => {
    const textual = num(def.textual_fidelity, 0);
    const scope = num(def.scope_fidelity, 0);
    const delegation = num(def.delegation_fidelity, 0);

    const integrity =
      (textual * wText) +
      (scope * wScope) +
      (delegation * wDelegation);

    const deltaDef = 1 - integrity;

    return {
      term: def.term || "",
      source_authority: def.source_authority || "",
      governing_definition: def.governing_definition || "",
      applied_definition: def.applied_definition || "",
      scope_domain: def.scope_domain || "",
      textual_fidelity: round(textual, 6),
      scope_fidelity: round(scope, 6),
      delegation_fidelity: round(delegation, 6),
      integrity_score: round(integrity, 6),
      delta_def: round(deltaDef, 6),
      notes: def.notes || ""
    };
  });

  const avgIntegrity =
    scored.length
      ? scored.reduce((s, x) => s + num(x.integrity_score, 0), 0) / scored.length
      : 0;

  const avgDelta =
    scored.length
      ? scored.reduce((s, x) => s + num(x.delta_def, 0), 0) / scored.length
      : 0;

  const good = num(thresholds.good, 0.85);
  const warning = num(thresholds.warning, 0.65);

  const flagged = scored.filter(x => num(x.integrity_score, 0) < warning);

  return {
    module: "CDA",
    title: "Constitutional Definition Audit",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    weights: {
      textual_fidelity: round(wText, 6),
      scope_fidelity: round(wScope, 6),
      delegation_fidelity: round(wDelegation, 6)
    },
    thresholds: {
      good: round(good, 6),
      warning: round(warning, 6)
    },
    scores: {
      definition_integrity: round(avgIntegrity, 6),
      delta_def: round(avgDelta, 6),
      overall_risk_class: classify(avgIntegrity, good, warning)
    },
    aggregate: {
      definition_integrity: round(avgIntegrity, 6),
      average_delta_def: round(avgDelta, 6),
      definition_count: scored.length,
      flagged_definition_count: flagged.length
    },
    definitions: scored,
    flagged_definitions: flagged,
    narrative:
      scored.length
        ? "CDA measured definition integrity against controlling authority and computed average scope drift."
        : "CDA found no definitions to evaluate."
  };
      }
