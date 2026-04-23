// cae/runner.js
// CAE -> Constitutional Alignment Engine
// Validates and aggregates clause-level constitutional alignment.

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6) {
  return Number(num(v).toFixed(d));
}

function flattenClauses(model = {}) {
  const articles = Array.isArray(model.articles) ? model.articles : [];
  const rows = [];

  for (const article of articles) {
    const title = article?.title || "Untitled Article";
    const clauses = Array.isArray(article?.clauses) ? article.clauses : [];
    for (const clause of clauses) {
      rows.push({
        article_title: title,
        clause_id: clause?.clause_id || "",
        reference: clause?.reference || "",
        title: clause?.title || "",
        constitutional_anchor: clause?.constitutional_anchor || "",
        intent: clause?.intent || "",
        alignment_score: num(clause?.alignment_score, 0),
        confidence: num(clause?.confidence, 0),
        source_hash: clause?.source_hash || "",
        statutes: clause?.statutes || [],
        regulations: clause?.regulations || [],
        scope_notes: clause?.scope_notes || [],
        tags: clause?.tags || [],
        evidence_links: clause?.evidence_links || []
      });
    }
  }

  return rows;
}

export async function run(_scenario = {}, ctx = {}) {
  const model = ctx.model || {};
  const weights = model.weights || {};
  const clauses = flattenClauses(model);

  const alignmentThreshold = num(model?.summary?.alignment_threshold, 0.8);
  const divergenceThreshold = num(model?.summary?.divergence_threshold, 0.8);

  const avgAlignment =
    clauses.length
      ? clauses.reduce((s, c) => s + num(c.alignment_score, 0), 0) / clauses.length
      : 0;

  const avgConfidence =
    clauses.length
      ? clauses.reduce((s, c) => s + num(c.confidence, 0), 0) / clauses.length
      : 0;

  const flagged = clauses.filter(c => num(c.alignment_score, 0) < divergenceThreshold);

  const artifact = {
    module: "CAE",
    title: "Constitutional Alignment Engine",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    weights: {
      clarity_of_scope: round(weights.clarity_of_scope, 6),
      constitutional_nexus: round(weights.constitutional_nexus, 6),
      operational_fidelity: round(weights.operational_fidelity, 6)
    },
    summary: {
      average_alignment: round(avgAlignment, 6),
      average_confidence: round(avgConfidence, 6),
      alignment_threshold: round(alignmentThreshold, 6),
      divergence_threshold: round(divergenceThreshold, 6),
      clause_count: clauses.length,
      flagged_clause_count: flagged.length
    },
    scores: {
      constitutional_alignment: round(avgAlignment, 6),
      alignment_score: round(avgAlignment, 6),
      confidence_score: round(avgConfidence, 6),
      overall_risk_class:
        avgAlignment < 0.5 ? "HIGH_DIVERGENCE" :
        avgAlignment < 0.8 ? "MODERATE_DIVERGENCE" :
        "LOW_DIVERGENCE"
    },
    clauses,
    flagged_clauses: flagged,
    narrative:
      clauses.length
        ? "CAE validated the current constitutional alignment model and produced aggregate clause-level alignment scores."
        : "CAE found no clauses to evaluate."
  };

  return artifact;
                                 }
