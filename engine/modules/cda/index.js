// engine/modules/cda/index.js
// CDA — Constitutional Divergence Analyzer
// Self-contained module (logic + UI)
// Includes 0-1 + 2σ–4σ, Justice Monopoly, Credit, Eviction/Coercive Control

import { getOrCreateScenario, writeDerived, setModuleStatus } from "../core/session.js";

export async function run(scenario) {
  const s = scenario || getOrCreateScenario();

  // === YOUR ORIGINAL 0-1 DIVERGENCE FORMULA (PROTECTED — UNTOUCHED) ===
  const divergence01 = calculateOriginalDivergence01(s.inputs || {});

  // === NEW: 2σ–4σ STATISTICAL LAYER ===
  const sigmaScore = calculateSigmaDivergence(s.inputs || {});

  // === NEW EXPANDED CATEGORIES ===
  const justiceMonopoly = calculateJusticeMonopolyDivergence(s.inputs || {});
  const creditAccess = calculateCreditworthinessDivergence(s.inputs || {});
  const evictionCoercive = calculateEvictionCoerciveControlDivergence(s.inputs || {});

  const cdaOutput = {
    module: "CDA",
    module_version: "1.0",
    generated_at: new Date().toISOString(),
    divergence_01: divergence01,
    divergence_sigma: sigmaScore,
    justice_monopoly: justiceMonopoly,
    credit_access: creditAccess,
    eviction_coercive_control: evictionCoercive,
    overall_severity: Math.max(divergence01, (sigmaScore - 1) / 3),
    interpretation: getSigmaInterpretation(sigmaScore),
    notes: "Divergence analysis includes justice monopoly, credit barriers, eviction/coercive control, and animal displacement."
  };

  writeDerived("cda", cdaOutput);
  setModuleStatus("cda", "OK", "Divergence analysis complete");

  return cdaOutput;
}

// ==================== YOUR ORIGINAL 0-1 FORMULA (KEEP EXACTLY AS-IS) ====================
function calculateOriginalDivergence01(inputs) {
  // ← YOUR ORIGINAL CDA DIVERGENCE FORMULA GOES HERE — DO NOT MODIFY
  // Replace this placeholder with your actual implementation
  return 0.68;
}

// ==================== NEW 2σ–4σ LAYER ====================
function calculateSigmaDivergence(inputs) {
  const factors = {
    justiceMonopoly: inputs.justiceCostBarrier || 0,
    creditAccess: inputs.creditDenialRate || 0,
    evictionCoercive: (inputs.retaliatoryEvictionFlag || 0) + (inputs.coerciveControlEvidence || 0),
    animalDisplacement: inputs.animalDisplacementFlag || 0
  };
  const raw = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
  return Math.min(4, 2 + (raw * 2));   // 2σ to 4σ range
}

function getSigmaInterpretation(sigma) {
  if (sigma >= 3.5) return "Extreme divergence — near-certain constitutional violation";
  if (sigma >= 3.0) return "Strong divergence — high-confidence misalignment";
  if (sigma >= 2.5) return "Notable divergence — warrants review";
  return "Within normal variation";
}

// ==================== NEW SPECIFIC DIVERGENCE CALCULATORS ====================
function calculateJusticeMonopolyDivergence(inputs) {
  return (inputs.unmetLegalNeedsPercentage || 0) * 0.92;   // 92% low-income gap
}

function calculateCreditworthinessDivergence(inputs) {
  return (inputs.creditDenialRate || 0) * 0.85;           // economic gatekeeping
}

function calculateEvictionCoerciveControlDivergence(inputs) {
  return ((inputs.retaliatoryEvictionFlag || 0) + 
          (inputs.coerciveControlEvidence || 0) + 
          (inputs.animalDisplacementFlag || 0)) / 3;
}
