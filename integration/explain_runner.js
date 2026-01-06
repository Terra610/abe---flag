// integration/explain_runner.js
// Plain-language companion for humans.
// Local-only. No network. No legal advice. No people scoring.
// Reads scenario + receipts + module_status + hashes and outputs receipts.explain

function friendlyModuleName(key) {
  const map = {
    intake: "Intake (your local files / defaults)",
    system: "System Map (how the engine is wired)",
    cae: "CAE (scope/alignment issue-spotter)",
    divergence: "CDA Divergence (what’s off-mission / out-of-scope)",
    ccri: "CCRI (system-level credit integrity)",
    cff: "CFF (funding forensics: on/off mission)",
    affe: "AFFE (funding explorer bridge)",
    ciri: "CIRI (recoverable cost + savings math)",
    cibs: "CIBS (budget allocations)",
    cii: "CII (project portfolio)",
    macro: "Macro (optional scale-up model)"
  };
  return map[key] || key.toUpperCase();
}

function summarizeStatuses(module_status = {}) {
  const out = { ok: [], warn: [], fail: [], skip: [], pending: [], running: [] };

  for (const [k, v] of Object.entries(module_status)) {
    const s = (v?.status || "PENDING").toUpperCase();
    if (s === "OK") out.ok.push(k);
    else if (s === "WARN") out.warn.push(k);
    else if (s === "FAIL") out.fail.push(k);
    else if (s === "SKIP") out.skip.push(k);
    else if (s === "RUNNING") out.running.push(k);
    else out.pending.push(k);
  }
  return out;
}

function pickTopMeaningfulResults(scenario) {
  const ciri = scenario?.derived?.ciri || null;
  const cibs = scenario?.derived?.cibs || null;
  const cii = scenario?.derived?.cii || null;

  const totalRecovery =
    (ciri && (ciri.total_recovery ?? ciri?.outputs?.total_recovery ?? ciri?.kpis?.total_recovery)) ?? null;

  const ciriIndex =
    (ciri && (ciri.CIRI ?? ciri?.outputs?.CIRI ?? ciri?.kpis?.CIRI)) ?? null;

  const allocationsCount =
    (cibs && (Array.isArray(cibs.allocations) ? cibs.allocations.length : null)) ??
    (cibs && (Array.isArray(cibs?.outputs?.allocations) ? cibs.outputs.allocations.length : null)) ??
    null;

  const portfolioCount =
    (cii && (Array.isArray(cii.portfolio) ? cii.portfolio.length : null)) ??
    (cii && (Array.isArray(cii?.outputs?.portfolio) ? cii.outputs.portfolio.length : null)) ??
    null;

  return {
    total_recovery: totalRecovery,
    ciri_index: ciriIndex,
    allocations_count: allocationsCount,
    portfolio_count: portfolioCount
  };
}

export function buildExplain(scenario) {
  const receipt = scenario?.receipts?.audit_certificate || null;
  const module_status = scenario?.module_status || receipt?.module_status || {};
  const hashes = scenario?.hashes || receipt?.hashes || {};

  const statusBuckets = summarizeStatuses(module_status);
  const results = pickTopMeaningfulResults(scenario);

  const ranModules = (receipt?.module_status ? Object.keys(receipt.module_status) : Object.keys(module_status)) || [];
  const ranFriendly = ranModules.map((k) => ({
    key: k,
    name: friendlyModuleName(k),
    status: (module_status?.[k]?.status || "PENDING").toUpperCase(),
    notes: module_status?.[k]?.notes || ""
  }));

  const hashCount = hashes ? Object.keys(hashes).length : 0;

  const explain = {
    kind: "ABE_PLAIN_LANGUAGE_EXPLAINER",
    version: "1.0",
    generated_at: new Date().toISOString(),

    plain_language: {
      headline: "What this run proves (in plain English)",
      summary: [
        "ABE ran locally in your browser and produced a set of outputs.",
        "The audit hashes are digital fingerprints of those outputs.",
        "If anyone changes even one character later, the hash changes — that’s how tampering is caught.",
        "No servers, no accounts, no tracking: your device did the work and kept the data."
      ],

      what_happened: {
        modules: ranFriendly,
        status_summary: {
          ok: statusBuckets.ok.map(friendlyModuleName),
          warn: statusBuckets.warn.map(friendlyModuleName),
          fail: statusBuckets.fail.map(friendlyModuleName),
          skip: statusBuckets.skip.map(friendlyModuleName)
        }
      },

      what_the_hash_means: {
        plain_english: "A hash is a digital fingerprint of a file or output.",
        why_it_matters: [
          "Proves integrity: you can detect if outputs were modified after the run.",
          "Supports verification: anyone can recompute hashes locally and compare.",
          "Builds trust without surveillance or gatekeepers."
        ],
        what_it_is_not: [
          "Not tracking. Not a beacon. Not a report sent anywhere.",
          "Not a personal score. ABE hashes outputs, not people."
        ],
        quick_stats: {
          hash_entries_count: hashCount
        }
      },

      key_results: {
        note:
          "These are pulled from engine outputs if present. If a module is stubbed, the values may be placeholders.",
        total_recovery: results.total_recovery,
        ciri_index: results.ciri_index,
        allocations_count: results.allocations_count,
        portfolio_count: results.portfolio_count
      },

      what_to_do_next: [
        "Save audit_certificate.json and scenario.json together (they’re the evidence pair).",
        "If a module shows WARN/FAIL, read its notes — it will say exactly what was missing.",
        "When ready, upload real documents via Intake (still local-only) to produce non-placeholder outputs."
      ],

      non_negotiables_checklist: [
        "Local-only execution",
        "No API / no backend",
        "No logins",
        "No tracking",
        "SHA-256 receipts",
        "No people scoring"
      ],

      safety_note:
        "ABE is an issue-spotting and integrity engine. It does not replace a lawyer and does not provide legal advice."
    },

    links: {
      audit_certificate_path: "receipts.audit_certificate",
      explain_path: "receipts.explain"
    }
  };

  return explain;
        }
