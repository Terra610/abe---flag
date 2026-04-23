// cff/runner.js
// CFF -> Cash Flow Forensics
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
      stream_id
