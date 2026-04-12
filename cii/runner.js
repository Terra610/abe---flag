export async function run(scenario = {}, ctx = {}) {
  const cibs = scenario?.derived?.cibs || scenario?.inputs?.cibs || {};
  const budget =
    cibs?.budget ||
    {};

  const availableBudget = Number(budget?.available_budget) || 0;
  const allocations = Array.isArray(budget?.allocations) ? budget.allocations : [];

  const portfolio = allocations
    .filter(item => Number(item.amount) > 0)
    .map((item, index) => {
      const allocated = round2(Number(item.amount) || 0);
      const monthly = round2(Number(item.monthly_amount) || allocated / 12);

      return {
        project_id: `cii-${index + 1}`,
        category: item.category,
        allocated_usd: allocated,
        monthly_usd: monthly,
        purpose: item.purpose || "",
        recipient: item.recipient || inferRecipient(item.category),
        deployment_type: inferDeploymentType(item.category),
        estimated_units: estimateUnits(item.category, allocated),
        start_month: item.start_month || "Month 1",
        end_month: item.end_month || "Month 12"
      };
    });

  const totalUnits = portfolio.reduce((sum, item) => sum + (Number(item.estimated_units) || 0), 0);
  const totalFundedAmount = round2(
    portfolio.reduce((sum, item) => sum + (Number(item.allocated_usd) || 0), 0)
  );

  const findings = [];
  if (totalFundedAmount > 0) {
    findings.push(`Portfolio funded amount: ${formatMoney(totalFundedAmount)}.`);
    findings.push(`Estimated deployment units: ${totalUnits}.`);
    findings.push(`Funded portfolio entries: ${portfolio.length}.`);
  } else {
    findings.push("No funded portfolio could be built because CIBS did not provide an active budget.");
  }

  return {
    module: "cii",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      cibs
    },
    result: {
      total_units: totalUnits,
      total_funded_amount: totalFundedAmount,
      portfolio
    },
    findings,
    plain_language: buildPlainLanguage({
      totalUnits,
      totalFundedAmount,
      portfolioCount: portfolio.length
    })
  };
}

function estimateUnits(category, allocated) {
  const amount = Number(allocated) || 0;

  const unitCosts = {
    "Community Housing Support": 6500,
    "Youth / Education / Aftercare": 4000,
    "Veterans & Emergency Relief": 5000,
    "Local Small Business Recovery": 12000,
    "Digital Access / Connectivity": 1500,
    "Legal Defense / Rights Enforcement": 3500,
    "Data Transparency / Public Dashboard": 8000,
    "Administration & Compliance": 6000
  };

  const costPerUnit = unitCosts[category] || 5000;
  return Math.floor(amount / costPerUnit);
}

function inferRecipient(category) {
  const map = {
    "Community Housing Support": "Local housing partners / family stabilization programs",
    "Youth / Education / Aftercare": "Schools / youth programs / aftercare providers",
    "Veterans & Emergency Relief": "Veterans services / emergency response programs",
    "Local Small Business Recovery": "Local business recovery and workforce partners",
    "Digital Access / Connectivity": "Community connectivity / digital inclusion programs",
    "Legal Defense / Rights Enforcement": "Legal aid / rights defense / compliance review",
    "Data Transparency / Public Dashboard": "Public dashboard / reporting / transparency office",
    "Administration & Compliance": "Program administration / audit / compliance oversight"
  };
  return map[category] || "Community program partner";
}

function inferDeploymentType(category) {
  const map = {
    "Community Housing Support": "stabilization_support",
    "Youth / Education / Aftercare": "youth_programs",
    "Veterans & Emergency Relief": "emergency_relief",
    "Local Small Business Recovery": "micro_reinvestment",
    "Digital Access / Connectivity": "digital_access",
    "Legal Defense / Rights Enforcement": "rights_enforcement",
    "Data Transparency / Public Dashboard": "public_transparency",
    "Administration & Compliance": "compliance_operations"
  };
  return map[category] || "community_support";
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
        "CII did not build a funded implementation portfolio because no active CIBS budget was available from the current run.",
      what_to_do_next: [
        "Confirm that CIRI produced recoverable value.",
        "Confirm that CIBS produced a nonzero available budget.",
        "Rerun the engine with fuller upstream case detail if the output is still zero."
      ]
    };
  }

  return {
    status: "portfolio_built",
    explanation:
      "CII converted the CIBS reinvestment budget into visible implementation units. This is the layer where recovery becomes deployable community action.",
    what_this_output_means: [
      `${formatMoney(data.totalFundedAmount)} is represented in the implementation portfolio.`,
      `${data.portfolioCount} funded portfolio entries were created.`,
      `${data.totalUnits} estimated deployment units were modeled from the current budget.`
    ]
  };
    }
