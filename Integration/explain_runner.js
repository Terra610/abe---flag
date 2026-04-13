// integration/explain_runner.js
// ABE Output Explainer — Local-only, deterministic, no APIs.
// Purpose: "What it means for me" (impact + next steps) without changing engine outputs.
// Writes: receipts.explain  (or caller stores it)
// NOTE: Not legal advice. Not financial advice. System-level interpretation only.

function up(s) {
  return String(s || "").toUpperCase();
}

function money(n) {
  const v = Number(n);
  if (!isFinite(v)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
}

function pct(n) {
  const v = Number(n);
  if (!isFinite(v)) return null;
  return `${Math.round(v * 100)}%`;
}

function get(obj, path) {
  try {
    return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function has(obj, path) {
  const v = get(obj, path);
  return v !== undefined && v !== null;
}

function safeKeys(obj) {
  try {
    return Object.keys(obj || {});
  } catch {
    return [];
  }
}

function statusCounts(module_status = {}) {
  const entries = Object.entries(module_status || {});
  const ran = entries.filter(([, v]) => up(v?.status) !== "PENDING");
  const ok = ran.filter(([, v]) => up(v?.status) === "OK");
  const warn = ran.filter(([, v]) => up(v?.status) === "WARN");
  const fail = ran.filter(([, v]) => up(v?.status) === "FAIL");
  const skip = ran.filter(([, v]) => up(v?.status) === "SKIP");
  return { entries, ran, ok, warn, fail, skip };
}

function overallStatus(module_status = {}) {
  const { ok, warn, fail } = statusCounts(module_status);
  if (fail.length) return "FAIL";
  if (warn.length) return "WARN";
  if (ok.length) return "OK";
  return "UNKNOWN";
}

// ---- Interpretive helpers (no “people scoring”, just system signals) ----

function summarizeDivergence(scenario) {
  const div = scenario?.derived?.divergence;
  if (!div) return null;

  // We don't assume a rigid schema; we look for common shapes.
  const score =
    get(div, "score") ??
    get(div, "divergence_score") ??
    get(div, "normalized_score") ??
    get(div, "summary.score") ??
    null;

  const flags =
    get(div, "flags") ??
    get(div, "signals") ??
    get(div, "findings") ??
    get(div, "summary.flags") ??
    null;

  const count = Array.isArray(flags) ? flags.length : (typeof flags === "object" && flags ? safeKeys(flags).length : null);

  const scoreText = score === null ? null : (typeof score === "number" ? pct(score) : String(score));
  return {
    exists: true,
    score: score,
    score_text: scoreText,
    flags_count: count
  };
}

function summarizeCIRI(scenario) {
  const ciri = scenario?.derived?.ciri;
  if (!ciri) return null;

  // Look for total recovery in multiple plausible places.
  const total =
    get(ciri, "total_recovery") ??
    get(ciri, "kpis.total_recovery") ??
    get(ciri, "outputs.total_recovery") ??
    get(ciri, "summary.total_recovery") ??
    get(ciri, "results.total_recovery") ??
    null;

  const roiPerCase =
    get(ciri, "roi_per_case") ??
    get(ciri, "kpis.roi_per_case") ??
    null;

  const ciriIndex =
    get(ciri, "ciri_index") ??
    get(ciri, "CIRI") ??
    get(ciri, "kpis.CIRI") ??
    null;

  return {
    exists: true,
    total_recovery: total,
    total_recovery_text: total !== null ? money(total) : null,
    roi_per_case: roiPerCase,
    roi_per_case_text: roiPerCase !== null ? money(roiPerCase) : null,
    ciri_index: ciriIndex
  };
}

function summarizeCIBS(scenario) {
  const cibs = scenario?.derived?.cibs;
  if (!cibs) return null;

  const allocations =
    get(cibs, "allocations") ??
    get(cibs, "derived.cibs.allocations") ??
    get(cibs, "budget") ??
    null;

  const count = Array.isArray(allocations) ? allocations.length : null;

  return { exists: true, allocations_count: count };
}

function summarizeCII(scenario) {
  const cii = scenario?.derived?.cii;
  if (!cii) return null;

  const portfolio =
    get(cii, "portfolio") ??
    get(cii, "projects") ??
    null;

  const count = Array.isArray(portfolio) ? portfolio.length : null;

  return { exists: true, projects_count: count };
}

function summarizeCFF(scenario) {
  const cff = scenario?.derived?.cff;
  if (!cff) return null;

  // Common bucket names
  const on = get(cff, "totals.ON_MISSION") ?? get(cff, "totals.on_mission") ?? null;
  const off = get(cff, "totals.OFF_MISSION") ?? get(cff, "totals.off_mission") ?? null;
  const unclear = get(cff, "totals.UNCLEAR") ?? get(cff, "totals.unclear") ?? null;

  return {
    exists: true,
    on_mission: on,
    off_mission: off,
    unclear: unclear,
    on_mission_text: on !== null ? money(on) : null,
    off_mission_text: off !== null ? money(off) : null,
    unclear_text: unclear !== null ? money(unclear) : null
  };
}

function summarizeCCRI(scenario) {
  const ccri = scenario?.derived?.ccri;
  if (!ccri) return null;

  const riskClass =
    get(ccri, "scores.overall_risk_class") ??
    get(ccri, "overall_risk_class") ??
    null;

  return { exists: true, overall_risk_class: riskClass ? String(riskClass) : null };
}

function confidenceLevel(scenario) {
  // Confidence is about presence of outputs, not “truth”.
  // Higher confidence when downstream modules exist.
  const hasDiv = !!scenario?.derived?.divergence;
  const hasCiri = !!scenario?.derived?.ciri;
  const hasCibs = !!scenario?.derived?.cibs;
  const hasCii = !!scenario?.derived?.cii;

  if (hasDiv && hasCiri && hasCibs && hasCii) return "HIGH (full economic + budget + portfolio chain present)";
  if (hasDiv && hasCiri) return "MEDIUM (divergence + economic recovery present; budget/portfolio may be missing)";
  if (hasDiv) return "LOW (divergence present; downstream recovery not present yet)";
  return "LOW (no divergence or recovery outputs present yet)";
}

function whatToDoNext(scenario) {
  const todos = [];

  // Intake
  todos.push("If you have documents (tickets, policies, funding tables, contracts), upload them in Integration and re-run. More inputs = better outputs.");

  // Divergence
  if (!scenario?.derived?.divergence) {
    todos.push("Divergence didn’t generate. Open CDA and create at least one scenario/finding, then re-run Integration.");
  } else {
    todos.push("Review Divergence output for the specific practice being flagged. Confirm the facts match your situation.");
  }

  // CIRI
  if (!scenario?.derived?.ciri) {
    todos.push("CIRI didn’t generate. Check that divergence exists and CIRI runner can read it, then re-run.");
  } else {
    todos.push("Review CIRI total recovery and the inputs used. If any assumptions are wrong, adjust inputs and re-run.");
  }

  // CIBS/CII
  if (scenario?.derived?.ciri && !scenario?.derived?.cibs) {
    todos.push("CIBS didn’t generate. Confirm CIRI output exists and includes total recovery, then re-run.");
  }
  if (scenario?.derived?.cibs && !scenario?.derived?.cii) {
    todos.push("CII didn’t generate. Confirm CIBS allocations exist or provide a portfolio template, then re-run.");
  }

  // CFF/AFFE
  if (scenario?.derived?.cff) {
    todos.push("If OFF_MISSION appears, pull the underlying line items that produced it and keep them with your audit receipt.");
  } else {
    todos.push("If you want funding misuse analysis, provide cff/inputs.csv and re-run.");
  }

  return todos;
}

function greenFlagsRedFlags(scenario) {
  const greens = [];
  const reds = [];

  const ms = scenario?.module_status || {};
  const overall = overallStatus(ms);

  if (overall === "OK") greens.push("Engine ran clean with no fatal failures.");
  if (overall === "WARN") reds.push("There were warnings. Outputs exist, but one or more modules had issues.");
  if (overall === "FAIL") reds.push("Engine hit a failure. Some downstream outputs may be missing or incomplete.");

  if (scenario?.hashes && Object.keys(scenario.hashes).length) greens.push("Hashes were generated. Outputs are tamper-evident across reruns.");

  if (scenario?.derived?.ciri) greens.push("CIRI produced an economic recovery estimate (recoverable cost of misalignment).");
  if (scenario?.derived?.cibs) greens.push("CIBS produced budget allocations (how recovery can be re-invested).");
  if (scenario?.derived?.cii) greens.push("CII produced a project portfolio (what those budgets could fund).");

  if (scenario?.derived?.cff) {
    greens.push("CFF produced ON/OFF/UNCLEAR classification signals.");
    const off = summarizeCFF(scenario)?.off_mission;
    if (off !== null && Number(off) > 0) reds.push("CFF indicates OFF_MISSION dollars exist (needs review of line items).");
  }

  if (!scenario?.derived?.divergence) reds.push("No divergence output found. That usually blocks ROI downstream.");

  return { green_flags: greens, red_flags: reds };
}

function whatToShare(scenario) {
  return {
    safe_to_share: [
      "audit_certificate.json (receipt + hashes + status)",
      "derived.plain_english (process explanation)",
      "receipts.explain (this human-facing explanation) — if it contains no personal data",
      "Screenshots of module status + hashes"
    ],
    do_not_share_publicly: [
      "Raw uploaded documents",
      "Anything containing personal identifiers, account numbers, addresses, minors’ data",
      "Full scenario.json unless you’ve reviewed it (it may include sensitive inputs)"
    ]
  };
}

// ---- Main builder ----

export function buildExplain(scenario) {
  const ms = scenario?.module_status || {};
  const overall = overallStatus(ms);

  const divergence = summarizeDivergence(scenario);
  const ciri = summarizeCIRI(scenario);
  const cibs = summarizeCIBS(scenario);
  const cii = summarizeCII(scenario);
  const cff = summarizeCFF(scenario);
  const ccri = summarizeCCRI(scenario);

  const flags = greenFlagsRedFlags(scenario);

  const quick = [];
  quick.push(`Overall engine status: ${overall}`);
  quick.push(`Confidence: ${confidenceLevel(scenario)}`);

  if (divergence?.exists) {
    quick.push(`Divergence present${divergence.score_text ? ` (score: ${divergence.score_text})` : ""}${divergence.flags_count !== null ? `, flags: ${divergence.flags_count}` : ""}.`);
  } else {
    quick.push("Divergence not present (downstream ROI may be limited).");
  }

  if (ciri?.exists) {
    quick.push(`Recoverable cost estimate (CIRI total recovery): ${ciri.total_recovery_text || "present (value not detected)"}.`);
  } else {
    quick.push("CIRI not present (no recovery estimate generated).");
  }

  if (cibs?.exists) quick.push("Budget allocation layer (CIBS) is present.");
  if (cii?.exists) quick.push("Project portfolio layer (CII) is present.");
  if (cff?.exists) quick.push("Funding forensics layer (CFF) is present.");
  if (ccri?.exists) quick.push(`Credit integrity layer (CCRI) is present${ccri.overall_risk_class ? ` (risk: ${ccri.overall_risk_class})` : ""}.`);

  const meaning = {
    in_60_seconds: quick,
    what_this_means_for_me: [
      "ABE is telling you what the system did (modules), what it produced (outputs), and how to prove it (hashes).",
      "If divergence exists, you have a structured statement of 'practice vs lawful scope' that can feed ROI math.",
      "If CIRI exists, you have a quantified estimate of recoverable cost — the 'discount' created by realignment.",
      "If CIBS/CII exist, you have an auditable path from recovery → budgets → projects (community ROI)."
    ],
    green_flags: flags.green_flags,
    red_flags: flags.red_flags,
    next_steps: whatToDoNext(scenario),
    sharing_guidance: whatToShare(scenario)
  };

  const moduleImpact = {
    divergence: divergence || { exists: false, note: "No divergence output detected." },
    ciri: ciri || { exists: false, note: "No CIRI output detected." },
    cibs: cibs || { exists: false, note: "No CIBS output detected." },
    cii: cii || { exists: false, note: "No CII output detected." },
    cff: cff || { exists: false, note: "No CFF output detected." },
    ccri: ccri || { exists: false, note: "No CCRI output detected." }
  };

  return {
    module: "EXPLAIN",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    disclaimer: [
      "Not legal advice. Not financial advice.",
      "ABE explains system outputs and integrity receipts.",
      "You control your inputs. You control your device. Local-only."
    ],
    plain_english: meaning,
    module_impact: moduleImpact
  };
}
