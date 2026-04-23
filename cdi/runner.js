// cdi/runner.js
// CDI -> Constitutional Divergence Index
// Canonical formulas:
//   S_r = w1*s1 + w2*s2 + w3*s3 + w4*s4 + w5*s5
//   CDI = 1 - e^(-S_r / R)

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round(v, d = 4) {
  return Number(num(v).toFixed(d));
}

function firstNum(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

function deriveInputs(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const defaults = model.defaults || {};
  const cae = getExpansion(ctx, "CAE");
  const cda = getExpansion(ctx, "CDA");
  const ccri = getExpansion(ctx, "CCRI");

  const s1 = firstNum(
    scenario.s1,
    scenario.stops_per_1000,
    defaults.s1,
    0
  );

  const s2 = firstNum(
    scenario.s2,
    scenario.charge_mix_ratio,
    defaults.s2,
    0
  );

  const s3 = firstNum(
    scenario.s3,
    scenario.average_time_to_counsel,
    defaults.s3,
    0
  );

  const s4 = firstNum(
    scenario.s4,
    scenario.dismissal_rate,
    defaults.s4,
    0
  );

  const s5 = firstNum(
    scenario.s5,
    scenario.pretext_ratio,
    defaults.s5,
    0
  );

  const w1 = firstNum(scenario.w1, model.weights?.w1, defaults.w1, 1);
  const w2 = firstNum(scenario.w2, model.weights?.w2, defaults.w2, 1);
  const w3 = firstNum(scenario.w3, model.weights?.w3, defaults.w3, 1);
  const w4 = firstNum(scenario.w4, model.weights?.w4, defaults.w4, 1);
  const w5 = firstNum(scenario.w5, model.weights?.w5, defaults.w5, 1);

  const R = firstNum(
    scenario.R,
    scenario.normalization_constant,
    model.normalization_constant,
    defaults.R,
    100
  );

  const alignmentHint = firstNum(
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

  const ccriDivergence = firstNum(
    ccri?.scores?.constitutional_divergence_index,
    ccri?.aggregate?.average_divergence_index,
    null
  );

  return {
    s1, s2, s3, s4, s5,
    w1, w2, w3, w4, w5,
    R,
    alignmentHint,
    definitionIntegrity,
    ccriDivergence
  };
}

export async function run(scenario = {}, ctx = {}) {
  const inputs = deriveInputs(scenario, ctx);

  let Sr =
    (inputs.w1 * inputs.s1) +
    (inputs.w2 * inputs.s2) +
    (inputs.w3 * inputs.s3) +
    (inputs.w4 * inputs.s4) +
    (inputs.w5 * inputs.s5);

  if (inputs.alignmentHint != null) {
    Sr = Sr * (2 - clamp(inputs.alignmentHint, 0, 1));
  }

  if (inputs.definitionIntegrity != null) {
    Sr = Sr * (2 - clamp(inputs.definitionIntegrity, 0, 1));
  }

  if (inputs.ccriDivergence != null) {
    Sr = Sr * (1 + clamp(inputs.ccriDivergence, 0, 1) * 0.25);
  }

  const Rsafe = inputs.R > 0 ? inputs.R : 1;
  const cdi = 1 - Math.exp(-(Sr / Rsafe));

  const divergenceClass =
    cdi >= 0.8 ? "HIGH" :
    cdi >= 0.45 ? "MODERATE" :
    "LOW";

  return {
    module: "CDI",
    title: "Constitutional Divergence Index",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      Sr: "S_r = w1*s1 + w2*s2 + w3*s3 + w4*s4 + w5*s5",
      CDI: "CDI = 1 - e^(-S_r / R)"
    },
    inputs: {
      s1: round(inputs.s1, 6),
      s2: round(inputs.s2, 6),
      s3: round(inputs.s3, 6),
      s4: round(inputs.s4, 6),
      s5: round(inputs.s5, 6),
      w1: round(inputs.w1, 6),
      w2: round(inputs.w2, 6),
      w3: round(inputs.w3, 6),
      w4: round(inputs.w4, 6),
      w5: round(inputs.w5, 6),
      R: round(Rsafe, 6)
    },
    scores: {
      divergence_score: round(cdi, 6),
      constitutional_divergence_index: round(cdi, 6),
      overall_risk_class: divergenceClass,
      weighted_signal: round(Sr, 6)
    },
    aggregate: {
      S_r: round(Sr, 6),
      normalization_constant: round(Rsafe, 6),
      average_divergence_index: round(cdi, 6)
    },
    metrics: {
      stops_per_1000: round(inputs.s1, 6),
      charge_mix_ratio: round(inputs.s2, 6),
      average_time_to_counsel: round(inputs.s3, 6),
      dismissal_rate: round(inputs.s4, 6),
      pretext_ratio: round(inputs.s5, 6)
    },
    narrative:
      divergenceClass === "HIGH"
        ? "High constitutional divergence detected. Jurisdiction has materially departed from baseline integrity."
        : divergenceClass === "MODERATE"
        ? "Moderate constitutional divergence detected. Several indicators show measurable deviation from baseline."
        : "Low constitutional divergence detected. Current divergence remains bounded."
  };
}
