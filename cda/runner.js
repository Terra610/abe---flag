export async function run(scenario = {}, context = {}) {
  const intake = scenario?.inputs?.intake || {};

  const source = intake?.source || {};
  const text = String(source?.text || "").toLowerCase();
  const sourceType = String(source?.type || "").toLowerCase();
  const jurisdiction = String(source?.jurisdiction || "").toLowerCase();
  const title = String(source?.title || "").toLowerCase();

  const indicators = {
    commercial_terms: countMatches(text, [
      "commercial motor vehicle",
      "commerce",
      "for hire",
      "carrier",
      "cmv",
      "dot regulated",
      "safety sensitive"
    ]),
    private_terms: countMatches(text, [
      "private",
      "personal",
      "non-commercial",
      "citizen",
      "private travel",
      "private movement"
    ]),
    enforcement_terms: countMatches(text, [
      "traffic stop",
      "citation",
      "arrest",
      "detained",
      "suspension",
      "revocation",
      "compliance",
      "inspection",
      "probable cause"
    ]),
    funding_terms: countMatches(text, [
      "grant",
      "funding",
      "appropriation",
      "federal funds",
      "mcsap",
      "budget",
      "program"
    ]),
    ambiguity_terms: countMatches(text, [
      "interpretation",
      "undefined",
      "unclear",
      "ambiguous",
      "vague",
      "broadly construed"
    ])
  };

  let divergence = 0;
  const findings = [];
  const authorityTrace = [];

  if (!sourceType.trim()) {
    divergence += 1;
    findings.push("Source type is not specified.");
  }

  if (!jurisdiction.trim()) {
    divergence += 1;
    findings.push("Jurisdiction is not specified.");
  } else {
    authorityTrace.push(jurisdiction);
  }

  if (!text.trim() && !title.trim()) {
    divergence += 1;
    findings.push("No usable source text or title was provided.");
  }

  if (indicators.private_terms > 0 && indicators.commercial_terms > 0) {
    divergence += 2;
    findings.push("Commercial authority language appears alongside private/non-commercial activity language.");
  }

  if (indicators.enforcement_terms > 0 && indicators.private_terms > 0 && indicators.commercial_terms === 0) {
    divergence += 2;
    findings.push("Enforcement language appears with private/non-commercial activity without clear commercial trigger.");
  }

  if (indicators.ambiguity_terms > 0) {
    divergence += 1;
    findings.push("Ambiguity or interpretation language appears in the source.");
  }

  if (indicators.funding_terms > 0) {
    authorityTrace.push("funding_trace_present");
  }

  const alignmentStatus = divergence === 0 ? "aligned" : "divergent";

  const result = {
    alignment_status: alignmentStatus,
    divergence_score: divergence,
    authority_trace: authorityTrace,
    findings,
    indicators
  };

  return {
    module_version: "1.1.0",
    generated_at: new Date().toISOString(),
    summary: {
      avg_divergence: divergence,
      status: alignmentStatus
    },
    by_domain: authorityTrace,
    result,
    legal_explainer: buildLegalExplainer(result, intake)
  };
}

function countMatches(text, phrases) {
  let count = 0;
  for (const phrase of phrases) {
    if (text.includes(phrase)) {
      count += 1;
    }
  }
  return count;
}

function buildLegalExplainer(cdaResult, intake) {
  const divergence = Number(cdaResult?.divergence_score) || 0;
  const findings = Array.isArray(cdaResult?.findings) ? cdaResult.findings : [];
  const source = intake?.source || {};
  const text = String(source?.text || "").toLowerCase();

  if (divergence === 0) {
    return {
      status: "aligned",
      plain_language:
        "Based on the provided input, A.B.E. did not detect a constitutional, jurisdictional, or scope conflict strong enough to classify the condition as divergence.",
      what_this_means:
        "The described condition appears to fit within lawful authority as currently modeled by the engine.",
      likely_issue_type: "none_detected",
      legal_foundation: [
        "Constitutional alignment as modeled from provided input",
        "No visible scope conflict detected from current data"
      ],
      what_you_can_do: [
        "No corrective action is indicated from this input alone.",
        "If you suspect hidden overreach, provide the exact statute, regulation, funding source, or enforcement action for a deeper run.",
        "Use more complete source text if the current input was only a brief test."
      ],
      safety_note:
        "This output is informational. Preserve records and obtain legal advice if an actual enforcement event occurred."
    };
  }

  const likelyIssues = [];
  if (text.includes("private") || text.includes("non-commercial") || text.includes("personal")) {
    likelyIssues.push("Private or non-commercial activity appears to be treated as if it were commercial activity.");
  }
  if (text.includes("traffic stop") || text.includes("arrest") || text.includes("citation")) {
    likelyIssues.push("An enforcement action appears in the source and may require a clear jurisdictional and statutory basis.");
  }
  if (text.includes("mcsap") || text.includes("funding") || text.includes("appropriation") || text.includes("grant")) {
    likelyIssues.push("Funding or program authority may need to be checked against the specific action being taken.");
  }
  if (text.includes("ambiguous") || text.includes("vague") || text.includes("interpretation")) {
    likelyIssues.push("Ambiguity or undefined terms may be contributing to the divergence finding.");
  }

  if (likelyIssues.length === 0) {
    likelyIssues.push("The described condition appears to exceed or blur lawful authority as modeled from the input.");
  }

  return {
    status: "divergent",
    plain_language:
      "A.B.E. found signs that authority may be applied outside its lawful scope. In plain terms, the source suggests government power may be reaching beyond the boundary that authorizes it.",
    what_this_means:
      "The engine detected a mismatch between the kind of activity described and the kind of authority that normally must exist before that activity can be regulated or enforced.",
    likely_issue_type: "authority_scope_conflict",
    likely_issues: likelyIssues,
    findings,
    legal_foundation: [
      "Authority must remain within constitutional and jurisdictional limits.",
      "State action cannot outrun controlling authority or exceed delegated scope.",
      "Where definitions, scope, or funding do not support the action, divergence may exist.",
      "Conflicts between state action and controlling federal authority require careful preemption and scope review."
    ],
    what_you_can_do: [
      "Request the exact legal authority being used, including statute, regulation, and definition section.",
      "Request the jurisdictional basis for the action before accepting the state's framing.",
      "Ask whether the action applies only to commercial, regulated, or funded activity, and whether that trigger is actually present.",
      "Preserve all records: notices, citations, bodycam references, funding references, letters, and agency responses.",
      "Document the sequence of events in plain language while it is still fresh.",
      "Use the engine output to organize a challenge, complaint, affidavit, or legal review."
    ],
    safety_note:
      "Do not escalate in the moment. Preserve your safety first. Use this output for documentation, redress, and later challenge."
  };
}
