// cii/runner.js
// CII -> Constitutional Integrity Index
// Canonical formula:
//   CII = Σ_{p=1..n} ((B_p / R_T) * η_p * w_p)

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

function getExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

function normalizeProgressWeight(status, explicitWeight) {
  const direct = firstNum(explicitWeight, null);
  if (direct != null) return direct;

  const s = String(status || "").toLowerCase();
  if (s === "scoping") return 0.2;
  if (s === "design") return 0.4;
  if (s === "active") return 0.8;
  if (s === "complete") return 1.0;
  return 0.2;
}

function normalizeProjects(scenario = {}, model = {}, cibs = null) {
  const rawProjects =
    scenario.projects ||
    model.projects ||
    [];

  if (rawProjects.length) return rawProjects;

  const categories = cibs?.categories || [];
  return categories.map((cat, idx) => ({
    key: cat.key || `project_${idx + 1}`,
    label: cat.label || cat.key || `Project ${idx + 1}`,
    B_p: cat.B_i || 0,
    eta_p: 0.5,
    status: "design"
  }));
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const cibs = getPrior(ctx, "CIBS");
  const affe = getExpansion(ctx, "AFFE");

  const RT = firstNum(
    scenario.R_T,
    scenario.total_recovery,
    cibs?.aggregate?.RT,
    cibs?.aggregate?.total_budget_allocated,
    0
  ) || 0;

  const effectivenessHint = firstNum(
    affe?.scores?.effectiveness,
    affe?.aggregate?.effectiveness,
    null
  );

  const projects = normalizeProjects(scenario, model, cibs).map((p, idx) => {
    const B_p = firstNum(
      p.B_p,
      p.budget,
      p.allocation,
      cibs?.categories?.[idx]?.B_i,
      0
    ) || 0;

    let eta_p = firstNum(
      p.eta_p,
      p.effectiveness,
      0.5
    );

    if (effectivenessHint != null) {
      eta_p = (eta_p + effectivenessHint) / 2;
    }

    const w_p = normalizeProgressWeight(p.status, p.w_p);
    const contribution = RT > 0 ? ((B_p / RT) * eta_p * w_p) : 0;

    return {
      key: p.key || `project_${idx + 1}`,
      label: p.label || p.key || `Project ${idx + 1}`,
      B_p: round(B_p, 6),
      eta_p: round(eta_p, 6),
      w_p: round(w_p, 6),
      contribution: round(contribution, 6),
      status: p.status || "scoping"
    };
  });

  const cii = projects.reduce((s, p) => s + p.contribution, 0);

  return {
    module: "CII",
    title: "Constitutional Integrity Index",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      CII: "CII = Σ((B_p / R_T) * η_p * w_p)"
    },
    scores: {
      constitutional_integrity_index: round(cii, 6),
      cii: round(cii, 6),
      overall_risk_class:
        cii >= 0.8 ? "HIGH_PROGRESS" :
        cii >= 0.45 ? "MODERATE_PROGRESS" :
        "EARLY_PROGRESS"
    },
    aggregate: {
      RT: round(RT, 6),
      project_count: projects.length,
      weighted_progress_sum: round(cii, 6)
    },
    projects,
    narrative:
      cii >= 0.8
        ? "Strong propagation achieved. Allocated recovery is translating into high-integrity project progress."
        : cii >= 0.45
        ? "Moderate propagation achieved. Several projects are advancing, but total integrity conversion is still partial."
        : "Early propagation stage. Allocations exist, but project effectiveness and completion remain limited."
  };
}
