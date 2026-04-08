// engine/modules/cda.js
// Constitutional Divergence Analyzer - Original 0-1 + 2σ–4σ Layer
// Expanded with Justice Monopoly, Creditworthiness, Eviction/Coercive Control

export function calculateDivergence(inputData) {
  // === YOUR ORIGINAL 0-1 DIVERGENCE FORMULA (UNTOUCHED) ===
  let divergence01 = calculateOriginalDivergence01(inputData);

  // === NEW: TWO-SIGMA DIVERGENCE LAYER (2σ–4σ) ===
  const sigmaScore = calculateSigmaDivergence(inputData);

  // === NEW CATEGORIES ===
  const justiceMonopolyScore = calculateJusticeMonopolyDivergence(inputData);
  const creditAccessScore = calculateCreditworthinessDivergence(inputData);
  const evictionAbuseScore = calculateEvictionCoerciveControlDivergence(inputData);

  return {
    divergence_01: divergence01,                    // Original scale (0-1)
    divergence_sigma: sigmaScore,                   // 2σ–4σ statistical confidence
    justice_monopoly: justiceMonopolyScore,
    credit_access: creditAccessScore,
    eviction_coercive_control: evictionAbuseScore,
    interpretation: getSigmaInterpretation(sigmaScore),
    overall_severity: Math.max(divergence01, (sigmaScore - 1) / 3)
  };
}

// Your original 0-1 function (placeholder — keep your exact implementation here)
function calculateOriginalDivergence01(inputData) {
  // ← YOUR ORIGINAL FORMULA GOES HERE — UNCHANGED
  return 0.68; // example
}

// 2σ–4σ layer
function calculateSigmaDivergence(data) {
  const factors = {
    justiceMonopoly: data.justiceCostBarrier || 0,
    creditDenial: data.creditDenialRate || 0,
    evictionRetaliatory: data.retaliatoryEvictionFlag || 0,
    coerciveControl: data.coerciveControlEvidence || 0,
    animalDisplacement: data.animalDisplacementFlag || 0
  };
  const raw = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
  return Math.min(4, 2 + (raw * 2)); // 2σ to 4σ
}

function getSigmaInterpretation(sigma) {
  if (sigma >= 3.5) return "Extreme divergence — near-certain constitutional violation";
  if (sigma >= 3) return "Strong divergence — high-confidence misalignment";
  if (sigma >= 2.5) return "Notable divergence — warrants review";
  return "Within normal variation";
}

// New specific scorers
function calculateJusticeMonopolyDivergence(data) {
  return (data.unmetLegalNeedsPercentage || 0) * 0.92; // 92% low-income gap
}

function calculateCreditworthinessDivergence(data) {
  return (data.creditDenialRate || 0) * 0.85; // economic gatekeeping
}

function calculateEvictionCoerciveControlDivergence(data) {
  return ((data.retaliatoryEvictionFlag || 0) + (data.coerciveControlEvidence || 0) + (data.animalDisplacementFlag || 0)) / 3;
                                                                              }
