// cff/runner.js
// CFF -> Constitutional Funding Forensics
// Measures funding alignment, flagged use, and average fidelity across monitored streams.

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

  const wAppro = num(weights.appropriation_fidelity, 0.34);
  const wUse = num(weights.use_fidelity, 0.33);
  const wTrace = num(weights.traceability_fidelity, 0.33);

  const streams = Array.isArray(model.funding_streams) ? model.funding_streams : [];

  const scored = streams.map(stream => {
    const authorized = num(stream.authorized_use_usd, 0);
    const actual = num(stream.actual_use_usd, 0);

    const appropriation = num(stream.appropriation_fidelity, 0);
    const use = num(stream.use_fidelity, 0);
    const trace = num(stream.traceability_fidelity, 0);

    const fidelity =
      (appropriation * wAppro) +
      (use * wUse) +
      (trace * wTrace);

    const flagged = Math.max(0, actual - authorized);
    const alignment =
      authorized > 0
        ? Math.max(0, 1 - (flagged / authorized))
        : 0;

    return {
      stream_id: stream.stream_id || "",
      program_name: stream.program_name || "",
      authorized_use_usd: round(authorized, 2),
      actual_use_usd: round(actual, 2),
      flagged_use_usd: round(flagged, 2),
      funding_alignment: round(alignment, 6),
      appropriation_fidelity: round(appropriation, 6),
      use_fidelity: round(use, 6),
      traceability_fidelity: round(trace, 6),
      fidelity_score: round(fidelity, 6),
      notes: stream.notes || ""
    };
  });

  const avgFidelity =
    scored.length
      ? scored.reduce((s, x) => s + num(x.fidelity_score, 0), 0) / scored.length
      : 0;

  const avgAlignment =
    scored.length
      ? scored.reduce((s, x) => s + num(x.funding_alignment, 0), 0) / scored.length
      : 0;

  const totalAuthorized = scored.reduce((s, x) => s + num(x.authorized_use_usd, 0), 0);
  const totalActual = scored.reduce((s, x) => s + num(x.actual_use_usd, 0), 0);
  const totalFlagged = scored.reduce((s, x) => s + num(x.flagged_use_usd, 0), 0);

  const good = num(thresholds.good, 0.85);
  const warning = num(thresholds.warning, 0.65);

  const flaggedStreams = scored.filter(x => num(x.flagged_use_usd, 0) > 0);

  return {
    module: "CFF",
    title: "Cash Flow Forensics",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    weights: {
      appropriation_fidelity: round(wAppro, 6),
      use_fidelity: round(wUse, 6),
      traceability_fidelity: round(wTrace, 6)
    },
    thresholds: {
      good: round(good, 6),
      warning: round(warning, 6)
    },
    scores: {
      funding_alignment: round(avgAlignment, 6),
      fidelity_score: round(avgFidelity, 6),
      overall_risk_class: classify(avgFidelity, good, warning),
      total_flagged_funds: round(totalFlagged, 2)
    },
    aggregate: {
      funding_alignment: round(avgAlignment, 6),
      average_fidelity_score: round(avgFidelity, 6),
      total_authorized_use_usd: round(totalAuthorized, 2),
      total_actual_use_usd: round(totalActual, 2),
      total_flagged_funds: round(totalFlagged, 2),
      stream_count: scored.length,
      flagged_stream_count: flaggedStreams.length
    },
    funding_streams: scored,
    flagged_streams: flaggedStreams,
    narrative:
      scored.length
        ? "CFF measured funding alignment and flagged funding variance across the configured streams."
        : "CFF found no funding streams to evaluate."
  };
}
