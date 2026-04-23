// cibs/runner.js
// CIBS -> Constitutional Integrity Baseline Schema
// Canonical formulas:
//   B_i = R_T * p_i
//   Σ_i B_i = R_T
//   Optional quarterly schedule:
//   B_i,q = B_i * f_q

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

function getPrior(ctx, name) {
  return ctx?.priorCore?.[name]?.artifact || null;
}

function normalizeCategories(scenario = {}, model = {}) {
  const raw =
    scenario.categories ||
    model.categories ||
    [
      { key: "mobility", p_i: 0.25 },
      { key: "workforce", p_i: 0.25 },
      { key: "housing", p_i: 0.25 },
      { key: "community", p_i: 0.25 }
    ];

  const withShares = raw.map((c, idx) => ({
    key: c.key || `category_${idx + 1}`,
    label: c.label || c.key || `Category ${idx + 1}`,
    p_i: firstNum(c.p_i, c.share, c.percent, 0)
  }));

  const total = withShares.reduce((s, c) => s + c.p_i, 0);

  if (total <= 0) {
    const even = 1 / withShares.length;
    return withShares.map(c => ({ ...c, p_i: even }));
  }

  return withShares.map(c => ({ ...c, p_i: c.p_i / total }));
}

function normalizeQuarterFactors(scenario = {}, model = {}) {
  const fq =
    scenario.f_q ||
    scenario.quarter_factors ||
    model.quarter_factors ||
    [0.25, 0.25, 0.25, 0.25];

  const arr = Array.isArray(fq) && fq.length ? fq.slice(0, 4) : [0.25, 0.25, 0.25, 0.25];
  const total = arr.reduce((s, v) => s + num(v, 0), 0);
  if (total <= 0) return [0.25, 0.25, 0.25, 0.25];
  return arr.map(v => num(v, 0) / total);
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const ciri = getPrior(ctx, "CIRI");

  const RT = firstNum(
    scenario.R_T,
    scenario.total_recovery,
    ciri?.aggregate?.RT,
    0
  ) || 0;

  const categories = normalizeCategories(scenario, model);
  const quarterFactors = normalizeQuarterFactors(scenario, model);

  const allocations = categories.map(cat => {
    const B_i = RT * cat.p_i;
    const quarterly = quarterFactors.map((f_q, idx) => ({
      quarter: idx + 1,
      f_q: round(f_q, 6),
      B_i_q: round(B_i * f_q, 6)
    }));

    return {
      key: cat.key,
      label: cat.label,
      p_i: round(cat.p_i, 6),
      B_i: round(B_i, 6),
      quarterly
    };
  });

  const totalAllocated = allocations.reduce((s, a) => s + a.B_i, 0);

  return {
    module: "CIBS",
    title: "Constitutional Integrity Baseline Schema",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      allocation: "B_i = R_T * p_i",
      conservation: "Σ_i B_i = R_T",
      quarterly: "B_i,q = B_i * f_q"
    },
    scores: {
      total_recovery_budget: round(RT, 6),
      allocation_conservation_error: round(Math.abs(RT - totalAllocated), 6),
      allocation_integrity:
        Math.abs(RT - totalAllocated) < 0.0001 ? 1 : 0
    },
    aggregate: {
      RT: round(RT, 6),
      total_budget_allocated: round(totalAllocated, 6),
      category_count: allocations.length
    },
    categories: allocations,
    quarter_factors: quarterFactors.map(v => round(v, 6)),
    narrative:
      "Recovery budget allocated across baseline categories according to normalized shares. Quarterly schedule generated."
  };
}
