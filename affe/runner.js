export async function run(scenario = {}, ctx = {}) {
  const cda = scenario?.derived?.cda || {};
  const cff = scenario?.derived?.cff || {};

  const divergence = Number(cda?.divergence_score) || 0;
  const offMission = Number(cff?.totals?.OFF_MISSION) || 0;
  const unclear = Number(cff?.totals?.UNCLEAR) || 0;

  const baseDivergenceCost = divergence * 125000;
  const offMissionCost = offMission * 250000;
  const uncertaintyCost = unclear * 50000;

  const estimatedTotalExposure = baseDivergenceCost + offMissionCost + uncertaintyCost;

  const highlights = [];

  if (divergence > 0) {
    highlights.push(`Divergence detected: ${divergence}`);
  }
  if (offMission > 0) {
    highlights.push(`Off-mission funding flags: ${offMission}`);
  }
  if (unclear > 0) {
    highlights.push(`Unclear funding or scope conditions: ${unclear}`);
  }
  if (estimatedTotalExposure === 0) {
    highlights.push("No measurable exposure was modeled from the current input.");
  }

  return {
    module: "AFFE",
    module_version: "2.0",
    generated_at: new Date().toISOString(),
    result: {
      estimated_total_exposure: estimatedTotalExposure
    },
    highlights,
    notes: "AFFE runner is modeling direct exposure from divergence and funding-scope mismatch."
  };
}
