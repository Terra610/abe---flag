// integration/explain_runner.js
// Local-only Output Explainer (deterministic).
// Converts scenario + receipt + key derived outputs into plain English.
// No legal advice. No people scoring. No external calls.

function upper(s) { return String(s || "").toUpperCase(); }

function safeKeys(obj) {
  try { return Object.keys(obj || {}); } catch { return []; }
}

function getPath(obj, path) {
  try {
    return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function summarizeStatus(module_status) {
  const entries = Object.entries(module_status || {});
  const ran = entries.filter(([, v]) => upper(v?.status) !== "PENDING");
  const ok = ran.filter(([, v]) => upper(v?.status) === "OK");
  const warn = ran.filter(([, v]) => upper(v?.status) === "WARN");
  const fail = ran.filter(([, v]) => upper(v?.status) === "FAIL");
  const skip = ran.filter(([, v]) => upper(v?.status) === "SKIP");

  const overall = fail.length ? "FAIL" : warn.length ? "WARN" : ok.length ? "OK" : "UNKNOWN";
  return { overall, ran, ok, warn, fail, skip };
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  try {
    return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  } catch {
    return String(Math.round(x));
  }
}

function buildModuleHighlights(scenario) {
  const highlights = [];

  // CDA / divergence
  const divergence = scenario?.derived?.divergence;
  if (divergence) {
    highlights.push({
      module: "CDA",
      what_it_did: "Created a structured divergence artifact (system drift vs lawful scope).",
      what_to_check: "Open CDA page for the specific flags and scope tags."
    });
  }

  // CFF
  const cff = scenario?.derived?.cff;
  if (cff) {
    const on = getPath(cff, "totals.ON_MISSION") ?? getPath(cff, "summary.on_mission_total");
    const off = getPath(cff, "totals.OFF_MISSION") ?? getPath(cff, "summary.off_mission_total");
    highlights.push({
      module: "CFF",
      what_it_did: "Classified funding line items as ON_MISSION / OFF_MISSION / UNCLEAR (where inputs exist).",
      key_numbers: {
        ON_MISSION: money(on) || on || null,
        OFF_MISSION: money(off) || off || null
      }
    });
  }

  // AFFE
  if (scenario?.derived?.affe) {
    highlights.push({
      module: "AFFE",
      what_it_did: "Built explorer-ready highlights from CFF (and optional CIRI prefills).",
      what_to_check: "Open AFFE page to browse patterns."
    });
  }

  // CCRI
  const ccri = scenario?.derived?.ccri;
  if (ccri) {
    highlights.push({
      module: "CCRI",
      what_it_did: "Generated system-level credit integrity signals (not scoring people).",
      note: "If CCRI outputs overrides/prefills, CIRI can use them."
    });
  }

  // CIRI
  const ciri = scenario?.derived?.ciri;
  if (ciri) {
    const total = getPath(ciri, "total_recovery") ?? getPath(ciri, "kpis.total_recovery") ?? getPath(ciri, "outputs.total_recovery");
    highlights.push({
      module: "CIRI",
      what_it_did: "Calculated recoverable value from lawful realignment (deterministic math).",
      key_numbers: { total_recovery: money(total) || total || null }
    });
  }

  // CIBS
  if (scenario?.derived?.cibs) {
    highlights.push({
      module: "CIBS",
      what_it_did: "Allocated the recovery pool into transparent budget categories.",
      what_to_check: "Open CIBS page to see allocations."
    });
  }

  // CII
  if (scenario?.derived?.cii) {
    highlights.push({
      module: "CII",
      what_it_did: "Produced an auditable project portfolio tied to the CIBS budget.",
      what_to_check: "Open CII page to see projects and coverage."
    });
  }

  // Macro
  if (scenario?.derived?.macro) {
    highlights.push({
      module: "Macro",
      what_it_did: "Projected top-down impacts (jobs/wages/GDP) using local parameters.",
      what_to_check: "Open Macro page to view the cascade outputs."
    });
  }

  return highlights;
}

export function buildExplain(scenario) {
  const receipt = scenario?.receipts?.audit_certificate || null;
  const status = receipt?.module_status || scenario?.module_status || {};
  const hashes = receipt?.hashes || scenario?.hashes || {};

  const { overall, ok, warn, fail, skip, ran } = summarizeStatus(status);

  const engineId = receipt?.engine?.engine_id || scenario?.engine?.engine_id || "ABE_FLAG";
  const engineVersion = receipt?.engine?.engine_version || scenario?.engine?.engine_version || "1.0";

  const inputsPresent = receipt?.inputs_present || safeKeys(scenario?.inputs);
  const derivedPresent = receipt?.derived_present || safeKeys(scenario?.derived);

  const highlights = buildModuleHighlights(scenario);

  const plain_language = {
    headline: `ABE Engine Run: ${overall}`,
    what_this_is: [
      "You just ran A.B.E. locally in your browser.",
      "No servers were contacted. No accounts. No tracking.",
      "Outputs are hashed so changes can be detected."
    ],
    what_happened: [
      `Engine: ${engineId} v${engineVersion}`,
      `Modules completed: ${ok.length}/${ran.length || Object.keys(status).length}`,
      warn.length ? `Warnings: ${warn.length} (non-fatal)` : "Warnings: 0",
      fail.length ? `Failures: ${fail.length} (required failures may stop the engine)` : "Failures: 0",
      skip.length ? `Skipped: ${skip.length} (optional modules missing inputs)` : "Skipped: 0"
    ],
    module_highlights: highlights.length ? highlights : [
      { note: "No derived outputs detected yet. Run with Intake uploads or module inputs to produce results." }
    ],
    what_to_download: [
      "audit_certificate.json = module run receipt + hashes",
      "scenario.json = full local state (inputs + derived + hashes)"
    ],
    how_hashes_help_you: [
      "A hash is a fingerprint of an output.",
      "If any output changes, its hash changes.",
      "Re-run on the same inputs to verify reproducibility."
    ],
    hashes: {
      audit_certificate: hashes?.["receipts.audit_certificate"] || null
    },
    current_keys: {
      inputs_present: inputsPresent,
      derived_present: derivedPresent
    },
    next_steps: [
      "If you want more outputs: use Intake to upload docs or paste text, then run Integration again.",
      "If a module shows SKIP: feed it the inputs it expects (it’s optional).",
      "If a module shows FAIL: fix that runner or its required inputs, then re-run."
    ],
    guardrails: [
      "Issue-spotting only (not legal advice).",
      "Systems are evaluated — people are not scored.",
      "Privacy and integrity are non-negotiable."
    ]
  };

  return {
    generated_at: new Date().toISOString(),
    engine: { engine_id: engineId, engine_version: engineVersion },
    plain_language,
    technical: {
      overall_status: overall,
      module_status: status,
      hashes,
      inputs_present: inputsPresent,
      derived_present: derivedPresent
    }
  };
}
