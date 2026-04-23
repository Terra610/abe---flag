// macro/runner.js
// Macro -> ABE Macro Cascade Model
// Consumes settled recovery totals and propagates them into sector gains, jobs supported, and a bounded macro index.

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 4) {
  return Number(num(v).toFixed(d));
}

function safeShareNormalize(sectors) {
  const total = (sectors || []).reduce((s, x) => s + num(x.share, 0), 0);
  if (total <= 0) {
    const even = sectors.length ? 1 / sectors.length : 0;
    return sectors.map(s => ({ ...s, share: even }));
  }
  return sectors.map(s => ({ ...s, share: num(s.share, 0) / total }));
}

function getIntegration(ctx) {
  return ctx?.integration || ctx?.priorCore?.ABE?.artifact || null;
}

export async function run(scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const integration = getIntegration(ctx);

  const recoveryTotal =
    num(scenario.recovery_total_usd, 0) ||
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd, 0) ||
    num(model.defaults?.recovery_total_usd, 0);

  const rawSectors = Array.isArray(model.sectors) ? model.sectors : [];
  const sectors = safeShareNormalize(rawSectors);

  const sectorOutputs = sectors.map(sector => {
    const allocated = recoveryTotal * num(sector.share, 0);
    const gain = allocated * num(sector.multiplier, 1);
    const jobsSupported =
      num(sector.jobs_per_dollar, 0) > 0 ? gain / num(sector.jobs_per_dollar, 1) : 0;

    return {
      key: sector.key,
      label: sector.label,
      share: round(sector.share, 6),
      allocated_usd: round(allocated, 2),
      multiplier: round(sector.multiplier, 6),
      gain_usd: round(gain, 2),
      jobs_per_dollar: round(sector.jobs_per_dollar, 6),
      jobs_supported: round(jobsSupported, 2)
    };
  });

  const totalGain = sectorOutputs.reduce((s, x) => s + num(x.gain_usd, 0), 0);
  const totalJobs = sectorOutputs.reduce((s, x) => s + num(x.jobs_supported, 0), 0);
  const K = num(model.normalization_constant, 1000000000);
  const macroIndex = 1 - Math.exp(-(totalGain / (K > 0 ? K : 1)));

  return {
    module: "MACRO",
    title: "ABE Macro Cascade Model",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    formulas: {
      sector_gain: "G_s = B_s * m_s",
      total_gain: "G_total = Σ G_s",
      jobs_supported: "J_s = G_s / j_s",
      macro_index: "M = 1 - e^(-G_total / K_m)"
    },
    inputs: {
      recovery_total_usd: round(recoveryTotal, 2),
      normalization_constant: round(K, 2)
    },
    scores: {
      macro_cascade_index: round(macroIndex, 6),
      total_gain_usd: round(totalGain, 2),
      total_jobs_supported: round(totalJobs, 2)
    },
    aggregate: {
      recovery_total_usd: round(recoveryTotal, 2),
      total_gain_usd: round(totalGain, 2),
      total_jobs_supported: round(totalJobs, 2),
      sector_count: sectorOutputs.length
    },
    sectors: sectorOutputs,
    narrative:
      recoveryTotal > 0
        ? "Macro cascade generated from settled recovery totals. Sector gains and jobs supported reflect post-integration propagation."
        : "No recovery total was available. Macro cascade remains dormant until Integration/ABE writes a recovery output."
  };
}
