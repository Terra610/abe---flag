/* system/cli.js
   ABE deterministic execution controller
   Core spine: CDI -> CIRI -> CIBS -> CII -> ABE
   Expansions: CAE / CDA / CCRI feed core, CFF feeds CIRI, AFFE refines downstream
*/

const ABE_CORE_ORDER = ["CDI", "CIRI", "CIBS", "CII", "ABE"];
const ABE_EXPANSIONS = ["CAE", "CDA", "CCRI", "CFF", "AFFE"];

const STORAGE_KEYS = {
  CAE: ["ABE_CAE_ARTIFACT_V1", "abe_cae_artifact"],
  CDA: ["ABE_CDA_SCENARIO_V1", "abe_cda_artifact", "ABE_CDI_ARTIFACT_V1", "abe_cdi_artifact"],
  CCRI: ["ABE_CCRI_SCENARIO_V1", "abe_ccri_artifact"],
  CFF: ["ABE_CFF_ARTIFACT_V1", "abe_cff_artifact"],
  AFFE: ["ABE_AFFE_ARTIFACT_V1", "abe_affe_artifact"],

  CDI: ["ABE_CDI_SCENARIO_V1", "abe_cdi_artifact"],
  CIRI: ["ABE_CIRI_SCENARIO_V2", "ABE_CIRI_SCENARIO_V1", "abe_ciri_artifact"],
  CIBS: ["ABE_CIBS_BUDGET_V1", "abe_cibs_artifact"],
  CII: ["ABE_CII_PORTFOLIO_V1", "abe_cii_artifact"],
  ABE: ["ABE_INTEGRATION_ARTIFACT_V1", "abe_integration_artifact", "ABE_AUDIT_RECEIPT_V1"]
};

const MODULE_PATHS = {
  CDI: "/abe---flag/cdi/runner.js",
  CIRI: "/abe---flag/ciri/runner.js",
  CIBS: "/abe---flag/cibs/runner.js",
  CII: "/abe---flag/cii/runner.js"
};

const MODULE_MODELS = {
  CDI: "/abe---flag/cdi/model.json",
  CIRI: "/abe---flag/ciri/model.json",
  CIBS: "/abe---flag/cibs/model.json",
  CII: "/abe---flag/cii/model.json"
};

const MODULE_INPUTS = {
  CDI: "/abe---flag/cdi/inputs.json",
  CIRI: "/abe---flag/ciri/inputs.json",
  CIBS: "/abe---flag/cibs/inputs.json",
  CII: "/abe---flag/cii/inputs.json"
};

function nowIso() {
  return new Date().toISOString();
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
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
  const keys = STORAGE_KEYS[moduleName];
  if (!keys || !keys.length) return;
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeExpansionInputs(expansions) {
  const cae = expansions.CAE?.value || null;
  const cda = expansions.CDA?.value || null;
  const ccri = expansions.CCRI?.value || null;
  const cff = expansions.CFF?.value || null;
  const affe = expansions.AFFE?.value || null;

  const caeAlignment =
    cae?.summary?.average_alignment ??
    cae?.aggregate?.average_alignment ??
    cae?.scores?.constitutional_alignment ??
    cae?.scores?.alignment_score ??
    null;

  const cdaDefinitionIntegrity =
    cda?.scores?.definition_integrity ??
    cda?.aggregate?.definition_integrity ??
    cda?.definition_integrity ??
    null;

  const ccriRecovery =
    ccri?.aggregate?.total_constitutional_capital_recovery_usd ??
    ccri?.scores?.economic_impact ??
    null;

  const ccriDivergence =
    ccri?.scores?.constitutional_divergence_index ??
    ccri?.aggregate?.average_divergence_index ??
    null;

  const cffFundingAlignment =
    cff?.scores?.funding_alignment ??
    cff?.aggregate?.funding_alignment ??
    cff?.funding_alignment ??
    null;

  const affeEffectiveness =
    affe?.scores?.effectiveness ??
    affe?.aggregate?.effectiveness ??
    affe?.effectiveness ??
    null;

  return {
    authority_alignment: caeAlignment,
    definition_integrity: cdaDefinitionIntegrity,
    recovery_hint_usd: ccriRecovery,
    divergence_hint: ccriDivergence,
    funding_alignment: cffFundingAlignment,
    effectiveness_hint: affeEffectiveness
  };
}

function buildCoreSeed(expansions) {
  const normalized = normalizeExpansionInputs(expansions);

  return {
    generated_at: nowIso(),
    expansions_detected: Object.fromEntries(
      Object.entries(expansions).map(([name, ref]) => [name, !!ref])
    ),
    upstream: normalized
  };
}

function validateCoreArtifact(moduleName, artifact) {
  assert(artifact && typeof artifact === "object", `${moduleName}: runner returned no artifact`);
  assert(
    artifact.module === moduleName || moduleName === "ABE",
    `${moduleName}: artifact.module mismatch`
  );
}

function makeAbeAggregate(coreResults, expansions) {
  const cdi = coreResults.CDI?.artifact || {};
  const ciri = coreResults.CIRI?.artifact || {};
  const cibs = coreResults.CIBS?.artifact || {};
  const cii = coreResults.CII?.artifact || {};

  const cdiValue =
    cdi.scores?.divergence_score ??
    cdi.scores?.constitutional_divergence_index ??
    cdi.aggregate?.average_divergence_index ??
    0;

  const ciriValue =
    ciri.scores?.constitutional_risk_index ??
    ciri.scores?.ciri ??
    ciri.scores?.overall_risk_index ??
    ciri.aggregate?.ciri ??
    0;

  const cibsValue =
    cibs.aggregate?.total_budget_allocated ??
    cibs.aggregate?.total_allocated ??
    cibs.aggregate?.total_recovery_budget ??
    0;

  const ciiValue =
    cii.scores?.constitutional_integrity_index ??
    cii.scores?.cii ??
    cii.aggregate?.cii ??
    0;

  const abeSignatureNumerator = Number(ciiValue || 0) + Number(cibsValue || 0);
  const abeSignatureDenominator = Number(1 - cdiValue || 1);

  const signature =
    abeSignatureDenominator !== 0
      ? abeSignatureNumerator / abeSignatureDenominator
      : null;

  const artifact = {
    module: "ABE",
    title: "American Butterfly Effect",
    version: "1.0",
    generated_at: nowIso(),
    cli_execution_order: [...ABE_CORE_ORDER],
    expansion_modules: [...ABE_EXPANSIONS],
    upstream_expansions: Object.fromEntries(
      Object.entries(expansions).map(([name, ref]) => [name, ref ? ref.key : null])
    ),
    phi_inputs: {
      CIRI: ciriValue,
      CIBS: cibsValue,
      CII: ciiValue,
      CDI: cdiValue
    },
    signature_formula: {
      expression: "ABE = (∂C + ∂R) / ∂I",
      numerator: abeSignatureNumerator,
      denominator: abeSignatureDenominator,
      value: signature
    },
    chain_formula: "ABE(x) = Φ(CIRI(x), CIBS(x), CII(x), CDI(x))",
    core_receipts: {
      CDI: coreResults.CDI?.artifact || null,
      CIRI: coreResults.CIRI?.artifact || null,
      CIBS: coreResults.CIBS?.artifact || null,
      CII: coreResults.CII?.artifact || null
    }
  };

  return artifact;
}

async function importRunner(moduleName) {
  const path = MODULE_PATHS[moduleName];
  assert(path, `${moduleName}: no runner path configured`);
  const mod = await import(path);
  assert(typeof mod.run === "function", `${moduleName}: runner missing exported run()`);
  return mod.run;
}

async function loadModuleAssets(moduleName) {
  const [model, inputs] = await Promise.all([
    fetchJson(MODULE_MODELS[moduleName]),
    fetchJson(MODULE_INPUTS[moduleName])
  ]);
  return { model, inputs };
}

function buildModuleContext(moduleName, seed, priorCore, expansions, model, inputs) {
  return {
    module: moduleName,
    generated_at: nowIso(),
    seed: deepClone(seed),
    priorCore: deepClone(priorCore),
    expansions: Object.fromEntries(
      Object.entries(expansions).map(([name, ref]) => [name, ref ? ref.value : null])
    ),
    model,
    inputs
  };
}

async function runCoreModule(moduleName, seed, priorCore, expansions) {
  const run = await importRunner(moduleName);
  const { model, inputs } = await loadModuleAssets(moduleName);
  const ctx = buildModuleContext(moduleName, seed, priorCore, expansions, model, inputs);

  const scenario =
    inputs?.scenario ||
    inputs?.scenarios?.[0] ||
    inputs ||
    {};

  const artifact = await run(scenario, ctx);
  validateCoreArtifact(moduleName, artifact);
  writeCanonical(moduleName, artifact);

  return {
    module: moduleName,
    artifact,
    key: STORAGE_KEYS[moduleName]?.[0] || null
  };
}

function collectExpansionArtifacts() {
  return {
    CAE: readFirstLocalStorage(STORAGE_KEYS.CAE),
    CDA: readFirstLocalStorage(STORAGE_KEYS.CDA),
    CCRI: readFirstLocalStorage(STORAGE_KEYS.CCRI),
    CFF: readFirstLocalStorage(STORAGE_KEYS.CFF),
    AFFE: readFirstLocalStorage(STORAGE_KEYS.AFFE)
  };
}

function checkCorePreconditions(priorCore, nextModule) {
  const ready = Object.keys(priorCore);

  if (nextModule === "CDI") return;
  if (nextModule === "CIRI") assert(ready.includes("CDI"), "CIRI blocked: CDI must run first");
  if (nextModule === "CIBS") assert(ready.includes("CIRI"), "CIBS blocked: CIRI must run first");
  if (nextModule === "CII") assert(ready.includes("CIBS"), "CII blocked: CIBS must run first");
}

export async function runABE(options = {}) {
  const startedAt = nowIso();
  const expansions = collectExpansionArtifacts();
  const seed = buildCoreSeed(expansions);
  const coreResults = {};

  for (const moduleName of ["CDI", "CIRI", "CIBS", "CII"]) {
    checkCorePreconditions(coreResults, moduleName);
    coreResults[moduleName] = await runCoreModule(
      moduleName,
      seed,
      coreResults,
      expansions
    );
  }

  const abeArtifact = makeAbeAggregate(coreResults, expansions);
  writeCanonical("ABE", abeArtifact);

  return {
    ok: true,
    started_at: startedAt,
    finished_at: nowIso(),
    execution_order: [...ABE_CORE_ORDER],
    expansions_detected: Object.fromEntries(
      Object.entries(expansions).map(([name, ref]) => [name, !!ref])
    ),
    results: {
      CDI: coreResults.CDI?.artifact || null,
      CIRI: coreResults.CIRI?.artifact || null,
      CIBS: coreResults.CIBS?.artifact || null,
      CII: coreResults.CII?.artifact || null,
      ABE: abeArtifact
    }
  };
}

export async function runABEWithReport(options = {}) {
  try {
    return await runABE(options);
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

export function getABEExecutionSpec() {
  return {
    core_order: [...ABE_CORE_ORDER],
    expansion_modules: [...ABE_EXPANSIONS],
    description:
      "Core pioneers execute in locked deterministic order. Expansions enrich inputs but never reorder the spine."
  };
    }
