export async function run(scenario = {}, ctx = {}) {
  const intake = scenario?.inputs?.intake || {};
  const source = intake?.source || {};

  const rawText = [source.title, source.type, source.jurisdiction, source.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const findings = [];
  const authorityTrace = [];
  let divergence = 0;

  const hasPrivate = hasAny(rawText, [
    "private", "personal", "non-commercial", "citizen", "private travel", "private movement"
  ]);

  const hasCommercial = hasAny(rawText, [
    "commercial", "for hire", "carrier", "cmv", "motor carrier", "dot regulated", "safety sensitive"
  ]);

  const hasEnforcement = hasAny(rawText, [
    "traffic stop", "citation", "arrest", "detained", "suspension", "revocation", "inspection", "compliance"
  ]);

  const hasFunding = hasAny(rawText, [
    "mcsap", "grant", "funding", "appropriation", "federal funds", "program funds", "budget"
  ]);

  const hasAmbiguity = hasAny(rawText, [
    "ambiguous", "vague", "undefined", "interpretation", "broadly construed", "unclear"
  ]);

  const hasScopeTerms = hasAny(rawText, [
    "authority", "jurisdiction", "scope", "delegated", "delegation", "preemption", "federal", "state"
  ]);

  if (!String(source?.jurisdiction || "").trim()) {
    divergence += 1;
    findings.push("Jurisdiction is not specified in the intake.");
  } else {
    authorityTrace.push(String(source.jurisdiction));
  }

  if (!String(source?.type || "").trim()) {
    divergence += 1;
    findings.push("Source type is not specified in the intake.");
  }

  if (!String(source?.text || "").trim()) {
    divergence += 1;
    findings.push("No source text was provided, so the engine has limited authority context.");
  }

  if (hasPrivate && hasCommercial) {
    divergence += 2;
    findings.push("Private/non-commercial language appears alongside commercial-regulatory language.");
  }

  if (hasPrivate && hasEnforcement && !hasCommercial) {
    divergence += 2;
    findings.push("Enforcement language appears against private/non-commercial activity without a clear commercial trigger.");
  }

  if (hasFunding && hasEnforcement) {
    divergence += 1;
    findings.push("Funding/program language appears alongside enforcement activity and may require scope review.");
    authorityTrace.push("funding_trace_present");
  }

  if (hasAmbiguity) {
    divergence += 1;
    findings.push("Ambiguity or interpretation language appears in the source.");
  }

  if (hasScopeTerms) {
    authorityTrace.push("scope_review_triggered");
  }

  const alignmentStatus = divergence === 0 ? "aligned" : "divergent";

  const result = {
    alignment_status: alignmentStatus,
    divergence_score: divergence,
    authority_trace: authorityTrace,
    findings,
    indicators: {
      private_trigger: hasPrivate,
      commercial_trigger: hasCommercial,
      enforcement_trigger: hasEnforcement,
      funding_trigger: hasFunding,
      ambiguity_trigger: hasAmbiguity,
      scope_trigger: hasScopeTerms
    }
  };

  return {
    module: "CDA",
    module_version: "2.0",
    generated_at: new Date().toISOString(),
    inputs_used: {
      intake_present: !!intake
    },
    summary: {
      avg_alignment: divergence === 0 ? 1 : 0,
      avg_divergence: divergence,
      top_domains: authorityTrace
    },
    by_domain: authorityTrace,
    result,
    legal_explainer: buildLegalExplainer(result, intake)
  };
}

function hasAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}

function buildLegalExplainer(cdaResult, intake) {
  const divergence = Number(cdaResult?.divergence_score) || 0;
  const findings = Array.isArray(cdaResult?.findings) ? cdaResult.findings : [];
  const source = intake?.source || {};

  if (divergence === 0) {
    return {
      status: "aligned",
      plain_language:
        "Based on the information provided, A.B.E. did not detect a strong authority, scope, or jurisdiction conflict.",
      what_this_means:
        "The input does not currently show a clear sign that government power was applied outside its lawful boundary.",
      what_you_can_do: [
        "If this was only a short test, provide more exact text from the stop, notice, citation, statute, or agency document.",
        "If you still suspect overreach, rerun the engine with the actual enforcement language and the exact authority being cited."
      ],
      safety_note:
        "This output is informational only and depends on the quality of the input text."
    };
  }

  const likelyIssues = [];

  if (cdaResult?.indicators?.private_trigger && cdaResult?.indicators?.commercial_trigger) {
    likelyIssues.push("Commercial regulatory language appears to be crossing into private or non-commercial activity.");
  }

  if (cdaResult?.indicators?.enforcement_trigger && cdaResult?.indicators?.private_trigger) {
    likelyIssues.push("An enforcement event appears to involve private activity without a clearly stated commercial basis.");
  }

  if (cdaResult?.indicators?.funding_trigger) {
    likelyIssues.push("A funding or program authority question may exist and should be compared to the specific action taken.");
  }

  if (cdaResult?.indicators?.ambiguity_trigger) {
    likelyIssues.push("Ambiguous or undefined terms may be expanding power beyond a clear lawful limit.");
  }

  if (likelyIssues.length === 0) {
    likelyIssues.push("The input suggests a possible authority or scope conflict that needs closer review.");
  }

  return {
    status: "divergent",
    plain_language:
      "A.B.E. detected signs that the action described may exceed the lawful scope of the authority being used.",
    what_this_means:
      "In plain terms, the government action described may be using a rule, funding hook, or enforcement power outside the boundary that authorizes it.",
    likely_issues: likelyIssues,
    findings,
    legal_foundation: [
      "Authority must stay within constitutional and jurisdictional limits.",
      "State action cannot exceed delegated scope.",
      "Where definitions, scope, or funding do not support the action, divergence may exist.",
      "Conflicts with controlling federal authority require careful scope and preemption review."
    ],
    what_you_can_do: [
      "Request the exact statute, regulation, and definition section being relied on.",
      "Ask what jurisdictional trigger gives the state or officer authority in this specific situation.",
      "Ask whether the action applies only to commercial or regulated activity, and whether that trigger is actually present.",
      "Preserve records: notices, citations, agency letters, bodycam references, docket entries, and timestamps.",
      "Write a simple timeline of what happened while the details are still fresh.",
      "Use the engine output to organize a complaint, affidavit, public records request, or legal review."
    ],
    safety_note:
      "Do not escalate in the moment. Preserve your safety first and use this output for documentation and later challenge."
  };
}
