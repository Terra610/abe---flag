// integration/orchestrator.js
// ABE Integration Orchestrator
// Binds module artifacts into a deterministic audit receipt.

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

function nowIso(){
  return new Date().toISOString();
}

function safeParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function readFirst(keys){
  for(const key of keys || []){
    const raw = localStorage.getItem(key);
    if(!raw) continue;
    const parsed = safeParse(raw);
    if(parsed) return parsed;
  }
  return null;
}

function num(v, fallback = 0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, d = 6){
  return Number(num(v).toFixed(d));
}

async function sha256(text){
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function readArtifacts(){
  const artifacts = {};
  for(const [module, keys] of Object.entries(STORAGE_KEYS)){
    if(module === "INTEGRATION") continue;
    artifacts[module] = readFirst(keys);
  }
  return artifacts;
}

function extractPhi(artifacts){
  const CDI = artifacts.CDI || {};
  const CIRI = artifacts.CIRI || {};
  const CIBS = artifacts.CIBS || {};
  const CII = artifacts.CII || {};

  return {
    CDI:
      CDI?.scores?.constitutional_divergence_index ??
      CDI?.scores?.divergence_score ??
      CDI?.aggregate?.average_divergence_index ??
      0,

    CIRI:
      CIRI?.scores?.ciri ??
      CIRI?.scores?.constitutional_risk_index ??
      CIRI?.scores?.constitutional_integrity_risk_index ??
      0,

    CIBS:
      CIBS?.aggregate?.total_budget_allocated ??
      CIBS?.aggregate?.RT ??
      CIBS?.scores?.total_budget_allocated ??
      0,

    CII:
      CII?.scores?.cii ??
      CII?.scores?.constitutional_integrity_index ??
      CII?.aggregate?.constitutional_integrity_index ??
      0
  };
}

function extractMoney(artifacts){
  return {
    recovery_capital_usd:
      artifacts?.INTEGRATION?.aggregate?.total_constitutional_capital_recovery_usd ??
      artifacts?.CIBS?.aggregate?.total_budget_allocated ??
      artifacts?.CIBS?.aggregate?.RT ??
      0,

    macro_gain_usd:
      artifacts?.MACRO?.aggregate?.total_gain_usd ??
      artifacts?.MACRO?.scores?.total_gain_usd ??
      0,

    rt_deployment_usd:
      artifacts?.RT?.scores?.total_deployment_usd ??
      artifacts?.RT?.aggregate?.D_total ??
      0,

    rt_activation_usd:
      artifacts?.RT?.scores?.total_activation_usd ??
      artifacts?.RT?.aggregate?.A_total ??
      0
  };
}

export async function buildIntegrationReceipt(model = {}){
  const artifacts = readArtifacts();
  const phi = extractPhi(artifacts);
  const money = extractMoney(artifacts);

  const numerator = num(phi.CII) + num(phi.CIBS);
  const denominator = 1 - num(phi.CDI);
  const signatureValue = denominator !== 0 ? numerator / denominator : null;

  const receiptCore = {
    module: "INTEGRATION",
    title: "Audit & SHA-256 Integrity Layer",
    version: model.version || "1.0",
    generated_at: nowIso(),
    chain_formula: model.chain_formula || "ABE(x) = Phi(CIRI(x), CIBS(x), CII(x), CDI(x), MACRO(x), RT(x))",
    signature_formula: {
      expression: model.signature_formula || "ABE = (dC + dR) / dI",
      numerator: round(numerator, 6),
      denominator: round(denominator, 6),
      value: signatureValue === null ? null : round(signatureValue, 6)
    },
    execution_order: model.execution_order || [
      "INTAKE",
      "CAE",
      "CDA",
      "CDI",
      "CIRI",
      "CIBS",
      "CII",
      "INTEGRATION",
      "MACRO",
      "RT",
      "CFF",
      "CCRI",
      "AFFE"
    ],
    phi_inputs: {
      CDI: round(phi.CDI, 6),
      CIRI: round(phi.CIRI, 6),
      CIBS: round(phi.CIBS, 2),
      CII: round(phi.CII, 6)
    },
    aggregate: {
      total_constitutional_capital_recovery_usd: round(money.recovery_capital_usd, 2),
      macro_gain_usd: round(money.macro_gain_usd, 2),
      rt_deployment_usd: round(money.rt_deployment_usd, 2),
      rt_activation_usd: round(money.rt_activation_usd, 2)
    },
    artifacts_seen: Object.fromEntries(
      Object.entries(artifacts).map(([k,v]) => [k, !!v])
    ),
    artifact_bundle: artifacts,
    integrity: {
      hash_algorithm: "SHA-256",
      local_only: true,
      deterministic: true,
      no_backend: true,
      no_login: true
    }
  };

  const canonical = JSON.stringify(receiptCore, null, 2);
  const hash = await sha256(canonical);

  const receipt = {
    ...receiptCore,
    integrity: {
      ...receiptCore.integrity,
      receipt_hash: "sha256:" + hash
    }
  };

  localStorage.setItem("ABE_INTEGRATION_ARTIFACT_V1", JSON.stringify(receipt));
  localStorage.setItem("abe_integration_artifact", JSON.stringify(receipt));
  localStorage.setItem("ABE_AUDIT_RECEIPT_V1", JSON.stringify(receipt));

  return receipt;
}
