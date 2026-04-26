/* system/cli.js
   ABE deterministic execution controller
   Full automatic pipeline:
   INTAKE -> CAE -> CDA -> CDI -> CIRI -> CIBS -> CII -> INTEGRATION -> MACRO -> RT -> CFF -> CCRI -> AFFE
*/

const STORAGE_KEYS = {
  INTAKE: ["ABE_INTAKE_ARTIFACT_V1", "abe_intake_artifact"],

  CAE: ["ABE_CAE_ARTIFACT_V1", "abe_cae_artifact"],
  CDA: ["ABE_CDA_SCENARIO_V1", "abe_cda_artifact"],

  CDI: ["ABE_CDI_SCENARIO_V1", "abe_cdi_artifact"],
  CIRI: ["ABE_CIRI_SCENARIO_V2", "ABE_CIRI_SCENARIO_V1", "abe_ciri_artifact"],
  CIBS: ["ABE_CIBS_BUDGET_V1", "abe_cibs_artifact"],
  CII: ["ABE_CII_PORTFOLIO_V1", "abe_cii_artifact"],

  INTEGRATION: ["ABE_INTEGRATION_ARTIFACT_V1", "abe_integration_artifact", "ABE_AUDIT_RECEIPT_V1"],
  MACRO: ["ABE_MACRO_ARTIFACT_V1", "abe_macro_artifact"],
  RT: ["ABE_RT_ARTIFACT_V1", "abe_rt_artifact"],

  CFF: ["ABE_CFF_ARTIFACT_V1", "abe_cff_artifact"],
  CCRI: ["ABE_CCRI_SCENARIO_V1", "abe_ccri_artifact"],
  AFFE: ["ABE_AFFE_ARTIFACT_V1", "abe_affe_artifact"]
};

const MODULE_PATHS = {
  CAE: "/abe---flag/cae/runner.js",
  CDA: "/abe---flag/cda/runner.js",
  CDI: "/abe---flag/cdi/runner.js",
  CIRI: "/abe---flag/ciri/runner.js",
  CIBS: "/abe---flag/cibs/runner.js",
  CII: "/abe---flag/cii/runner.js",
  MACRO: "/abe---flag/macro/runner.js",
  RT: "/abe---flag/rt/runner.js",
  CFF: "/abe---flag/cff/runner.js",
  CCRI: "/abe---flag/ccri/runner.js",
  AFFE: "/abe---flag/affe/runner.js"
};

const MODULE_MODELS = {
  CAE: "/abe---flag/cae/model.json",
  CDA: "/abe---flag/cda/model.json",
  CDI: "/abe---flag/cdi/model.json",
  CIRI: "/abe---flag/ciri/model.json",
  CIBS: "/abe---flag/cibs/model.json",
  CII: "/abe---flag/cii/model.json",
  INTEGRATION: "/abe---flag/integration/model.json",
  MACRO: "/abe---flag/macro/model.json",
  RT: "/abe---flag/rt/model.json",
  CFF: "/abe---flag/cff/model.json",
  CCRI: "/abe---flag/ccri/model.json",
  AFFE: "/abe---flag/affe/model.json"
};

const MODULE_INPUTS = {
  CDI: "/abe---flag/cdi/inputs.json",
  CIRI: "/abe---flag/ciri/inputs.json",
  CIBS: "/abe---flag/cibs/inputs.json",
  CII: "/abe---flag/cii/inputs.json",
  MACRO: "/abe---flag/macro/inputs.json",
  CCRI: "/abe---flag/ccri/inputs.json"
};

function nowIso(){ return new Date().toISOString(); }

function safeParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function readFirst(keys){
  for(const key of keys || []){
    const raw = localStorage.getItem(key);
    if(!raw) continue;
    const parsed = safeParse(raw);
    if(parsed) return { key, value: parsed };
  }
  return null;
}

function writeAll(moduleName, artifact){
  for(const key of STORAGE_KEYS[moduleName] || []){
    localStorage.setItem(key, JSON.stringify(artifact));
  }
}

async function fetchJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

async function importRun(moduleName){
  const path = MODULE_PATHS[moduleName];
  if(!path) throw new Error(`${moduleName}: runner path missing`);
  const mod = await import(path);
  if(typeof mod.run !== "function") throw new Error(`${moduleName}: runner missing run()`);
  return mod.run;
}

async function loadModel(moduleName){
  return fetchJSON(MODULE_MODELS[moduleName]);
}

async function loadInputs(moduleName){
  const path = MODULE_INPUTS[moduleName];
  return path ? fetchJSON(path) : null;
}

function pickScenario(inputs){
  return inputs?.scenario || inputs?.scenarios?.[0] || inputs || {};
}

async function runModule(moduleName, scenario, ctx){
  const run = await importRun(moduleName);
  const artifact = await run(scenario || {}, ctx || {});
  writeAll(moduleName, artifact);
  return artifact;
}

function buildIntegrationArtifact(core, integrationModel){
  const cdi = core.CDI || {};
  const ciri = core.CIRI || {};
  const cibs = core.CIBS || {};
  const cii = core.CII || {};

  const phi = {
    CDI: cdi?.scores?.constitutional_divergence_index ?? cdi?.scores?.divergence_score ?? cdi?.aggregate?.average_divergence_index ?? 0,
    CIRI: ciri?.scores?.ciri ?? ciri?.scores?.constitutional_risk_index ?? 0,
    CIBS: cibs?.aggregate?.total_budget_allocated ?? cibs?.aggregate?.RT ?? 0,
    CII: cii?.scores?.cii ?? cii?.scores?.constitutional_integrity_index ?? 0
  };

  const numerator = Number(phi.CII || 0) + Number(phi.CIBS || 0);
  const denominator = 1 - Number(phi.CDI || 0);
  const value = denominator !== 0 ? numerator / denominator : null;

  return {
    module: "ABE",
    title: "American Butterfly Effect",
    version: integrationModel?.version || "1.0",
    generated_at: nowIso(),
    cli_execution_order: ["INTAKE", "CAE", "CDA", "CDI", "CIRI", "CIBS", "CII", "INTEGRATION", "MACRO", "RT", "CFF", "CCRI", "AFFE"],
    core_order: ["CDI", "CIRI", "CIBS", "CII"],
    chain_formula: integrationModel?.chain_formula || "ABE(x) = Phi(CIRI(x), CIBS(x), CII(x), CDI(x))",
    phi_inputs: {
      CDI: Number(Number(phi.CDI || 0).toFixed(6)),
      CIRI: Number(Number(phi.CIRI || 0).toFixed(6)),
      CIBS: Number(Number(phi.CIBS || 0).toFixed(2)),
      CII: Number(Number(phi.CII || 0).toFixed(6))
    },
    signature_formula: {
      expression: integrationModel?.signature_formula || "ABE = (dC + dR) / dI",
      numerator: Number(numerator.toFixed(6)),
      denominator: Number(denominator.toFixed(6)),
      value: value == null ? null : Number(value.toFixed(6))
    },
    aggregate: {
      total_impacted_population: ciri?.aggregate?.exposed_population ?? ciri?.aggregate?.case_count ?? 0,
      total_constitutional_capital_recovery_usd: Math.round(cibs?.aggregate?.total_budget_allocated ?? cibs?.aggregate?.RT ?? 0)
    },
    core_receipts: {
      CDI: core.CDI,
      CIRI: core.CIRI,
      CIBS: core.CIBS,
      CII: core.CII
    }
  };
}

export async function runABEFullPipeline(){
  const started_at = nowIso();
  const intake = readFirst(STORAGE_KEYS.INTAKE)?.value || null;

  const caeModel = await loadModel("CAE");
  const CAE = await runModule("CAE", {}, { model: caeModel });

  const cdaModel = await loadModel("CDA");
  const CDA = await runModule("CDA", {}, { model: cdaModel });

  const cdiModel = await loadModel("CDI");
  const cdiInputs = await loadInputs("CDI");
  const CDI = await runModule("CDI", pickScenario(cdiInputs), {
    model: cdiModel,
    inputs: cdiInputs,
    expansions: { CAE, CDA }
  });

  const ciriModel = await loadModel("CIRI");
  const ciriInputs = await loadInputs("CIRI");
  const CIRI = await runModule("CIRI", pickScenario(ciriInputs), {
    model: ciriModel,
    inputs: ciriInputs,
    priorCore: { CDI: { artifact: CDI } },
    expansions: { CAE, CDA }
  });

  const cibsModel = await loadModel("CIBS");
  const cibsInputs = await loadInputs("CIBS");
  const CIBS = await runModule("CIBS", pickScenario(cibsInputs), {
    model: cibsModel,
    inputs: cibsInputs,
    priorCore: { CIRI: { artifact: CIRI } }
  });

  const ciiModel = await loadModel("CII");
  const ciiInputs = await loadInputs("CII");
  const CII = await runModule("CII", pickScenario(ciiInputs), {
    model: ciiModel,
    inputs: ciiInputs,
    priorCore: { CIBS: { artifact: CIBS } }
  });

  const integrationModel = await loadModel("INTEGRATION");
  const INTEGRATION = buildIntegrationArtifact({ CDI, CIRI, CIBS, CII }, integrationModel);
  writeAll("INTEGRATION", INTEGRATION);

  const macroModel = await loadModel("MACRO");
  const macroInputs = await loadInputs("MACRO");
  const MACRO = await runModule("MACRO", pickScenario(macroInputs), {
    model: macroModel,
    inputs: macroInputs,
    integration: INTEGRATION
  });

  const rtModel = await loadModel("RT");
  const RT = await runModule("RT", {}, {
    model: rtModel,
    priorCore: {
      CIBS: { artifact: CIBS },
      CII: { artifact: CII }
    },
    expansions: {
      INTEGRATION,
      MACRO
    }
  });

  const cffModel = await loadModel("CFF");
  const CFF = await runModule("CFF", {}, { model: cffModel });

  const ccriModel = await loadModel("CCRI");
  const ccriInputs = await loadInputs("CCRI");
  const CCRI = await runModule("CCRI", pickScenario(ccriInputs), {
    model: ccriModel,
    inputs: ccriInputs,
    expansions: { CAE, CDA, CFF }
  });

  const affeModel = await loadModel("AFFE");
  const AFFE = await runModule("AFFE", {}, {
    model: affeModel,
    priorCore: { CII: { artifact: CII } },
    expansions: {
      INTEGRATION,
      MACRO,
      RT,
      CFF,
      CCRI
    }
  });

  return {
    ok: true,
    started_at,
    finished_at: nowIso(),
    intake,
    execution_order: ["INTAKE", "CAE", "CDA", "CDI", "CIRI", "CIBS", "CII", "INTEGRATION", "MACRO", "RT", "CFF", "CCRI", "AFFE"],
    results: {
      INTAKE: intake,
      CAE,
      CDA,
      CDI,
      CIRI,
      CIBS,
      CII,
      INTEGRATION,
      MACRO,
      RT,
      CFF,
      CCRI,
      AFFE
    }
  };
}

export async function runABEFullPipelineWithReport(){
  try {
    return await runABEFullPipeline();
  } catch(error) {
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
