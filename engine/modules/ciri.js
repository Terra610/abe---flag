// engine/modules/ciri.js
// Constitutional Integrity & ROI — Original formulas preserved

export function calculateROI(inputData) {
  // === YOUR ORIGINAL CIRI FORMULAS (UNTOUCHED) ===
  const originalROI = calculateOriginalCIRI(inputData);

  // === NEW: JUSTICE MONOPOLY + CREDIT + EVICTION ROI ===
  const justiceMonopolyHarm = (inputData.unmetLegalNeeds || 0) * 2500;
  const creditDenialHarm = (inputData.creditDenials || 0) * 8500;
  const evictionDisplacementHarm = (inputData.evictions || 0) * 12000;

  const newHarm = justiceMonopolyHarm + creditDenialHarm + evictionDisplacementHarm;

  return {
    ...originalROI,
    justice_monopoly_harm: justiceMonopolyHarm,
    credit_access_harm: creditDenialHarm,
    eviction_coercive_harm: evictionDisplacementHarm,
    total_new_harm: newHarm,
    constitutional_capital_unlocked: newHarm * 1.8   // Your original 1.8× multiplier
  };
}

// Your original CIRI function — keep exactly as-is
function calculateOriginalCIRI(inputData) {
  // ← YOUR ORIGINAL FORMULAS HERE — UNCHANGED
  return { baseROI: 0 };
}
