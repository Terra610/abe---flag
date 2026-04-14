// integration/orchestrator.js
// Local-only orchestration helper for A.B.E.
// Fixes engine/core pathing so Integration resolves its own core files correctly.

import { scenarioGet, getOrCreateScenario } from "./engine/core/session.js";

async function loadEngineManifest() {
  const res = await fetch("./engine/core/engine.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not load engine manifest (HTTP ${res.status})`);
  }
  return res.json();
}

function safeReadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`Could not parse localStorage key ${key}:`, err);
    return null;
  }
}

function modulePresence() {
  return {
    intake: !!safeReadJson("abe_intake_artifact"),
    cda: !!safeReadJson("abe_cda_artifact") || !!safeReadJson("ABE_CDA_SCENARIO_V1"),
    cdi: !!safeReadJson("abe_cdi_artifact"),
    cff: !!safeReadJson("abe_cff_artifact"),
    affe: !!safeReadJson("abe_affe_artifact"),
    ciri: !!safeReadJson("abe_ciri_artifact") || !!safeReadJson("ABE_CIRI_SCENARIO_V2"),
    cibs: !!safeReadJson("abe_cibs_artifact") || !!safeReadJson("ABE_CIBS_BUDGET_V1"),
    cii: !!safeReadJson("abe_cii_artifact") || !!safeReadJson("ABE_CII_PORTFOLIO_V1"),
    macro: !!safeReadJson("abe_macro_artifact"),
    integration: !!safeReadJson("abe_integration_artifact")
  };
}

function readinessScore(presence) {
  const vals = Object.values(presence);
  const present = vals.filter(Boolean).length;
  return vals.length ? Math.round((present / vals.length) * 100) : 0;
}

function buildDownstreamView(presence) {
  return {
    from_cda: {
      ready_for_cdi: !!presence.cda,
      ready_for_cff: !!presence.cda,
      ready_for_integration: !!presence.cda
    },
    from_cdi: {
      ready_for_affe: !!presence.cdi,
      ready_for_ciri: !!presence.cdi,
      ready_for_integration: !!presence.cdi
    },
    from_cff: {
      ready_for_affe: !!presence.cff,
      ready_for_integration: !!presence.cff
    },
    from_affe: {
      ready_for_ciri: !!presence.affe,
      ready_for_integration: !!presence.affe
    },
    from_ciri: {
      ready_for_cibs: !!presence.ciri,
      ready_for_cii: !!presence.ciri,
      ready_for_integration: !!presence.ciri
    },
    from_cibs: {
      ready_for_cii: !!presence.cibs,
      ready_for_integration: !!presence.cibs
    },
    from_cii: {
      ready_for_macro: !!presence.cii,
      ready_for_integration: !!presence.cii
    },
    from_macro: {
      ready_for_integration: !!presence.macro
    }
  };
}

function buildModuleSummary(artifacts, presence) {
  return {
    intake_title: artifacts.intake?.original_file_name || artifacts.intake?.doc_type || "",
    cda_score:
      artifacts.cda?.divergence_score ??
      artifacts.cda?.result?.divergence_score ??
      null,
    cdi_weighted_divergence:
      artifacts.cdi?.result?.weighted_divergence ?? null,
    cff_classification:
      artifacts.cff?.result?.classification ||
      artifacts.cff?.classification ||
      "",
    affe_classification:
      artifacts.affe?.result?.classification ||
      artifacts.affe?.classification ||
      "",
    ciri_total_recovery:
      artifacts.ciri?.result?.net_modeled_recovery ??
      artifacts.ciri?.total_recovery ??
      null,
    cibs_budget_total:
      artifacts.cibs?.budget?.available_budget ??
      artifacts.cibs?.total_recovery ??
      null,
    cii_total_units:
      artifacts.cii?.result?.total_units ??
      (Array.isArray(artifacts.cii?.portfolio) ? artifacts.cii.portfolio.length : 0) ??
      0,
    cii_total_funded_amount:
      artifacts.cii?.result?.total_funded_amount ??
      artifacts.cii?.total_budget_in ??
      null,
    macro_uplift:
      artifacts.macro?.result?.projected_macro_uplift ?? null,
    presence
  };
}

function buildIntegritySummary(presence) {
  const out = [];
  if (!presence.intake) out.push("Missing Intake artifact.");
  if (!presence.cda) out.push("Missing CDA artifact.");
  if (!presence.cdi) out.push("Missing CDI artifact.");
  if (!presence.cff) out.push("Missing CFF artifact.");
  if (!presence.affe) out.push("Missing AFFE artifact.");
  if (!presence.ciri) out.push("Missing CIRI artifact.");
  if (!presence.cibs) out.push("Missing CIBS artifact.");
  if (!presence.cii) out.push("Missing CII artifact.");
  if (!out.length) out.push("All tracked module artifacts are present.");
  return out;
}

function collectArtifacts() {
  return {
    intake: safeReadJson("abe_intake_artifact"),
    cda: safeReadJson("abe_cda_artifact") || safeReadJson("ABE_CDA_SCENARIO_V1"),
    cdi: safeReadJson("abe_cdi_artifact"),
    cff: safeReadJson("abe_cff_artifact"),
    affe: safeReadJson("abe_affe_artifact"),
    ciri: safeReadJson("abe_ciri_artifact") || safeReadJson("ABE_CIRI_SCENARIO_V2"),
    cibs: safeReadJson("abe_cibs_artifact") || safeReadJson("ABE_CIBS_BUDGET_V1"),
    cii: safeReadJson("abe_cii_artifact") || safeReadJson("ABE_CII_PORTFOLIO_V1"),
    macro: safeReadJson("abe_macro_artifact")
  };
}

export async function buildIntegrationArtifact(meta = {}) {
  const manifest = await loadEngineManifest();
  const presence = modulePresence();
  const artifacts = collectArtifacts();
  const readiness = readinessScore(presence);
  const downstream = buildDownstreamView(presence);
  const summary = buildModuleSummary(artifacts, presence);
  const integrity = buildIntegritySummary(presence);

  const integratedTotal =
    Number(summary.macro_uplift) ||
    Number(summary.cii_total_funded_amount) ||
    Number(summary.cibs_budget_total) ||
    Number(summary.ciri_total_recovery) ||
    0;

  const integrationArtifact = {
    module: "integration",
    version: manifest?.version || "1.0.0",
    timestamp: new Date().toISOString(),
    privacy: {
      local_only: true,
      telemetry: false,
      remote_calls: false
    },
    integration: {
      name: meta.name || "",
      scope: meta.scope || "",
      notes: meta.notes || ""
    },
    presence,
    readiness_score: readiness,
    integrated_total: integratedTotal,
    module_summary: summary,
    integrity_summary: integrity,
    downstream_view: downstream,
    audit_snapshot: {
      timestamp: new Date().toISOString(),
      modules_present: Object.entries(presence).filter(([, v]) => v).map(([k]) => k),
      readiness_score: readiness,
      integrated_total: integratedTotal,
      intake_title: summary.intake_title || ""
    }
  };

  localStorage.setItem("abe_integration_artifact", JSON.stringify(integrationArtifact));
  getOrCreateScenario("abe_integration_artifact", integrationArtifact);

  return integrationArtifact;
}

export async function getIntegrationArtifact(meta = {}) {
  const existing = scenarioGet("abe_integration_artifact") || safeReadJson("abe_integration_artifact");
  if (existing) return existing;
  return buildIntegrationArtifact(meta);
    }
