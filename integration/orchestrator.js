import { createSessionMeta, finalizeSessionMeta } from "/abe---flag/integration/engine/core/session.js";

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readFirst(keys) {
  for (const key of keys || []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = safeParse(raw);
      if (parsed) {
        return { key, value: parsed };
      }
    } catch (_) {}
  }
  return null;
}

function writeAll(keys, payload) {
  for (const key of keys || []) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (_) {}
  }
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6) {
  return Number(num(v).toFixed(d));
}

function getPhiInputs(core) {
  const cdi = core.CDI?.value || {};
  const ciri = core.CIRI?.value || {};
  const cibs = core.CIBS?.value || {};
  const cii = core.CII?.value || {};

  return {
    CDI:
      cdi?.scores?.constitutional_divergence_index ??
      cdi?.scores?.divergence_score ??
      cdi?.aggregate?.average_divergence_index ??
      0,

    CIRI:
      ciri?.scores?.ciri ??
      ciri?.scores?.constitutional_risk_index ??
      ciri?.aggregate?.ciri ??
      0,

    CIBS:
      cibs?.aggregate?.total_budget_allocated ??
      cibs?.aggregate?.total_recovery_budget ??
      cibs?.aggregate?.RT ??
      0,

    CII:
      cii?.scores?.cii ??
      cii?.scores?.constitutional_integrity_index ??
      cii?.aggregate?.cii ??
      0
  };
}

function getAggregate(core) {
  const ciri = core.CIRI?.value || {};
  const ccriLikePopulation =
    ciri?.aggregate?.exposed_population ??
    ciri?.aggregate?.case_count ??
    0;

  const cibs = core.CIBS?.value || {};
  const totalRecovery =
    cibs?.aggregate?.total_budget_allocated ??
    cibs?.aggregate?.RT ??
    0;

  return {
    total_impacted_population: ccriLikePopulation,
    total_constitutional_capital_recovery_usd: Math.round(num(totalRecovery))
  };
}

function buildSignature(phi) {
  const numerator = num(phi.CII) + num(phi.CIBS);
  const denominator = 1 - num(phi.CDI);

  return {
    expression: "ABE = (∂C + ∂R) / ∂I",
    numerator: round(numerator, 6),
    denominator: round(denominator, 6),
    value: denominator !== 0 ? round(numerator / denominator, 6) : null
  };
}

function buildArtifact(model, core, session) {
  const phi = getPhiInputs(core);
  const signature = buildSignature(phi);
  const aggregate = getAggregate(core);

  return {
    module: "ABE",
    title: "American Butterfly Effect",
    version: model.version || "1.0",
    generated_at: new Date().toISOString(),
    cli_execution_order: model.core_order || ["CDI", "CIRI", "CIBS", "CII", "ABE"],
    chain_formula: model.chain_formula || "ABE(x) = Φ(CIRI(x), CIBS(x), CII(x), CDI(x))",
    phi_inputs: {
      CDI: round(phi.CDI, 6),
      CIRI: round(phi.CIRI, 6),
      CIBS: round(phi.CIBS, 6),
      CII: round(phi.CII, 6)
    },
    signature_formula: signature,
    aggregate,
    core_receipts: {
      CDI: core.CDI?.value || null,
      CIRI: core.CIRI?.value || null,
      CIBS: core.CIBS?.value || null,
      CII: core.CII?.value || null
    },
    receipt_sources: {
      CDI: core.CDI?.key || null,
      CIRI: core.CIRI?.key || null,
      CIBS: core.CIBS?.key || null,
      CII: core.CII?.key || null
    },
    session: finalizeSessionMeta(session)
  };
}

export async function runIntegration() {
  const session = createSessionMeta();

  const model = await fetch("/abe---flag/integration/model.json", { cache: "no-store" }).then(r => {
    if (!r.ok) throw new Error("integration/model.json: HTTP " + r.status);
    return r.json();
  });

  const core = {
    CDI: readFirst(model.artifact_keys?.CDI || []),
    CIRI: readFirst(model.artifact_keys?.CIRI || []),
    CIBS: readFirst(model.artifact_keys?.CIBS || []),
    CII: readFirst(model.artifact_keys?.CII || [])
  };

  const found = Object.values(core).filter(Boolean).length;
  if (found < 4) {
    throw new Error("Integration blocked: one or more core pioneer artifacts are missing.");
  }

  const artifact = buildArtifact(model, core, session);
  writeAll(model.artifact_keys?.ABE || [], artifact);

  return {
    ok: true,
    artifact,
    core
  };
    }
