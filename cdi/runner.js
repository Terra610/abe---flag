export async function run(scenario = {}, ctx = {}) {
  const cda = scenario?.derived?.cda || scenario?.inputs?.cda || null;

  const model = await loadJson("./model.json");
  const csvRows = await loadCsv("./divergence.csv");

  const domains = Array.isArray(model?.domains) ? model.domains : [];
  const header = csvRows.length ? csvRows[0] : [];
  const body = csvRows.slice(1);

  const categoryIndex = header.indexOf("Category");
  const divergenceIndex = header.indexOf("Divergence");
  const confidenceIndex = header.indexOf("Confidence");

  const domainScores = [];
  let weightedDivergence = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const domainName = domain?.name || "";
    const domainWeight = Number(domain?.weight) || 0;

    const matchingRow = body.find(row => String(row[categoryIndex] || "").trim() === domainName);

    let rawDivergence = matchingRow ? Number(matchingRow[divergenceIndex]) || 0 : 0;
    const rawConfidence = matchingRow ? Number(matchingRow[confidenceIndex]) || 0 : 0;

    rawDivergence = applyCdaAdjustment(domain.key, rawDivergence, cda);

    const weightedDomainDivergence = round4(rawDivergence * domainWeight);
    const weightedDomainConfidence = round4(rawConfidence * domainWeight);

    weightedDivergence += weightedDomainDivergence;
    weightedConfidence += weightedDomainConfidence;
    totalWeight += domainWeight;

    domainScores.push({
      key: domain.key,
      category: domainName,
      weight: domainWeight,
      divergence: rawDivergence,
      confidence: rawConfidence,
      weighted_divergence: weightedDomainDivergence,
      weighted_confidence: weightedDomainConfidence,
      sigma_band: classifySigma(rawDivergence)
    });
  }

  const normalizedWeightedDivergence =
    totalWeight > 0 ? round4(weightedDivergence / totalWeight) : 0;

  const normalizedWeightedConfidence =
    totalWeight > 0 ? round4(weightedConfidence / totalWeight) : 0;

  const overallSigmaBand = classifySigma(normalizedWeightedDivergence);

  const highestDomain = domainScores
    .slice()
    .sort((a, b) => b.weighted_divergence - a.weighted_divergence)[0];

  const findings = [];

  if (normalizedWeightedDivergence > 0) {
    findings.push(`Weighted constitutional divergence computed at ${normalizedWeightedDivergence}.`);
  } else {
    findings.push("No constitutional divergence was computed from the current domain inputs.");
  }

  if (normalizedWeightedConfidence > 0) {
    findings.push(`Weighted confidence computed at ${normalizedWeightedConfidence}.`);
  }

  if (highestDomain) {
    findings.push(`Highest weighted divergence domain: ${highestDomain.category} (${highestDomain.weighted_divergence}).`);
  }

  if (cda?.void_ab_initio_flag || cda?.result?.void_ab_initio_flag) {
    findings.push("CDA triggered void ab initio, which elevated domain severity in the constitutional divergence profile.");
  }

  return {
    module: "cdi",
    version: model?.version || "1.0.0",
    timestamp: new Date().toISOString(),
    input: {
      model_version: model?.version || "unknown",
      source_file: "divergence.csv"
    },
    result: {
      domain_scores: domainScores,
      weighted_divergence: normalizedWeightedDivergence,
      weighted_confidence: normalizedWeightedConfidence,
      overall_sigma_band: overallSigmaBand
    },
    findings,
    plain_language: buildPlainLanguage({
      weightedDivergence: normalizedWeightedDivergence,
      weightedConfidence: normalizedWeightedConfidence,
      overallSigmaBand,
      highestDomain
    })
  };
}

function applyCdaAdjustment(domainKey, divergence, cda) {
  const result = cda?.result || cda || {};
  let adjusted = Number(divergence) || 0;

  if (result.void_ab_initio_flag) {
    adjusted += 0.15;
  }

  if (result.ultra_vires_flag) {
    adjusted += 0.10;
  }

  if (result.off_mission_flag) {
    adjusted += 0.08;
  }

  if (result.funding_scope_conflict && ["healthcare", "housing", "education", "transport"].includes(domainKey)) {
    adjusted += 0.05;
  }

  if (result.doctrine_triggers?.includes("commerce_nexus_failure") && domainKey === "commerce") {
    adjusted += 0.10;
  }

  if (result.doctrine_triggers?.includes("jurisdiction_failure") && domainKey === "justice") {
    adjusted += 0.08;
  }

  return Math.min(1, round4(adjusted));
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load JSON: ${path}`);
  return res.json();
}

async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load CSV: ${path}`);
  const text = await res.text();
  return text.trim().split(/\r?\n/).map(line => line.split(",").map(cell => cell.trim()));
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}

function classifySigma(divergence) {
  const d = Number(divergence) || 0;
  if (d >= 0.80) return "4σ severe divergence";
  if (d >= 0.60) return "3σ high divergence";
  if (d >= 0.40) return "2σ material divergence";
  if (d >= 0.20) return "1σ emerging divergence";
  return "baseline-aligned";
}

function buildPlainLanguage(data) {
  if ((Number(data.weightedDivergence) || 0) === 0) {
    return {
      status: "aligned",
      explanation:
        "CDI did not compute measurable constitutional divergence from the current domain inputs.",
      what_to_do_next: [
        "Confirm divergence.csv values are populated correctly.",
        "Confirm domain names match model.json.",
        "Confirm CDA is supplying conflict flags when present."
      ]
    };
  }

  return {
    status: "divergence_measured",
    explanation:
      "CDI computed weighted constitutional divergence across the defined domains. This measures how far the current profile departs from constitutional fidelity.",
    what_this_output_means: [
      `Weighted divergence: ${data.weightedDivergence}`,
      `Weighted confidence: ${data.weightedConfidence}`,
      `Overall sigma band: ${data.overallSigmaBand}`,
      data.highestDomain
        ? `Highest divergence domain: ${data.highestDomain.category}`
        : "No dominant divergence domain was identified."
    ]
  };
      }
