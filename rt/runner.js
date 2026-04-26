// rt/runner.js
// RT -> Rebuild Together Engine
// Converts CIBS allocations, CII propagation, and MACRO projections
// into structured capital activation sectors.

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6) {
  return Number(num(v).toFixed(d));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeShares(sectors) {
  const total = sectors.reduce((s, x) => s + num(x.allocation_share, 0), 0);

  if (total <= 0) {
    const even = sectors.length ? 1 / sectors.length : 0;
    return sectors.map(s => ({ ...s, allocation_share: even }));
  }

  return sectors.map(s => ({
    ...s,
    allocation_share: num(s.allocation_share, 0) / total
  }));
}

function normalizeQuarterFactors(factors) {
  const arr = Array.isArray(factors) && factors.length
    ? factors.slice(0, 4)
    : [0.25, 0.25, 0.25, 0.25];

  while (arr.length < 4) arr.push(0);

  const total = arr.reduce((s, v) => s + num(v, 0), 0);
  if (total <= 0) return [0.25, 0.25, 0.25, 0.25];

  return arr.map(v => num(v, 0) / total);
}

function getPrior(ctx, name) {
  return ctx?.priorCore?.[name]?.artifact || null;
}

function getExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

function getRecoveryBase(ctx = {}, scenario = {}) {
  const cibs = getPrior(ctx, "CIBS") || getExpansion(ctx, "CIBS");
  const integration = getExpansion(ctx, "INTEGRATION") || getPrior(ctx, "ABE");
  const macro = getExpansion(ctx, "MACRO");

  return (
    num(scenario.recovery_total_usd, 0) ||
    num(cibs?.aggregate?.total_budget_allocated, 0) ||
    num(cibs?.aggregate?.RT, 0) ||
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd, 0) ||
    num(macro?.aggregate?.recovery_total_usd, 0) ||
    0
  );
}

function getCiiEffectiveness(ctx = {}) {
  const cii = getPrior(ctx, "CII") || getExpansion(ctx, "CII");

  return clamp(
    num(
      cii?.scores?.constitutional_integrity_index,
      cii?.scores?.cii,
      cii?.aggregate?.weighted_progress_sum,
      0.5
    ),
    0,
    1
  );
}

function getMacroMultiplierHint(ctx = {}) {
  const macro = getExpansion(ctx, "MACRO");
  const recovery = num(macro?.aggregate?.recovery_total_usd, 0);
  const gain = num(macro?.aggregate?.total_gain_usd, 0);

  if (recovery > 0 && gain > 0) {
    return gain / recovery;
  }

  return 1;
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const defaults = model.defaults || {};
  const formulas = model.formula || {};

  const sectors = normalizeShares(
    Array.isArray(model.capital_activation_sectors)
      ? model.capital_activation_sectors
      : []
  );

  const quarterFactors = normalizeQuarterFactors(
    scenario.quarter_factors || defaults.quarter_factors
  );

  const recoveryBase = getRecoveryBase(ctx, scenario);
  const ciiEffectiveness = getCiiEffectiveness(ctx);
  const macroMultiplierHint = getMacroMultiplierHint(ctx);
  const normalizationConstant = num(defaults.normalization_constant, 1000000000);

  const sectorOutputs = sectors.map((sector) => {
    const a_i = num(sector.allocation_share, 0);
    const B_i = recoveryBase * a_i;

    const eta_i = clamp(
      (num(sector.effectiveness, 0.5) + ciiEffectiveness) / 2,
      0,
      1
    );

    const m_i = num(sector.activation_multiplier, 1) * macroMultiplierHint;
    const w_i = clamp(num(sector.progress_weight, 0.5), 0, 1);

    const D_i = B_i;
    const A_i = D_i * m_i * eta_i;

    const quarterly = quarterFactors.map((f_q, idx) => ({
      quarter: idx + 1,
      f_q: round(f_q, 6),
      deployment_usd: round(D_i * f_q, 2),
      activation_usd: round(A_i * f_q, 2)
    }));

    return {
      key: sector.key,
      name: sector.name,
      description: sector.description,
      allocation_share: round(a_i, 6),
      B_i: round(B_i, 2),
      a_i: round(a_i, 6),
      D_i: round(D_i, 2),
      m_i: round(m_i, 6),
      eta_i: round(eta_i, 6),
      w_i: round(w_i, 6),
      A_i: round(A_i, 2),
      quarterly
    };
  });

  const D_total = sectorOutputs.reduce((s, x) => s + num(x.D_i, 0), 0);
  const A_total = sectorOutputs.reduce((s, x) => s + num(x.A_i, 0), 0);

  const RTI = D_total > 0
    ? sectorOutputs.reduce((s, x) => {
        return s + ((num(x.D_i, 0) / D_total) * num(x.eta_i, 0) * num(x.w_i, 0));
      }, 0)
    : 0;

  const activationIndex = 1 - Math.exp(-(A_total / Math.max(1, normalizationConstant)));

  return {
    module: "RT",
    title: "Rebuild Together Engine",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      deployment: formulas.deployment || "D_i = B_i * a_i",
      activation: formulas.activation || "A_i = D_i * m_i * eta_i",
      total_activation: formulas.total_activation || "A_total = sum(A_i)",
      execution_index: formulas.execution_index || "RTI = sum((D_i / D_total) * eta_i * w_i)"
    },
    inputs: {
      recovery_base_usd: round(recoveryBase, 2),
      cii_effectiveness_hint: round(ciiEffectiveness, 6),
      macro_multiplier_hint: round(macroMultiplierHint, 6),
      normalization_constant: round(normalizationConstant, 2),
      quarter_factors: quarterFactors.map(v => round(v, 6))
    },
    scores: {
      rebuild_together_index: round(RTI, 6),
      activation_index: round(activationIndex, 6),
      total_activation_usd: round(A_total, 2),
      total_deployment_usd: round(D_total, 2),
      overall_status:
        RTI >= 0.8 ? "HIGH_EXECUTION_READINESS" :
        RTI >= 0.45 ? "MODERATE_EXECUTION_READINESS" :
        "EARLY_EXECUTION_STAGE"
    },
    aggregate: {
      D_total: round(D_total, 2),
      A_total: round(A_total, 2),
      sector_count: sectorOutputs.length,
      allocation_conservation_error: round(Math.abs(D_total - recoveryBase), 2)
    },
    capital_activation_sectors: sectorOutputs,
    trace: {
      cibs_seen: !!(getPrior(ctx, "CIBS") || getExpansion(ctx, "CIBS")),
      cii_seen: !!(getPrior(ctx, "CII") || getExpansion(ctx, "CII")),
      integration_seen: !!(getExpansion(ctx, "INTEGRATION") || getPrior(ctx, "ABE")),
      macro_seen: !!getExpansion(ctx, "MACRO")
    },
    narrative:
      recoveryBase > 0
        ? "RT converted recovery capital into structured deployment sectors and measurable economic activation."
        : "RT found no recovery base. Deployment remains dormant until upstream recovery outputs are available."
  };
    }
