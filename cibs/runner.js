export async function run(scenario = {}, ctx = {}) {
  const ciri = scenario?.derived?.ciri || scenario?.inputs?.ciri || {};
  const availableRecovery =
    Number(ciri?.total_recovery) ||
    Number(ciri?.net_modeled_recovery) ||
    Number(ciri?.result?.net_modeled_recovery) ||
    0;

  const allocationFramework = [
    {
      category: "Community Housing Support",
      percent: 25,
      purpose: "Keep families stable and stop generational collapse."
    },
    {
      category: "Youth / Education / Aftercare",
      percent: 20,
      purpose: "Restore equal opportunity and protect the next generation."
    },
    {
      category: "Veterans & Emergency Relief",
      percent: 10,
      purpose: "Support recovery and avoid system re-entry."
    },
    {
      category: "Local Small Business Recovery",
      percent: 15,
      purpose: "Stimulate jobs and independence."
    },
    {
      category: "Digital Access / Connectivity",
      percent: 5,
      purpose: "Ensure participation and equal voice."
    },
    {
      category: "Legal Defense / Rights Enforcement",
      percent: 10,
      purpose: "Maintain constitutional compliance and prevent relapse."
    },
    {
      category: "Data Transparency / Public Dashboard",
      percent: 5,
      purpose: "Keep accountability visible to the people."
    },
    {
      category: "Administration & Compliance",
      percent: 10,
      purpose: "Operate efficiently and verify integrity."
    }
  ];

  const allocations = allocationFramework.map(item => {
    const amount = round2((availableRecovery * item.percent) / 100);
    return {
      category: item.category,
      percent: item.percent,
      amount,
      purpose: item.purpose,
      monthly_amount: round2(amount / 12),
      start_month: "Month 1",
      end_month: "Month 12",
      recipient: inferRecipient(item.category)
    };
  });

  const totalPercent = allocationFramework.reduce((sum, item) => sum + item.percent, 0);
  const programCount = allocations.filter(item => item.amount > 0).length;

  const findings = [];
  if (availableRecovery > 0) {
    findings.push(`Recovery pool available: ${formatMoney(availableRecovery)}.`);
    findings.push(`CIBS allocated recovery across ${programCount} active categories.`);
  } else {
    findings.push("No recovery pool was available, so no active allocations were modeled.");
  }

  return {
    module: "cibs",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      ciri
    },
    budget: {
      available_budget: availableRecovery,
      total_percent: totalPercent,
      allocations,
      program_count: programCount
    },
    findings,
    plain_language: buildPlainLanguage({
      availableRecovery,
      programCount,
      allocations
    })
  };
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
  if ((Number(data.availableRecovery) || 0) === 0) {
    return {
      status: "zero_state",
      explanation:
        "CIBS did not receive a recovery pool from CIRI, so no meaningful community budget could be built from this run.",
      what_to_do_next: [
        "Strengthen the upstream divergence and exposure inputs.",
        "Confirm CIRI is producing a nonzero net modeled recovery value.",
        "Rerun the engine with fuller case details."
      ]
    };
  }

  return {
    status: "budget_modeled",
    explanation:
      "CIBS converted recoverable value into a visible reinvestment structure. This shows how prevented harm can become housing support, education, legal defense, small business recovery, and other community gains.",
    what_this_output_means: [
      `${formatMoney(data.availableRecovery)} is available for structured reinvestment.`,
      `${data.programCount} allocation categories received active funding.`,
      "The recovery pool is no longer abstract. It is now mapped into visible community use."
    ]
  };
  }
