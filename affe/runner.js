// affe/runner.js
// AFFE -> After-Effects and Forward Fidelity Engine
// Downstream stabilization and forward-integrity module.

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

function classify(score, good, warning) {
  if (score >= good) return "HIGH_STABILITY";
  if (score >= warning) return "MODERATE_STABILITY";
  return "LOW_STABILITY";
}

function readExpansion(ctx, name) {
  return ctx?.expansions?.[name] || null;
}

function readCore(ctx, name) {
  return ctx?.priorCore?.[name]?.artifact || null;
}

export async function run(_scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const weights = model.weights || {};
  const thresholds = model.thresholds || {};
  const defaults = model.defaults || {};

  const cii = readCore(ctx, "CII");
  const integration = readExpansion(ctx, "INTEGRATION") || readCore(ctx, "ABE");
  const macro = readExpansion(ctx, "MACRO");

  const recoveryDurability =
    clamp(
      num(
        cii?.scores?.constitutional_integrity_index,
        cii?.scores?.cii,
        defaults.recovery_durability,
        0.5
      ),
      0,
      1
    );

  const systemStability =
    clamp(
      num(
        macro?.scores?.macro_cascade_index,
        defaults.system_stability,
        0.5
      ),
      0,
      1
    );

  const forwardIntegrity =
    clamp(
      num(
        integration?.signature_formula?.value != null
          ? Math.min(1, integration.signature_formula.value > 0 ? integration.signature_formula.value / 1000000 : 0)
          : null,
        defaults.forward_integrity,
        0.5
      ),
      0,
      1
    );

  const wRecovery = num(weights.recovery_durability, 0.34);
  const wStability = num(weights.system_stability, 0.33);
  const wForward = num(weights.forward_integrity, 0.33);

  const effectiveness =
    (recoveryDurability * wRecovery) +
    (systemStability * wStability) +
    (forwardIntegrity * wForward);

  const good = num(thresholds.good, 0.85);
  const warning = num(thresholds.warning, 0.65);

  return {
    module: "AFFE",
    title: "After-Effects and Forward Fidelity Engine",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    weights: {
      recovery_durability: round(wRecovery, 6),
      system_stability: round(wStability, 6),
      forward_integrity: round(wForward, 6)
    },
    scores: {
      effectiveness: round(effectiveness, 6),
      recovery_durability: round(recoveryDurability, 6),
      system_stability: round(systemStability, 6),
      forward_integrity: round(forwardIntegrity, 6),
      overall_risk_class: classify(effectiveness, good, warning)
    },
    aggregate: {
      effectiveness: round(effectiveness, 6),
      threshold_good: round(good, 6),
      threshold_warning: round(warning, 6)
    },
    trace: {
      cii_seen: !!cii,
      integration_seen: !!integration,
      macro_seen: !!macro
    },
    narrative:
      effectiveness >= good
        ? "AFFE indicates strong post-realignment durability and forward stability."
        : effectiveness >= warning
        ? "AFFE indicates moderate stabilization. Forward integrity is improving but not yet locked."
        : "AFFE indicates weak stabilization. Recovery exists, but long-run durability remains fragile."
  };
}
