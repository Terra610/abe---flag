/* system/cli.js
   ABE deterministic execution controller
   Full automatic pipeline:
   Intake -> CDI -> CIRI -> CIBS -> CII -> ABE/Integration -> Macro
   Expansions: CAE -> CDA -> CFF -> CCRI -> AFFE
*/

const STORAGE_KEYS = {
  INTAKE: ["ABE_INTAKE_ARTIFACT_V1", "abe_intake_artifact"],

  CDI: ["ABE_CDI_SCENARIO_V1", "abe_cdi_artifact"],
  CIRI: ["ABE_CIRI_SCENARIO_V2", "ABE_CIRI_SCENARIO_V1", "abe_ciri_artifact"],
  CIBS: ["ABE_CIBS_BUDGET_V1", "abe_cibs_artifact"],
  CII: ["ABE_CII_PORTFOLIO_V1", "abe_cii_artifact"],

  ABE: ["ABE_INTEGRATION_ARTIFACT_V1", "abe_integration_artifact", "ABE_AUDIT_RECEIPT_V1"],
  MACRO: ["ABE_MACRO_ARTIFACT_V1", "abe_macro_artifact"],

  CAE: ["ABE_CAE_ARTIFACT_V1", "abe_cae_artifact"],
  CDA: ["ABE_CDA_SCENARIO_V1", "abe_cda_artifact"],
  CFF: ["ABE_CFF_ARTIFACT_V1", "abe_cff_artifact"],
  CCRI: ["ABE_CCRI_SCENARIO_V1", "abe_ccri_artifact"],
  AFFE: ["ABE_AFFE_ARTIFACT_V1", "abe_affe_artifact"]
};

const MODULE_PATHS = {
  CDI: "/abe---flag/cdi/runner.js",
  CIRI: "/abe---flag/ciri/runner.js",
  CIBS: "/abe---flag/cibs/runner.js",
  CII: "/abe---flag/cii/runner.js",
  CAE: "/abe---flag/cae/runner.js",
  CDA: "/abe---flag/cda/runner.js",
  CFF: "/abe---flag/cff/runner.js",
  CCRI: "/abe---flag/ccri/runner.js",
  AFFE: "/abe---flag/affe/runner.js",
  MACRO: "/abe---flag/macro/runner.js"
};

const MODULE_MODELS = {
  CDI: "/abe---flag/cdi/model.json",
  CIRI: "/abe---flag/ciri/model.json",
  CIBS: "/abe---flag/cibs/model.json",
  CII: "/abe---flag/cii/model.json",
  CAE: "/abe---flag/cae/model.json",
  CDA: "/abe---flag/cda/model.json",
  CFF: "/abe---flag/cff/model.json",
  CCRI: "/abe---flag/ccri/model.json",
  AFFE: "/abe---flag/affe/model.json",
  MACRO: "/abe---flag/macro/model.json",
  INTEGRATION: "/abe---flag/integration/model.json"
};

const MODULE_INPUTS = {
  CDI: "/abe---flag/cdi/inputs.json",
  CIRI: "/abe---flag/ciri/inputs.json",
  CIBS: "/abe---flag/cibs/inputs.json",
  CII: "/abe---flag/cii/inputs.json",
  CCRI: "/abe---flag/ccri/inputs.json",
  MACRO: "/abe---flag/macro/inputs.json"
};

function nowIso() {
  return new Date().toISOString();
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readFirstLocalStorage(keys) {
  for (const key of keys || []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = safeParse(raw);
      if (parsed) return { key, value: parsed };
    } catch (_) {}
  }
  return null;
}

function writeCanonical(moduleName, payload) {
  const keys = STORAGE_KEYS[moduleName] || [];
  for (const key of keys) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (_) {}
  }
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function importRunner(moduleName) {
  const path = MODULE_PATHS[moduleName];
  if (!path) throw new Error(`${moduleName}: no runner path configured`);
  const mod = await import(path);
  if (typeof mod.run !== "function") throw new Error(`${moduleName}: runner missing run()`);
  return mod.run;
}

async function loadAssets(moduleName) {
  const model = MODULE_MODELS[moduleName] ? await fetchJson(MODULE_MODELS[moduleName]) : null;
  const inputs = MODULE_INPUTS[moduleName] ? await fetchJson(MODULE_INPUTS[moduleName]) : null;
  return { model, inputs };
}

function pickScenario(inputs) {
  return inputs?.scenario || inputs?.scenarios?.[0] || inputs || {};
}

function getCorePhi(coreResults) {
  const cdi = coreResults.CDI || {};
  const ciri = coreResults.CIRI || {};
  const cibs = coreResults.CIBS || {};
  const cii = coreResults.CII || {};

  return {
    CDI:
      cdi?.scores?.constitutional_divergence_index ??
      cdi?.scores?.divergence_score ??
      cdi?.aggregate?.average_divergence_index ??
      0,

    CIRI:
      ciri?.scores?.ciri ??
      ciri?.scores?.constitutional_risk_index ??
      0,

    CIBS:
      cibs?.aggregate?.total_budget_allocated ??
      cibs?.aggregate?.RT ??
      0,

    CII:
      cii?.scores?.cii ??
      cii?.scores?.constitutional_integrity_index ??
      0
  };
}

function buildIntegrationArtifact(coreResults, integrationModel) {
  const phi = getCorePhi(coreResults);
  const numerator = Number(phi.CII || 0) + Number(phi.CIBS || 0);
  const denominator = 1 - Number(phi.CDI || 0);
  const signatureValue = denominator !== 0 ? numerator / denominator : null;

  const ciri = coreResults.CIRI || {};
  const cibs = coreResults.CIBS || {};

  return {
    module: "ABE",
    title: "American Butterfly Effect",
    version: integrationModel?.version || "1.0",
    generated_at: nowIso(),
    cli_execution_order: ["CDI", "CIRI", "CIBS", "CII", "ABE"],
    chain_formula: integrationModel?.chain_formula || "ABE(x) = Φ(CIRI(x), CIBS(x), CII(x), CDI(x))",
    phi_inputs: {
      CDI: Number((phi.CDI || 0).toFixed(6)),
      CIRI: Number((phi.CIRI || 0).toFixed(6)),
      CIBS: Number((phi.CIBS || 0).toFixed(2)),
      CII: Number((phi.CII || 0).toFixed(6))
    },
    signature_formula: {
      expression: integrationModel?.signature_formula || "ABE = (∂C + ∂R) / ∂I",
      numerator: Number(numerator.toFixed(6)),
      denominator: Number(denominator.toFixed(6)),
      value: signatureValue == null ? null : Number(signatureValue.toFixed(6))
    },
    aggregate: {
      total_impacted_population:
        ciri?.aggregate?.exposed_population ??
        ciri?.aggregate?.case_count ??
        0,
      total_constitutional_capital_recovery_usd:
        Math.round(
          cibs?.aggregate?.total_budget_allocated ??
          cibs?.aggregate?.RT ??
          0
        )
    },
    core_receipts: {
      CDI: coreResults.CDI || null,
      CIRI: coreResults.CIRI || null,
      CIBS: coreResults.CIBS || null,
      CII: coreResults.CII || null
    }
  };
}

async function runCoreModule(moduleName, priorCore = {}) {
  const run = await importRunner(moduleName);
  const { model, inputs } = await loadAssets(moduleName);
  const scenario = pickScenario(inputs);
  const artifact = await run(scenario, { model, inputs, priorCore, expansions: {} });
  writeCanonical(moduleName, artifact);
  return artifact;
}

async function runExpansionModule(moduleName, args) {
  const run = await importRunner(moduleName);
  const { model, inputs } = await loadAssets(moduleName);
  const scenario = pickScenario(inputs);
  const artifact = await run(scenario, args(model, inputs, scenario));
  writeCanonical(moduleName, artifact);
  return artifact;
}

export async function runABEFullPipeline() {
  const started_at = nowIso();

  const intake = readFirstLocalStorage(STORAGE_KEYS.INTAKE)?.value || null;

  const core = {};
  core.CDI = await runCoreModule("CDI", {});
  core.CIRI = await runCoreModule("CIRI", { CDI: { artifact: core.CDI } });
  core.CIBS = await runCoreModule("CIBS", { CIRI: { artifact: core.CIRI } });
  core.CII = await runCoreModule("CII", { CIBS: { artifact: core.CIBS } });

  const integrationModel = await fetchJson(MODULE_MODELS.INTEGRATION);
  const integration = buildIntegrationArtifact(core, integrationModel);
  writeCanonical("ABE", integration);

  const macro = await runExpansionModule("MACRO", (model, inputs) => ({
    model,
    inputs,
    integration
  }));

  const cae = await runExpansionModule("CAE", (model, schema) => ({
    model,
    schema
  }));

  const cda = await runExpansionModule("CDA", (model, schema) => ({
    model,
    schema
  }));

  const cff = await runExpansionModule("CFF", (model, schema) => ({
    model,
    schema
  }));

  const ccri = await runExpansionModule("CCRI", (model, schema) => ({
    model,
    schema,
    expansions: {
      CAE: cae,
      CDA: cda,
      CFF: cff
    }
  }));

  const affe = await runExpansionModule("AFFE", (model, schema) => ({
    model,
    schema,
    priorCore: {
      CII: { artifact: core.CII }
    },
    expansions: {
      INTEGRATION: integration,
      MACRO: macro
    }
  }));

  return {
    ok: true,
    started_at,
    finished_at: nowIso(),
    intake,
    results: {
      CDI: core.CDI,
      CIRI: core.CIRI,
      CIBS: core.CIBS,
      CII: core.CII,
      ABE: integration,
      MACRO: macro,
      CAE: cae,
      CDA: cda,
      CFF: cff,
      CCRI: ccri,
      AFFE: affe
    }
  };
}

export async function runABEFullPipelineWithReport() {
  try {
    return await runABEFullPipeline();
  } catch (error) {
    return {
      ok: false,
      started_at: nowIso(),
      finished_at: nowIso(),
      error: {
        message: error?.message || String(error),
        stack: error?.stack || null
      }
    };
  }
}
