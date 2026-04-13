export async function run(scenario = {}, ctx = {}) {
  const model = await loadJson("./model.json");
  const csvRows = await loadCsv("./divergence.csv");

  const domains = Array.isArray(model?.domains) ? model.domains : [];
  const header = csvRows.length ? csvRows[0] : [];
  const body = csvRows.slice(1);

  const requiredColumns = ["Category", "Divergence", "Confidence"];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));

  if (!domains.length) {
    throw new Error("CDI model.json is missing or has no domains.");
  }

  if (missingColumns.length) {
    throw new Error(`CDI divergence.csv is missing required columns: ${missingColumns.join(", ")}`);
  }

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

    const rawDivergence = matchingRow ? Number(matchingRow[divergenceIndex]) || 0 : 0;
    const rawConfidence = matchingRow ? Number(matchingRow[confidenceIndex]) || 0 : 0;

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

  const findings = [];
  if (normalizedWeightedDivergence > 0) {
    findings.push(`Weighted constitutional divergence computed at ${normalizedWeightedDivergence}.`);
  } else {
    findings.push("No constitutional divergence was computed from the current CDI source data.");
  }

  if (normalizedWeightedConfidence > 0) {
    findings.push(`Weighted confidence computed at ${normalizedWeightedConfidence}.`);
  }

  const highestDomain = domainScores
    .slice()
    .sort((a, b) => (b.weighted_divergence - a.weighted_divergence))[0];

  if (highestDomain) {
    findings.push(
      `Highest weighted divergence domain: ${highestDomain.category} (${highestDomain.weighted_divergence}).`
    );
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

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load JSON: ${path}`);
  return res.json();
}

async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load CSV: ${path}`);
  const text = await res.text();
  return text
    .trim()
    .split(/\r?\n/)
    .map(line => splitCsvLine(line));
}

function splitCsvLine(line) {
  return line.split(",").map(cell => cell.trim());
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
        "Confirm the divergence.csv values are populated correctly.",
        "Confirm the domain names in divergence.csv match the names in model.json.",
        "Use updated divergence source data if you want a live constitutional deviation profile."
      ]
    };
  }

  return {
    status: "divergence_measured",
    explanation:
      "CDI computed weighted constitutional divergence across the defined domains. This output measures how far the current system profile departs from constitutional fidelity.",
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
