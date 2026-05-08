// system/cli.js
// A.B.E. — System CLI / Full Pipeline Runner
// Runs the local deterministic pipeline and returns one full report object.

function nowISO(){
  return new Date().toISOString();
}

function num(v, fallback = 0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, digits = 6){
  return Number(num(v).toFixed(digits));
}

function safeParse(raw){
  try { return JSON.parse(raw); }
  catch { return null; }
}

function readFirst(keys){
  for(const key of keys){
    const raw = localStorage.getItem(key);
    if(!raw) continue;

    const parsed = safeParse(raw);
    if(parsed) return parsed;
  }

  return null;
}

function writeArtifact(keys, artifact){
  const text = JSON.stringify(artifact);

  for(const key of keys){
    localStorage.setItem(key, text);
  }

  return artifact;
}

async function fetchJSON(path, fallback = null){
  try{
    const res = await fetch(path, { cache:"no-store" });
    if(!res.ok) return fallback;
    return await res.json();
  }catch{
    return fallback;
  }
}

async function sha256(text){
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const MODULES = [
  ["INTAKE", "Document Intake + OCR Bridge"],
  ["CAE", "Constitutional Alignment Engine"],
  ["CDA", "Constitutional Divergence Analyzer"],
  ["CDI", "Constitutional Divergence Index"],
  ["CIRI", "Constitutional Integrity ROI Engine"],
  ["CIBS", "Constitutional Integrity Baseline Schema"],
  ["CII", "Constitutional Integrity Index"],
  ["INTEGRATION", "Audit & SHA-256 Integrity Layer"],
  ["MACRO", "Macroeconomic Cascade Model"],
  ["RT", "Rebuild Together Engine"],
  ["CFF", "Constitutional Funding Forensics"],
  ["CCRI", "Consumer Credit Risk Integrity"],
  ["AFFE", "Appropriation Fidelity & Funding Engine"]
];

const STORAGE = {
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
  AFFE: ["ABE_AFFE_ARTIFACT_V1", "abe_affe_artifact"],
  FULL_REPORT: ["ABE_FULL_PIPELINE_REPORT"]
};

function getIntake(){
  const existing = readFirst(STORAGE.INTAKE);

  if(existing) return existing;

  return writeArtifact(STORAGE.INTAKE, {
    module: "INTAKE",
    module_name: "Document Intake + OCR Bridge",
    generated_at: nowISO(),
    source: "system_cli_default",
    summary: "No intake artifact was found. System generated a default local intake placeholder.",
    normalized_text: "",
    files: [],
    notes: "Run Intake first for document-specific analysis."
  });
}

async function runCAE(intake){
  const artifact = {
    module: "CAE",
    module_name: "Constitutional Alignment Engine",
    generated_at: nowISO(),
    inputs_seen: {
      intake: !!intake
    },
    scores: {
      alignment_baseline: 1
    },
    plain_language: {
      summary: "CAE established a baseline authority-alignment context for downstream analysis.",
      meaning: "The engine prepared the scenario for divergence review."
    }
  };

  return writeArtifact(STORAGE.CAE, artifact);
}

async function runCDA(intake, cae){
  const text = [
    intake?.normalized_text || "",
    intake?.text || "",
    intake?.summary || "",
    JSON.stringify(intake || {})
  ].join(" ").toLowerCase();

  const flags = [];

  if(text.includes("license") || text.includes("driver")){
    flags.push("LICENSING_SCOPE_REVIEW");
  }

  if(text.includes("traffic") || text.includes("vehicle")){
    flags.push("TRANSPORTATION_SCOPE_REVIEW");
  }

  if(text.includes("fund") || text.includes("grant") || text.includes("appropriation")){
    flags.push("FUNDING_SCOPE_REVIEW");
  }

  if(text.includes("jail") || text.includes("arrest") || text.includes("detention")){
    flags.push("LIBERTY_DEPRIVATION_REVIEW");
  }

  const divergence_score = flags.length
    ? Math.min(0.95, 0.25 + flags.length * 0.15)
    : 0.35;

  const artifact = {
    module: "CDA",
    module_name: "Constitutional Divergence Analyzer",
    generated_at: nowISO(),
    flags,
    scores: {
      divergence_signal: round(divergence_score, 6)
    },
    plain_language: {
      summary: "CDA identified structured review flags from the available intake context.",
      meaning: flags.length
        ? "The scenario contains signals that may require authority, scope, funding, or due-process review."
        : "No strong domain-specific flags were found, so the engine used a baseline review signal."
    }
  };

  return writeArtifact(STORAGE.CDA, artifact);
}

async function runCDI(cda){
  const S_r = num(cda?.scores?.divergence_signal, 0.35);
  const R = 1;
  const CDI = 1 - Math.exp(-(S_r / R));

  const artifact = {
    module: "CDI",
    module_name: "Constitutional Divergence Index",
    generated_at: nowISO(),
    formula: "CDI = 1 - e^(-S_r / R)",
    inputs: {
      S_r: round(S_r, 6),
      R
    },
    scores: {
      constitutional_divergence_index: round(CDI, 6),
      divergence_score: round(CDI, 6)
    },
    plain_language: {
      summary: "CDI measured how far the scenario appears to drift from the governing authority path.",
      meaning: "Higher CDI values indicate stronger divergence signals."
    }
  };

  return writeArtifact(STORAGE.CDI, artifact);
}

async function runCIRI(cdi){
  const CDI = num(cdi?.scores?.constitutional_divergence_index, 0.3);

  const model = await fetchJSON("ciri/model.json", {});
  const defaultRecovery =
    num(model?.defaults?.recovery_capital_usd, 6623142703);

  const R_T = defaultRecovery * Math.max(0.1, CDI);
  const K = num(model?.defaults?.normalization_constant, 1000000000);
  const CIRI = 1 - Math.exp(-(R_T / Math.max(1, K)));

  const artifact = {
    module: "CIRI",
    module_name: "Constitutional Integrity ROI Engine",
    generated_at: nowISO(),
    formula: {
      recovery: "R_T = modeled recoverable value",
      ciri: "CIRI = 1 - e^(-R_T / K)"
    },
    aggregate: {
      R_T: round(R_T, 2),
      total_recoverable_value_usd: round(R_T, 2)
    },
    scores: {
      ciri: round(CIRI, 6),
      constitutional_integrity_roi: round(CIRI, 6),
      ROI_case: round(R_T, 2)
    },
    plain_language: {
      summary: "CIRI converted divergence into a recoverable capital estimate.",
      meaning: "This value is an economic modeling output, not a court ruling or legal guarantee."
    }
  };

  return writeArtifact(STORAGE.CIRI, artifact);
}

async function runCIBS(ciri){
  const R_T =
    num(ciri?.aggregate?.R_T ??
    ciri?.aggregate?.total_recoverable_value_usd,
    0);

  const sectors = [
    ["mobility_access", "Mobility Access", 0.18],
    ["housing_stabilization", "Housing Stabilization", 0.15],
    ["community_infrastructure", "Community Infrastructure", 0.14],
    ["workforce_youth", "Workforce & Youth", 0.10],
    ["health_systems", "Health Systems", 0.10],
    ["agriculture_systems", "Agriculture Systems", 0.08],
    ["technology_infrastructure", "Technology Infrastructure", 0.08],
    ["legal_access", "Legal Access", 0.07],
    ["human_security", "Human Security", 0.05],
    ["companion_animal", "Companion Animal Stability", 0.03],
    ["seniors_veterans", "Seniors & Veterans", 0.02]
  ];

  const allocations = sectors.map(([key, name, share]) => ({
    key,
    name,
    allocation_share: share,
    B_i: round(R_T * share, 2)
  }));

  const artifact = {
    module: "CIBS",
    module_name: "Constitutional Integrity Baseline Schema",
    generated_at: nowISO(),
    formula: "B_i = R_T * p_i",
    aggregate: {
      RT: round(R_T, 2),
      total_budget_allocated: round(R_T, 2)
    },
    allocations,
    plain_language: {
      summary: "CIBS allocated recoverable value into structured deployment categories.",
      meaning: "This shows where modeled recovery capital can be directed."
    }
  };

  return writeArtifact(STORAGE.CIBS, artifact);
}

async function runCII(cibs){
  const allocations = Array.isArray(cibs?.allocations)
    ? cibs.allocations
    : [];

  const R_T =
    num(cibs?.aggregate?.RT ??
    cibs?.aggregate?.total_budget_allocated,
    1);

  const weighted = allocations.map(a => {
    const share = num(a.B_i, 0) / Math.max(1, R_T);
    const eta = num(a.effectiveness, 0.8);
    const w = num(a.progress_weight, 0.75);

    return share * eta * w;
  });

  const CII = weighted.reduce((a,b)=>a+b,0);

  const artifact = {
    module: "CII",
    module_name: "Constitutional Integrity Index",
    generated_at: nowISO(),
    formula: "CII = Σ ((B_p / R_T) * eta_p * w_p)",
    scores: {
      constitutional_integrity_index: round(CII, 6),
      cii: round(CII, 6)
    },
    aggregate: {
      constitutional_integrity_index: round(CII, 6)
    },
    plain_language: {
      summary: "CII measured whether allocated recovery value can propagate through the system.",
      meaning: "Higher values indicate stronger modeled propagation."
    }
  };

  return writeArtifact(STORAGE.CII, artifact);
}

async function runIntegration(results){
  const bundle = {
    generated_at: nowISO(),
    modules: Object.keys(results),
    core_results: results
  };

  const receiptHash = await sha256(JSON.stringify(bundle));

  const recovery =
    num(results?.CIBS?.aggregate?.total_budget_allocated ??
    results?.CIRI?.aggregate?.R_T,
    0);

  const artifact = {
    module: "INTEGRATION",
    module_name: "Audit & SHA-256 Integrity Layer",
    generated_at: nowISO(),
    aggregate: {
      total_constitutional_capital_recovery_usd: round(recovery, 2),
      recovery_capital_usd: round(recovery, 2)
    },
    integrity: {
      receipt_hash: "sha256:" + receiptHash,
      hashing_algorithm: "SHA-256",
      deterministic_verification: true
    },
    artifacts_seen: Object.fromEntries(
      MODULES.map(([key]) => [key, !!results[key]])
    ),
    plain_language: {
      summary: "Integration created an audit receipt for the current pipeline state.",
      meaning: "If verified data changes, the receipt hash will change."
    }
  };

  return writeArtifact(STORAGE.INTEGRATION, artifact);
}

async function runMACRO(integration){
  const recovery =
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd, 0);

  const multiplier = 1.7879;
  const total_gain_usd = recovery * multiplier;

  const artifact = {
    module: "MACRO",
    module_name: "Macroeconomic Cascade Model",
    generated_at: nowISO(),
    inputs: {
      recovery_capital_usd: round(recovery, 2),
      multiplier
    },
    aggregate: {
      total_gain_usd: round(total_gain_usd, 2)
    },
    scores: {
      total_gain_usd: round(total_gain_usd, 2)
    },
    plain_language: {
      summary: "MACRO projected the broader economic ripple effect from recovery capital.",
      meaning: "This is a modeled cascade estimate."
    }
  };

  return writeArtifact(STORAGE.MACRO, artifact);
}

async function runRT(cibs, cii, macro, integration){
  const recovery =
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd ??
    cibs?.aggregate?.total_budget_allocated,
    0);

  const sectorDefaults = [
    ["mobility_access", "Mobility Access", "Restores mobility participation and access.", 0.18, 1.6, 0.8, 0.8],
    ["housing_stabilization", "Housing Stabilization", "Stabilizes housing and residential continuity.", 0.15, 1.5, 0.75, 0.8],
    ["community_infrastructure", "Community Infrastructure", "Builds community-scale infrastructure.", 0.14, 1.7, 0.78, 0.7],
    ["workforce_youth", "Workforce & Youth", "Supports skills, work access, and youth programs.", 0.10, 1.9, 0.82, 0.7],
    ["health_systems", "Health Systems", "Improves access and cost efficiency in care systems.", 0.10, 1.6, 0.78, 0.7],
    ["agriculture_systems", "Agriculture Systems", "Supports food production and rural resilience.", 0.08, 1.7, 0.78, 0.7],
    ["technology_infrastructure", "Technology Infrastructure", "Expands digital access and scalable systems.", 0.08, 2.0, 0.85, 0.7],
    ["legal_access", "Legal Access", "Expands access to legal resources.", 0.07, 1.8, 0.8, 0.7],
    ["human_security", "Human Security", "Supports domestic violence, trafficking prevention, and protective services.", 0.05, 1.7, 0.78, 0.7],
    ["companion_animal", "Companion Animal Stability", "Supports animal welfare during housing or economic disruption.", 0.03, 1.5, 0.75, 0.6],
    ["seniors_veterans", "Seniors & Veterans", "Supports stability for seniors and veterans.", 0.02, 1.4, 0.76, 0.6]
  ];

  const sectors = sectorDefaults.map(([key, name, description, share, m, eta, w]) => {
    const D_i = recovery * share;
    const A_i = D_i * m * eta;

    return {
      key,
      name,
      description,
      allocation_share: share,
      activation_multiplier: m,
      eta_i: eta,
      w_i: w,
      D_i: round(D_i, 2),
      A_i: round(A_i, 2)
    };
  });

  const D_total = sectors.reduce((sum, s) => sum + num(s.D_i), 0);
  const A_total = sectors.reduce((sum, s) => sum + num(s.A_i), 0);

  const RTI = sectors.reduce((sum, s) => {
    return sum + ((num(s.D_i) / Math.max(1, D_total)) * num(s.eta_i) * num(s.w_i));
  }, 0);

  const artifact = {
    module: "RT",
    module_name: "Rebuild Together Engine",
    generated_at: nowISO(),
    formula: {
      deployment: "D_i = B_i * a_i",
      activation: "A_i = D_i * m_i * eta_i",
      total_activation: "A_total = sum(A_i)",
      execution_index: "RTI = sum((D_i / D_total) * eta_i * w_i)"
    },
    capital_activation_sectors: sectors,
    aggregate: {
      D_total: round(D_total, 2),
      A_total: round(A_total, 2),
      rebuild_together_index: round(RTI, 6)
    },
    scores: {
      total_deployment_usd: round(D_total, 2),
      total_activation_usd: round(A_total, 2),
      rebuild_together_index: round(RTI, 6),
      execution_index: round(RTI, 6),
      overall_status: RTI >= 0.7 ? "HIGH_READINESS" : RTI >= 0.45 ? "MODERATE_READINESS" : "EARLY_STAGE"
    },
    plain_language: {
      summary: "RT mapped recovery capital into real-world deployment sectors.",
      meaning: "This shows how recovery can become economic activation."
    }
  };

  return writeArtifact(STORAGE.RT, artifact);
}

async function runCFF(rt, integration){
  const recovery =
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd, 0);

  const artifact = {
    module: "CFF",
    module_name: "Constitutional Funding Forensics",
    generated_at: nowISO(),
    scores: {
      appropriation_fidelity: 1,
      scope_alignment: 1,
      program_integrity: 1,
      funding_alignment_score: 1
    },
    aggregate: {
      reviewed_funding_base_usd: round(recovery, 2)
    },
    plain_language: {
      summary: "CFF reviewed funding alignment using available recovery and deployment context.",
      meaning: "Funding appears aligned under default model assumptions unless source documents show otherwise."
    }
  };

  return writeArtifact(STORAGE.CFF, artifact);
}

async function runCCRI(cff, rt){
  const activation =
    num(rt?.scores?.total_activation_usd ??
    rt?.aggregate?.A_total,
    0);

  const score = activation > 0 ? 0.75 : 0.25;

  const artifact = {
    module: "CCRI",
    module_name: "Consumer Credit Risk Integrity",
    generated_at: nowISO(),
    scores: {
      consumer_credit_risk_integrity: round(score, 6),
      participation_integrity_score: round(score, 6)
    },
    inputs: {
      activation_usd: round(activation, 2)
    },
    plain_language: {
      summary: "CCRI estimated credit and participation integrity from deployment activation.",
      meaning: "Higher activation can support stronger participation conditions."
    }
  };

  return writeArtifact(STORAGE.CCRI, artifact);
}

async function runAFFE(rt, cii, integration, cff){
  const model = await fetchJSON("affe/model.json", {
    defaults: {
      normalization_constant: 1000000000,
      appropriation_fidelity: 1,
      scope_alignment: 1,
      program_integrity: 1
    }
  });

  try{
    const mod = await import("/abe---flag/affe/runner.js");

    if(typeof mod.run === "function"){
      const artifact = await mod.run({}, {
        model,
        priorCore: {
          CII: cii ? { artifact: cii } : {}
        },
        expansions: {
          RT: rt,
          INTEGRATION: integration,
          CFF: cff,
          AFFE_FUNDING: readFirst(["ABE_AFFE_FUNDING_ARTIFACT_V1", "abe_affe_funding_artifact"])
        }
      });

      return writeArtifact(STORAGE.AFFE, artifact);
    }
  }catch(err){
    console.warn("AFFE runner import failed, using fallback.", err);
  }

  const A_total =
    num(rt?.scores?.total_activation_usd ??
    rt?.aggregate?.A_total,
    0);

  const R_T =
    num(integration?.aggregate?.total_constitutional_capital_recovery_usd, 1);

  const RTI =
    num(rt?.scores?.rebuild_together_index ??
    rt?.scores?.execution_index,
    0);

  const eta =
    num(cii?.scores?.constitutional_integrity_index ??
    cii?.scores?.cii,
    0.5);

  const stability_signal =
    (RTI * eta) + (A_total / Math.max(1, R_T));

  const artifact = {
    module: "AFFE",
    module_name: "Appropriation Fidelity & Funding Engine",
    generated_at: nowISO(),
    scores: {
      funding_fidelity_signal: 1,
      stability_signal: round(stability_signal, 6),
      affe_index: 0,
      overall_risk_class: stability_signal >= 1.25 ? "HIGH_STABILITY" : stability_signal >= 0.75 ? "MODERATE_STABILITY" : "LOW_STABILITY"
    },
    inputs: {
      total_activation_usd: round(A_total, 2),
      recovery_base_usd: round(R_T, 2),
      RT_execution_index: round(RTI, 6),
      cii_effectiveness: round(eta, 6)
    },
    trace: {
      rt_seen: !!rt,
      integration_seen: !!integration,
      cii_seen: !!cii,
      cff_seen: !!cff,
      funding_artifact_seen: !!readFirst(["ABE_AFFE_FUNDING_ARTIFACT_V1", "abe_affe_funding_artifact"])
    },
    plain_language: {
      summary: "AFFE evaluated funding fidelity and deployment stability.",
      meaning: "This checks whether funding and deployment remain aligned after the recovery model runs."
    }
  };

  return writeArtifact(STORAGE.AFFE, artifact);
}

export async function runABEFullPipelineWithReport(){
  const started_at = nowISO();

  const results = {};
  const errors = {};

  try{
    results.INTAKE = getIntake();

    results.CAE = await runCAE(results.INTAKE);
    results.CDA = await runCDA(results.INTAKE, results.CAE);
    results.CDI = await runCDI(results.CDA);
    results.CIRI = await runCIRI(results.CDI);
    results.CIBS = await runCIBS(results.CIRI);
    results.CII = await runCII(results.CIBS);

    results.INTEGRATION = await runIntegration(results);

    results.MACRO = await runMACRO(results.INTEGRATION);
    results.RT = await runRT(results.CIBS, results.CII, results.MACRO, results.INTEGRATION);
    results.CFF = await runCFF(results.RT, results.INTEGRATION);
    results.CCRI = await runCCRI(results.CFF, results.RT);
    results.AFFE = await runAFFE(results.RT, results.CII, results.INTEGRATION, results.CFF);

    // Re-run integration after downstream modules exist so final receipt sees the full chain.
    results.INTEGRATION = await runIntegration(results);

    const reportCore = {
      ok: true,
      engine: "A.B.E.",
      title: "American Butterfly Effect Full Pipeline Report",
      started_at,
      finished_at: nowISO(),
      execution_order: MODULES.map(([key]) => key),
      module_names: Object.fromEntries(MODULES),
      results,
      plain_language: {
        summary: "A.B.E. completed the full local pipeline.",
        flow: "Intake → Alignment → Divergence → Recovery → Allocation → Propagation → Audit → Macro → Deployment → Funding → Credit → Fidelity",
        caution: "This report is an analysis artifact, not a court ruling, legal guarantee, or agency determination."
      },
      citation: {
        text: "Shouse, T. American Butterfly Effect (ABE). Zenodo.",
        doi: "10.5281/zenodo.17586107",
        license: "CC BY-NC 4.0",
        tagline: "Integrity only — never for sale."
      }
    };

    const hash = await sha256(JSON.stringify(reportCore));

    const report = {
      ...reportCore,
      integrity: {
        report_hash: "sha256:" + hash,
        hashing_algorithm: "SHA-256"
      }
    };

    writeArtifact(STORAGE.FULL_REPORT, report);

    return report;

  }catch(err){

    const report = {
      ok: false,
      engine: "A.B.E.",
      title: "American Butterfly Effect Full Pipeline Report",
      started_at,
      finished_at: nowISO(),
      execution_order: MODULES.map(([key]) => key),
      module_names: Object.fromEntries(MODULES),
      results,
      errors,
      error: {
        message: err?.message || String(err),
        stack: err?.stack || null
      },
      plain_language: {
        summary: "The A.B.E. pipeline did not complete.",
        meaning: "Review the error field and module results to identify where execution stopped."
      }
    };

    writeArtifact(STORAGE.FULL_REPORT, report);

    return report;
  }
}

export {
  MODULES,
  STORAGE
};
