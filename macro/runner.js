export async function run(scenario = {}, ctx = {}) {
  const cii = scenario?.derived?.cii || scenario?.inputs?.cii || {};
  const result = cii?.result || cii || {};

  const totalFundedAmount = Number(result?.total_funded_amount) || 0;
  const totalUnits = Number(result?.total_units) || 0;
  const portfolio = Array.isArray(result?.portfolio) ? result.portfolio : [];

  const sectorMultipliers = {
    housing: 1.85,
    youth_programs: 1.65,
    emergency_relief: 1.35,
    micro_reinvestment: 2.10,
    digital_access: 1.45,
    rights_enforcement: 1.25,
    public_transparency: 1.20,
    compliance_operations: 1.15,
    community_support: 1.30
  };

  let totalProjectedUplift = 0;
  let totalJobsEquivalent = 0;

  const sectorBreakdown = portfolio.map(item => {
    const allocated = Number(item.allocated_usd) || 0;
    const deploymentType = item.deployment_type || "community_support";
    const multiplier = sectorMultipliers[deploymentType] || 1.30;

    const projectedUplift = round2(allocated * multiplier);
    const jobsEquivalent = Math.floor(projectedUplift / 125000);

    totalProjectedUplift += projectedUplift;
    totalJobsEquivalent += jobsEquivalent;

    return {
      project_id: item.project_id,
      category: item.category,
      deployment_type: deploymentType,
      allocated_usd: allocated,
      multiplier,
      projected_uplift: projectedUplift,
      jobs_equivalent: jobsEquivalent,
      estimated_units: Number(item.estimated_units) || 0
    };
  });

  const roiRatio = totalFundedAmount > 0
    ? round2(totalProjectedUplift / totalFundedAmount)
    : 0;

  const findings = [];
  if (totalFundedAmount > 0) {
    findings.push(`Total funded amount entering Macro: ${formatMoney(totalFundedAmount)}.`);
    findings.push(`Projected macro uplift: ${formatMoney(totalProjectedUplift)}.`);
    findings.push(`Estimated jobs equivalent: ${totalJobsEquivalent}.`);
    findings.push(`ROI ratio: ${roiRatio}x.`);
  } else {
    findings.push("No funded implementation portfolio was available, so no macro uplift could be modeled.");
  }

  return {
    module: "macro",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      cii
    },
    result: {
      total_funded_amount: totalFundedAmount,
      total_units: totalUnits,
      projected_macro_uplift: totalProjectedUplift,
      jobs_equivalent: totalJobsEquivalent,
      roi_ratio: roiRatio,
      sector_breakdown: sectorBreakdown
    },
    findings,
    plain_language: buildPlainLanguage({
      totalFundedAmount,
      totalUnits,
      totalProjectedUplift,
      totalJobsEquivalent,
      roiRatio
    })
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(n) || 0);
}

function buildPlainLanguage(data) {
  if ((Number(data.totalFundedAmount) || 0) === 0) {
    return {
      status: "zero_state",
      explanation:
        "Macro did not model broader uplift because no funded implementation portfolio was available from CII.",
      what_to_do_next: [
        "Confirm CIRI produced recovery.",
        "Confirm CIBS produced an active budget.",
        "Confirm CII produced a funded implementation portfolio."
      ]
    };
  }

  return {
    status: "uplift_modeled",
    explanation:
      "Macro translated the implementation portfolio into a broader system-level uplift estimate. This shows how lawful realignment can move beyond individual recovery and into visible economic expansion.",
    what_this_output_means: [
      `${formatMoney(data.totalFundedAmount)} entered the macro model as funded implementation.`,
      `${formatMoney(data.totalProjectedUplift)} was projected as broader macro uplift.`,
      `${data.totalJobsEquivalent} jobs-equivalent units were modeled.`,
      `${data.roiRatio}x ROI was projected from the current portfolio.`
    ]
  };
}
