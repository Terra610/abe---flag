export async function run(scenario = {}, ctx = {}) {
  const intake = scenario?.inputs?.intake || {};
  const cda = scenario?.derived?.cda || {};
  const cff = scenario?.derived?.cff || {};
  const affe = scenario?.derived?.affe || {};

  const divergenceScore = Number(cda?.divergence_score) || 0;
  const offMission = Number(cff?.totals?.OFF_MISSION) || 0;
  const unclear = Number(cff?.totals?.UNCLEAR) || 0;
  const exposure = Number(affe?.result?.estimated_total_exposure) || 0;

  const source = intake?.source || {};
  const rawText = [source.title, source.type, source.jurisdiction, source.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const enforcementSignals = countMatches(rawText, [
    "traffic stop",
    "citation",
    "arrest",
    "detained",
    "charge",
    "charged",
    "prosecution",
    "suspension",
    "revocation",
    "jail",
    "incarceration"
  ]);

  const suppressionSignals = countMatches(rawText, [
    "job",
    "work",
    "employment",
    "housing",
    "homeless",
    "license",
    "mobility",
    "transportation",
    "credit",
    "insurance",
    "court",
    "fines"
  ]);

  const rightsSignals = countMatches(rawText, [
    "private",
    "non-commercial",
    "constitutional",
    "rights",
    "due process",
    "equal protection",
    "preemption",
    "authority",
    "jurisdiction"
  ]);

  const ciriScore =
    divergenceScore +
    offMission * 2 +
    unclear +
    enforcementSignals +
    suppressionSignals +
    rightsSignals;

  const casesAvoided = Math.max(0, (divergenceScore * 8) + (offMission * 5) + enforcementSignals);
  const jailDaysAvoided = Math.max(0, (casesAvoided * 14) + (divergenceScore * 10));
  const participationRestored = Math.max(0, (divergenceScore * 25) + (suppressionSignals * 15) + (rightsSignals * 10));

  const directSavings = exposure;
  const indirectSavings = Math.round(participationRestored * 1800);
  const deferredSavings = Math.round(jailDaysAvoided * 110);
  const transitionCosts = Math.round((directSavings + indirectSavings + deferredSavings) * 0.08);

  const netModeledRecovery = Math.max(
    0,
    directSavings + indirectSavings + deferredSavings - transitionCosts
  );

  const findings = [];

  if (divergenceScore > 0) findings.push(`Divergence score contributed ${divergenceScore} points to recovery modeling.`);
  if (offMission > 0) findings.push(`Off-mission funding conditions contributed ${offMission} weighted recovery triggers.`);
  if (unclear > 0) findings.push(`Unclear funding or scope conditions contributed ${unclear} cautionary recovery triggers.`);
  if (enforcementSignals > 0) findings.push(`Enforcement signals detected: ${enforcementSignals}.`);
  if (suppressionSignals > 0) findings.push(`Economic suppression signals detected: ${suppressionSignals}.`);
  if (rightsSignals > 0) findings.push(`Rights and authority signals detected: ${rightsSignals}.`);
  if (netModeledRecovery === 0) findings.push("No recoverable value was modeled from the current input set.");

  return {
    module: "ciri",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      intake,
      cda,
      cff,
      affe
    },
    result: {
      ciri_score: ciriScore,
      cases_avoided: casesAvoided,
      jail_days_avoided: jailDaysAvoided,
      participation_restored: participationRestored,
      direct_savings: directSavings,
      indirect_savings: indirectSavings,
      deferred_savings: deferredSavings,
      transition_costs: transitionCosts,
      net_modeled_recovery: netModeledRecovery,
      findings
    },
    plain_language: buildPlainLanguage({
      ciriScore,
      casesAvoided,
      jailDaysAvoided,
      participationRestored,
      netModeledRecovery
    })
  };
}

function countMatches(text, phrases) {
  let count = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) count += 1;
  }
  return count;
}

function buildPlainLanguage(data) {
  if ((Number(data.netModeledRecovery) || 0) === 0) {
    return {
      status: "zero_state",
      explanation:
        "CIRI did not model recoverable value from the current run. That usually means the upstream divergence, funding mismatch, or exposure signals were too weak or too incomplete.",
      what_to_do_next: [
        "Use the exact enforcement language, citation text, or court language.",
        "Include the legal authority they relied on.",
        "Include facts showing private or non-commercial activity if that is part of the conflict."
      ]
    };
  }

  return {
    status: "recovery_modeled",
    explanation:
      "CIRI translated the detected divergence and modeled exposure into human and economic recovery outputs. This shows what harm can be prevented and what value can be restored through lawful realignment.",
    what_this_output_means: [
      `${data.casesAvoided} cases could potentially be avoided.`,
      `${data.jailDaysAvoided} jail days could potentially be avoided.`,
      `${data.participationRestored} units of civic and economic participation were modeled as restorable.`,
      `${formatMoney(data.netModeledRecovery)} was modeled as recoverable value.`
    ]
  };
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(n) || 0);
    }
